-- ============================================================================
-- Migration: 070_add_document_categories
-- Description: Additional document categories for the unified student document
--              manager (CV, birth certificate, AA test, music achievement,
--              UKiset, IELTS). Passport, reports, exam certificate and Other
--              already exist from migration 060.
-- ============================================================================

insert into public.document_categories (code, label, section, sort_order) values
  ('cv',                'CV',                'documents', 4),
  ('birth_certificate', 'Birth Certificate', 'documents', 5),
  ('music_achievement', 'Music Achievement', 'documents', 6),
  ('aa_test_doc',       'AA Test Document',  'documents', 7),
  ('ukiset',            'UKiset',            'documents', 8),
  ('ielts',             'IELTS',             'documents', 9)
on conflict (code) do nothing;
