-- ============================================================================
-- Migration: 005_create_schools_table
-- Description: Schools table with FK references to lookup tables
-- Depends on: 003_create_profiles_table, 004_create_school_reference_tables
-- ============================================================================

create table public.schools (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Legacy ID (for migration from old system)
  legacy_id int unique,
  
  -- Basic Information
  name text not null,
  
  -- Address
  address text,
  city text,
  county text,
  postcode text,
  country_id int references public.countries(id),
  
  -- Geolocation
  latitude decimal(10, 7),
  longitude decimal(10, 7),
  
  -- Contact Information
  telephone text,
  fax text,
  email text,
  website text,
  
  -- School Classification (FK to reference tables)
  gender_type_id int references public.school_gender_types(id),
  institution_type_id int references public.school_institution_types(id),
  phase_id int references public.school_phases(id),
  religious_affiliation_id int references public.school_religious_affiliations(id),
  
  -- Capacity
  pupil_count int default 0,
  boarder_count int default 0,
  boarder_age_range text,
  
  -- Visa Information
  child_visa_age int,
  accepts_child_visa boolean default false,
  accepts_general_visa boolean default false,
  
  -- Status
  status text default 'normal' check (status in ('normal', 'suspended')),
  accepts_applications boolean default true,
  
  -- Search & Notes
  keywords text,
  remarks text,
  
  -- System fields (legacy)
  login_name text,
  
  -- Staff assignment (UUID reference to profiles)
  assigned_to uuid references public.profiles(id),
  
  -- Audit fields
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  
  -- Legacy timestamp
  legacy_last_update timestamptz
);

-- ============================================================================
-- ENABLE TRIGRAM EXTENSION (for fuzzy search) - must be before index
-- ============================================================================

create extension if not exists pg_trgm;

-- ============================================================================
-- INDEXES
-- ============================================================================

create index schools_legacy_id_idx on public.schools(legacy_id);
create index schools_name_idx on public.schools(name);
create index schools_country_id_idx on public.schools(country_id);
create index schools_gender_type_id_idx on public.schools(gender_type_id);
create index schools_institution_type_id_idx on public.schools(institution_type_id);
create index schools_phase_id_idx on public.schools(phase_id);
create index schools_religious_affiliation_id_idx on public.schools(religious_affiliation_id);
create index schools_city_idx on public.schools(city);
create index schools_county_idx on public.schools(county);
create index schools_postcode_idx on public.schools(postcode);
create index schools_assigned_to_idx on public.schools(assigned_to);
create index schools_name_trgm_idx on public.schools using gin (name gin_trgm_ops);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.schools enable row level security;

create policy "schools_select_policy" on public.schools
  for select to authenticated using (true);
create policy "schools_insert_policy" on public.schools
  for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "schools_update_policy" on public.schools
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);
create policy "schools_delete_policy" on public.schools
  for delete to authenticated
  using ((select auth.uid()) = created_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger schools_updated_at
  before update on public.schools
  for each row
  execute function public.handle_updated_at();
