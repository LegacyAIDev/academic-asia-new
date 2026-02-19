-- ============================================================================
-- Migration: 009_create_event_reference_tables
-- Description: Reference tables for events module
-- Depends on: 001_create_reference_tables
-- ============================================================================

-- ============================================================================
-- EVENT TYPES
-- ============================================================================

create table public.event_types (
  id serial primary key,
  code text unique not null,
  label text not null,
  description text,
  color text,
  sort_order int default 0
);

insert into public.event_types (code, label, description, color, sort_order) values
  ('event', 'General Event', 'Seminars, workshops, and general events', 'blue', 0),
  ('expo', 'Education Expo', 'Large-scale education exhibitions', 'purple', 1),
  ('top_schools', 'Top Schools Weekend', 'Top Schools interview weekends', 'green', 2),
  ('interview', 'Individual Interview', 'One-on-one school interviews', 'orange', 3),
  ('music_audition', 'Music Audition', 'Music scholarship auditions', 'pink', 4);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index event_types_code_idx on public.event_types(code);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.event_types enable row level security;

create policy "event_types_select" on public.event_types 
  for select to authenticated using (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.event_types is 'Event type categories';
