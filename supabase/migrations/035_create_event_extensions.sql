-- ============================================================================
-- Migration: 035_restructure_events_system
-- Description: Incremental migration to restructure events per Gerald's spec.
--              ALTERs existing tables in place — NO remigration needed.
--
-- What this does:
--   1. New reference tables: event_categories, delivery_modes, visibilities, scheduling_modes
--   2. ALTERs event_types: adds category_id FK, inserts new sub-types
--   3. ALTERs events: adds parent_event_id, category_id, delivery_mode, visibility, etc.
--   4. Renames event_interviewers → event_representatives, adds scheduling columns
--   5. ALTERs event_schedules: adds start_time, end_time, representative_id
--   6. ALTERs student_event_applications: adds representative, seats, pieces
--   7. New table: event_exam_blocks (group sitting sub-form)
--   8. New tables: exam booking workflow (individual exams from student profile)
--   9. Backfills legacy data with sensible defaults
--
-- Safe to run on existing database with data. All new columns are nullable.
-- Depends on: 009, 010, 011, 018
-- ============================================================================


-- ============================================================================
-- PART 1: NEW REFERENCE TABLES
-- ============================================================================

-- 1a. Event Categories (Tier 1)
create table public.event_categories (
                                         id serial primary key,
                                         code text unique not null,
                                         label text not null,
                                         description text,
                                         sort_order int default 0
);

insert into public.event_categories (code, label, description, sort_order) values
                                                                               ('engagement_guidance',  'Engagement & Guidance',  'Public events: expos, seminars, webinars, exhibitions', 1),
                                                                               ('admission_assessment', 'Admission & Assessment', 'Private events: interviews, auditions, group exams',    2);

alter table public.event_categories enable row level security;
create policy "event_categories_select" on public.event_categories
  for select to authenticated using (true);

comment on table public.event_categories is 'Top-level event category: Engagement & Guidance vs Admission & Assessment';


-- 1b. Delivery Modes
create table public.delivery_modes (
                                       id serial primary key,
                                       code text unique not null,
                                       label text not null,
                                       sort_order int default 0
);

insert into public.delivery_modes (code, label, sort_order) values
                                                                ('in_person', 'In Person', 1),
                                                                ('online',    'Online',    2),
                                                                ('hybrid',    'Hybrid',    3);

alter table public.delivery_modes enable row level security;
create policy "delivery_modes_select" on public.delivery_modes
  for select to authenticated using (true);


-- 1c. Event Visibilities
create table public.event_visibilities (
                                           id serial primary key,
                                           code text unique not null,
                                           label text not null,
                                           sort_order int default 0
);

insert into public.event_visibilities (code, label, sort_order) values
                                                                    ('public',  'Public / Open',            1),
                                                                    ('private', 'Private / Invitation-only', 2);

alter table public.event_visibilities enable row level security;
create policy "event_visibilities_select" on public.event_visibilities
  for select to authenticated using (true);


-- 1d. Scheduling Modes
create table public.scheduling_modes (
                                         id serial primary key,
                                         code text unique not null,
                                         label text not null,
                                         description text,
                                         sort_order int default 0
);

insert into public.scheduling_modes (code, label, description, sort_order) values
                                                                               ('one_to_one',    '1 to 1 Time Slots', 'Individual interview slots with representatives', 1),
                                                                               ('group_sitting', 'Group Sitting',      'Group exam with shared time blocks',              2),
                                                                               ('no_scheduling', 'No Scheduling',      'Open event, no time slot assignment',             3);

alter table public.scheduling_modes enable row level security;
create policy "scheduling_modes_select" on public.scheduling_modes
  for select to authenticated using (true);


-- ============================================================================
-- PART 2: ALTER EVENT_TYPES — add category FK + new sub-types
-- ============================================================================

alter table public.event_types
    add column category_id int references public.event_categories(id);

-- Map existing 5 types to their categories
update public.event_types
set category_id = (select id from public.event_categories where code = 'engagement_guidance')
where code in ('event', 'expo', 'top_schools');

update public.event_types
set category_id = (select id from public.event_categories where code = 'admission_assessment')
where code in ('interview', 'music_audition');

-- Rename existing types for clarity
update public.event_types set label = 'Seminar / Workshop'  where code = 'event';
update public.event_types set label = 'Education Expo'      where code = 'expo';
update public.event_types set label = 'Top Schools Weekend' where code = 'top_schools';
update public.event_types set label = 'Interview Day'       where code = 'interview';
update public.event_types set label = 'Music Audition'      where code = 'music_audition';

