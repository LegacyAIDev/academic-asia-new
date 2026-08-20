-- ============================================================================
-- Migration: 074_student_document_categories
-- Description: Completes the student profile document taxonomy against the
--              client's requested list, and orders the picker to match it.
--
-- Depends on: 060_add_resume_fields_and_documents, 070_add_document_categories
-- ============================================================================


-- ============================================================================
-- PART 1: MISSING CATEGORIES
-- ============================================================================
-- aa_test_doc was a single generic bucket, but the legacy dump and the client
-- both treat the two AA test papers as separate documents (19,223 files split
-- across AATest_MathandGrammar and AATest_Essay).
--
-- report_and_certificate matches the legacy combined file
-- (ReportandCertificate.pdf, 10,122 files) and the client's vocabulary. The
-- resume section keeps its finer-grained school_report / exam_certificate pair
-- for forward-looking data entry — different section, different workflow.
-- ============================================================================

insert into public.document_categories (code, label, section, sort_order) values
  ('report_and_certificate', 'Report and Certificate',     'documents', 42),
  ('aa_test_math_grammar',   'AA Test — Math and Grammar', 'documents', 43),
  ('aa_test_essay',          'AA Test — Essay',            'documents', 44)
on conflict (code) do nothing;


-- ============================================================================
-- PART 2: PICKER ORDER
-- ============================================================================
-- The documents section previously occupied 4-9, which collided with
-- legal_documents (10-11) once the new entries were added. Moving it to a 40+
-- block gives every category a unique sort_order and makes the student profile
-- picker read in the order the client asked for:
--   Passport, CV, Birth Certificate, Report and Certificate,
--   AA Test (Math & Grammar), AA Test (Essay), Music, UKiset, IELTS, Other
-- ============================================================================

update public.document_categories set sort_order = 40 where code = 'cv';
update public.document_categories set sort_order = 41 where code = 'birth_certificate';
update public.document_categories set sort_order = 45 where code = 'music_achievement';
update public.document_categories set sort_order = 46 where code = 'ukiset';
update public.document_categories set sort_order = 47 where code = 'ielts';

-- Retained as the importer's fallback for AA test files that match neither
-- paper, and because migration 070 created it. Sorted last in its section.
update public.document_categories set sort_order = 48 where code = 'aa_test_doc';
