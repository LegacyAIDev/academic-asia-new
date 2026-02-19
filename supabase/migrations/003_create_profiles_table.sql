-- ============================================================================
-- Migration: 003_create_profiles_table
-- Description: User profiles extending auth.users
-- Depends on: 002_create_profile_reference_tables
-- NOTE: Must be created BEFORE students, schools, events that reference it
-- ============================================================================

create table public.profiles (
  -- Primary key (same as auth.users.id for 1:1 relationship)
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- Legacy ID (for migration - preserves "AA00119" references)
  legacy_id text unique,
  
  -- Personal Information
  surname text,
  first_name text,
  
  -- Contact Information
  email_1 text,
  email_2 text,
  telephone text,
  mobile text,
  fax text,
  
  -- Role & Permissions
  department_id int references public.departments(id),
  admin_level int references public.admin_levels(level),
  position text,
  
  -- Employment
  join_date date,
  
  -- Case Metrics (from legacy system)
  yearly_case_count int default 0,
  weekly_case_count int default 0,
  daily_case_count int default 0,
  
  -- Notes
  remarks text,
  
  -- Audit fields
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index profiles_legacy_id_idx on public.profiles(legacy_id);
create index profiles_department_id_idx on public.profiles(department_id);
create index profiles_admin_level_idx on public.profiles(admin_level);
create index profiles_surname_idx on public.profiles(surname);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;

create policy "profiles_select_policy"
  on public.profiles for select to authenticated using (true);

create policy "profiles_update_own_policy"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_insert_policy"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email_1)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
