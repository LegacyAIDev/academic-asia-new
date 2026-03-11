-- ============================================================================
-- Migration: 027_create_student_resume_table
-- Description: Student resume/music audition records
-- Depends on: 006_create_students_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- MUSIC INSTRUMENT REFERENCE TABLE
-- ============================================================================

create table public.music_instruments (
                                          id serial primary key,
                                          code text unique not null,
                                          label text not null,
                                          category text,                       -- e.g., strings, woodwind, brass, keyboard, percussion, vocal
                                          sort_order int default 0,
                                          is_active boolean default true
);

insert into public.music_instruments (code, label, category, sort_order) values
                                                                             -- Keyboard
                                                                             ('piano', 'Piano', 'keyboard', 1),
                                                                             ('organ', 'Organ', 'keyboard', 2),
                                                                             ('harpsichord', 'Harpsichord', 'keyboard', 3),
                                                                             -- Strings
                                                                             ('violin', 'Violin', 'strings', 10),
                                                                             ('viola', 'Viola', 'strings', 11),
                                                                             ('cello', 'Cello', 'strings', 12),
                                                                             ('double_bass', 'Double Bass', 'strings', 13),
                                                                             ('harp', 'Harp', 'strings', 14),
                                                                             ('guitar', 'Guitar', 'strings', 15),
                                                                             -- Woodwind
                                                                             ('flute', 'Flute', 'woodwind', 20),
                                                                             ('oboe', 'Oboe', 'woodwind', 21),
                                                                             ('clarinet', 'Clarinet', 'woodwind', 22),
                                                                             ('bassoon', 'Bassoon', 'woodwind', 23),
                                                                             ('saxophone', 'Saxophone', 'woodwind', 24),
                                                                             ('recorder', 'Recorder', 'woodwind', 25),
                                                                             ('piccolo', 'Piccolo', 'woodwind', 26),
                                                                             -- Brass
                                                                             ('trumpet', 'Trumpet', 'brass', 30),
                                                                             ('trombone', 'Trombone', 'brass', 31),
                                                                             ('french_horn', 'French Horn', 'brass', 32),
                                                                             ('tuba', 'Tuba', 'brass', 33),
                                                                             ('euphonium', 'Euphonium', 'brass', 34),
                                                                             ('cornet', 'Cornet', 'brass', 35),
                                                                             -- Percussion
                                                                             ('percussion', 'Percussion', 'percussion', 40),
                                                                             ('drums', 'Drums', 'percussion', 41),
                                                                             ('timpani', 'Timpani', 'percussion', 42),
                                                                             ('marimba', 'Marimba', 'percussion', 43),
                                                                             ('xylophone', 'Xylophone', 'percussion', 44),
                                                                             -- Vocal
                                                                             ('vocal', 'Vocal', 'vocal', 50),
                                                                             ('singing', 'Singing', 'vocal', 51);

-- ============================================================================
-- RESUME TYPE REFERENCE TABLE
-- ============================================================================

create table public.resume_types (
                                     id serial primary key,
                                     code text unique not null,
                                     label text not null,
                                     sort_order int default 0,
                                     is_active boolean default true
);

insert into public.resume_types (code, label, sort_order) values
                                                              ('music_audition', 'Music Audition', 1),
                                                              ('top_schools', 'Top Schools', 2);

-- ============================================================================
-- STUDENT RESUME TABLE
-- ============================================================================

create table public.student_resume (
                                       id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                       student_id uuid not null references public.students(id) on delete cascade,

    -- Resume type
                                       resume_type_id int references public.resume_types(id),

    -- School (if applicable)
                                       exam_school text,

    -- Instrument/Subject
                                       instrument_id int references public.music_instruments(id),
                                       subject text,                        -- Original subject value

    -- Results
                                       result text,

    -- Qualification details
                                       qualification text,                  -- e.g., "ABRSM G8", "Trinity Grade 5"

    -- Music piece details
                                       piece text,                          -- Name of the piece
                                       composer text,                       -- Composer name

    -- Priority/ordering
                                       priority int default 0,

    -- Additional fields
                                       gov text,                            -- Government related
                                       cat text,                            -- Category

    -- Event reference
                                       event_name text,                     -- e.g., "MUSIC AUDITION-TOP SCHOOLS WEEKEND 2012"

    -- Remarks
                                       remarks text,

    -- Legacy tracking
                                       legacy_student_code text,
                                       legacy_resume_type text,

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

create index music_instruments_code_idx on public.music_instruments(code);
create index music_instruments_category_idx on public.music_instruments(category);
create index resume_types_code_idx on public.resume_types(code);

create index student_resume_student_id_idx on public.student_resume(student_id);
create index student_resume_resume_type_id_idx on public.student_resume(resume_type_id);
create index student_resume_instrument_id_idx on public.student_resume(instrument_id);
create index student_resume_assigned_to_idx on public.student_resume(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.music_instruments enable row level security;
alter table public.resume_types enable row level security;
alter table public.student_resume enable row level security;

create policy "music_instruments_select" on public.music_instruments
  for select to authenticated using (true);
create policy "resume_types_select" on public.resume_types
  for select to authenticated using (true);

create policy "student_resume_select" on public.student_resume
  for select to authenticated using (true);
create policy "student_resume_insert" on public.student_resume
  for insert to authenticated with check (true);
create policy "student_resume_update" on public.student_resume
  for update to authenticated using (true) with check (true);
create policy "student_resume_delete" on public.student_resume
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_resume_updated_at
    before update on public.student_resume
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.music_instruments is 'Musical instruments reference for auditions';
comment on table public.resume_types is 'Resume/audition types: Music Audition, Top Schools';
comment on table public.student_resume is 'Student resume records - primarily music audition details';