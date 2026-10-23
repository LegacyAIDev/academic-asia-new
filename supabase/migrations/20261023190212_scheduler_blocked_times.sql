-- Recurring blocked times for one staff member or one room, e.g. "Lunch,
-- Mon–Fri 13:00–14:00". Room blocks are hard: the capacity trigger refuses a
-- booking that lands in one (SR005) and blocked rooms are not suggested. Staff
-- blocks are soft: they show up in scheduler_free_busy, so the booking form
-- warns about them like any other clash and "Book anyway" still works.

create table if not exists public.scheduler_blocked_times (
  id          uuid primary key default gen_random_uuid(),
  label       text not null check (char_length(btrim(label)) between 1 and 80),
  profile_id  uuid references public.profiles(id) on delete cascade,
  room_id     uuid references public.scheduler_rooms(id) on delete cascade,
  -- ISO weekdays, 1 = Monday … 7 = Sunday.
  weekdays    smallint[] not null
              check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  start_time  time not null,
  end_time    time not null,
  -- Null ends_on repeats forever; starts_on = ends_on is a one-off block.
  starts_on   date not null,
  ends_on     date,
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint scheduler_blocked_times_one_subject check (num_nonnulls(profile_id, room_id) = 1),
  constraint scheduler_blocked_times_time_order check (end_time > start_time),
  constraint scheduler_blocked_times_date_order check (ends_on is null or ends_on >= starts_on)
);

create index if not exists scheduler_blocked_times_profile_idx
  on public.scheduler_blocked_times (profile_id) where profile_id is not null;
create index if not exists scheduler_blocked_times_room_idx
  on public.scheduler_blocked_times (room_id) where room_id is not null;

drop trigger if exists scheduler_blocked_times_updated_at on public.scheduler_blocked_times;
create trigger scheduler_blocked_times_updated_at before update on public.scheduler_blocked_times
  for each row execute function public.handle_updated_at();

comment on table public.scheduler_blocked_times is
  'Recurring blocked time (e.g. lunch) for one staff member or one room; expanded by scheduler_blocked_time_occurrences.';

-- Same access model as the other scheduler tables: open to signed-in staff,
-- with ownership and permissions enforced by the server actions.
alter table public.scheduler_blocked_times enable row level security;
drop policy if exists scheduler_blocked_times_select on public.scheduler_blocked_times;
drop policy if exists scheduler_blocked_times_insert on public.scheduler_blocked_times;
drop policy if exists scheduler_blocked_times_update on public.scheduler_blocked_times;
drop policy if exists scheduler_blocked_times_delete on public.scheduler_blocked_times;
create policy scheduler_blocked_times_select on public.scheduler_blocked_times
  for select to authenticated using (true);
create policy scheduler_blocked_times_insert on public.scheduler_blocked_times
  for insert to authenticated with check (true);
create policy scheduler_blocked_times_update on public.scheduler_blocked_times
  for update to authenticated using (true) with check (true);
create policy scheduler_blocked_times_delete on public.scheduler_blocked_times
  for delete to authenticated using (true);
revoke all on public.scheduler_blocked_times from anon;

-- Every occurrence of the given people's and rooms' blocks that overlaps
-- [p_from, p_to). Expanded per Hong Kong calendar day; the time zone literal
-- must match SCHEDULER_TIMEZONE in src/lib/scheduler/config.ts.
create or replace function public.scheduler_blocked_time_occurrences(
  p_from timestamptz, p_to timestamptz,
  p_profile_ids uuid[] default '{}', p_room_ids uuid[] default '{}')
