-- ============================================================================
-- Migration: 060_add_resume_fields_and_documents
-- Description: Add Parents Input to student_brief_intro and create
--              student_documents table for file uploads (school reports,
--              exam certificates, special talents, passports, etc.)
--
-- Depends on: 026_create_student_brief_intro_table, 006_create_students_table
-- ============================================================================


-- ============================================================================
-- PART 1: ADD PARENTS INPUT TO STUDENT_BRIEF_INTRO
-- ============================================================================
-- Field 76 from Gerald's Resume section — "D - Parents Input"
-- ============================================================================

alter table public.student_brief_intro
    add column parents_input text;

comment on column public.student_brief_intro.parents_input is 'Parents input / additional notes from parents (Resume section D)';


-- ============================================================================
-- PART 2: DOCUMENT CATEGORIES REFERENCE TABLE
-- ============================================================================

create table public.document_categories (
                                            id serial primary key,
                                            code text unique not null,
                                            label text not null,
                                            section text,                          -- Which UI section this appears in
                                            sort_order int default 0
);

insert into public.document_categories (code, label, section, sort_order) values
                                                                              ('school_report',     'Current School Report',     'resume',          1),
                                                                              ('exam_certificate',  'External Exam Certificate', 'resume',          2),
                                                                              ('special_talent',    'Special Talent Evidence',    'resume',          3),
                                                                              ('passport_copy',     'Passport Copy',              'legal_documents', 10),
                                                                              ('visa_document',     'Visa Document',              'legal_documents', 11),
                                                                              ('other',             'Other Document',             'other',           99);

alter table public.document_categories enable row level security;
create policy "document_categories_select" on public.document_categories
  for select to authenticated using (true);

comment on table public.document_categories is 'Document upload categories for student files';
comment on column public.document_categories.section is 'UI section: resume, legal_documents, other';


-- ============================================================================
-- PART 3: STUDENT DOCUMENTS TABLE
-- ============================================================================
-- Generic file upload table. One row per uploaded file.
-- Covers Resume fields 56 (school reports), 57 (exam certs), 58 (talents),
-- Legal Documents field 67 (passport copy), and future upload needs.
-- Files stored in Supabase Storage, path referenced here.
-- ============================================================================

create table public.student_documents (
                                          id uuid primary key default gen_random_uuid(),

    -- Core FK
                                          student_id uuid not null references public.students(id) on delete cascade,

    -- Category
                                          category_id int not null references public.document_categories(id),

    -- File info
                                          file_name text not null,               -- Original filename
                                          file_path text not null,               -- Supabase Storage path
                                          file_size bigint,                      -- Size in bytes
                                          mime_type text,                        -- e.g. application/pdf, image/jpeg

    -- Optional context
                                          title text,                            -- User-provided label
                                          description text,                      -- Notes about this document
                                          academic_year text,                    -- e.g. "2024/25" for school reports

    -- Uploaded by
                                          uploaded_by uuid references public.profiles(id),

    -- Audit
                                          created_at timestamptz default now(),
                                          updated_at timestamptz default now()
);

-- Indexes
create index student_documents_student_id_idx
    on public.student_documents(student_id);
create index student_documents_category_id_idx
    on public.student_documents(category_id);
create index student_documents_student_category_idx
    on public.student_documents(student_id, category_id);

-- RLS
alter table public.student_documents enable row level security;

create policy "student_documents_select" on public.student_documents
  for select to authenticated using (true);
create policy "student_documents_insert" on public.student_documents
  for insert to authenticated with check (true);
create policy "student_documents_update" on public.student_documents
  for update to authenticated using (true) with check (true);
create policy "student_documents_delete" on public.student_documents
  for delete to authenticated using (true);

create trigger student_documents_updated_at
    before update on public.student_documents
    for each row execute function public.handle_updated_at();

comment on table public.student_documents is 'Student file uploads: school reports, exam certs, special talents, passports, etc.';
comment on column public.student_documents.file_path is 'Path in Supabase Storage bucket';
comment on column public.student_documents.academic_year is 'Which academic year this document relates to (e.g. school reports)';