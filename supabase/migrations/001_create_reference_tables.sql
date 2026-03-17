-- ============================================================================
-- Migration: 001_create_reference_tables
-- Description: Create all lookup/reference tables with integer PKs
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
return new;
end;
$$;

-- ============================================================================
-- REFERENCE TABLES
-- ============================================================================

-- Student status reference table
create table public.student_statuses (
                                         id serial primary key,
                                         code text unique not null,
                                         label text not null,
                                         description text,
                                         color text,
                                         sort_order int default 0,
                                         is_active boolean default true
);

insert into public.student_statuses (code, label, color, sort_order) values
                                                                         ('new', 'New', 'blue', 0),
                                                                         ('pending', 'Pending', 'yellow', 1),
                                                                         ('active', 'Active', 'green', 2),
                                                                         ('closed', 'Closed', 'gray', 3),
                                                                         ('dead', 'Dead', 'red', 4);

-- Placement/temperature reference table
create table public.placement_statuses (
                                           id serial primary key,
                                           code text unique not null,
                                           label text not null,
                                           color text,
                                           sort_order int default 0
);

insert into public.placement_statuses (code, label, color, sort_order) values
                                                                           ('very_hot', 'Very Hot', 'red', 0),
                                                                           ('hot', 'Hot', 'orange', 1),
                                                                           ('warm', 'Warm', 'yellow', 2),
                                                                           ('cold', 'Cold', 'blue', 3);

-- Lead source reference table
create table public.lead_sources (
                                     id serial primary key,
                                     code text unique not null,
                                     label text not null,
                                     category text,
                                     sort_order int default 0,
                                     is_active boolean default true
);

insert into public.lead_sources (code, label, category, sort_order) values
                                                                        ('walk_in', 'Walk-In', 'walk_in', 0),
                                                                        ('walk_in_friends', 'Walk-In (Friends)', 'walk_in', 1),
                                                                        ('referral_school', 'Referral (School)', 'referral', 10),
                                                                        ('own_referral', 'Own Referral', 'referral', 11),
                                                                        ('top_schools_09', 'Top Schools 09', 'top_schools', 20),
                                                                        ('top_schools_10', 'Top Schools 10', 'top_schools', 21),
                                                                        ('top_schools_10_v', 'Top Schools 10 (V)', 'top_schools', 22),
                                                                        ('top_schools_11', 'Top Schools 11', 'top_schools', 23),
                                                                        ('top_schools_11_v', 'Top Schools 11 (V)', 'top_schools', 24),
                                                                        ('top_schools_12', 'Top Schools 12', 'top_schools', 25),
                                                                        ('top_schools_13', 'Top Schools 13', 'top_schools', 26),
                                                                        ('top_schools_14', 'Top Schools 14', 'top_schools', 27),
                                                                        ('top_schools_15', 'Top Schools 15', 'top_schools', 28),
                                                                        ('top_schools_16', 'Top Schools 16', 'top_schools', 29),
                                                                        ('may_expo_09', 'May Expo 09', 'expo', 30),
                                                                        ('may_expo_11', 'May Expo 11', 'expo', 31),
                                                                        ('june_expo_12', 'June Expo 12', 'expo', 32),
                                                                        ('oct_expo_09', 'Oct Expo 09', 'expo', 33),
                                                                        ('oct_expo_10', 'OCT EXPO 10', 'expo', 34),
                                                                        ('oct_expo_11', 'Oct Expo 11', 'expo', 35),
                                                                        ('oct_expo_12', 'Oct Expo 12', 'expo', 36),
                                                                        ('oct_expo_13', 'Oct Expo 13', 'expo', 37),
                                                                        ('feb_expo_13', 'Feb Expo 13', 'expo', 38),
                                                                        ('concord_event', 'Concord Event', 'event', 40),
                                                                        ('concord_event_19_march', 'Concord Event 19 March', 'event', 41),
                                                                        ('direct_mail', 'Direct Mail', 'marketing', 50),
                                                                        ('email_courier', 'Email & Courier', 'marketing', 51),
                                                                        ('newspaper', 'Newspaper', 'marketing', 52),
                                                                        ('website', 'Website', 'marketing', 53),
                                                                        ('ch_hk_bursary', 'CH- HK Bursary', 'partner', 60),
                                                                        ('eduwise', 'EduWise', 'partner', 61),
                                                                        ('focus', 'Focus', 'partner', 62),
                                                                        ('hsbc', 'HSBC', 'partner', 63),
                                                                        ('mtr', 'MTR', 'partner', 64),
                                                                        ('other', 'Other', 'other', 99);

-- School type reference table
create table public.school_types (
                                     id serial primary key,
                                     code text unique not null,
                                     label text not null,
                                     region text,
                                     sort_order int default 0
);

