-- ============================================================================
-- Migration: 028_create_student_visits_table
-- Description: Student school visit records (scheduled visits, tours, open days)
-- Depends on: 006_create_students_table, 005_create_schools_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- VISIT RESULT STATUSES REFERENCE TABLE
-- ============================================================================

create table public.visit_result_statuses (
                                              id serial primary key,
                                              code text unique not null,
                                              label text not null,
                                              sort_order int default 0,
                                              is_active boolean default true
);

insert into public.visit_result_statuses (code, label, sort_order) values
                                                                       ('confirmed', 'Confirmed', 1),
                                                                       ('pending_parent', 'Pending (P)', 2),
                                                                       ('pending_school', 'Pending (S)', 3),
                                                                       ('pending', 'Pending', 4),
                                                                       ('cancelled', 'Cancelled', 5),
                                                                       ('unavailable', 'Unavailable', 6),
                                                                       ('tnfa', 'TNFA', 7);

-- ============================================================================
-- STUDENT VISITS TABLE
-- ============================================================================

create table public.student_visits (
                                       id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                       student_id uuid not null references public.students(id) on delete cascade,
                                       school_id uuid references public.schools(id) on delete set null,

    -- Visit details
                                       visit_date date,
                                       visit_time text,                     -- Free-text (various formats: "9:15am", "0930", "10.30a.m.")
                                       half_term_holiday text,              -- Holiday/exeat period info

    -- Result
                                       result_status_id int references public.visit_result_statuses(id),

    -- School contact & visit log
                                       school_contact text,
                                       visit_log text,

    -- Remarks
                                       remarks text,

    -- Legacy tracking
                                       legacy_student_code text,
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

create index visit_result_statuses_code_idx on public.visit_result_statuses(code);

create index student_visits_student_id_idx on public.student_visits(student_id);
create index student_visits_school_id_idx on public.student_visits(school_id);
create index student_visits_visit_date_idx on public.student_visits(visit_date);
create index student_visits_result_status_id_idx on public.student_visits(result_status_id);
create index student_visits_assigned_to_idx on public.student_visits(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.visit_result_statuses enable row level security;
alter table public.student_visits enable row level security;

create policy "visit_result_statuses_select" on public.visit_result_statuses
    for select to authenticated using (true);

create policy "student_visits_select" on public.student_visits
    for select to authenticated using (true);
create policy "student_visits_insert" on public.student_visits
    for insert to authenticated with check (true);
create policy "student_visits_update" on public.student_visits
    for update to authenticated using (true) with check (true);
create policy "student_visits_delete" on public.student_visits
    for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_visits_updated_at
    before update on public.student_visits
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.visit_result_statuses is 'Reference table for school visit result statuses';
comment on table public.student_visits is 'Student school visit records - scheduled tours, open days, interviews';
comment on column public.student_visits.visit_time is 'Free-text visit time (various formats from legacy data)';
comment on column public.student_visits.half_term_holiday is 'Half-term/exeat period info relevant to the visit';
comment on column public.student_visits.school_contact is 'School contact person for the visit';
comment on column public.student_visits.visit_log is 'Visit activity log/notes';