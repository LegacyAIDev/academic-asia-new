-- ============================================================================
-- Migration: 011_create_event_relation_tables
-- Description: Event relation tables (schools, interviewers, schedules, exams, results)
-- Depends on: 005_create_schools_table, 006_create_students_table, 010_create_events_table
-- ============================================================================

-- ============================================================================
-- EVENT_SCHOOLS (Schools participating in events)
-- Consolidates: Event_School, Expo_School, II_School, MA_School, TS_School
-- ============================================================================

create table public.event_schools (
                                      id uuid primary key default gen_random_uuid(),

    -- Foreign keys
                                      event_id uuid not null references public.events(id) on delete cascade,
                                      school_id uuid not null references public.schools(id) on delete cascade,

    -- Legacy tracking
                                      legacy_event_id int,
                                      legacy_school_id int,
                                      legacy_table text,  -- 'event', 'expo', 'indinterview', 'musicaudition', 'topschool'

    -- Details
                                      remarks text,
                                      event_remarks text,
                                      registration_fee text,
                                      payable_to text,

    -- Music audition specific
                                      is_confirmed boolean default false,
                                      is_school_confirmed boolean default false,
                                      application_deadline date,
                                      application_deadline_remarks text,

    -- Assignment
                                      assigned_to uuid references public.profiles(id),

    -- Audit
                                      created_at timestamptz default now(),
                                      updated_at timestamptz default now(),
                                      legacy_last_update timestamptz,

    -- Prevent duplicates
                                      unique (event_id, school_id)
);

create index event_schools_event_id_idx on public.event_schools(event_id);
create index event_schools_school_id_idx on public.event_schools(school_id);
create index event_schools_assigned_to_idx on public.event_schools(assigned_to);

-- ============================================================================
-- EVENT_REPRESENTATIVES (School representatives at events)
-- Consolidates: Expo_Interviewer, II_Interviewer, MA_Interviewer, TS_Interviewer
-- Renamed from event_interviewers to match Gerald's new structure.
-- ============================================================================

create table public.event_representatives (
                                              id uuid primary key default gen_random_uuid(),

    -- Foreign keys
                                              event_id uuid not null references public.events(id) on delete cascade,
                                              school_id uuid not null references public.schools(id) on delete cascade,

    -- Legacy tracking
                                              legacy_event_id int,
                                              legacy_school_id int,
                                              legacy_table text,

    -- Representative info
                                              name text not null,
                                              role text,                           -- e.g. Interviewer, Admissions Officer
                                              remarks text,

    -- Scheduling availability (per-representative override of event times)
                                              venue_room text,                     -- Specific room/venue for this representative
                                              available_from timestamptz,          -- When this rep starts (may differ from event)
                                              available_to timestamptz,            -- When this rep finishes
                                              slot_length_minutes int,             -- Custom slot length (overrides event default)

    -- Assignment
                                              assigned_to uuid references public.profiles(id),

    -- Audit
                                              created_at timestamptz default now(),
                                              updated_at timestamptz default now(),
                                              legacy_last_update timestamptz
);

create index event_representatives_event_id_idx on public.event_representatives(event_id);
create index event_representatives_school_id_idx on public.event_representatives(school_id);
create index event_representatives_assigned_to_idx on public.event_representatives(assigned_to);

-- ============================================================================
-- EVENT_SCHEDULES (Student appointment slots)
-- Consolidates: Expo_Schedule, II_Schedule, MA_Schedule, TS_Schedule
-- ============================================================================

create table public.event_schedules (
                                        id uuid primary key default gen_random_uuid(),

    -- Foreign keys
                                        event_id uuid not null references public.events(id) on delete cascade,
                                        student_id uuid not null references public.students(id) on delete cascade,
                                        representative_id uuid references public.event_representatives(id) on delete set null,

    -- Legacy tracking
                                        legacy_event_id int,
                                        legacy_student_code text,
                                        legacy_table text,

    -- Schedule details
                                        schedule_date date,
                                        timeslot int,                        -- Legacy: integer slot number
                                        start_time time,                     -- New: actual start time
                                        end_time time,                       -- New: actual end time
                                        interviewer_name text,               -- Legacy: text name (new records use representative_id)
                                        remarks text,

    -- Assignment
                                        assigned_to uuid references public.profiles(id),

    -- Audit
                                        created_at timestamptz default now(),
                                        updated_at timestamptz default now(),
                                        legacy_last_update timestamptz
);

create index event_schedules_event_id_idx on public.event_schedules(event_id);
create index event_schedules_student_id_idx on public.event_schedules(student_id);
create index event_schedules_schedule_date_idx on public.event_schedules(schedule_date);
create index event_schedules_assigned_to_idx on public.event_schedules(assigned_to);
create index event_schedules_representative_id_idx on public.event_schedules(representative_id);

