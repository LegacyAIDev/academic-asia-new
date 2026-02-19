-- ============================================================================
-- Migration: 004_create_events_table
-- Description: Create events table with RLS
-- ============================================================================

-- Event types reference table
create table public.event_types (
  id text primary key,
  label text not null,
  description text,
  color text,
  sort_order int default 0,
  is_active boolean default true
);

insert into public.event_types (id, label, color, sort_order) values
  ('top_schools', 'Top Schools', 'blue', 0),
  ('music_auditions', 'Music Auditions', 'purple', 1),
  ('expo', 'Expo', 'green', 2),
  ('pre_departure', 'Pre-Departure', 'orange', 3),
  ('individual_interviews', 'Individual Interviews', 'indigo', 4);

alter table public.event_types enable row level security;

create policy "Event types viewable by authenticated"
  on public.event_types
  for select
  to authenticated
  using (true);

-- Events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text references public.event_types(id) not null,
  start_date date,
  end_date date,
  location text,
  description text,
  status text references public.status_types(id) default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Indexes
create index events_type_idx on public.events(type);
create index events_status_idx on public.events(status);
create index events_start_date_idx on public.events(start_date);

-- Enable RLS
alter table public.events enable row level security;

-- RLS Policies
create policy "Authenticated users can view events"
  on public.events
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create events"
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Users can update own events"
  on public.events
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Users can delete own events"
  on public.events
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

-- Trigger
create trigger events_updated_at
  before update on public.events
  for each row
  execute function public.handle_updated_at();

comment on table public.events is 'Events like Top Schools, Expos, Interviews';
