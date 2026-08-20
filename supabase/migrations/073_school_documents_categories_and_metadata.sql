-- ============================================================================
-- Migration: 073_school_documents_categories_and_metadata
-- Description: Prepares school_documents for the legacy file import.
--              Adds a minimal set of high-confidence document categories,
--              school branding/media columns, and the metadata carried in
--              legacy filenames (academic year, year level, music audition).
--
-- Depends on: 005_create_schools_table, 071_create_school_documents
-- ============================================================================


-- ============================================================================
-- PART 1: DOCUMENT CATEGORIES
-- ============================================================================
-- Only categories we can assign with high confidence from a filename. Anything
-- ambiguous imports as 'other', which renders as the flat document list the
-- legacy system used. Categories are refined later with an UPDATE once the
-- full multi-school export is available — no re-upload needed.
-- ============================================================================

insert into public.document_categories (code, label, section, sort_order) values
  ('school_factsheet',    'Factsheet',             'school', 24),
  ('school_exam_results', 'Exam Results',          'school', 25),
  ('school_application',  'Application Procedure', 'school', 26),
  ('school_gallery',      'Photos',                'school', 27)
on conflict (code) do nothing;


-- ============================================================================
-- PART 2: SCHOOL BRANDING / MEDIA
-- ============================================================================
-- Logo.png / Campus.png / Map.png appear exactly once per school in the legacy
-- dump — they are profile assets, not documents. Filing them in the document
-- list would bury the school logo among fee letters.
-- Values are storage paths (private bucket), served via signed URL.
-- ============================================================================

alter table public.schools
  add column if not exists logo_url         text,
  add column if not exists campus_image_url text,
  add column if not exists map_url          text;

comment on column public.schools.logo_url is 'Storage path to school logo (school-documents bucket)';
comment on column public.schools.campus_image_url is 'Storage path to campus image';
comment on column public.schools.map_url is 'Storage path to location map image';


-- ============================================================================
-- PART 3: DOCUMENT METADATA PARSED FROM LEGACY FILENAMES
-- ============================================================================
-- Legacy names follow: [PROCEED_]{YEAR}_[YEARLEVEL_][MA_]{Description}.{ext}
-- The filename is the only place this information exists, so it is captured at
-- import time even though the UI does not surface all of it yet — re-deriving
-- it later would mean re-walking the source tree.
-- ============================================================================

alter table public.school_documents
  add column if not exists academic_year     text,
  add column if not exists year_level        text,
  add column if not exists is_music_audition boolean default false,
  add column if not exists source_file_name  text;

comment on column public.school_documents.academic_year is 'Year parsed from filename, e.g. "2024" or "2022-23"';
comment on column public.school_documents.year_level is 'Entry year level parsed from filename: YEAR9, YEAR10, YEAR12, ALLYEAR';
comment on column public.school_documents.is_music_audition is 'Filename carried the MA_ marker — Music Audition variant (see AA_MA events)';
comment on column public.school_documents.source_file_name is 'Original legacy filename, retained for traceability after title cleanup';

create index if not exists school_documents_academic_year_idx
  on public.school_documents(academic_year);


-- ----------------------------------------------------------------------------
-- PART 4: SECOND-PASS CATEGORIES
-- ----------------------------------------------------------------------------
-- Added after reviewing the 'other' bucket against the real sample: these five
-- clusters are unambiguous from the filename and together move ~26% of live
-- files out of 'other'.
-- ----------------------------------------------------------------------------

insert into public.document_categories (code, label, section, sort_order) values
  ('school_guardianship',   'Guardianship',          'school', 28),
  ('school_pre_arrival',    'Pre-Arrival & Boarding','school', 29),
  ('school_medical',        'Medical & Welfare',     'school', 30),
  ('school_correspondence', 'Letters & Newsletters', 'school', 31),
  ('school_curriculum',     'Curriculum & Reading',  'school', 32)
on conflict (code) do nothing;


-- ----------------------------------------------------------------------------
-- PART 5: BUCKET SIZE LIMIT
-- ----------------------------------------------------------------------------
-- 071 created school-documents with a 10 MB cap, but legitimate school files
-- exceed it (a 17.7 MB boarding handbook, a 10.2 MB presentation). Aligns with
-- the student-documents bucket, which already allows 50 MB.
-- ----------------------------------------------------------------------------

update storage.buckets set file_size_limit = 52428800 where id = 'school-documents';
