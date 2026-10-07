-- ============================================================================
-- SCHEDULER: EXECUTE GRANTS, ATTENDANCE, VIEW STATUS FIX
-- Restricts the scheduler functions to signed-in staff, records attendance
-- for a booking (moving a linked exam to completed when the student showed
-- up), drops a stale exam link when a booking stops being an examination,
-- and shows completed exams as confirmed instead of pending on the calendar.
-- ============================================================================

-- Functions default to PUBLIC execute; only authenticated users may call these.
revoke execute on function public.scheduler_save_booking(jsonb, jsonb) from public, anon;
revoke execute on function public.scheduler_confirm_booking(uuid) from public, anon;
revoke execute on function public.scheduler_cancel_booking(uuid, text) from public, anon;
revoke execute on function public.scheduler_available_rooms(timestamptz, timestamptz, int, boolean, uuid) from public, anon;
revoke execute on function public.scheduler_free_busy(timestamptz, timestamptz, uuid[], uuid[], uuid[], uuid) from public, anon;
grant execute on function public.scheduler_save_booking(jsonb, jsonb) to authenticated;
grant execute on function public.scheduler_confirm_booking(uuid) to authenticated;
grant execute on function public.scheduler_cancel_booking(uuid, text) to authenticated;
grant execute on function public.scheduler_available_rooms(timestamptz, timestamptz, int, boolean, uuid) to authenticated;
grant execute on function public.scheduler_free_busy(timestamptz, timestamptz, uuid[], uuid[], uuid[], uuid) to authenticated;

-- A booking that is no longer an examination must not keep pointing at an exam record.
create or replace function public.scheduler_clear_exam_link_for_non_exam()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.booking_type not in ('examination', 'group_examination') then
    new.exam_id := null;
  end if;
  return new;
end $$;

drop trigger if exists scheduler_bookings_clear_exam_link on public.scheduler_bookings;
create trigger scheduler_bookings_clear_exam_link
  before insert or update of booking_type, exam_id on public.scheduler_bookings
  for each row execute function public.scheduler_clear_exam_link_for_non_exam();

-- Attendance is recorded after the session; a candidate who showed up completes the exam.
create or replace function public.scheduler_record_attendance(p_id uuid, p_attendance text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_exam uuid;
begin
  if p_attendance not in ('show_up', 'no_show') then
    raise exception 'Attendance must be show_up or no_show' using errcode = '22P02';
  end if;
  update public.scheduler_bookings
     set attendance = p_attendance
   where id = p_id and status = 'confirmed'
  returning exam_id into v_exam;
  if not found then
    raise exception 'Only confirmed bookings can record attendance' using errcode = 'P0002';
  end if;
  if v_exam is not null and p_attendance = 'show_up' then
    update public.student_individual_exams set status_id = 3 where id = v_exam and status_id = 2;
  end if;
end $$;
revoke execute on function public.scheduler_record_attendance(uuid, text) from public, anon;
grant execute on function public.scheduler_record_attendance(uuid, text) to authenticated;

-- Exam branch: completed exams (status 3) read as confirmed on the calendar.
create or replace view public.scheduler_calendar_items with (security_invoker = true) as
select
  'booking'::text as source, b.id as source_id, b.id as booking_id, b.title, b.booking_type, b.status,
  b.start_at, b.end_at, b.local_date, b.location_type, b.room_id, r.display_name as room_name, r.floor, r.room_number,
  l.name as location_name, b.seats_required, b.is_exclusive, b.organiser_id, b.student_id, b.application_id, b.exam_id,
  b.school_id, b.online_link, b.notes, b.created_by
from public.scheduler_bookings b
left join public.scheduler_rooms r on r.id = b.room_id
left join public.scheduler_locations l on l.id = r.location_id
where b.status <> 'cancelled'
union all
select
  'exam', e.id, null, coalesce(e.title, t.label, 'Exam'), 'examination',
  'confirmed',
  (e.confirmed_date + e.confirmed_start_time) at time zone 'Asia/Hong_Kong',
  (e.confirmed_date + e.confirmed_end_time)   at time zone 'Asia/Hong_Kong',
  e.confirmed_date,
  case when r.id is null then 'online' else 'room' end,
  r.id, r.display_name, r.floor, r.room_number, l.name, 1, false, null,
  e.student_id, e.application_id, e.id, e.school_id, e.online_link, e.remarks, null
from public.student_individual_exams e
left join public.individual_exam_types t on t.id = e.exam_type_id
left join public.scheduler_rooms r on r.id = coalesce(e.room_id, (select r2.id from public.scheduler_rooms r2 where lower(trim(e.room)) = lower(r2.display_name) limit 1))
left join public.scheduler_locations l on l.id = r.location_id
where e.status_id in (2, 3)
  and e.confirmed_date is not null and e.confirmed_start_time is not null and e.confirmed_end_time is not null
  and not exists (select 1 from public.scheduler_bookings b where b.exam_id = e.id and b.status <> 'cancelled')
union all
select
  'event_schedule', s.id, null,
  coalesce(ev.name, 'Event') || case when s.is_blocker then ' (blocked)' else '' end,
  'other', 'confirmed',
  (s.schedule_date + s.start_time) at time zone 'Asia/Hong_Kong',
  (s.schedule_date + s.end_time)   at time zone 'Asia/Hong_Kong',
  s.schedule_date,
  case when r.id is null then 'online' else 'room' end,
  r.id, r.display_name, r.floor, r.room_number, l.name, 1, false, null,
  s.student_id, null, null, ev.school_id, ev.online_link, s.remarks, null
from public.event_schedules s
join public.events ev on ev.id = s.event_id
left join public.event_representatives rep on rep.id = s.representative_id
left join public.scheduler_rooms r on lower(trim(rep.venue_room)) = lower(r.display_name)
left join public.scheduler_locations l on l.id = r.location_id
where s.schedule_date is not null and s.start_time is not null and s.end_time is not null;
