-- ============================================================================
-- Migration: 030_create_student_predeparture_table
-- Description: Pre-departure briefing records (event attendance, flight info, guardians)
-- Depends on: 006_create_students_table, 005_create_schools_table,
--             010_create_events_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- STUDENT PREDEPARTURE TABLE
-- ============================================================================

create table public.student_predeparture (
                                             id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                             student_id uuid not null references public.students(id) on delete cascade,
                                             school_id uuid references public.schools(id) on delete set null,
                                             event_id uuid references public.events(id) on delete set null,

    -- Contact
                                             email text,

    -- Seating
                                             seats_requested int default 0,
                                             seats_assigned int default 0,

    -- Pickup providers (boolean flags, same as travel module)
                                             whg boolean default false,           -- WHG guardian service
                                             quest boolean default false,         -- Quest guardian service

    -- Guardians & contacts
                                             relatives text,                      -- Guardian/relative details
                                             others text,                         -- Other pickup/guardian info

    -- Appointment
                                             appointment_date date,
                                             appointment_time text,               -- "Morning" / "Afternoon"

    -- Flight details
                                             flight_number text,
                                             airline text,                        -- Free-text (not normalized - too varied)
                                             arrival_airport text,                -- Free-text (not normalized - too varied)
                                             arrival_date text,                   -- Free-text (multiple formats: "31AUG2014 12:15", "1/9/2014")
                                             terminal text,                       -- "Terminal 3", "5", etc.

    -- Remarks
                                             remarks text,

    -- Legacy tracking
                                             legacy_student_code text,
                                             legacy_event_name text,              -- Original event name from CSV
                                             legacy_school_name text,             -- Original school name from CSV

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

create index student_predeparture_student_id_idx on public.student_predeparture(student_id);
create index student_predeparture_school_id_idx on public.student_predeparture(school_id);
create index student_predeparture_event_id_idx on public.student_predeparture(event_id);
create index student_predeparture_assigned_to_idx on public.student_predeparture(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.student_predeparture enable row level security;

create policy "student_predeparture_select" on public.student_predeparture
    for select to authenticated using (true);
create policy "student_predeparture_insert" on public.student_predeparture
    for insert to authenticated with check (true);
create policy "student_predeparture_update" on public.student_predeparture
    for update to authenticated using (true) with check (true);
create policy "student_predeparture_delete" on public.student_predeparture
    for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_predeparture_updated_at
    before update on public.student_predeparture
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.student_predeparture is 'Pre-departure briefing records - event attendance, flight info, guardian details';
comment on column public.student_predeparture.whg is 'WHG guardian service provider flag';
comment on column public.student_predeparture.quest is 'Quest guardian service provider flag';
comment on column public.student_predeparture.relatives is 'Guardian/relative contact details for UK-side support';
comment on column public.student_predeparture.others is 'Other guardian/pickup contact info';
comment on column public.student_predeparture.arrival_date is 'Free-text arrival date (multiple formats from legacy data)';