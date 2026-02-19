-- ============================================================================
-- Migration: 002_create_profile_reference_tables
-- Description: Reference tables for staff profiles
-- Depends on: 001_create_reference_tables
-- ============================================================================

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

create table public.departments (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.departments (code, label, sort_order) values
  ('admin', 'Admin', 0),
  ('consultant', 'Consultant', 1),
  ('general', 'General', 2);

-- ============================================================================
-- ADMIN LEVELS (Permission tiers)
-- ============================================================================

create table public.admin_levels (
  id serial primary key,
  level int unique not null,
  label text not null,
  description text,
  sort_order int default 0
);

insert into public.admin_levels (level, label, description, sort_order) values
  (0, 'Super Admin', 'Full system access', 0),
  (3, 'Manager', 'Department management', 1),
  (4, 'Senior Staff', 'Extended permissions', 2),
  (6, 'Staff', 'Standard permissions', 3),
  (7, 'Junior Staff', 'Limited permissions', 4),
  (8, 'Basic', 'Read-only access', 5);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index departments_code_idx on public.departments(code);
create index admin_levels_level_idx on public.admin_levels(level);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.departments enable row level security;
alter table public.admin_levels enable row level security;

create policy "departments_select" on public.departments 
  for select to authenticated using (true);
create policy "admin_levels_select" on public.admin_levels 
  for select to authenticated using (true);
