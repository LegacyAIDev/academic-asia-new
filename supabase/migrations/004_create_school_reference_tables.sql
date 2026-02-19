-- ============================================================================
-- Migration: 004_create_school_reference_tables
-- Description: Reference tables for schools module
-- Depends on: 001_create_reference_tables
-- ============================================================================

-- ============================================================================
-- GENDER TYPES (schooltype column: Co-Ed, Boys, Girls)
-- ============================================================================

create table public.school_gender_types (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.school_gender_types (code, label, sort_order) values
  ('co_ed', 'Co-Ed', 0),
  ('boys', 'Boys', 1),
  ('girls', 'Girls', 2),
  ('boys_6g', 'Boys (6G)', 3),
  ('boys_6g_day', 'Boys (6G Day only)', 4);

-- ============================================================================
-- INSTITUTION TYPES (si column)
-- ============================================================================

create table public.school_institution_types (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.school_institution_types (code, label, sort_order) values
  ('independent_school', 'Independent School', 0),
  ('independent_school_1', 'Independent School 1', 1),
  ('independent_college', 'Independent College', 2),
  ('further_education_college', 'Further Education College', 3),
  ('sixth_form_college_gov', 'Sixth Form College - Government', 4),
  ('summer_school', 'Summer School', 5),
  ('stabis_school', 'Stabis School', 6),
  ('stabis_school_comm', 'Stabis School_Comm', 7),
  ('stabis', 'Stabis', 8),
  ('summer', 'Summer', 9);

-- ============================================================================
-- SCHOOL PHASES (sp column)
-- ============================================================================

create table public.school_phases (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.school_phases (code, label, sort_order) values
  ('all', 'All', 0),
  ('prep', 'Prep', 1),
  ('prep_s', 'Prep_S', 2),
  ('senior', 'Senior', 3),
  ('sixth_form', 'Sixth Form', 4);

-- ============================================================================
-- RELIGIOUS AFFILIATIONS (ra column)
-- ============================================================================

create table public.school_religious_affiliations (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.school_religious_affiliations (code, label, sort_order) values
  ('non_denominational', 'Non denominational', 0),
  ('church_of_england', 'Church of England', 1),
  ('roman_catholic', 'Roman Catholic', 2),
  ('christian', 'Christian', 3),
  ('inter_denominational', 'Inter denominational', 4),
  ('methodist', 'Methodist', 5),
  ('all_faiths', 'All Faiths', 6),
  ('anglican', 'Anglican', 7),
  ('quaker', 'Quaker', 8),
  ('church_in_wales', 'Church in Wales', 9),
  ('catholic', 'Catholic', 10);

-- ============================================================================
-- COUNTRIES
-- ============================================================================

create table public.countries (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.countries (code, label, sort_order) values
  ('uk', 'UK', 0),
  ('united_kingdom', 'United Kingdom', 1),
  ('england', 'England', 2),
  ('scotland', 'Scotland', 3),
  ('northern_ireland', 'Northern Ireland', 4),
  ('china', 'China', 10),
  ('hong_kong', 'Hong Kong', 11),
  ('macau', 'Macau', 12),
  ('malaysia', 'Malaysia', 13),
  ('austria', 'Austria', 20),
  ('canada', 'Canada', 21),
  ('portugal', 'Portugal', 22),
  ('other', 'Other', 99);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index school_gender_types_code_idx on public.school_gender_types(code);
create index school_institution_types_code_idx on public.school_institution_types(code);
create index school_phases_code_idx on public.school_phases(code);
create index school_religious_affiliations_code_idx on public.school_religious_affiliations(code);
create index countries_code_idx on public.countries(code);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.school_gender_types enable row level security;
alter table public.school_institution_types enable row level security;
alter table public.school_phases enable row level security;
alter table public.school_religious_affiliations enable row level security;
alter table public.countries enable row level security;

create policy "school_gender_types_select" on public.school_gender_types 
  for select to authenticated using (true);
create policy "school_institution_types_select" on public.school_institution_types 
  for select to authenticated using (true);
create policy "school_phases_select" on public.school_phases 
  for select to authenticated using (true);
create policy "school_religious_affiliations_select" on public.school_religious_affiliations 
  for select to authenticated using (true);
create policy "countries_select" on public.countries 
  for select to authenticated using (true);