insert into public.school_types (code, label, region, sort_order) values
                                                                      ('hk', 'HK', 'hong_kong', 0),
                                                                      ('hong_kong_local', 'Hong Kong - Local', 'hong_kong', 1),
                                                                      ('hong_kong_international', 'Hong Kong - International', 'hong_kong', 2),
                                                                      ('local_chinese_medium', 'Local (Chinese Medium)', 'hong_kong', 3),
                                                                      ('local_english_medium', 'Local (English Medium)', 'hong_kong', 4),
                                                                      ('english_chinese', 'English+Chinese', 'hong_kong', 5),
                                                                      ('macau', 'MACAU', 'macau', 10),
                                                                      ('macau_local', 'Macau - Local', 'macau', 11),
                                                                      ('macau_international', 'Macau - International', 'macau', 12),
                                                                      ('chinese_medium_macau', 'Chinese Medium-Macau', 'macau', 13),
                                                                      ('english_medium_macau', 'English Medium-Macau', 'macau', 14),
                                                                      ('china', 'CHINA', 'china', 20),
                                                                      ('china_local', 'China - Local', 'china', 21),
                                                                      ('china_international', 'China - International', 'china', 22),
                                                                      ('japan', 'Japan', 'asia', 30),
                                                                      ('singapore', 'Singapore', 'asia', 31),
                                                                      ('malaysia', 'Malaysia', 'asia', 32),
                                                                      ('thailand', 'Thailand', 'asia', 33),
                                                                      ('thailand_international', 'Thailand - International', 'asia', 34),
                                                                      ('taiwan', 'Taiwan', 'asia', 35),
                                                                      ('india', 'India', 'asia', 36),
                                                                      ('philippines', 'Philippines', 'asia', 37),
                                                                      ('uk', 'UK', 'europe', 40),
                                                                      ('paris_france', 'Paris, France', 'europe', 41),
                                                                      ('portuguese', 'Portuguese', 'europe', 42),
                                                                      ('united_states', 'United States', 'americas', 50),
                                                                      ('canada', 'Canada', 'americas', 51),
                                                                      ('south_america', 'South America', 'americas', 52),
                                                                      ('australia', 'Australia', 'oceania', 60),
                                                                      ('others', 'Others', 'other', 99);

-- Nationality reference table
create table public.nationalities (
                                      id serial primary key,
                                      code text unique not null,
                                      label text not null,
                                      sort_order int default 0,
                                      is_active boolean default true
);

insert into public.nationalities (code, label, sort_order) values
                                                               ('hksar', 'HKSAR', 0),
                                                               ('bno', 'BNO', 1),
                                                               ('bno_hksar', 'BNO+HKSAR', 2),
                                                               ('msar', 'MSAR', 3),
                                                               ('macau', 'Macau', 4),
                                                               ('chinese', 'Chinese', 5),
                                                               ('china', 'China', 6),
                                                               ('british_citizen', 'British Citizen', 10),
                                                               ('german', 'German', 11),
                                                               ('portuguese', 'Portuguese', 12),
                                                               ('italian', 'Italiana', 13),
                                                               ('belgium', 'Belgium', 14),
                                                               ('austria', 'Austria', 15),
                                                               ('dutch', 'Holland/Netherlands', 16),
                                                               ('eu', 'EU', 17),
                                                               ('eu_austria', 'EU-Austria', 18),
                                                               ('australian', 'Australian', 20),
                                                               ('new_zealand', 'New Zealand', 21),
                                                               ('singaporean', 'Singapore', 22),
                                                               ('malaysian', 'Malaysia', 23),
                                                               ('taiwanese', 'Taiwan', 24),
                                                               ('thai', 'Thai', 25),
                                                               ('japanese', 'Japan', 26),
                                                               ('korean', 'Korea', 27),
                                                               ('indian', 'Indian', 28),
                                                               ('filipino', 'Philippines', 29),
                                                               ('usa', 'USA', 30),
                                                               ('canadian', 'Canadian', 31),
                                                               ('other', 'Other', 99);

-- Course/Year reference table
create table public.courses (
                                id serial primary key,
                                code text unique not null,
                                label text not null,
                                category text,
                                sort_order int default 0,
                                is_active boolean default true
);

insert into public.courses (code, label, category, sort_order) values
    ('nursery', 'Nursery', 'early_years', 1),
    ('pre_kindergarten', 'Pre-Kindergarten', 'early_years', 2),
    ('pre_prep', 'Pre-Prep', 'early_years', 3),
    ('reception', 'Reception', 'early_years', 4),
    ('year_1', 'Year 1', 'primary', 5),
    ('year_2', 'Year 2', 'primary', 6),
    ('year_3', 'Year 3', 'primary', 7),
    ('year_4', 'Year 4', 'primary', 8),
    ('year_5', 'Year 5', 'primary', 9),
    ('year_6', 'Year 6', 'primary', 10),
    ('year_7', 'Year 7', 'secondary', 11),
    ('year_8', 'Year 8', 'secondary', 12),
    ('year_9', 'Year 9', 'secondary', 13),
    ('year_10', 'Year 10', 'secondary', 14),
    ('year_11', 'Year 11', 'secondary', 15),
    ('year_12', 'Year 12', 'sixth_form', 16),
    ('year_13', 'Year 13', 'sixth_form', 17),
    ('foundation', 'Foundation', 'foundation', 18),
    ('other', 'Other', 'other', 99);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index student_statuses_code_idx on public.student_statuses(code);
create index placement_statuses_code_idx on public.placement_statuses(code);
create index lead_sources_code_idx on public.lead_sources(code);
create index school_types_code_idx on public.school_types(code);
create index nationalities_code_idx on public.nationalities(code);
create index courses_code_idx on public.courses(code);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.student_statuses enable row level security;
alter table public.placement_statuses enable row level security;
alter table public.lead_sources enable row level security;
alter table public.school_types enable row level security;
alter table public.nationalities enable row level security;
alter table public.courses enable row level security;

create policy "student_statuses_select_policy"
  on public.student_statuses for select to authenticated using (true);
create policy "placement_statuses_select_policy"
  on public.placement_statuses for select to authenticated using (true);
create policy "lead_sources_select_policy"
  on public.lead_sources for select to authenticated using (true);
create policy "school_types_select_policy"
  on public.school_types for select to authenticated using (true);
create policy "nationalities_select_policy"
  on public.nationalities for select to authenticated using (true);
create policy "courses_select_policy"
  on public.courses for select to authenticated using (true);