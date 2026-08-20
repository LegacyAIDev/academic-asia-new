-- Recovered from the live database (supabase_migrations.schema_migrations).
-- Applied to production 2026-08-19 but never committed; restored here so the
-- migration history on disk matches what the database actually ran.

insert into public.document_categories (code, label, section, sort_order) values
  ('school_scholarship',       'Scholarships & Bursaries', 'school', 33),
  ('school_summer_programme',  'Summer Programmes',        'school', 34),
  ('school_term_dates',        'Term Dates & Calendar',    'school', 35)
on conflict (code) do nothing;