returns table (
  blocked_time_id uuid, label text, profile_id uuid, room_id uuid,
  start_at timestamptz, end_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select t.id, t.label, t.profile_id, t.room_id,
         (g.d::date + t.start_time) at time zone 'Asia/Hong_Kong',
         (g.d::date + t.end_time)   at time zone 'Asia/Hong_Kong'
  from public.scheduler_blocked_times t
  cross join lateral generate_series(
    greatest(t.starts_on, (p_from at time zone 'Asia/Hong_Kong')::date)::timestamp,
    least(coalesce(t.ends_on, (p_to at time zone 'Asia/Hong_Kong')::date),
          (p_to at time zone 'Asia/Hong_Kong')::date)::timestamp,
    interval '1 day') as g(d)
  where (t.profile_id = any(p_profile_ids) or t.room_id = any(p_room_ids))
    and extract(isodow from g.d)::smallint = any(t.weekdays)
    and (g.d::date + t.start_time) at time zone 'Asia/Hong_Kong' < p_to
    and (g.d::date + t.end_time)   at time zone 'Asia/Hong_Kong' > p_from;
$$;

revoke execute on function public.scheduler_blocked_time_occurrences(timestamptz, timestamptz, uuid[], uuid[]) from public, anon;
grant execute on function public.scheduler_blocked_time_occurrences(timestamptz, timestamptz, uuid[], uuid[]) to authenticated;

-- Room capacity trigger (body from 20260928074722) plus the room-block check.
-- Only a new booking, or one moved to another room or time, is refused: confirming,
-- retitling or recording attendance on a booking that a block was later drawn
-- over must keep working.
create or replace function public.scheduler_check_room_capacity()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_cap    int;
  v_active boolean;
  v_used   int;
  v_excl   boolean;
  v_block  text;
begin
  if new.room_id is null or new.status = 'cancelled' then
    return new;
  end if;

  select capacity, is_active into v_cap, v_active from public.scheduler_rooms where id = new.room_id for update;
  if v_cap is null then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;
  if not v_active then
    raise exception 'Room is inactive and cannot be booked' using errcode = 'SR006';
  end if;

  if tg_op = 'INSERT'
     or new.room_id is distinct from old.room_id
     or new.start_at is distinct from old.start_at
     or new.end_at is distinct from old.end_at then
    select o.label into v_block
    from public.scheduler_blocked_time_occurrences(new.start_at, new.end_at, '{}'::uuid[], array[new.room_id]) o
    order by o.start_at
    limit 1;
    if v_block is not null then
      raise exception 'Room is blocked then: %', v_block using errcode = 'SR005';
    end if;
  end if;

  select coalesce(sum(b.seats_required), 0), bool_or(b.is_exclusive)
    into v_used, v_excl
  from public.scheduler_bookings b
  where b.room_id = new.room_id
    and b.status <> 'cancelled'
    and b.id is distinct from new.id
    and b.period && tstzrange(new.start_at, new.end_at, '[)');

  if coalesce(v_excl, false) or (new.is_exclusive and v_used > 0) then
    raise exception 'Room is exclusively booked for that time' using errcode = 'SR001';
  end if;
  if v_used + new.seats_required > v_cap then
    raise exception 'Room capacity exceeded (% of % seats already reserved)', v_used, v_cap using errcode = 'SR002';
  end if;
  return new;
end $$;

-- Room suggestions (body from 20260928070928): blocked rooms drop out.
create or replace function public.scheduler_available_rooms(
  p_from timestamptz, p_to timestamptz, p_seats int default 1,
  p_exam_only boolean default false, p_exclude_booking uuid default null)
returns table (
  room_id uuid, display_name text, floor text, room_number text, location_name text,
  capacity int, remaining int, is_exam_suitable boolean, is_accessible boolean, online_station_count int)
language sql stable set search_path = '' as $$
  with usage as (
    select b.room_id, coalesce(sum(b.seats_required), 0)::int as used, bool_or(b.is_exclusive) as has_exclusive
    from public.scheduler_bookings b
    where b.status <> 'cancelled' and b.room_id is not null
      and b.period && tstzrange(p_from, p_to, '[)')
      and (p_exclude_booking is null or b.id <> p_exclude_booking)
    group by b.room_id),
  blocked as (
    select distinct o.room_id
    from public.scheduler_blocked_time_occurrences(
      p_from, p_to, '{}'::uuid[],
      (select coalesce(array_agg(r2.id), '{}') from public.scheduler_rooms r2 where r2.is_active)) o)
  select r.id, r.display_name, r.floor, r.room_number, l.name,
         r.capacity, r.capacity - coalesce(u.used, 0),
         r.is_exam_suitable, r.is_accessible, r.online_station_count
  from public.scheduler_rooms r
  join public.scheduler_locations l on l.id = r.location_id
  left join usage u on u.room_id = r.id
  where r.is_active
    and not coalesce(u.has_exclusive, false)
    and r.capacity - coalesce(u.used, 0) >= p_seats
    and (not p_exam_only or r.is_exam_suitable)
    and not exists (select 1 from blocked bl where bl.room_id = r.id)
  order by r.capacity - coalesce(u.used, 0) asc, r.display_name;
$$;

-- Free/busy (body from 20260928071455) plus one branch for staff blocks, so the
-- booking form's clash warning names them ("Blocked: Lunch").
create or replace function public.scheduler_free_busy(
  p_from timestamptz, p_to timestamptz,
  p_profile_ids uuid[] default '{}', p_student_ids uuid[] default '{}',
  p_room_ids uuid[] default '{}', p_exclude_booking_id uuid default null)
returns table (
  subject_kind text, subject_id uuid, item_source text, item_id uuid,
  title text, booking_type text, start_at timestamptz, end_at timestamptz)
language sql stable set search_path = '' as $$
  select distinct on (x.subject_kind, x.subject_id, x.item_source, x.item_id)
         x.subject_kind, x.subject_id, x.item_source, x.item_id, x.title, x.booking_type, x.start_at, x.end_at
  from (
    select 'room'::text as subject_kind, i.room_id as subject_id, i.source as item_source, i.source_id as item_id,
           i.title, i.booking_type, i.start_at, i.end_at
    from public.scheduler_calendar_items i
    where i.room_id = any(p_room_ids) and i.start_at < p_to and i.end_at > p_from
      and (p_exclude_booking_id is null or i.booking_id is distinct from p_exclude_booking_id)
    union all
    select 'profile', a.profile_id, 'booking', b.id, b.title, b.booking_type, b.start_at, b.end_at
    from public.scheduler_booking_attendees a
    join public.scheduler_bookings b on b.id = a.booking_id
    where a.profile_id = any(p_profile_ids) and b.status <> 'cancelled'
      and b.start_at < p_to and b.end_at > p_from
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
    union all
    select 'profile', b.organiser_id, 'booking', b.id, b.title, b.booking_type, b.start_at, b.end_at
    from public.scheduler_bookings b
    where b.organiser_id = any(p_profile_ids) and b.status <> 'cancelled'
      and b.start_at < p_to and b.end_at > p_from
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
    union all
    select 'student', i.student_id, i.source, i.source_id, i.title, i.booking_type, i.start_at, i.end_at
    from public.scheduler_calendar_items i
    where i.student_id = any(p_student_ids) and i.start_at < p_to and i.end_at > p_from
      and (p_exclude_booking_id is null or i.booking_id is distinct from p_exclude_booking_id)
    union all
    select 'student', a.student_id, 'booking', b.id, b.title, b.booking_type, b.start_at, b.end_at
    from public.scheduler_booking_attendees a
    join public.scheduler_bookings b on b.id = a.booking_id
    where a.student_id = any(p_student_ids) and b.status <> 'cancelled'
      and b.start_at < p_to and b.end_at > p_from
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
    union all
    select 'profile', o.profile_id, 'blocked_time', o.blocked_time_id, 'Blocked: ' || o.label, 'blocked_time', o.start_at, o.end_at
    from public.scheduler_blocked_time_occurrences(p_from, p_to, p_profile_ids, '{}'::uuid[]) o
  ) x
  order by x.subject_kind, x.subject_id, x.item_source, x.item_id, x.start_at;
$$;
-- create or replace keeps the existing grants on scheduler_available_rooms and scheduler_free_busy.
