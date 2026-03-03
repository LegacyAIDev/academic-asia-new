-- ============================================================================
-- Migration: 022_create_school_entrance_exams_table
-- Description: School entrance exam requirements (papers needed for entry)
-- Depends on: 005_create_schools_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- ENTRANCE EXAM TYPE REFERENCE TABLE
-- ============================================================================

create table public.entrance_exam_types (
                                            id serial primary key,
                                            code text unique not null,
                                            label text not null,
                                            sort_order int default 0,
                                            is_active boolean default true
);

insert into public.entrance_exam_types (code, label, sort_order) values
                                                                     ('entrance_sep', 'Entrance Sep', 1),
                                                                     ('entrance_jan', 'Entrance Jan', 2),
                                                                     ('entrance_apr', 'Entrance Apr', 3),
                                                                     ('pre_test', 'Pre-Test', 4),
                                                                     ('scholarship', 'Scholarship', 5),
                                                                     ('assessment_day', 'Assessment Day', 6),
                                                                     ('setting', 'Setting', 7),
                                                                     ('sample', 'Sample', 8),
                                                                     ('summer', 'Summer', 9),
                                                                     ('pre_ib_course', 'Pre-IB Course', 10);

-- ============================================================================
-- SCHOOL ENTRANCE EXAMS TABLE
-- ============================================================================

create table public.school_entrance_exams (
                                              id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                              school_id uuid not null references public.schools(id) on delete cascade,

    -- Entry details
                                              entry_year text,                     -- Academic year (e.g., "2024-25")
                                              exam_type_id int references public.entrance_exam_types(id),

    -- Exam paper details
                                              year_level text,                     -- Year level (e.g., "Year 12", "Year 9")
                                              subject text,                        -- Subject (Mathematics, English, etc.)
                                              duration_minutes int default 0,      -- Exam duration in minutes

    -- Exam format/instructions
                                              exam_format text,                    -- Instructions (calculator allowed, etc.)

    -- Files
                                              files text,                          -- Exam paper files

    -- AA has paper?
                                              has_paper boolean default false,     -- "case" field Y/N

    -- Remarks
                                              remarks text,                        -- General remarks
                                              aa_remarks text,                     -- AA internal remarks

    -- Legacy tracking
                                              legacy_school_id int,
                                              legacy_exam_type text,

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

create index entrance_exam_types_code_idx on public.entrance_exam_types(code);

create index school_entrance_exams_school_id_idx on public.school_entrance_exams(school_id);
create index school_entrance_exams_exam_type_id_idx on public.school_entrance_exams(exam_type_id);
create index school_entrance_exams_entry_year_idx on public.school_entrance_exams(entry_year);
create index school_entrance_exams_year_level_idx on public.school_entrance_exams(year_level);
create index school_entrance_exams_subject_idx on public.school_entrance_exams(subject);
create index school_entrance_exams_assigned_to_idx on public.school_entrance_exams(assigned_to);

-- Composite for common queries
create index school_entrance_exams_school_year_idx on public.school_entrance_exams(school_id, entry_year);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.entrance_exam_types enable row level security;
alter table public.school_entrance_exams enable row level security;

create policy "entrance_exam_types_select" on public.entrance_exam_types
  for select to authenticated using (true);

create policy "school_entrance_exams_select" on public.school_entrance_exams
  for select to authenticated using (true);
create policy "school_entrance_exams_insert" on public.school_entrance_exams
  for insert to authenticated with check (true);
create policy "school_entrance_exams_update" on public.school_entrance_exams
  for update to authenticated using (true) with check (true);
create policy "school_entrance_exams_delete" on public.school_entrance_exams
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_entrance_exams_updated_at
    before update on public.school_entrance_exams
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.entrance_exam_types is 'Entrance exam type: Entrance Sep/Jan/Apr, Pre-Test, Scholarship, etc.';
comment on table public.school_entrance_exams is 'School entrance exam requirements by year level and subject';
comment on column public.school_entrance_exams.year_level is 'Year level for the exam paper (e.g., Year 12, Year 9)';
comment on column public.school_entrance_exams.subject is 'Exam subject (Mathematics, English, Chemistry, etc.)';
comment on column public.school_entrance_exams.has_paper is 'Whether AA has the exam paper on file';