-- ============================================================================
-- EVENT_EXAMS (Entrance exam information)
-- Consolidates: Event_Exam, Expo_Exam, II_Exam, TS_Exam
-- ============================================================================

create table public.event_exams (
                                    id uuid primary key default gen_random_uuid(),

    -- Foreign keys
                                    event_id uuid not null references public.events(id) on delete cascade,
                                    school_id uuid not null references public.schools(id) on delete cascade,

    -- Legacy tracking
                                    legacy_event_id int,
                                    legacy_school_id int,
                                    legacy_table text,

    -- Exam details
                                    apply_year text,
                                    entrance_exam_date date,
                                    is_confirmed boolean default false,
                                    application_deadline date,
                                    remarks text,

    -- Assignment
                                    assigned_to uuid references public.profiles(id),

    -- Audit
                                    created_at timestamptz default now(),
                                    updated_at timestamptz default now(),
                                    legacy_last_update timestamptz
);

create index event_exams_event_id_idx on public.event_exams(event_id);
create index event_exams_school_id_idx on public.event_exams(school_id);
create index event_exams_entrance_exam_date_idx on public.event_exams(entrance_exam_date);
create index event_exams_assigned_to_idx on public.event_exams(assigned_to);

-- ============================================================================
-- EVENT_RESULTS (Student outcomes/offers)
-- From: Event_Result
-- ============================================================================

create table public.event_results (
                                      id uuid primary key default gen_random_uuid(),

    -- Foreign keys
                                      event_id uuid references public.events(id) on delete set null,
                                      student_id uuid not null references public.students(id) on delete cascade,
                                      school_id uuid references public.schools(id) on delete set null,

    -- Legacy tracking
                                      legacy_event_name text,
                                      legacy_student_code text,
                                      legacy_school_id int,

    -- Result details
                                      subject text,
                                      qualification text,

    -- Music specific
                                      piece text,
                                      composer text,

    -- Outcome
                                      score text,
                                      offer text,
                                      priority int,
                                      remarks text,

    -- Assignment
                                      assigned_to uuid references public.profiles(id),

    -- Audit
                                      created_at timestamptz default now(),
                                      updated_at timestamptz default now(),
                                      legacy_last_update timestamptz
);

create index event_results_event_id_idx on public.event_results(event_id);
create index event_results_student_id_idx on public.event_results(student_id);
create index event_results_school_id_idx on public.event_results(school_id);
create index event_results_assigned_to_idx on public.event_results(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.event_schools enable row level security;
alter table public.event_representatives enable row level security;
alter table public.event_schedules enable row level security;
alter table public.event_exams enable row level security;
alter table public.event_results enable row level security;

-- Select policies (all authenticated can read)
create policy "event_schools_select" on public.event_schools
  for select to authenticated using (true);
create policy "event_representatives_select" on public.event_representatives
  for select to authenticated using (true);
create policy "event_schedules_select" on public.event_schedules
  for select to authenticated using (true);
create policy "event_exams_select" on public.event_exams
  for select to authenticated using (true);
create policy "event_results_select" on public.event_results
  for select to authenticated using (true);

-- Insert policies
create policy "event_schools_insert" on public.event_schools
  for insert to authenticated with check (true);
create policy "event_representatives_insert" on public.event_representatives
  for insert to authenticated with check (true);
create policy "event_schedules_insert" on public.event_schedules
  for insert to authenticated with check (true);
create policy "event_exams_insert" on public.event_exams
  for insert to authenticated with check (true);
create policy "event_results_insert" on public.event_results
  for insert to authenticated with check (true);

-- Update policies
create policy "event_schools_update" on public.event_schools
  for update to authenticated using (true) with check (true);
create policy "event_representatives_update" on public.event_representatives
  for update to authenticated using (true) with check (true);
create policy "event_schedules_update" on public.event_schedules
  for update to authenticated using (true) with check (true);
create policy "event_exams_update" on public.event_exams
  for update to authenticated using (true) with check (true);
create policy "event_results_update" on public.event_results
  for update to authenticated using (true) with check (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger event_schools_updated_at before update on public.event_schools
    for each row execute function public.handle_updated_at();
create trigger event_representatives_updated_at before update on public.event_representatives
    for each row execute function public.handle_updated_at();
create trigger event_schedules_updated_at before update on public.event_schedules
    for each row execute function public.handle_updated_at();
create trigger event_exams_updated_at before update on public.event_exams
    for each row execute function public.handle_updated_at();
create trigger event_results_updated_at before update on public.event_results
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.event_schools is 'Schools participating in events (M:M relation)';
comment on table public.event_representatives is 'School representatives at events (interviewers, admissions officers, etc.)';
comment on table public.event_schedules is 'Student appointment slots at events';
comment on table public.event_exams is 'Entrance exam information for events';
comment on table public.event_results is 'Student results/outcomes from events';