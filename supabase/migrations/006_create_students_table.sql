-- ============================================================================
-- Migration: 006_create_students_table
-- Description: Students table with integer FKs to reference tables
-- Depends on: 001_create_reference_tables, 003_create_profiles_table
-- ============================================================================

create table public.students (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Legacy IDs (for migration from old system)
  student_code text unique,
  temp_id text,
  
  -- Personal Information
  surname text not null,
  first_name text not null,
  chinese_name text,
  gender text check (gender in ('M', 'F')),
  date_of_birth date,
  nationality_id int references public.nationalities(id),
  
  -- Passport
  passport_type text,
  passport_number text,
  passport_copy_url text,
  photo_url text,
  
  -- Contact Information
  address_line_1 text,
  address_line_2 text,
  chinese_address text,
  chinese_address_1 text,
  chinese_address_2 text,
  telephone text,
  mobile text,
  fax text,
  email text,
  
  -- Enrollment Information
  enrollment_date date,
  course_id int references public.courses(id),
  entry_year text,
  sixth_form text,
  
  -- Current School
  present_school text,
  present_school_type_id int references public.school_types(id),
  
  -- Lead/Source tracking
  lead_source_id int references public.lead_sources(id),
  lead_source_2 text,
  lead_source_3 text,
  lead_source_4 text,
  lead_source_5 text,
  
  -- Status & Placement
  status_id int references public.student_statuses(id),
  placement_id int references public.placement_statuses(id),
  
  -- Exam Papers
  exam_paper text,
  
  -- Notes & Remarks
  remarks text,
  placement_remarks text,
  education_remarks text,
  
  -- Preferences
  aa_news boolean default false,
  airport_pickup boolean default false,
  
  -- Staff assignment (UUID reference to profiles)
  assigned_to uuid references public.profiles(id),
  
  -- System fields (legacy)
  login_name text,
  
  -- Audit fields
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  
  -- Legacy timestamp
  legacy_last_update timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index students_student_code_idx on public.students(student_code);
create index students_email_idx on public.students(email);
create index students_status_id_idx on public.students(status_id);
create index students_placement_id_idx on public.students(placement_id);
create index students_lead_source_id_idx on public.students(lead_source_id);
create index students_course_id_idx on public.students(course_id);
create index students_nationality_id_idx on public.students(nationality_id);
create index students_present_school_type_id_idx on public.students(present_school_type_id);
create index students_entry_year_idx on public.students(entry_year);
create index students_surname_idx on public.students(surname);
create index students_first_name_idx on public.students(first_name);
create index students_assigned_to_idx on public.students(assigned_to);
create index students_created_by_idx on public.students(created_by);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.students enable row level security;

create policy "students_select_policy" on public.students
  for select to authenticated using (true);
create policy "students_insert_policy" on public.students
  for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "students_update_policy" on public.students
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);
create policy "students_delete_policy" on public.students
  for delete to authenticated
  using ((select auth.uid()) = created_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger students_updated_at
  before update on public.students
  for each row
  execute function public.handle_updated_at();
