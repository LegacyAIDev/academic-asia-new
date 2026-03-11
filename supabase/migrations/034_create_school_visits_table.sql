-- ============================================================================
-- Migration: 034_create_school_visits_table
-- Description: Consultant visits to schools (site visits, school tours by AA staff)
-- Depends on: 005_create_schools_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- SCHOOL VISITS TABLE
-- ============================================================================

create table public.school_visits (
                                      id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                      school_id uuid not null references public.schools(id) on delete cascade,

    -- Visit details
                                      visit_date date,

    -- School contact & visit log
                                      school_contact text,                 -- Contact person at the school for this visit
                                      visit_log text,                      -- Visit activity log

    -- Result (currently unused in legacy data, reserved for future)
                                      result text,

    -- Remarks (often contains detailed school notes from the visit)
                                      remarks text,

    -- Legacy tracking
                                      legacy_school_id int,

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

create index school_visits_school_id_idx on public.school_visits(school_id);
create index school_visits_visit_date_idx on public.school_visits(visit_date);
create index school_visits_assigned_to_idx on public.school_visits(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.school_visits enable row level security;

create policy "school_visits_select" on public.school_visits
    for select to authenticated using (true);
create policy "school_visits_insert" on public.school_visits
    for insert to authenticated with check (true);
create policy "school_visits_update" on public.school_visits
    for update to authenticated using (true) with check (true);
create policy "school_visits_delete" on public.school_visits
    for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_visits_updated_at
    before update on public.school_visits
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.school_visits is 'Consultant visits to schools - site visits, tours, meetings with school staff';
comment on column public.school_visits.remarks is 'Detailed school visit notes (can be very long with observations, facilities info, etc.)';
comment on column public.school_visits.school_contact is 'School contact person met during the visit';