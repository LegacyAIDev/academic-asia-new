-- ============================================================================
-- Migration: 003_create_schools_table
-- Description: Create schools table with RLS
-- ============================================================================

-- Schools table
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  country text,
  city text,
  address text,
  website text,
  notes text,
  status text references public.status_types(id) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Indexes
create index schools_status_idx on public.schools(status);
create index schools_country_idx on public.schools(country);
create index schools_type_idx on public.schools(type);

-- Enable RLS
alter table public.schools enable row level security;

-- RLS Policies
create policy "Authenticated users can view schools"
  on public.schools
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create schools"
  on public.schools
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Users can update own schools"
  on public.schools
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Users can delete own schools"
  on public.schools
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

-- Trigger for updated_at
create trigger schools_updated_at
  before update on public.schools
  for each row
  execute function public.handle_updated_at();

comment on table public.schools is 'Partner schools for student applications';
