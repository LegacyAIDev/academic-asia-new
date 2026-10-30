-- Activities (Phase 1 spec, 22 Sep meeting note 18, Phase 1.5; SEC-06, STU-14):
-- a read-only record of what was done, when, and by whom. Written by database
-- triggers so every write path is covered (app, imports, direct API calls),
-- and kept apart from the notes staff write themselves.

create table if not exists public.activity_log (
  id              bigint generated always as identity primary key,
  occurred_at     timestamptz not null default now(),
  -- Null for writes without a signed-in user (imports, maintenance): shown as "System".
  actor_id        uuid references public.profiles(id) on delete set null,
  action          text not null check (action in ('created', 'updated', 'deleted')),
  entity          text not null,
  entity_id       text not null,
  -- No foreign keys on purpose: the history of a deleted record must survive it (SEC-04).
  student_id      uuid,
  school_id       uuid,
  application_id  uuid,
  -- What the record was called at the time (title, subject or name), for display.
  label           text,
  -- Columns an update changed; values are not copied, so no personal data is duplicated here.
  changed         text[] not null default '{}'
);

create index if not exists activity_log_student_idx on public.activity_log (student_id, occurred_at desc) where student_id is not null;
create index if not exists activity_log_school_idx on public.activity_log (school_id, occurred_at desc) where school_id is not null;
create index if not exists activity_log_application_idx on public.activity_log (application_id, occurred_at desc) where application_id is not null;
create index if not exists activity_log_entity_idx on public.activity_log (entity, entity_id);
create index if not exists activity_log_actor_idx on public.activity_log (actor_id);

comment on table public.activity_log is
  'Read-only activity history written by triggers: action, record, changed columns, staff member and time.';

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  prior jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  changed_columns text[] := '{}';
  actor uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key order by n.key), '{}')
      into changed_columns
      from jsonb_each(rec) as n(key, value)
     where n.key not in ('updated_at', 'updated_by', 'body_preview')
       and n.value is distinct from prior -> n.key;
    -- Saving a record without changing anything is not an activity.
    if cardinality(changed_columns) = 0 then
      return null;
    end if;
  end if;

  insert into public.activity_log (actor_id, action, entity, entity_id, student_id, school_id, application_id, label, changed)
  values (
    (select p.id from public.profiles p where p.id = actor),
    case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    -- Entrance exam papers are recorded as their own kind, so the app can show
    -- them only to the examination team (same rule as isExamPaperRow).
    case
      when tg_table_name = 'school_documents' and (
        rec ->> 'attachable_type' = 'school_entrance_exams'
        or exists (select 1 from public.document_categories c
                   where c.id = nullif(rec ->> 'category_id', '')::int and c.code = 'school_entrance_exam_paper')
      ) then 'school_exam_papers'
      else tg_table_name
    end,
    rec ->> 'id',
    case when tg_table_name = 'students' then (rec ->> 'id')::uuid else nullif(rec ->> 'student_id', '')::uuid end,
    case when tg_table_name = 'schools' then (rec ->> 'id')::uuid else nullif(rec ->> 'school_id', '')::uuid end,
    case when tg_table_name = 'student_applications' then (rec ->> 'id')::uuid else nullif(rec ->> 'application_id', '')::uuid end,
    left(coalesce(
      nullif(rec ->> 'title', ''), nullif(rec ->> 'subject', ''), nullif(rec ->> 'name', ''), nullif(rec ->> 'file_name', ''),
      nullif(concat_ws(' ', rec ->> 'first_name', rec ->> 'surname'), '')
    ), 200),
    changed_columns
  );
  return null;
end;
$$;

revoke execute on function public.log_activity() from public, anon, authenticated;

-- The records whose history staff need. Add a table here to start logging it.
do $$
declare
  t text;
begin
  foreach t in array array[
    'students', 'student_applications', 'student_individual_exams', 'student_contacts', 'student_documents',
    'scheduler_bookings', 'scheduler_booking_attendees', 'filed_emails',
    'schools', 'school_contacts', 'school_documents', 'school_entrance_exams'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_activity', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_activity()',
      t || '_activity', t
    );
  end loop;
end $$;

-- Readable by signed-in staff (the app shows a record's history only to those who
-- can see the record); written only by the trigger, never edited or deleted.
alter table public.activity_log enable row level security;
drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log for select to authenticated using (true);
revoke all on public.activity_log from anon;
revoke insert, update, delete, truncate on public.activity_log from authenticated;
