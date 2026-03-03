-- ============================================================================
-- Migration: 015_create_student_applications_table
-- Description: Student school applications (main applications table)
-- Depends on: 006_create_students_table, 005_create_schools_table,
--             001_create_reference_tables (courses), 010_create_events_table,
--             014_create_application_reference_tables
-- ============================================================================

create table public.student_applications (
                                             id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                             student_id uuid not null references public.students(id) on delete cascade,
                                             school_id uuid not null references public.schools(id) on delete cascade,

    -- Course reference (optional - uses existing courses table)
                                             course_id int references public.courses(id),
                                             course_detail text,                -- Additional course info

    -- Entry timing
                                             entry_year text,                   -- "201009" format (YYYYMM)
                                             entry_month int,                   -- Extracted month (9 = September)
                                             entry_year_value int,              -- Extracted year (2010)
                                             course_start_month int,            -- C.S.D. month from UI
                                             course_start_year int,             -- C.S.D. year from UI

    -- Application status
                                             status_id int references public.application_statuses(id),
                                             sub_status_id int references public.application_sub_statuses(id),
                                             mode_id int references public.application_modes(id) default 1,  -- Default: Normal

    -- Referral
                                             is_referral boolean default false,

    -- Scholarship
                                             scholarship_amount decimal(10,2) default 0,
                                             scholarship_detail text,

    -- Event link (optional)
                                             event_id uuid references public.events(id),
                                             event_date date,
                                             event_time text,
                                             music_audition text,

    -- Remarks
                                             aa_remarks text,                   -- Internal AA remarks/logs
                                             result_remarks text,               -- Result remarks
                                             remarks_to_school text,            -- Remarks sent to school

    -- Registration
                                             registration_date date,

    -- Legacy tracking
                                             legacy_student_code text,
                                             legacy_school_id int,
                                             legacy_course text,
                                             legacy_event_name text,
                                             legacy_status text,
                                             legacy_sub_status text,
                                             is_archived boolean default false,  -- true for history records

    -- Assignment
                                             assigned_to uuid references public.profiles(id),

    -- Audit
                                             created_at timestamptz default now(),
                                             updated_at timestamptz default now(),
                                             legacy_last_update timestamptz
);

-- ============================================================================
-- STUDENT APPLICATION DEPOSITS
-- ============================================================================

create table public.student_application_deposits (
                                                     id uuid primary key default gen_random_uuid(),

    -- Link to application
                                                     application_id uuid not null references public.student_applications(id) on delete cascade,

    -- Deposit details
                                                     deposit_date date,
                                                     amount decimal(10,2),
                                                     discount decimal(10,2),
                                                     has_commission boolean default false,
                                                     remarks text,

    -- Legacy tracking
                                                     legacy_student_code text,
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

-- Student applications
create index student_applications_student_id_idx on public.student_applications(student_id);
create index student_applications_school_id_idx on public.student_applications(school_id);
create index student_applications_status_id_idx on public.student_applications(status_id);
create index student_applications_event_id_idx on public.student_applications(event_id);
create index student_applications_course_id_idx on public.student_applications(course_id);
create index student_applications_entry_year_idx on public.student_applications(entry_year);
create index student_applications_assigned_to_idx on public.student_applications(assigned_to);
create index student_applications_is_archived_idx on public.student_applications(is_archived);
create index student_applications_registration_date_idx on public.student_applications(registration_date);

-- Composite indexes for common queries
create index student_applications_student_school_idx on public.student_applications(student_id, school_id);
create index student_applications_student_archived_idx on public.student_applications(student_id, is_archived);

-- Deposits
create index student_app_deposits_application_id_idx on public.student_application_deposits(application_id);
create index student_app_deposits_deposit_date_idx on public.student_application_deposits(deposit_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.student_applications enable row level security;
alter table public.student_application_deposits enable row level security;

-- Applications policies
create policy "student_applications_select" on public.student_applications
  for select to authenticated using (true);
create policy "student_applications_insert" on public.student_applications
  for insert to authenticated with check (true);
create policy "student_applications_update" on public.student_applications
  for update to authenticated using (true) with check (true);
create policy "student_applications_delete" on public.student_applications
  for delete to authenticated using (true);

-- Deposits policies
create policy "student_app_deposits_select" on public.student_application_deposits
  for select to authenticated using (true);
create policy "student_app_deposits_insert" on public.student_application_deposits
  for insert to authenticated with check (true);
create policy "student_app_deposits_update" on public.student_application_deposits
  for update to authenticated using (true) with check (true);
create policy "student_app_deposits_delete" on public.student_application_deposits
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_applications_updated_at
    before update on public.student_applications
    for each row execute function public.handle_updated_at();

create trigger student_app_deposits_updated_at
    before update on public.student_application_deposits
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.student_applications is 'Student school applications - tracks application status through enrollment process';
comment on column public.student_applications.entry_year is 'Original entry year in YYYYMM format (e.g., 201009 = September 2010)';
comment on column public.student_applications.is_archived is 'true for historical/archived applications';
comment on table public.student_application_deposits is 'Deposit payments for student applications';