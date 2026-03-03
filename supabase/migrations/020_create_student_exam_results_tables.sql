-- ============================================================================
-- Migration: 020_create_student_exam_results_tables
-- Description: Student exam/test results (AA Tests, Individual Exams, School Exams)
-- Depends on: 006_create_students_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- EXAM TYPE REFERENCE TABLE (Test / Exam dropdown)
-- ============================================================================

create table public.exam_types (
                                   id serial primary key,
                                   code text unique not null,
                                   label text not null,
                                   sort_order int default 0,
                                   is_active boolean default true
);

insert into public.exam_types (code, label, sort_order) values
                                                            ('aa_test', 'AA Test', 1),
                                                            ('individual_exam', 'Individual Exam', 2),
                                                            ('school_exam', 'School Exam', 3);

-- ============================================================================
-- EXAM SUBJECT REFERENCE TABLE
-- ============================================================================

create table public.exam_subjects (
                                      id serial primary key,
                                      code text unique not null,
                                      label text not null,
                                      exam_type_code text,              -- Which exam type this subject belongs to (null = all)
                                      sort_order int default 0,
                                      is_active boolean default true
);

insert into public.exam_subjects (code, label, exam_type_code, sort_order) values
                                                                               -- AA Test subjects
                                                                               ('eng', 'Eng', 'aa_test', 1),
                                                                               ('maths', 'Maths', 'aa_test', 2),
                                                                               ('piano', 'Piano', 'aa_test', 3),
                                                                               -- Individual Exam subjects
                                                                               ('english', 'English', 'individual_exam', 10),
                                                                               -- School Exam subjects
                                                                               ('a_level', 'A Level', 'school_exam', 20),
                                                                               ('gcse', 'GCSE', 'school_exam', 21),
                                                                               ('ib', 'IB', 'school_exam', 22),
                                                                               ('pre_u', 'Pre - U', 'school_exam', 23);

-- ============================================================================
-- EXAM PAPER REFERENCE TABLE (Year level of the paper)
-- ============================================================================

create table public.exam_papers (
                                    id serial primary key,
                                    code text unique not null,
                                    label text not null,
                                    sort_order int default 0,
                                    is_active boolean default true
);

insert into public.exam_papers (code, label, sort_order) values
                                                             ('year_5', 'Year 5', 5),
                                                             ('year_6', 'Year 6', 6),
                                                             ('year_7', 'Year 7', 7),
                                                             ('year_8', 'Year 8', 8),
                                                             ('year_9', 'Year 9', 9),
                                                             ('year_10', 'Year 10', 10),
                                                             ('year_11', 'Year 11', 11),
                                                             ('year_12', 'Year 12', 12),
                                                             ('year_13', 'Year 13', 13),
                                                             ('foundation', 'Foundation', 20),
                                                             ('pre_al', 'Pre-AL', 21),
                                                             ('english_course', 'English Course', 22),
                                                             ('no_paper', 'No Paper', 99);

-- ============================================================================
-- EXAM RESULT STATUS REFERENCE TABLE
-- ============================================================================

create table public.exam_result_statuses (
                                             id serial primary key,
                                             code text unique not null,
                                             label text not null,
                                             sort_order int default 0
);

insert into public.exam_result_statuses (code, label, sort_order) values
                                                                      ('normal', 'Normal', 1),
                                                                      ('suspended', 'Suspended', 2),
                                                                      ('cancelled', 'Cancelled', 3);

-- ============================================================================
-- STUDENT EXAM RESULTS TABLE
-- ============================================================================

create table public.student_exam_results (
                                             id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                             student_id uuid not null references public.students(id) on delete cascade,
                                             school_id uuid references public.schools(id),    -- Optional school reference

    -- Exam details
                                             test_date date,                                  -- AA Test Date
                                             exam_type_id int references public.exam_types(id),
                                             subject_id int references public.exam_subjects(id),
                                             paper_id int references public.exam_papers(id),  -- Exam Paper (Year level)

    -- Paper ready
                                             paper_ready boolean default false,

    -- Results
                                             score decimal(10,2),                             -- Results (actual score)
                                             max_score decimal(10,2) default 100,             -- Max. Score

    -- Status
                                             status_id int references public.exam_result_statuses(id) default 1,

    -- Remarks
                                             remarks text,

    -- Legacy tracking
                                             legacy_student_code text,
                                             legacy_exam text,                                -- Original combined exam value (e.g., "AA Test Maths")
                                             legacy_course text,                              -- Original course/paper value

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

create index exam_types_code_idx on public.exam_types(code);
create index exam_subjects_code_idx on public.exam_subjects(code);
create index exam_subjects_exam_type_idx on public.exam_subjects(exam_type_code);
create index exam_papers_code_idx on public.exam_papers(code);
create index exam_result_statuses_code_idx on public.exam_result_statuses(code);

create index student_exam_results_student_id_idx on public.student_exam_results(student_id);
create index student_exam_results_school_id_idx on public.student_exam_results(school_id);
create index student_exam_results_test_date_idx on public.student_exam_results(test_date);
create index student_exam_results_exam_type_id_idx on public.student_exam_results(exam_type_id);
create index student_exam_results_subject_id_idx on public.student_exam_results(subject_id);
create index student_exam_results_paper_id_idx on public.student_exam_results(paper_id);
create index student_exam_results_assigned_to_idx on public.student_exam_results(assigned_to);

-- Composite for common queries
create index student_exam_results_student_exam_idx on public.student_exam_results(student_id, exam_type_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.exam_types enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.exam_papers enable row level security;
alter table public.exam_result_statuses enable row level security;
alter table public.student_exam_results enable row level security;

create policy "exam_types_select" on public.exam_types for select to authenticated using (true);
create policy "exam_subjects_select" on public.exam_subjects for select to authenticated using (true);
create policy "exam_papers_select" on public.exam_papers for select to authenticated using (true);
create policy "exam_result_statuses_select" on public.exam_result_statuses for select to authenticated using (true);

create policy "student_exam_results_select" on public.student_exam_results
  for select to authenticated using (true);
create policy "student_exam_results_insert" on public.student_exam_results
  for insert to authenticated with check (true);
create policy "student_exam_results_update" on public.student_exam_results
  for update to authenticated using (true) with check (true);
create policy "student_exam_results_delete" on public.student_exam_results
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_exam_results_updated_at
    before update on public.student_exam_results
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.exam_types is 'Test/Exam type: AA Test, Individual Exam, School Exam';
comment on table public.exam_subjects is 'Exam subjects: Eng, Maths, Piano, English, A Level, GCSE, IB, Pre-U';
comment on table public.exam_papers is 'Exam paper year level: Year 5-13, Foundation, No Paper';
comment on table public.exam_result_statuses is 'Exam result status';
comment on table public.student_exam_results is 'Student exam/test results with scores';