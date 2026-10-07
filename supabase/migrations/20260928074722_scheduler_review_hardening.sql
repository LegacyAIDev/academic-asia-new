-- ============================================================================
-- SCHEDULER: REVIEW HARDENING
-- Examination bookings always start pending regardless of what the client
-- sends, and inactive rooms cannot take new bookings.
-- ============================================================================

create or replace function public.scheduler_check_room_capacity()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_cap    int;
  v_active boolean;
  v_used   int;
  v_excl   boolean;
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

-- Only the confirm RPC may move an examination to confirmed.
create or replace function public.scheduler_force_pending_exam_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.booking_type in ('examination', 'group_examination') and new.status = 'confirmed' then
    new.status := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists scheduler_bookings_exam_starts_pending on public.scheduler_bookings;
create trigger scheduler_bookings_exam_starts_pending
  before insert on public.scheduler_bookings
  for each row execute function public.scheduler_force_pending_exam_status();
