-- ============================================================================
-- SCHEDULER CORE
-- Locations, rooms, bookings, attendees, booking history, calendar view and
-- the write RPCs used by the scheduler. Room capacity and seat conflicts are
-- enforced here so that no application code path can double-book a room.
--
-- Business timezone: Asia/Hong_Kong — keep in sync with SCHEDULER_TIMEZONE in
-- src/lib/scheduler/config.ts.
-- ============================================================================

create extension if not exists btree_gist;

-- ----------------------------------------------------------------------------
-- 1. Locations and rooms
-- ----------------------------------------------------------------------------
create table if not exists public.scheduler_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  address     text,
  building    text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.scheduler_rooms (
  id                    uuid primary key default gen_random_uuid(),
  location_id           uuid not null references public.scheduler_locations(id),
  display_name          text not null unique,   -- matched case-insensitively against legacy free-text room names
  floor                 text,
  room_number           text,
  capacity              int not null default 1 check (capacity > 0),
  is_exam_suitable      boolean not null default false,
  online_station_count  int not null default 0 check (online_station_count >= 0),
  is_accessible         boolean not null default false,
  facilities_notes      text,
  color                 text,
  is_active             boolean not null default true,
  sort_order            int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists scheduler_rooms_location_id_idx on public.scheduler_rooms(location_id);

-- Seed: the office and the rooms found in legacy free-text room fields.
-- Capacities are placeholders until the customer supplies the room inventory.
insert into public.scheduler_locations (name, address, building)
values ('AA Centre', '14/F, China Taiping Tower Phase II, 8 Sunning Road, Causeway Bay, Hong Kong', 'China Taiping Tower Phase II')
on conflict (name) do nothing;

insert into public.scheduler_rooms (location_id, display_name, floor, capacity, is_exam_suitable, sort_order)
select l.id, v.display_name, '14/F', v.capacity, v.is_exam_suitable, v.sort_order
from public.scheduler_locations l
cross join (values
  ('Exam Room',    30, true,  1),
  ('Consultation',  4, false, 2),
  ('Churchill',     6, false, 3),
  ('Shakespeare',   6, false, 4),
  ('Darwin',        6, false, 5)
) as v(display_name, capacity, is_exam_suitable, sort_order)
where l.name = 'AA Centre'
on conflict (display_name) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Bookings
-- ----------------------------------------------------------------------------
create table if not exists public.scheduler_bookings (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  booking_type        text not null check (booking_type in
                        ('examination','group_examination','consultation','school_interview','internal_meeting','room_reservation','other')),
  status              text not null default 'confirmed' check (status in ('pending','confirmed','cancelled')),
  confirmed_by        uuid references public.profiles(id) on delete set null,
  confirmed_at        timestamptz,
  start_at            timestamptz not null,
  end_at              timestamptz not null,
  local_date          date not null,           -- business-timezone date for indexed range queries
  period              tstzrange generated always as (tstzrange(start_at, end_at, '[)')) stored,
  location_type       text not null default 'room' check (location_type in ('room','online')),
  room_id             uuid references public.scheduler_rooms(id) on delete set null,
  seats_required      int not null default 1 check (seats_required > 0),
  is_exclusive        boolean not null default false,
  organiser_id        uuid references public.profiles(id) on delete set null,
  student_id          uuid references public.students(id) on delete set null,
  application_id      uuid references public.student_applications(id) on delete set null,
  exam_id             uuid references public.student_individual_exams(id) on delete set null,
  assessment_set_id   uuid,                    -- FK added once the assessment-sets table exists (spec §9.4)
  assessment_snapshot jsonb,                   -- assessment details frozen at booking time (EXM-07)
  school_id           uuid references public.schools(id) on delete set null,
  online_link         text check (online_link is null or online_link ~* '^https?://'),
  notes               text,
  instructions        text,
  attendance          text check (attendance in ('show_up','no_show')),
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint scheduler_bookings_end_after_start check (end_at > start_at),
  constraint scheduler_bookings_max_duration check (end_at - start_at <= interval '14 days'),
  constraint scheduler_bookings_location check (
    (location_type = 'room' and room_id is not null) or (location_type = 'online' and room_id is null))
);
create index if not exists scheduler_bookings_local_date_idx on public.scheduler_bookings (local_date) where status <> 'cancelled';
create index if not exists scheduler_bookings_room_period_idx on public.scheduler_bookings using gist (room_id, period)
  where (room_id is not null and status <> 'cancelled');
create index if not exists scheduler_bookings_student_id_idx on public.scheduler_bookings (student_id);
create index if not exists scheduler_bookings_exam_id_idx on public.scheduler_bookings (exam_id);
create index if not exists scheduler_bookings_organiser_id_idx on public.scheduler_bookings (organiser_id);
create index if not exists scheduler_bookings_application_id_idx on public.scheduler_bookings (application_id);

-- ----------------------------------------------------------------------------
-- 3. Attendees (staff or students) with optional seat
-- ----------------------------------------------------------------------------
create table if not exists public.scheduler_booking_attendees (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.scheduler_bookings(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete cascade,
  student_id      uuid references public.students(id) on delete cascade,
  role            text not null default 'attendee' check (role in ('organiser','officer','consultant','staff','candidate','attendee')),
  seat_no         int check (seat_no is null or seat_no > 0),
  application_id  uuid references public.student_applications(id) on delete set null,
  room_id         uuid,        -- denormalised from the booking by trigger; null when cancelled or online
  period          tstzrange,   -- denormalised from the booking by trigger
  constraint scheduler_attendee_one_subject check ((profile_id is null) <> (student_id is null)),
  constraint scheduler_attendee_unique unique nulls not distinct (booking_id, profile_id, student_id),
  constraint scheduler_attendee_seat_no_double_booking
    exclude using gist (room_id with =, seat_no with =, period with &&)
    where (seat_no is not null and room_id is not null)
);
create index if not exists scheduler_booking_attendees_profile_id_idx on public.scheduler_booking_attendees (profile_id);
create index if not exists scheduler_booking_attendees_student_id_idx on public.scheduler_booking_attendees (student_id);
create index if not exists scheduler_booking_attendees_booking_id_idx on public.scheduler_booking_attendees (booking_id);

-- ----------------------------------------------------------------------------
-- 4. History (written by trigger, never by application code)
-- ----------------------------------------------------------------------------
create table if not exists public.scheduler_booking_history (
  id          bigserial primary key,
  booking_id  uuid not null references public.scheduler_bookings(id) on delete cascade,
  action      text not null check (action in ('created','confirmed','rescheduled','updated','cancelled')),
  actor_id    uuid references public.profiles(id) on delete set null,
  at          timestamptz not null default now(),
  changes     jsonb
);
create index if not exists scheduler_booking_history_booking_idx on public.scheduler_booking_history (booking_id, at desc);

-- ----------------------------------------------------------------------------
-- 5. updated_at triggers
-- ----------------------------------------------------------------------------
drop trigger if exists scheduler_locations_updated_at on public.scheduler_locations;
create trigger scheduler_locations_updated_at before update on public.scheduler_locations
  for each row execute function public.handle_updated_at();
drop trigger if exists scheduler_rooms_updated_at on public.scheduler_rooms;
create trigger scheduler_rooms_updated_at before update on public.scheduler_rooms
  for each row execute function public.handle_updated_at();
drop trigger if exists scheduler_bookings_updated_at on public.scheduler_bookings;
create trigger scheduler_bookings_updated_at before update on public.scheduler_bookings
  for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Room capacity guard
-- Several bookings may share a room until the reserved seats exceed its
-- capacity, unless one of them is exclusive. The room row is locked so that
-- concurrent bookings for the same room are checked one after another.
-- ----------------------------------------------------------------------------
create or replace function public.scheduler_check_room_capacity()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_cap  int;
  v_used int;
  v_excl boolean;
begin
  if new.room_id is null or new.status = 'cancelled' then
    return new;
  end if;

  select capacity into v_cap from public.scheduler_rooms where id = new.room_id for update;

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

drop trigger if exists scheduler_bookings_capacity on public.scheduler_bookings;
create trigger scheduler_bookings_capacity
  before insert or update of room_id, start_at, end_at, seats_required, is_exclusive, status
  on public.scheduler_bookings for each row execute function public.scheduler_check_room_capacity();

-- ----------------------------------------------------------------------------
-- 7. Attendee denormalisation + seat range
-- ----------------------------------------------------------------------------
create or replace function public.scheduler_attendee_fill_from_booking()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_room   uuid;
  v_period tstzrange;
  v_status text;
  v_cap    int;
begin
  select b.room_id, b.period, b.status into v_room, v_period, v_status
  from public.scheduler_bookings b where b.id = new.booking_id;

  new.room_id := case when v_status = 'cancelled' then null else v_room end;
  new.period  := v_period;

  if new.seat_no is not null then
    if v_room is null then
      raise exception 'A seat number needs a room' using errcode = 'SR003';
    end if;
    select capacity into v_cap from public.scheduler_rooms where id = v_room;
    if new.seat_no > v_cap then
      raise exception 'Seat % exceeds the room capacity of %', new.seat_no, v_cap using errcode = 'SR003';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists scheduler_booking_attendees_fill on public.scheduler_booking_attendees;
create trigger scheduler_booking_attendees_fill
  before insert or update on public.scheduler_booking_attendees
  for each row execute function public.scheduler_attendee_fill_from_booking();

-- Re-run the fill trigger for all attendees when the booking moves, changes room or is cancelled.
create or replace function public.scheduler_booking_propagate_to_attendees()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.scheduler_booking_attendees set period = new.period where booking_id = new.id;
  return null;
end $$;

drop trigger if exists scheduler_bookings_propagate on public.scheduler_bookings;
create trigger scheduler_bookings_propagate
  after update of room_id, start_at, end_at, status on public.scheduler_bookings
  for each row execute function public.scheduler_booking_propagate_to_attendees();

-- ----------------------------------------------------------------------------
-- 8. History trigger. The RPCs pass a reason through the transaction-local
-- setting scheduler.reason so it lands in the history row.
-- ----------------------------------------------------------------------------
create or replace function public.scheduler_log_booking_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_action  text;
  v_changes jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'created';
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    v_action := 'cancelled';
  elsif new.status = 'confirmed' and old.status = 'pending' then
    v_action := 'confirmed';
  elsif new.start_at <> old.start_at or new.end_at <> old.end_at or new.room_id is distinct from old.room_id then
    v_action := 'rescheduled';
  elsif (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
    v_action := 'updated';
  else
    return null;
  end if;

  if tg_op = 'UPDATE' then
    v_changes := jsonb_build_object(
      'start_at', jsonb_build_array(old.start_at, new.start_at),
      'end_at',   jsonb_build_array(old.end_at, new.end_at),
      'room_id',  jsonb_build_array(old.room_id, new.room_id),
      'status',   jsonb_build_array(old.status, new.status));
  end if;
  v_changes := v_changes || jsonb_build_object('reason', nullif(current_setting('scheduler.reason', true), ''));

  insert into public.scheduler_booking_history (booking_id, action, actor_id, changes)
  values (new.id, v_action, auth.uid(), v_changes);
  return null;
end $$;

drop trigger if exists scheduler_bookings_history on public.scheduler_bookings;
create trigger scheduler_bookings_history
  after insert or update on public.scheduler_bookings
  for each row execute function public.scheduler_log_booking_history();

-- ----------------------------------------------------------------------------
-- 9. Calendar view: bookings ∪ confirmed exams without a linked booking ∪ event slots
-- ----------------------------------------------------------------------------
create or replace view public.scheduler_calendar_items with (security_invoker = true) as
select
  'booking'::text      as source,
  b.id                 as source_id,
  b.id                 as booking_id,
  b.title,
  b.booking_type,
  b.status,
  b.start_at,
  b.end_at,
  b.local_date,
  b.location_type,
  b.room_id,
  r.display_name       as room_name,
  r.floor,
  r.room_number,
  l.name               as location_name,
  b.seats_required,
  b.is_exclusive,
  b.organiser_id,
  b.student_id,
  b.application_id,
  b.exam_id,
  b.school_id,
  b.online_link,
  b.notes,
  b.created_by
from public.scheduler_bookings b
left join public.scheduler_rooms r on r.id = b.room_id
left join public.scheduler_locations l on l.id = r.location_id
where b.status <> 'cancelled'

union all

select
  'exam', e.id, null,
  coalesce(e.title, t.label, 'Exam'),
  'examination',
  case when e.status_id = 2 then 'confirmed' else 'pending' end,
  (e.confirmed_date + e.confirmed_start_time) at time zone 'Asia/Hong_Kong',
  (e.confirmed_date + e.confirmed_end_time)   at time zone 'Asia/Hong_Kong',
  e.confirmed_date,
  case when r.id is null then 'online' else 'room' end,
  r.id, r.display_name, r.floor, r.room_number, l.name,
  1, false, null,
  e.student_id, e.application_id, e.id, e.school_id, e.online_link, e.remarks, null
from public.student_individual_exams e
left join public.individual_exam_types t on t.id = e.exam_type_id
left join public.scheduler_rooms r on lower(trim(e.room)) = lower(r.display_name)
left join public.scheduler_locations l on l.id = r.location_id
where e.status_id in (2, 3)
  and e.confirmed_date is not null and e.confirmed_start_time is not null and e.confirmed_end_time is not null
  and not exists (select 1 from public.scheduler_bookings b where b.exam_id = e.id and b.status <> 'cancelled')

union all

select
  'event_schedule', s.id, null,
  coalesce(ev.name, 'Event') || case when s.is_blocker then ' (blocked)' else '' end,
  'other',
  'confirmed',
  (s.schedule_date + s.start_time) at time zone 'Asia/Hong_Kong',
  (s.schedule_date + s.end_time)   at time zone 'Asia/Hong_Kong',
  s.schedule_date,
  case when r.id is null then 'online' else 'room' end,
  r.id, r.display_name, r.floor, r.room_number, l.name,
  1, false, null,
  s.student_id, null, null, ev.school_id, ev.online_link, s.remarks, null
from public.event_schedules s
join public.events ev on ev.id = s.event_id
left join public.event_representatives rep on rep.id = s.representative_id
left join public.scheduler_rooms r on lower(trim(rep.venue_room)) = lower(r.display_name)
left join public.scheduler_locations l on l.id = r.location_id
where s.schedule_date is not null and s.start_time is not null and s.end_time is not null;

-- ----------------------------------------------------------------------------
-- 10. Write RPCs (one transaction each)
-- ----------------------------------------------------------------------------
create or replace function public.scheduler_save_booking(p_booking jsonb, p_attendees jsonb default '[]'::jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id        uuid := nullif(p_booking->>'id', '')::uuid;
  v_uid       uuid := auth.uid();
  v_type      text := p_booking->>'booking_type';
  v_start     timestamptz := (p_booking->>'start_at')::timestamptz;
  v_end       timestamptz := (p_booking->>'end_at')::timestamptz;
  v_room      uuid := nullif(p_booking->>'room_id', '')::uuid;
  v_student   uuid := nullif(p_booking->>'student_id', '')::uuid;
  v_exam      uuid := nullif(p_booking->>'exam_id', '')::uuid;
  v_status    text;
  v_room_name text;
begin
  perform set_config('scheduler.reason', coalesce(p_booking->>'reason', ''), true);

  if v_id is null then
    v_status := coalesce(nullif(p_booking->>'status', ''),
                         case when v_type in ('examination', 'group_examination') then 'pending' else 'confirmed' end);
    insert into public.scheduler_bookings (
      title, booking_type, status, start_at, end_at, local_date, location_type, room_id, seats_required, is_exclusive,
      organiser_id, student_id, application_id, exam_id, assessment_set_id, assessment_snapshot, school_id,
      online_link, notes, instructions, created_by)
    values (
      p_booking->>'title', v_type, v_status, v_start, v_end, (v_start at time zone 'Asia/Hong_Kong')::date,
      coalesce(nullif(p_booking->>'location_type', ''), case when v_room is null then 'online' else 'room' end),
      v_room, coalesce((p_booking->>'seats_required')::int, 1), coalesce((p_booking->>'is_exclusive')::boolean, false),
      coalesce(nullif(p_booking->>'organiser_id', '')::uuid, v_uid), v_student,
      nullif(p_booking->>'application_id', '')::uuid, v_exam, nullif(p_booking->>'assessment_set_id', '')::uuid,
      p_booking->'assessment_snapshot', nullif(p_booking->>'school_id', '')::uuid,
      nullif(p_booking->>'online_link', ''), p_booking->>'notes', p_booking->>'instructions', v_uid)
    returning id, status into v_id, v_status;
  else
    update public.scheduler_bookings set
      title = p_booking->>'title', booking_type = v_type, start_at = v_start, end_at = v_end,
      local_date = (v_start at time zone 'Asia/Hong_Kong')::date,
      location_type = coalesce(nullif(p_booking->>'location_type', ''), case when v_room is null then 'online' else 'room' end),
      room_id = v_room, seats_required = coalesce((p_booking->>'seats_required')::int, 1),
      is_exclusive = coalesce((p_booking->>'is_exclusive')::boolean, false),
      organiser_id = coalesce(nullif(p_booking->>'organiser_id', '')::uuid, organiser_id),
      student_id = v_student, application_id = nullif(p_booking->>'application_id', '')::uuid, exam_id = v_exam,
      assessment_set_id = nullif(p_booking->>'assessment_set_id', '')::uuid, assessment_snapshot = p_booking->'assessment_snapshot',
      school_id = nullif(p_booking->>'school_id', '')::uuid, online_link = nullif(p_booking->>'online_link', ''),
      notes = p_booking->>'notes', instructions = p_booking->>'instructions'
    where id = v_id and status <> 'cancelled'
    returning status into v_status;
    if not found then
      raise exception 'Booking not found or already cancelled' using errcode = 'P0002';
    end if;
    delete from public.scheduler_booking_attendees where booking_id = v_id;
  end if;

  insert into public.scheduler_booking_attendees (booking_id, profile_id, student_id, role, seat_no, application_id)
  select v_id,
         nullif(a->>'profile_id', '')::uuid,
         nullif(a->>'student_id', '')::uuid,
         coalesce(nullif(a->>'role', ''), 'attendee'),
         nullif(a->>'seat_no', '')::int,
         nullif(a->>'application_id', '')::uuid
  from jsonb_array_elements(coalesce(p_attendees, '[]'::jsonb)) a;

  -- The booking's subject student is always an attendee so their calendar shows it.
  if v_student is not null and not exists (
      select 1 from public.scheduler_booking_attendees where booking_id = v_id and student_id = v_student) then
    insert into public.scheduler_booking_attendees (booking_id, student_id, role, application_id)
    values (v_id, v_student, case when v_type in ('examination', 'group_examination') then 'candidate' else 'attendee' end,
            nullif(p_booking->>'application_id', '')::uuid);
  end if;

  -- Mirror the schedule onto the linked exam record; confirmation happens separately.
  if v_exam is not null then
    select display_name into v_room_name from public.scheduler_rooms where id = v_room;
    update public.student_individual_exams set
      confirmed_date       = (v_start at time zone 'Asia/Hong_Kong')::date,
      confirmed_start_time = (v_start at time zone 'Asia/Hong_Kong')::time,
      confirmed_end_time   = (v_end at time zone 'Asia/Hong_Kong')::time,
      room                 = v_room_name,
      status_id            = case when v_status = 'confirmed' then 2 else 1 end
    where id = v_exam;
  end if;

  return v_id;
end $$;

create or replace function public.scheduler_confirm_booking(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_exam uuid;
begin
  update public.scheduler_bookings
     set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
   where id = p_id and status = 'pending'
  returning exam_id into v_exam;
  if not found then
    raise exception 'Booking not found or not pending' using errcode = 'P0002';
  end if;
  if v_exam is not null then
    update public.student_individual_exams set status_id = 2 where id = v_exam;
  end if;
end $$;

create or replace function public.scheduler_cancel_booking(p_id uuid, p_reason text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_exam uuid;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required to cancel a booking' using errcode = 'SR004';
  end if;
  perform set_config('scheduler.reason', p_reason, true);
  update public.scheduler_bookings
     set status = 'cancelled'
   where id = p_id and status <> 'cancelled'
  returning exam_id into v_exam;
  if not found then
    raise exception 'Booking not found or already cancelled' using errcode = 'P0002';
  end if;
  if v_exam is not null then
    update public.student_individual_exams set status_id = 4 where id = v_exam;
  end if;
end $$;

-- Rooms that can still take p_seats more people in the given period, best fit first.
create or replace function public.scheduler_available_rooms(
  p_from timestamptz, p_to timestamptz, p_seats int default 1,
  p_exam_only boolean default false, p_exclude_booking uuid default null)
returns table (
  room_id uuid, display_name text, floor text, room_number text, location_name text,
  capacity int, remaining int, is_exam_suitable boolean, is_accessible boolean, online_station_count int)
language sql stable security invoker set search_path = '' as $$
  with usage as (
    select b.room_id, coalesce(sum(b.seats_required), 0)::int as used, bool_or(b.is_exclusive) as has_exclusive
    from public.scheduler_bookings b
    where b.status <> 'cancelled' and b.room_id is not null
      and b.period && tstzrange(p_from, p_to, '[)')
      and (p_exclude_booking is null or b.id <> p_exclude_booking)
    group by b.room_id)
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
  order by r.capacity - coalesce(u.used, 0) asc, r.display_name;
$$;

-- ----------------------------------------------------------------------------
-- 11. Row level security (permissive for authenticated users, module gates live in the app)
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['scheduler_locations', 'scheduler_rooms', 'scheduler_bookings', 'scheduler_booking_attendees'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (true)', t || '_delete', t);
  end loop;
end $$;

alter table public.scheduler_booking_history enable row level security;
drop policy if exists scheduler_booking_history_select on public.scheduler_booking_history;
create policy scheduler_booking_history_select on public.scheduler_booking_history for select to authenticated using (true);

comment on table public.scheduler_locations is 'Physical sites (office branches) that contain bookable rooms';
comment on table public.scheduler_rooms is 'Bookable rooms with capacity and facilities; one row per physical room';
comment on table public.scheduler_bookings is 'Meetings, consultations, interviews and exam sessions that occupy people and optionally a room';
comment on table public.scheduler_booking_attendees is 'Staff and students attached to a booking, with optional seat number';
comment on table public.scheduler_booking_history is 'Audit trail of booking lifecycle events, written by trigger';
comment on view public.scheduler_calendar_items is 'Everything the calendar shows: scheduler bookings plus confirmed exams and event slots not yet linked to a booking';
