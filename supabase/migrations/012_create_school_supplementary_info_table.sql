-- ============================================================================
-- Migration: 012_create_school_supplementary_info_table
-- Description: School supplementary information (one-to-many with schools)
-- Depends on: 005_create_schools_table
-- ============================================================================

create table public.school_supplementary_info (
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to school (required)
  school_id uuid not null references public.schools(id) on delete cascade,
  
  -- Legacy tracking
  legacy_school_id int,
  
  -- Info details
  info_type text not null,  -- "Accommodation", "EFL Cost", "Admissions Info", etc.
  info text,                 -- The actual content
  school_year text,          -- "2014-15", "2015-16", etc.
  
  -- Notes
  remarks text,
  
  -- Assignment
  assigned_to uuid references public.profiles(id),
  
  -- Audit
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  legacy_last_update timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup by school
create index school_sup_info_school_id_idx on public.school_supplementary_info(school_id);

-- Filter by info type
create index school_sup_info_type_idx on public.school_supplementary_info(info_type);

-- Filter by school year
create index school_sup_info_year_idx on public.school_supplementary_info(school_year);

-- Combined: school + type (common query pattern)
create index school_sup_info_school_type_idx on public.school_supplementary_info(school_id, info_type);

-- Assignment
create index school_sup_info_assigned_to_idx on public.school_supplementary_info(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.school_supplementary_info enable row level security;

create policy "school_sup_info_select" on public.school_supplementary_info
  for select to authenticated using (true);

create policy "school_sup_info_insert" on public.school_supplementary_info
  for insert to authenticated with check (true);

create policy "school_sup_info_update" on public.school_supplementary_info
  for update to authenticated using (true) with check (true);

create policy "school_sup_info_delete" on public.school_supplementary_info
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_sup_info_updated_at
  before update on public.school_supplementary_info
  for each row
  execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.school_supplementary_info is 'School supplementary information - flexible key-value style data';
comment on column public.school_supplementary_info.info_type is 'Type of info: Accommodation, EFL Cost, Admissions Info, etc.';
comment on column public.school_supplementary_info.school_year is 'Academic year: 2014-15, 2015-16, etc.';
