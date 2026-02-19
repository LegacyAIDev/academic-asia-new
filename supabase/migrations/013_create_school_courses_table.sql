-- ============================================================================
-- Migration: 013_create_school_courses_table
-- Description: Junction table for schools ↔ courses (many-to-many)
-- Depends on: 005_create_schools_table, 001_create_reference_tables
-- ============================================================================

create table public.school_courses (
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign keys
  school_id uuid not null references public.schools(id) on delete cascade,
  course_id int not null references public.courses(id) on delete cascade,
  
  -- Legacy tracking
  legacy_school_id int,
  legacy_course_name text,  -- Original course name from CSV
  
  -- Course details at this school
  description text,
  course_date date,
  school_year text,         -- "2013-14", "2014-15", etc.
  name text,                -- Additional name field from CSV
  subject text,
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

-- Primary lookups
create index school_courses_school_id_idx on public.school_courses(school_id);
create index school_courses_course_id_idx on public.school_courses(course_id);

-- Combined (common query: which courses does school X offer?)
create index school_courses_school_course_idx on public.school_courses(school_id, course_id);

-- Filter by year
create index school_courses_year_idx on public.school_courses(school_year);

-- Assignment
create index school_courses_assigned_to_idx on public.school_courses(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.school_courses enable row level security;

create policy "school_courses_select" on public.school_courses
  for select to authenticated using (true);

create policy "school_courses_insert" on public.school_courses
  for insert to authenticated with check (true);

create policy "school_courses_update" on public.school_courses
  for update to authenticated using (true) with check (true);

create policy "school_courses_delete" on public.school_courses
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_courses_updated_at
  before update on public.school_courses
  for each row
  execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.school_courses is 'Junction table: courses offered by schools';
comment on column public.school_courses.legacy_course_name is 'Original course name from CSV for audit trail';
comment on column public.school_courses.school_year is 'Academic year: 2013-14, 2014-15, etc.';
