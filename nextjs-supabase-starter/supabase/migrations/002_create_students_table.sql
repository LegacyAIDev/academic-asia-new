-- ============================================================================
-- Migration: 002_create_students_table
-- Description: Create students table with proper RLS policies
-- ============================================================================

-- Students table
create table public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text unique,
  first_name text not null,
  surname text not null,
  chinese_name text,
  gender text check (gender in ('M', 'F', 'Other')),
  date_of_birth date,
  nationality text,
  passport_number text,
  email text,
  phone text,
  address text,
  present_school text,
  entry_year text,
  status text references public.status_types(id) default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Create indexes for common queries
create index students_status_idx on public.students(status);
create index students_created_by_idx on public.students(created_by);
create index students_surname_idx on public.students(surname);
create index students_entry_year_idx on public.students(entry_year);

-- Enable RLS
alter table public.students enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Best practices applied:
-- 1. Always specify role with TO (prevents execution for wrong roles)
-- 2. Use (select auth.uid()) instead of auth.uid() for 99%+ performance boost
-- 3. Separate policies for each operation (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================================

-- SELECT: All authenticated users can view all students
-- (In production, you might restrict this based on roles)
create policy "Authenticated users can view students"
  on public.students
  for select
  to authenticated
  using (true);

-- INSERT: Authenticated users can create students (with their user ID)
create policy "Authenticated users can create students"
  on public.students
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

-- UPDATE: Users can update students they created
-- (In production, add role-based access for admins)
create policy "Users can update own students"
  on public.students
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

-- DELETE: Users can delete students they created
create policy "Users can delete own students"
  on public.students
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger students_updated_at
  before update on public.students
  for each row
  execute function public.handle_updated_at();

-- Comments for documentation
comment on table public.students is 'Student profiles and applications';
comment on column public.students.student_code is 'Unique identifier for student (e.g., S045657)';
comment on column public.students.created_by is 'User who created this student record';
