-- Dated staff notes ("remarks") on a student, an application or an exam record.
-- One table with a real foreign key per parent, exactly one of them filled, so
-- deleting the parent removes its notes.

create table if not exists public.record_notes (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid references public.students(id) on delete cascade,
  application_id  uuid references public.student_applications(id) on delete cascade,
  exam_id         uuid references public.student_individual_exams(id) on delete cascade,
  body            text not null check (char_length(btrim(body)) between 1 and 5000),
  author_id       uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint record_notes_one_parent check (num_nonnulls(student_id, application_id, exam_id) = 1)
);

create index if not exists record_notes_student_idx
  on public.record_notes (student_id, created_at desc) where student_id is not null;
create index if not exists record_notes_application_idx
  on public.record_notes (application_id, created_at desc) where application_id is not null;
create index if not exists record_notes_exam_idx
  on public.record_notes (exam_id, created_at desc) where exam_id is not null;
create index if not exists record_notes_author_idx
  on public.record_notes (author_id);

drop trigger if exists record_notes_updated_at on public.record_notes;
create trigger record_notes_updated_at before update on public.record_notes
  for each row execute function public.handle_updated_at();

comment on table public.record_notes is
  'Dated staff notes on a student, an application or an exam record; only the author edits or deletes a note.';

-- Everyone signed in may read notes. Writing is limited to the note's author,
-- the same rule the app enforces, so a direct API call cannot post as someone
-- else or change another person's note.
alter table public.record_notes enable row level security;
drop policy if exists record_notes_select on public.record_notes;
drop policy if exists record_notes_insert on public.record_notes;
drop policy if exists record_notes_update on public.record_notes;
drop policy if exists record_notes_delete on public.record_notes;
create policy record_notes_select on public.record_notes
  for select to authenticated using (true);
create policy record_notes_insert on public.record_notes
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy record_notes_update on public.record_notes
  for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy record_notes_delete on public.record_notes
  for delete to authenticated using (author_id = (select auth.uid()));
revoke all on public.record_notes from anon;

-- School notes: who wrote each note from now on. The column is added without a
-- default first so the 1,913 imported notes stay empty and read as "old system".
alter table public.school_notes add column if not exists created_by uuid
  references public.profiles(id) on delete set null;
alter table public.school_notes alter column created_by set default auth.uid();
create index if not exists school_notes_created_by_idx on public.school_notes (created_by);
