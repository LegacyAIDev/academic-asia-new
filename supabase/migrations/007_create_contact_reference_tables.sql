-- ============================================================================
-- Migration: 007_create_contact_reference_tables
-- Description: Reference tables for student contacts module
-- Depends on: 001_create_reference_tables
-- ============================================================================

-- ============================================================================
-- RELATIONSHIP TYPES
-- ============================================================================

create table public.contact_relationships (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.contact_relationships (code, label, sort_order) values
  ('mother', 'Mother', 0),
  ('father', 'Father', 1),
  ('guardian', 'Guardian', 2),
  ('brother', 'Brother', 3),
  ('sister', 'Sister', 4),
  ('uncle', 'Uncle', 5),
  ('auntie', 'Auntie', 6),
  ('grandfather', 'Grandfather', 7),
  ('grandmother', 'Grandmother', 8),
  ('cousin', 'Cousin', 9),
  ('friend', 'Friend', 10),
  ('other', 'Other', 99);

-- ============================================================================
-- TITLES
-- ============================================================================

create table public.contact_titles (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.contact_titles (code, label, sort_order) values
  ('mr', 'Mr.', 0),
  ('mrs', 'Mrs.', 1),
  ('ms', 'Ms.', 2),
  ('miss', 'Miss', 3),
  ('dr', 'Dr.', 4),
  ('prof', 'Prof.', 5),
  ('rev', 'Rev.', 6);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index contact_relationships_code_idx on public.contact_relationships(code);
create index contact_titles_code_idx on public.contact_titles(code);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.contact_relationships enable row level security;
alter table public.contact_titles enable row level security;

create policy "contact_relationships_select" on public.contact_relationships 
  for select to authenticated using (true);
create policy "contact_titles_select" on public.contact_titles 
  for select to authenticated using (true);
