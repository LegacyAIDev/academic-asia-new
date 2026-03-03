-- ============================================================================
-- Migration: 023_create_school_academic_results_table
-- Description: School academic performance (league table data)
-- Depends on: 005_create_schools_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- ACADEMIC EXAM TYPE REFERENCE TABLE
-- ============================================================================

create table public.academic_exam_types (
                                            id serial primary key,
                                            code text unique not null,
                                            label text not null,
                                            country text default 'UK',           -- UK, Scotland, International
                                            sort_order int default 0,
                                            is_active boolean default true
);

insert into public.academic_exam_types (code, label, country, sort_order) values
                                                                              -- UK qualifications
                                                                              ('a_level', 'A Level', 'UK', 1),
                                                                              ('gcse', 'GCSE', 'UK', 2),
                                                                              ('igcse', 'IGCSE', 'UK', 3),
                                                                              ('pre_u', 'Pre - U', 'UK', 4),
                                                                              ('btec', 'BTEC', 'UK', 5),
                                                                              -- International
                                                                              ('ib', 'IB', 'International', 10),
                                                                              -- Scottish qualifications
                                                                              ('higher', 'Higher', 'Scotland', 20),
                                                                              ('advanced_higher', 'Advanced Higher', 'Scotland', 21),
                                                                              ('national_5', 'National 5', 'Scotland', 22),
                                                                              ('s5_higher', 'S5 Higher', 'Scotland', 23),
                                                                              ('s6_higher', 'S6 Higher', 'Scotland', 24);

-- ============================================================================
-- SCHOOL ACADEMIC RESULTS TABLE
-- ============================================================================

create table public.school_academic_results (
                                                id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                                school_id uuid not null references public.schools(id) on delete cascade,

    -- Exam details
                                                exam_year int,                       -- Year (2023, 2024, etc.)
                                                exam_type_id int references public.academic_exam_types(id),

    -- Grade and results
                                                grade_range text,                    -- Grade range (e.g., "A* - A", "9 - 7")
                                                result_percentage decimal(5,2),      -- Percentage of students achieving grade

    -- Remarks
                                                remarks text,

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

create index academic_exam_types_code_idx on public.academic_exam_types(code);
create index academic_exam_types_country_idx on public.academic_exam_types(country);

create index school_academic_results_school_id_idx on public.school_academic_results(school_id);
create index school_academic_results_exam_type_id_idx on public.school_academic_results(exam_type_id);
create index school_academic_results_exam_year_idx on public.school_academic_results(exam_year);
create index school_academic_results_assigned_to_idx on public.school_academic_results(assigned_to);

-- Composite for common queries
create index school_academic_results_school_year_idx on public.school_academic_results(school_id, exam_year);
create index school_academic_results_school_type_idx on public.school_academic_results(school_id, exam_type_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.academic_exam_types enable row level security;
alter table public.school_academic_results enable row level security;

create policy "academic_exam_types_select" on public.academic_exam_types
  for select to authenticated using (true);

create policy "school_academic_results_select" on public.school_academic_results
  for select to authenticated using (true);
create policy "school_academic_results_insert" on public.school_academic_results
  for insert to authenticated with check (true);
create policy "school_academic_results_update" on public.school_academic_results
  for update to authenticated using (true) with check (true);
create policy "school_academic_results_delete" on public.school_academic_results
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_academic_results_updated_at
    before update on public.school_academic_results
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.academic_exam_types is 'Academic exam types: A Level, GCSE, IB, Scottish Highers, etc.';
comment on table public.school_academic_results is 'School academic performance - league table data showing % of students achieving grades';
comment on column public.school_academic_results.grade_range is 'Grade range (e.g., A* - A, A* - B, 9 - 7)';
comment on column public.school_academic_results.result_percentage is 'Percentage of students achieving the grade range';