-- Add new sub-types Gerald defined
insert into public.event_types (code, label, description, color, sort_order, category_id) values
                                                                                              ('webinar',             'Webinar',              'Online seminars and information sessions',  'cyan',    5,
                                                                                               (select id from public.event_categories where code = 'engagement_guidance')),
                                                                                              ('exhibition',          'Exhibition',           'Education exhibitions and fairs',           'indigo',  6,
                                                                                               (select id from public.event_categories where code = 'engagement_guidance')),
                                                                                              ('group_entrance_exam', 'Group Entrance Exam',  'Group sitting entrance examinations',       'red',     7,
                                                                                               (select id from public.event_categories where code = 'admission_assessment')),
                                                                                              ('school_assessment',   'School Assessment',    'School-run assessment sessions',            'amber',   8,
                                                                                               (select id from public.event_categories where code = 'admission_assessment')),
                                                                                              ('scholarship_audition','Scholarship Audition', 'Scholarship and bursary auditions',         'emerald', 9,
                                                                                               (select id from public.event_categories where code = 'admission_assessment'));

create index if not exists event_types_category_id_idx on public.event_types(category_id);


-- ============================================================================
-- PART 3: ALTER EVENTS TABLE — add new columns
-- ============================================================================

alter table public.events
    add column parent_event_id    uuid references public.events(id) on delete set null,
  add column category_id        int  references public.event_categories(id),
  add column delivery_mode_id   int  references public.delivery_modes(id),
  add column visibility_id      int  references public.event_visibilities(id),
  add column scheduling_mode_id int  references public.scheduling_modes(id),
  add column school_id          uuid references public.schools(id),
  add column online_link        text,
  add column capacity           int;

create index events_parent_event_id_idx  on public.events(parent_event_id);
create index events_category_id_idx      on public.events(category_id);
create index events_school_id_idx        on public.events(school_id);
create index events_delivery_mode_id_idx on public.events(delivery_mode_id);
create index events_visibility_id_idx    on public.events(visibility_id);

comment on column public.events.parent_event_id    is 'Self-ref: NULL = main event, set = sub-event of parent';
comment on column public.events.category_id        is 'Engagement & Guidance vs Admission & Assessment';
comment on column public.events.school_id          is 'Single school (Admission events). Engagement events use event_schools junction.';
comment on column public.events.scheduling_mode_id is 'How scheduling works: 1-to-1 slots, group sitting, or none';
comment on column public.events.capacity           is 'Max seats / attendees';
comment on column public.events.online_link        is 'Zoom / Teams / Meet link';


-- ============================================================================
-- PART 4: RENAME event_interviewers → event_representatives + add columns
-- ============================================================================

alter table public.event_interviewers rename to event_representatives;

alter table public.event_representatives
    add column role                text,
  add column venue_room          text,
  add column available_from      timestamptz,
  add column available_to        timestamptz,
  add column slot_length_minutes int;

-- Fix trigger name after rename
drop trigger if exists event_interviewers_updated_at on public.event_representatives;
create trigger event_representatives_updated_at
    before update on public.event_representatives
    for each row execute function public.handle_updated_at();

-- Rename indexes for consistency
alter index if exists event_interviewers_event_id_idx    rename to event_representatives_event_id_idx;
alter index if exists event_interviewers_school_id_idx   rename to event_representatives_school_id_idx;
alter index if exists event_interviewers_assigned_to_idx rename to event_representatives_assigned_to_idx;

comment on table  public.event_representatives                    is 'School representatives at events (renamed from event_interviewers)';
comment on column public.event_representatives.role               is 'Role: Interviewer, Admissions Officer, etc.';
comment on column public.event_representatives.venue_room         is 'Specific room/venue for this rep';
comment on column public.event_representatives.available_from     is 'Rep availability start (may differ from event start)';
comment on column public.event_representatives.available_to       is 'Rep availability end';
comment on column public.event_representatives.slot_length_minutes is 'Custom slot length (overrides event default)';


-- ============================================================================
-- PART 5: ALTER EVENT_SCHEDULES — add real times + representative FK
-- ============================================================================

alter table public.event_schedules
    add column start_time         time,
  add column end_time           time,
  add column representative_id  uuid references public.event_representatives(id) on delete set null;

create index event_schedules_representative_id_idx on public.event_schedules(representative_id);

comment on column public.event_schedules.timeslot          is 'Legacy: integer slot number. New records use start_time/end_time.';
comment on column public.event_schedules.interviewer_name  is 'Legacy: text name. New records use representative_id FK.';
comment on column public.event_schedules.start_time        is 'Actual start time of this slot';
comment on column public.event_schedules.end_time          is 'Actual end time of this slot';
comment on column public.event_schedules.representative_id is 'FK to event_representatives';


-- ============================================================================
-- PART 6: ALTER STUDENT_EVENT_APPLICATIONS — add rep, seats, music fields
-- ============================================================================

