-- ============================================================================
-- Migration: 010_create_events_table
-- Description: Unified events table (consolidates Event, Expo, TopSchools, Interview, MusicAudition)
-- Depends on: 009_create_event_reference_tables
-- ============================================================================

create table public.events (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Legacy ID and type tracking
  legacy_id int,
  legacy_table text,  -- 'event', 'expo', 'topschool', 'indinterview', 'musicaudition'
  
  -- Event type (FK)
  event_type_id int not null references public.event_types(id),
  
  -- Basic Information
  name text not null,
  
  -- Date & Time
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  duration_minutes int,
  
  -- Location
  location text,
  
  -- Notes
  remarks text,
  
  -- Staff assignment (UUID reference to profiles)
  assigned_to uuid references public.profiles(id),
  
  -- Audit fields
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  
  -- Legacy timestamp
  legacy_last_update timestamptz,
  
  -- Unique constraint: prevent duplicate legacy imports
  unique (legacy_table, legacy_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookups
create index events_legacy_id_idx on public.events(legacy_id);
create index events_legacy_table_idx on public.events(legacy_table);

-- Event type filtering (most common query pattern)
create index events_event_type_id_idx on public.events(event_type_id);

-- Date-based queries
create index events_start_date_idx on public.events(start_date);
create index events_end_date_idx on public.events(end_date);

-- Combined: type + date (for "upcoming expos", "past interviews", etc.)
create index events_type_date_idx on public.events(event_type_id, start_date);

-- Staff assignment
create index events_assigned_to_idx on public.events(assigned_to);

-- Name search
create index events_name_idx on public.events(name);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.events enable row level security;

-- All authenticated users can view events
create policy "events_select_policy"
  on public.events
  for select
  to authenticated
  using (true);

-- Authenticated users can create events
create policy "events_insert_policy"
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

-- Users can update events they created
create policy "events_update_policy"
  on public.events
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

-- Users can delete events they created
create policy "events_delete_policy"
  on public.events
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger events_updated_at
  before update on public.events
  for each row
  execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.events is 'Unified events table - consolidates all event types';
comment on column public.events.legacy_id is 'Original ID from legacy table';
comment on column public.events.legacy_table is 'Source table: event, expo, topschool, indinterview, musicaudition';
comment on column public.events.event_type_id is 'FK to event_types';
comment on column public.events.duration_minutes is 'Default slot duration in minutes';
comment on column public.events.assigned_to is 'Staff member assigned (FK to profiles)';
