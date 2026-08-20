-- Recovered from the live database (supabase_migrations.schema_migrations).
-- Applied to production 2026-08-19 but never committed; restored here so the
-- migration history on disk matches what the database actually ran.

insert into public.document_categories (code, label, section, sort_order) values
  ('school_guardianship',   'Guardianship',        'school', 28),
  ('school_pre_arrival',    'Pre-Arrival & Boarding','school', 29),
  ('school_medical',        'Medical & Welfare',   'school', 30),
  ('school_correspondence', 'Letters & Newsletters','school', 31),
  ('school_curriculum',     'Curriculum & Reading','school', 32)
on conflict (code) do nothing;
