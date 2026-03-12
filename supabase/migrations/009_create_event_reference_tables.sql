-- ============================================================================
-- Migration: 009_create_event_reference_tables
-- Description: Reference tables for events module
-- Depends on: 001_create_reference_tables
-- ============================================================================

-- ============================================================================
-- EVENT CATEGORIES (Tier 1: determines which UI form renders)
-- ============================================================================

create table public.event_categories (
                                         id serial primary key,
                                         code text unique not null,
                                         label text not null,
                                         description text,
                                         sort_order int default 0
);

insert into public.event_categories (code, label, description, sort_order) values
                                                                               ('engagement_guidance',   'Engagement & Guidance',   'Public events: expos, seminars, webinars, exhibitions', 1),
                                                                               ('admission_assessment',  'Admission & Assessment',  'Private events: interviews, auditions, group exams, assessments', 2);

-- ============================================================================
-- EVENT TYPES (Tier 2: specific type within a category)
-- ============================================================================

create table public.event_types (
                                    id serial primary key,
                                    code text unique not null,
                                    label text not null,
                                    description text,
                                    color text,
                                    category_id int references public.event_categories(id),
                                    sort_order int default 0
);

insert into public.event_types (code, label, description, color, category_id, sort_order) values
                                                                                              -- Engagement & Guidance types
                                                                                              ('event',       'Seminar / Workshop',   'Seminars, workshops, and general events',   'blue',    (select id from public.event_categories where code = 'engagement_guidance'),  0),
                                                                                              ('expo',        'Education Expo',       'Large-scale education exhibitions',         'purple',  (select id from public.event_categories where code = 'engagement_guidance'),  1),
                                                                                              ('top_schools', 'Top Schools Weekend',  'Top Schools interview weekends',            'green',   (select id from public.event_categories where code = 'engagement_guidance'),  2),
                                                                                              ('webinar',     'Webinar',              'Online seminars and information sessions',   'cyan',    (select id from public.event_categories where code = 'engagement_guidance'),  3),
                                                                                              ('exhibition',  'Exhibition',           'Education exhibitions and fairs',            'indigo',  (select id from public.event_categories where code = 'engagement_guidance'),  4),
                                                                                              -- Admission & Assessment types
                                                                                              ('interview',         'Interview Day',        'One-on-one or group school interviews',       'orange',  (select id from public.event_categories where code = 'admission_assessment'), 10),
                                                                                              ('music_audition',    'Music Audition',       'Music scholarship auditions',                 'pink',    (select id from public.event_categories where code = 'admission_assessment'), 11),
                                                                                              ('group_entrance_exam','Group Entrance Exam', 'Group sitting entrance examinations',         'red',     (select id from public.event_categories where code = 'admission_assessment'), 12),
                                                                                              ('school_assessment', 'School Assessment',    'School-run assessment sessions',              'amber',   (select id from public.event_categories where code = 'admission_assessment'), 13),
                                                                                              ('scholarship_audition','Scholarship Audition','Scholarship and bursary auditions',          'emerald', (select id from public.event_categories where code = 'admission_assessment'), 14);

-- ============================================================================
-- DELIVERY MODES
-- ============================================================================

create table public.delivery_modes (
                                       id serial primary key,
                                       code text unique not null,
                                       label text not null,
                                       sort_order int default 0
);

insert into public.delivery_modes (code, label, sort_order) values
                                                                ('in_person',  'In Person',  1),
                                                                ('online',     'Online',     2),
                                                                ('hybrid',     'Hybrid',     3);

-- ============================================================================
-- EVENT VISIBILITIES
-- ============================================================================

create table public.event_visibilities (
                                           id serial primary key,
                                           code text unique not null,
                                           label text not null,
                                           sort_order int default 0
);

insert into public.event_visibilities (code, label, sort_order) values
                                                                    ('public',     'Public / Open',             1),
                                                                    ('private',    'Private / Invitation-only',  2);

-- ============================================================================
-- SCHEDULING MODES
-- ============================================================================

create table public.scheduling_modes (
                                         id serial primary key,
                                         code text unique not null,
                                         label text not null,
                                         description text,
                                         sort_order int default 0
);

insert into public.scheduling_modes (code, label, description, sort_order) values
                                                                               ('one_to_one',     '1 to 1 Time Slots',  'Individual interview slots with representatives', 1),
                                                                               ('group_sitting',  'Group Sitting',       'Group exam with shared time blocks',              2),
                                                                               ('no_scheduling',  'No Scheduling',       'Open event, no time slot assignment',             3);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index event_types_code_idx on public.event_types(code);
create index event_types_category_id_idx on public.event_types(category_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.event_categories enable row level security;
alter table public.event_types enable row level security;
alter table public.delivery_modes enable row level security;
alter table public.event_visibilities enable row level security;
alter table public.scheduling_modes enable row level security;

create policy "event_categories_select" on public.event_categories
  for select to authenticated using (true);
create policy "event_types_select" on public.event_types
  for select to authenticated using (true);
create policy "delivery_modes_select" on public.delivery_modes
  for select to authenticated using (true);
create policy "event_visibilities_select" on public.event_visibilities
  for select to authenticated using (true);
create policy "scheduling_modes_select" on public.scheduling_modes
  for select to authenticated using (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.event_categories is 'Top-level event category: Engagement & Guidance vs Admission & Assessment';
comment on table public.event_types is 'Event type sub-categories within each category';
comment on table public.delivery_modes is 'Event delivery: In Person, Online, Hybrid';
comment on table public.event_visibilities is 'Event visibility: Public or Private/Invitation-only';
comment on table public.scheduling_modes is 'How scheduling works: 1-to-1 slots, group sitting, or none';