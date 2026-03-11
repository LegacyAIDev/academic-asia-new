-- ============================================================================
-- Migration: 026_create_student_brief_intro_table
-- Description: Student profile/introduction (spoken English, hobbies, etc.)
-- Depends on: 006_create_students_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- SPOKEN ENGLISH LEVEL REFERENCE TABLE
-- ============================================================================

create table public.spoken_english_levels (
                                              id serial primary key,
                                              code text unique not null,
                                              label text not null,
                                              sort_order int default 0,
                                              is_active boolean default true
);

insert into public.spoken_english_levels (code, label, sort_order) values
                                                                       ('native', 'Native', 1),
                                                                       ('fluent', 'Fluent', 2),
                                                                       ('excellent', 'Excellent', 3),
                                                                       ('very_good', 'Very Good', 4),
                                                                       ('good', 'Good', 5),
                                                                       ('satisfactory_to_good', 'Satisfactory to Good', 6),
                                                                       ('fairly_good', 'Fairly Good', 7),
                                                                       ('satisfactory', 'Satisfactory', 8),
                                                                       ('fair', 'Fair', 9),
                                                                       ('basic', 'Basic', 10),
                                                                       ('limited', 'Limited', 11);

-- ============================================================================
-- STUDENT BRIEF INTRO TABLE
-- ============================================================================

create table public.student_brief_intro (
                                            id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                            student_id uuid not null references public.students(id) on delete cascade,

    -- Profile details
                                            spoken_english_id int references public.spoken_english_levels(id),
                                            legacy_spoken_english text,          -- Original value from CSV
                                            hobbies text,                        -- Hobbies description (can be long)
                                            subjects text,                       -- Subject interests
                                            remarks text,                        -- General remarks

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

create index spoken_english_levels_code_idx on public.spoken_english_levels(code);

create index student_brief_intro_student_id_idx on public.student_brief_intro(student_id);
create index student_brief_intro_spoken_english_id_idx on public.student_brief_intro(spoken_english_id);
create index student_brief_intro_assigned_to_idx on public.student_brief_intro(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.spoken_english_levels enable row level security;
alter table public.student_brief_intro enable row level security;

create policy "spoken_english_levels_select" on public.spoken_english_levels
  for select to authenticated using (true);

create policy "student_brief_intro_select" on public.student_brief_intro
  for select to authenticated using (true);
create policy "student_brief_intro_insert" on public.student_brief_intro
  for insert to authenticated with check (true);
create policy "student_brief_intro_update" on public.student_brief_intro
  for update to authenticated using (true) with check (true);
create policy "student_brief_intro_delete" on public.student_brief_intro
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_brief_intro_updated_at
    before update on public.student_brief_intro
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.spoken_english_levels is 'Spoken English proficiency levels';
comment on table public.student_brief_intro is 'Student profile/introduction including spoken English, hobbies, interests';