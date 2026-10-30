-- Email filing, basic (Phase 1 spec, 22 Sep meeting note 3; STU-10, COM-02, COM-03).
-- Staff upload an email (.eml, .msg or a PDF print) or type a manual record, and
-- link it to a student, a school or both, optionally to one of the student's
-- applications. Files live in the private filed-emails bucket.

create table if not exists public.filed_emails (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid references public.students(id) on delete cascade,
  school_id       uuid references public.schools(id) on delete cascade,
  application_id  uuid references public.student_applications(id) on delete set null,
  direction       text not null check (direction in ('received', 'sent')),
  source          text not null check (source in ('eml', 'msg', 'pdf', 'manual')),
  subject         text not null check (char_length(btrim(subject)) between 1 and 998),
  from_name       text check (char_length(from_name) <= 320),
  from_address    text check (char_length(from_address) <= 320),
  to_addresses    text[] not null default '{}' check (cardinality(to_addresses) <= 100),
  cc_addresses    text[] not null default '{}' check (cardinality(cc_addresses) <= 100),
  sent_at         timestamptz not null,
  body_text       text check (char_length(body_text) <= 200000),
  body_html       text check (char_length(body_html) <= 1000000),
  -- First part of the body, kept on the row so list search can read it without the full text.
  body_preview    text generated always as (left(coalesce(body_text, ''), 1000)) stored,
  message_id      text check (char_length(message_id) <= 998),
  staff_note      text check (char_length(staff_note) <= 2000),
  -- [{ "name", "size", "mime", "path" }]; path is never sent to the browser.
  attachments     jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  file_path       text,
  file_name       text,
  file_size       bigint check (file_size between 0 and 26214400),
  archived_at     timestamptz,
  archived_by     uuid references public.profiles(id) on delete set null,
  created_by      uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint filed_emails_has_owner check (num_nonnulls(student_id, school_id) >= 1),
  constraint filed_emails_application_needs_student check (application_id is null or student_id is not null),
  constraint filed_emails_file_matches_source check (
    (source = 'manual' and file_path is null and file_name is null)
    or (source <> 'manual' and file_path is not null and file_name is not null)
  ),
  -- archived_by can become null later (account removed), but is never set on a live email.
  constraint filed_emails_archiver_only_when_archived check (archived_by is null or archived_at is not null)
);

create index if not exists filed_emails_student_idx
  on public.filed_emails (student_id, sent_at desc) where student_id is not null;
create index if not exists filed_emails_school_idx
  on public.filed_emails (school_id, sent_at desc) where school_id is not null;
create index if not exists filed_emails_application_idx
  on public.filed_emails (application_id, sent_at desc) where application_id is not null;
create index if not exists filed_emails_created_by_idx on public.filed_emails (created_by);

-- The same email filed twice on one record is refused; an archived copy does not count.
create unique index if not exists filed_emails_student_message_uniq
  on public.filed_emails (student_id, message_id)
  where student_id is not null and message_id is not null and archived_at is null;
create unique index if not exists filed_emails_school_message_uniq
  on public.filed_emails (school_id, message_id)
  where school_id is not null and message_id is not null and archived_at is null;

drop trigger if exists filed_emails_updated_at on public.filed_emails;
create trigger filed_emails_updated_at before update on public.filed_emails
  for each row execute function public.handle_updated_at();

comment on table public.filed_emails is
  'Emails filed by staff against a student and/or school (manual upload or typed record).';

-- Same model as the rest of the schema: signed-in staff only, module rights
-- enforced in the app (Students for student emails, Schools for school emails).
alter table public.filed_emails enable row level security;
drop policy if exists filed_emails_select on public.filed_emails;
drop policy if exists filed_emails_insert on public.filed_emails;
drop policy if exists filed_emails_update on public.filed_emails;
drop policy if exists filed_emails_delete on public.filed_emails;
create policy filed_emails_select on public.filed_emails for select to authenticated using (true);
create policy filed_emails_insert on public.filed_emails for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy filed_emails_update on public.filed_emails for update to authenticated using (true) with check (true);
create policy filed_emails_delete on public.filed_emails for delete to authenticated using (true);
revoke all on public.filed_emails from anon;

-- Private bucket, 25 MB per object (decision D2). No MIME allow-list on the
-- bucket: attachments inside an email can be any type; the app checks the
-- email file itself and stores risky attachment types as octet-stream.
insert into storage.buckets (id, name, public, file_size_limit)
values ('filed-emails', 'filed-emails', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists filed_emails_objects_insert on storage.objects;
drop policy if exists filed_emails_objects_select on storage.objects;
drop policy if exists filed_emails_objects_update on storage.objects;
drop policy if exists filed_emails_objects_delete on storage.objects;
create policy filed_emails_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'filed-emails');
create policy filed_emails_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'filed-emails');
create policy filed_emails_objects_update on storage.objects for update to authenticated
  using (bucket_id = 'filed-emails') with check (bucket_id = 'filed-emails');
create policy filed_emails_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'filed-emails');
