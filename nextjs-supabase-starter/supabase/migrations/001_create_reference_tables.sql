-- ============================================================================
-- Migration: 001_create_reference_tables
-- Description: Create shared status reference table (avoid enums for flexibility)
-- ============================================================================

-- Status types reference table
-- Using reference tables instead of PostgreSQL ENUMs because:
-- 1. ENUMs require migrations to modify (can't add/remove values easily)
-- 2. ENUMs prevent zero-downtime deployments when modified
-- 3. Reference tables allow business users to manage values without dev help
create table public.status_types (
  id text primary key,
  label text not null,
  description text,
  color text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed common statuses
insert into public.status_types (id, label, color, sort_order) values
  ('draft', 'Draft', 'gray', 0),
  ('pending', 'Pending', 'yellow', 1),
  ('active', 'Active', 'green', 2),
  ('completed', 'Completed', 'blue', 3),
  ('cancelled', 'Cancelled', 'red', 4),
  ('applied', 'Applied', 'blue', 10),
  ('interviewed', 'Interviewed', 'purple', 11),
  ('accepted', 'Accepted', 'green', 12),
  ('rejected', 'Rejected', 'red', 13),
  ('enrolled', 'Enrolled', 'emerald', 14);

-- Enable RLS
alter table public.status_types enable row level security;

-- Everyone can read status types (reference data)
create policy "Status types are viewable by everyone"
  on public.status_types
  for select
  to authenticated
  using (true);

-- Comment for documentation
comment on table public.status_types is 'Shared status values for all entities. Modify label/color without migrations.';
