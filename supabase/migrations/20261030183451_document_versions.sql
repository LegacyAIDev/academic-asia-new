-- Entrance assessment paper versions (Phase 1 spec meeting note 11, Phase 1.5;
-- ASM-03, ASM-05): when a school sends an updated paper, exam officers replace
-- the file and the older one stays in the history with who uploaded it and when.
--
-- A replaced document points at its replacement. Only rows with no replacement
-- are current; the history of a paper is the chain of rows pointing at it.
-- Deleting the current version makes the one before it current again.

alter table public.school_documents
  add column if not exists superseded_by uuid references public.school_documents(id) on delete set null,
  add column if not exists superseded_at timestamptz;
alter table public.student_documents
  add column if not exists superseded_by uuid references public.student_documents(id) on delete set null,
  add column if not exists superseded_at timestamptz;

-- Who uploaded each document from now on (the version history names them).
alter table public.school_documents alter column uploaded_by set default auth.uid();
alter table public.student_documents alter column uploaded_by set default auth.uid();

-- Current attachments of a record are read on every page that shows them.
create index if not exists school_documents_current_attachable_idx
  on public.school_documents (attachable_type, attachable_id) where superseded_by is null;
create index if not exists student_documents_current_attachable_idx
  on public.student_documents (attachable_type, attachable_id) where superseded_by is null;
create index if not exists school_documents_superseded_by_idx
  on public.school_documents (superseded_by) where superseded_by is not null;
create index if not exists student_documents_superseded_by_idx
  on public.student_documents (superseded_by) where superseded_by is not null;

-- A document cannot replace itself, and a replacement time goes with a replacement.
alter table public.school_documents drop constraint if exists school_documents_superseded_check;
alter table public.school_documents add constraint school_documents_superseded_check
  check (superseded_by is distinct from id and (superseded_by is null or superseded_at is not null));
alter table public.student_documents drop constraint if exists student_documents_superseded_check;
alter table public.student_documents add constraint student_documents_superseded_check
  check (superseded_by is distinct from id and (superseded_by is null or superseded_at is not null));

comment on column public.school_documents.superseded_by is 'The newer version that replaced this document; null when this is the current version.';
comment on column public.student_documents.superseded_by is 'The newer version that replaced this document; null when this is the current version.';