alter table public.student_event_applications
    add column representative_id uuid references public.event_representatives(id) on delete set null,
  add column preferred_time    text,
  add column seats_requested   int,
  add column seats_assigned    int,
  add column pieces            jsonb default '[]';

create index student_event_apps_representative_id_idx
    on public.student_event_applications(representative_id);

comment on column public.student_event_applications.representative_id is 'Assigned representative for this student';
comment on column public.student_event_applications.preferred_time    is 'Student/parent preferred time slot';
comment on column public.student_event_applications.seats_requested   is 'Seats requested (capacity events)';
comment on column public.student_event_applications.seats_assigned    is 'Seats assigned (capacity events)';
comment on column public.student_event_applications.pieces            is 'Music pieces array: [{piece, composer}, ...] for music audition events';


-- ============================================================================
-- PART 7: EVENT EXAM BLOCKS (group sitting sub-form, fields 212–224)
-- ============================================================================

create table public.event_exam_blocks (
                                          id uuid primary key default gen_random_uuid(),

                                          event_id             uuid not null references public.events(id) on delete cascade,

                                          subject              text,
                                          name                 text,
                                          apply_year           text,
                                          duration_minutes     int,

                                          start_time           timestamptz,
                                          end_time             timestamptz,

                                          venue_room           text,
                                          invigilator_names    text,
                                          capacity             int,

                                          allowed_items        text,
                                          special_instructions text,
                                          attachment_path      text,

                                          sort_order           int default 0,

                                          created_at           timestamptz default now(),
                                          updated_at           timestamptz default now()
);

create index event_exam_blocks_event_id_idx on public.event_exam_blocks(event_id);

alter table public.event_exam_blocks enable row level security;
create policy "event_exam_blocks_select" on public.event_exam_blocks
  for select to authenticated using (true);
create policy "event_exam_blocks_insert" on public.event_exam_blocks
  for insert to authenticated with check (true);
create policy "event_exam_blocks_update" on public.event_exam_blocks
  for update to authenticated using (true) with check (true);
create policy "event_exam_blocks_delete" on public.event_exam_blocks
  for delete to authenticated using (true);

create trigger event_exam_blocks_updated_at
    before update on public.event_exam_blocks
    for each row execute function public.handle_updated_at();

comment on table public.event_exam_blocks is 'Exam blocks within group sitting events';


-- ============================================================================
-- PART 8: INDIVIDUAL EXAM BOOKING WORKFLOW
-- ============================================================================

-- 8a. Booking statuses
create table public.exam_booking_statuses (
                                              id serial primary key,
                                              code text unique not null,
                                              label text not null,
                                              color text,
                                              sort_order int default 0
);

insert into public.exam_booking_statuses (code, label, color, sort_order) values
                                                                              ('pending',   'Pending',   'yellow', 1),
                                                                              ('confirmed', 'Confirmed', 'blue',   2),
                                                                              ('completed', 'Completed', 'green',  3),
                                                                              ('cancelled', 'Cancelled', 'gray',   4);

alter table public.exam_booking_statuses enable row level security;
create policy "exam_booking_statuses_select" on public.exam_booking_statuses
  for select to authenticated using (true);


-- 8b. Individual exam types
create table public.individual_exam_types (
                                              id serial primary key,
                                              code text unique not null,
                                              label text not null,
                                              requires_school boolean default false,
                                              has_score boolean default false,
                                              sort_order int default 0
);

insert into public.individual_exam_types (code, label, requires_school, has_score, sort_order) values
                                                                                                   ('aa_test',        'AA Test',        false, true,  1),
                                                                                                   ('entrance_exam',  'Entrance Exam',  true,  false, 2),
                                                                                                   ('interview',      'Interview',      true,  false, 3),
                                                                                                   ('music_audition', 'Music Audition', true,  false, 4);

alter table public.individual_exam_types enable row level security;
create policy "individual_exam_types_select" on public.individual_exam_types
  for select to authenticated using (true);

comment on column public.individual_exam_types.requires_school is 'If true, school dropdown shows (filtered to student applications)';
comment on column public.individual_exam_types.has_score       is 'If true, score field shown after completion (AA Test only)';


