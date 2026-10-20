-- ============================================================================
-- STUDENT APPLICATIONS: STATUS HISTORY
-- Records every change of an application's status or sub-status with who made
-- it and when, so the application page can show the journey over time.
-- Written by a trigger, like scheduler_booking_history, so no write path (edit
-- dialog, status control, later automation) can skip it. Changes made before
-- this migration are not recorded: the old system's history was not imported.
-- ============================================================================

create table if not exists public.student_application_status_history (
  id                 bigint generated always as identity primary key,
  application_id     uuid not null references public.student_applications(id) on delete cascade,
  from_status_id     integer references public.application_statuses(id),
  to_status_id       integer references public.application_statuses(id),
  from_sub_status_id integer references public.application_sub_statuses(id),
  to_sub_status_id   integer references public.application_sub_statuses(id),
  changed_by         uuid references public.profiles(id) on delete set null,
  changed_at         timestamptz not null default now()
);
create index if not exists student_application_status_history_application_idx
  on public.student_application_status_history (application_id, changed_at desc);

comment on table public.student_application_status_history is
  'Status and sub-status changes of student applications, written by trigger';

create or replace function public.log_student_application_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- Empty for system changes and for a signed-in user without a profile row,
  -- so the history can never be the reason a status change fails.
  v_actor uuid := (select p.id from public.profiles p where p.id = auth.uid());
begin
  if tg_op = 'INSERT' then
    if new.status_id is not null or new.sub_status_id is not null then
      insert into public.student_application_status_history
        (application_id, to_status_id, to_sub_status_id, changed_by)
      values (new.id, new.status_id, new.sub_status_id, v_actor);
    end if;
  elsif new.status_id is distinct from old.status_id
     or new.sub_status_id is distinct from old.sub_status_id then
    insert into public.student_application_status_history
      (application_id, from_status_id, to_status_id, from_sub_status_id, to_sub_status_id, changed_by)
    values (new.id, old.status_id, new.status_id, old.sub_status_id, new.sub_status_id, v_actor);
  end if;
  return null;
end $$;

drop trigger if exists student_applications_status_history on public.student_applications;
create trigger student_applications_status_history
  after insert or update of status_id, sub_status_id on public.student_applications
  for each row execute function public.log_student_application_status_change();

-- Readable by signed-in staff like the other tables; no insert, update or
-- delete policy, so only the trigger writes.
alter table public.student_application_status_history enable row level security;
drop policy if exists student_application_status_history_select on public.student_application_status_history;
create policy student_application_status_history_select
  on public.student_application_status_history for select to authenticated using (true);
revoke all on public.student_application_status_history from anon;
