-- ============================================================================
-- Migration: 016_create_student_education_tables
-- Description: Student education/tutoring courses (AA internal programs)
-- Depends on: 006_create_students_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- EDUCATION COURSES (AA's internal tutoring/prep programs)
-- ============================================================================

create table public.education_courses (
                                          id serial primary key,
                                          code text unique not null,
                                          label text not null,
                                          category text,           -- 'prep', 'workshop', 'tutoring', 'camp', 'other'
                                          sort_order int default 0,
                                          is_active boolean default true
);

insert into public.education_courses (code, label, category, sort_order) values
                                                                             -- Interview Preparation
                                                                             ('interview_preparation', 'Interview Preparation', 'prep', 10),
                                                                             ('interview_group_workshop', 'Interview Group Workshop', 'workshop', 11),
                                                                             ('intensive_interview_prep', '2025 Sept Intensive Interview Prep', 'prep', 12),

                                                                             -- Entrance/Exam Preparation
                                                                             ('entrance_exam_preparation', 'Entrance Exam Preparation', 'prep', 20),
                                                                             ('common_entrance_13_preparation', 'Common Entrance 13+ Preparation', 'prep', 21),
                                                                             ('scholarship_exam_preparation', 'Scholarship Exam Preparation', 'prep', 22),
                                                                             ('elite_entrance', 'Elite Entrance', 'prep', 23),

                                                                             -- GCSE Programs
                                                                             ('gcse_preparation', 'GCSE Preparation', 'prep', 30),
                                                                             ('gcse_group_workshop', 'GCSE Group Workshop', 'workshop', 31),
                                                                             ('gcse_easter_group_lessons', 'GCSE Easter Group Lessons', 'workshop', 32),
                                                                             ('gcse_summer_group_lessons', 'GCSE Summer Group Lessons', 'workshop', 33),

                                                                             -- A Level Programs
                                                                             ('a_level_preparation', 'A Level Preparation', 'prep', 40),
                                                                             ('a_level_summer_group_lessons', 'A Level Summer Group Lessons', 'workshop', 41),

                                                                             -- IB Programs
                                                                             ('ib_preparation', 'IB Preparation', 'prep', 50),

                                                                             -- Test Preparation
                                                                             ('aa_test_preparation', 'AA Test Preparation', 'prep', 60),
                                                                             ('cat4_preparation', 'CAT4 Preparation', 'prep', 61),
                                                                             ('iseb_cpt', 'ISEB CPT', 'prep', 62),
                                                                             ('iseb_cpt_preparation', 'ISEB CPT Preparation', 'prep', 63),
                                                                             ('iseb_workshop', 'ISEB Workshop', 'workshop', 64),
                                                                             ('ukiset_preparation', 'Ukiset Preparation', 'prep', 65),
                                                                             ('ucat_preparation', 'UCAT Preparation', 'prep', 66),

                                                                             -- Tutoring
                                                                             ('subject_tutoring', 'Subject Tutoring', 'tutoring', 70),
                                                                             ('lt_subject_tutoring', 'LT Subject Tutoring', 'tutoring', 71),
                                                                             ('math_workshop', 'Math Workshop', 'workshop', 72),

                                                                             -- Other Programs
                                                                             ('cv_preparation', 'CV Preparation', 'other', 80),
                                                                             ('bridging_course_year_9', 'Bridging Course Year 9', 'other', 81),
                                                                             ('helix', 'Helix', 'other', 82),

                                                                             -- Summer Camps
                                                                             ('aa_summer_camp_2025', 'AA Summer Camp 2025', 'camp', 90),
                                                                             ('aa_summer_camp_2026', 'AA Summer Camp 2026', 'camp', 91);

-- ============================================================================
-- EDUCATION STATUS
-- ============================================================================

create table public.education_statuses (
                                           id serial primary key,
                                           code text unique not null,
                                           label text not null,
                                           sort_order int default 0
);

insert into public.education_statuses (code, label, sort_order) values
                                                                    ('normal', 'Normal', 1),
                                                                    ('completed', 'Completed', 2),
                                                                    ('cancelled', 'Cancelled', 3),
                                                                    ('pending', 'Pending', 4);

-- ============================================================================
-- STUDENT EDUCATION TABLE
-- ============================================================================

create table public.student_education (
                                          id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                          student_id uuid not null references public.students(id) on delete cascade,

    -- Course (reference or text for flexibility)
                                          course_id int references public.education_courses(id),
                                          legacy_course_name text,        -- Original course name from CSV

    -- Tutor
                                          tutor text,

    -- Dates
                                          start_date date,
                                          end_date date,

    -- Duration
                                          total_hours text,               -- "2 Years", "2 weeks", etc. (flexible text)

    -- Status
                                          status_id int references public.education_statuses(id) default 1,

    -- Communication
                                          email_sent boolean default false,

    -- Remarks
                                          remarks text,

    -- Legacy tracking
                                          legacy_student_code text,

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

create index education_courses_code_idx on public.education_courses(code);
create index education_courses_category_idx on public.education_courses(category);
create index education_statuses_code_idx on public.education_statuses(code);

create index student_education_student_id_idx on public.student_education(student_id);
create index student_education_course_id_idx on public.student_education(course_id);
create index student_education_start_date_idx on public.student_education(start_date);
create index student_education_assigned_to_idx on public.student_education(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.education_courses enable row level security;
alter table public.education_statuses enable row level security;
alter table public.student_education enable row level security;

create policy "education_courses_select" on public.education_courses
  for select to authenticated using (true);
create policy "education_statuses_select" on public.education_statuses
  for select to authenticated using (true);

create policy "student_education_select" on public.student_education
  for select to authenticated using (true);
create policy "student_education_insert" on public.student_education
  for insert to authenticated with check (true);
create policy "student_education_update" on public.student_education
  for update to authenticated using (true) with check (true);
create policy "student_education_delete" on public.student_education
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_education_updated_at
    before update on public.student_education
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.education_courses is 'AA internal tutoring/prep courses (different from school courses)';
comment on table public.education_statuses is 'Status for education enrollments';
comment on table public.student_education is 'Student enrollments in AA tutoring/prep programs';