-- 8c. Main booking table
create table public.student_individual_exams (
                                                 id uuid primary key default gen_random_uuid(),

    -- Core FKs
                                                 student_id       uuid not null references public.students(id) on delete cascade,
                                                 exam_type_id     int  not null references public.individual_exam_types(id),
                                                 school_id        uuid references public.schools(id),

    -- Exam info
                                                 title            text,                                -- For entrance exam / interview / audition
                                                 subject          text,
                                                 apply_year       text,
                                                 duration_minutes int,

    -- Preferred scheduling (consultant fills from parent call)
                                                 preferred_date       date,
                                                 preferred_start_time time,
                                                 end_time_calculated  time,

    -- Delivery & location
                                                 delivery_mode_id int references public.delivery_modes(id),
                                                 location         text default 'AA Office',
                                                 online_link      text,

    -- Assigned staff
                                                 examiner_names   text,

    -- Workflow status
                                                 status_id        int not null references public.exam_booking_statuses(id) default 1,

    -- Confirmed scheduling (exam department fills)
                                                 confirmed_date       date,
                                                 confirmed_start_time time,
                                                 confirmed_end_time   time,

    -- Result (AA Test only)
                                                 score            decimal(10,2),

    -- Notes
                                                 remarks          text,

    -- Assignment
                                                 assigned_to      uuid references public.profiles(id),

    -- Audit
                                                 created_at       timestamptz default now(),
                                                 updated_at       timestamptz default now(),
                                                 created_by       uuid references auth.users(id) default auth.uid()
);

create index student_individual_exams_student_id_idx     on public.student_individual_exams(student_id);
create index student_individual_exams_exam_type_id_idx   on public.student_individual_exams(exam_type_id);
create index student_individual_exams_school_id_idx      on public.student_individual_exams(school_id);
create index student_individual_exams_status_id_idx      on public.student_individual_exams(status_id);
create index student_individual_exams_preferred_date_idx on public.student_individual_exams(preferred_date);
create index student_individual_exams_confirmed_date_idx on public.student_individual_exams(confirmed_date);
create index student_individual_exams_assigned_to_idx    on public.student_individual_exams(assigned_to);
create index student_individual_exams_student_type_idx   on public.student_individual_exams(student_id, exam_type_id);

alter table public.student_individual_exams enable row level security;
create policy "student_individual_exams_select" on public.student_individual_exams
  for select to authenticated using (true);
create policy "student_individual_exams_insert" on public.student_individual_exams
  for insert to authenticated with check (true);
create policy "student_individual_exams_update" on public.student_individual_exams
  for update to authenticated using (true) with check (true);
create policy "student_individual_exams_delete" on public.student_individual_exams
  for delete to authenticated using (true);

create trigger student_individual_exams_updated_at
    before update on public.student_individual_exams
    for each row execute function public.handle_updated_at();

comment on table  public.student_individual_exams           is 'Individual exam booking: Pending → Confirmed → Completed workflow';
comment on column public.student_individual_exams.title     is 'Exam title (for entrance exam / interview / music audition)';
comment on column public.student_individual_exams.school_id is 'Only for entrance_exam/interview/music_audition. Filtered to applied schools.';
comment on column public.student_individual_exams.score     is 'Final score — AA Test only';


-- ============================================================================
-- PART 9: BACKFILL LEGACY DATA
-- ============================================================================
-- Populate new columns on existing events from their event_type mapping.
-- Safe to run multiple times (only updates NULLs).
-- ============================================================================

-- Category from event_type
update public.events e
set category_id = et.category_id
    from public.event_types et
where e.event_type_id = et.id
  and e.category_id is null;

-- Engagement → public visibility, no scheduling
update public.events
set visibility_id      = (select id from public.event_visibilities where code = 'public'),
    scheduling_mode_id = (select id from public.scheduling_modes   where code = 'no_scheduling')
where category_id = (select id from public.event_categories where code = 'engagement_guidance')
  and visibility_id is null;

-- Admission → private visibility, 1-to-1 scheduling
update public.events
set visibility_id      = (select id from public.event_visibilities where code = 'private'),
    scheduling_mode_id = (select id from public.scheduling_modes   where code = 'one_to_one')
where category_id = (select id from public.event_categories where code = 'admission_assessment')
  and visibility_id is null;

-- All legacy → in-person delivery
update public.events
set delivery_mode_id = (select id from public.delivery_modes where code = 'in_person')
where delivery_mode_id is null;


-- ============================================================================
-- VERIFICATION QUERY (run after applying):
--
--   select 'event_categories'     as tbl, count(*) from event_categories
--   union all select 'event_types',           count(*) from event_types
--   union all select 'delivery_modes',        count(*) from delivery_modes
--   union all select 'event_visibilities',    count(*) from event_visibilities
--   union all select 'scheduling_modes',      count(*) from scheduling_modes
--   union all select 'exam_booking_statuses', count(*) from exam_booking_statuses
--   union all select 'individual_exam_types', count(*) from individual_exam_types
--   union all select 'event_exam_blocks',     count(*) from event_exam_blocks
--   union all select 'student_individual_exams', count(*) from student_individual_exams
--   union all select 'events (with category)',   count(*) from events where category_id is not null
--   union all select 'events (total)',           count(*) from events;
--
-- ============================================================================