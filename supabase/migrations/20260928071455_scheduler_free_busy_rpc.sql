-- ============================================================================
-- SCHEDULER FREE/BUSY
-- Busy intervals for a set of rooms, staff and students inside a time range.
-- Used by the booking dialog to warn about people who are already booked.
-- Room feasibility is decided by scheduler_available_rooms; the room branch
-- here is informational only.
-- ============================================================================

create or replace function public.scheduler_free_busy(
  p_from timestamptz,
  p_to timestamptz,
  p_profile_ids uuid[] default '{}',
  p_student_ids uuid[] default '{}',
  p_room_ids uuid[] default '{}',
  p_exclude_booking_id uuid default null)
returns table (
  subject_kind text, subject_id uuid, item_source text, item_id uuid,
  title text, booking_type text, start_at timestamptz, end_at timestamptz)
language sql stable security invoker set search_path = '' as $$
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
  ) x
  order by x.subject_kind, x.subject_id, x.item_source, x.item_id, x.start_at;
$$;
