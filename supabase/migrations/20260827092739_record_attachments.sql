-- ============================================================================
-- Migration: 20260827092739_record_attachments
-- Description: Let a document row point at a specific parent record and, where
--              the artifact lives elsewhere, hold an external URL instead of a
--              stored file. Backs the "file/link support where only text input
--              exists" requirement for certificates, exam papers and the like.
--
-- Depends on: 060_add_resume_fields_and_documents, 071_create_school_documents
--
-- Rollback note: dropping the not-null relaxation on file_path/file_name
-- requires deleting every link row first, otherwise the constraint fails.
-- ============================================================================


-- ============================================================================
-- PART 1: STUDENT DOCUMENTS
-- ============================================================================

alter table public.student_documents
    add column if not exists attachable_type text,
    add column if not exists attachable_id   uuid,
    add column if not exists external_url    text;

alter table public.student_documents alter column file_path drop not null;
alter table public.student_documents alter column file_name drop not null;

-- Exactly one artifact per row: a stored file or an external link, never both,
-- never neither. Without this a row can exist that points at nothing.
alter table public.student_documents
    drop constraint if exists student_documents_artifact_ck;
alter table public.student_documents
    add constraint student_documents_artifact_ck check (
        (file_path is not null and file_name is not null and external_url is null)
        or (external_url is not null and file_path is null and file_name is null)
    );

-- The polymorphic pair is all-or-nothing; half of it is meaningless.
alter table public.student_documents
    drop constraint if exists student_documents_attachable_pair_ck;
alter table public.student_documents
    add constraint student_documents_attachable_pair_ck
    check ((attachable_type is null) = (attachable_id is null));

-- Keeps a school-side type from landing on the student table. Mirrors
-- ATTACH_POINTS in src/lib/attachments/attach-points.ts — a test asserts the
-- two lists agree.
alter table public.student_documents
    drop constraint if exists student_documents_attachable_type_ck;
alter table public.student_documents
    add constraint student_documents_attachable_type_ck
    check (attachable_type is null or attachable_type in (
        'students','student_visas','student_travel','student_exam_results',
        'student_resume','student_applications','student_application_deposits'));

-- Partial: the large majority of rows are owner-level with a null attachable_id.
create index if not exists student_documents_attachable_idx
    on public.student_documents(attachable_type, attachable_id)
    where attachable_id is not null;

comment on column public.student_documents.attachable_type is
    'Parent table name for a record-level attachment, e.g. student_visas. Null for owner-level documents. Polymorphic: no FK is possible, so cleanup lives in the delete server actions.';
comment on column public.student_documents.attachable_id is
    'Parent row uuid, paired with attachable_type.';
comment on column public.student_documents.external_url is
    'Set when the artifact is a link rather than an uploaded file; file_path/file_name are null in that case.';


-- ============================================================================
-- PART 2: SCHOOL DOCUMENTS
-- ============================================================================

alter table public.school_documents
    add column if not exists attachable_type text,
    add column if not exists attachable_id   uuid,
    add column if not exists external_url    text;

alter table public.school_documents alter column file_path drop not null;
alter table public.school_documents alter column file_name drop not null;

alter table public.school_documents
    drop constraint if exists school_documents_artifact_ck;
alter table public.school_documents
    add constraint school_documents_artifact_ck check (
        (file_path is not null and file_name is not null and external_url is null)
        or (external_url is not null and file_path is null and file_name is null)
    );

alter table public.school_documents
    drop constraint if exists school_documents_attachable_pair_ck;
alter table public.school_documents
    add constraint school_documents_attachable_pair_ck
    check ((attachable_type is null) = (attachable_id is null));

alter table public.school_documents
    drop constraint if exists school_documents_attachable_type_ck;
alter table public.school_documents
    add constraint school_documents_attachable_type_ck
    check (attachable_type is null or attachable_type in (
        'schools','school_entrance_exams','school_fees','school_notes','school_bank_details'));

create index if not exists school_documents_attachable_idx
    on public.school_documents(attachable_type, attachable_id)
    where attachable_id is not null;

comment on column public.school_documents.attachable_type is
    'Parent table name for a record-level attachment, e.g. school_entrance_exams. Null for owner-level documents.';
comment on column public.school_documents.attachable_id is
    'Parent row uuid, paired with attachable_type.';
comment on column public.school_documents.external_url is
    'Set when the artifact is a link rather than an uploaded file; file_path/file_name are null in that case.';


-- ============================================================================
-- PART 3: CATEGORIES FOR THE NEW ATTACH POINTS
-- ============================================================================
-- Each attach point maps to a fixed category so the inline attach control needs
-- no category picker, and the Documents tab still groups these sensibly.
-- visa_document and school_fee_schedule already exist and are reused.
-- ============================================================================

insert into public.document_categories (code, label, section, sort_order) values
    ('travel_document',            'Travel Document',           'legal_documents', 12),
    ('exam_paper',                 'Exam Paper',                'documents',       50),
    ('qualification_certificate',  'Qualification Certificate', 'documents',       51),
    ('exam_result_doc',            'Exam Result Document',      'documents',       52),
    ('application_document',       'Application Document',      'documents',       53),
    ('deposit_receipt',            'Deposit Receipt',           'documents',       54),
    ('school_entrance_exam_paper', 'Entrance Exam Paper',       'school',          36),
    ('school_note_attachment',     'Note Attachment',           'school',          37),
    ('school_bank_document',       'Bank Document',             'school',          38)
on conflict (code) do nothing;
