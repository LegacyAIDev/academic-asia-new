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
                                                                   -- Early Years
                                                                   ('nursery', 'Nursery', 'early_years', 1),
                                                                   ('pre_kindergarten', 'Pre-Kindergarten', 'early_years', 2),
                                                                   ('pre_prep', 'Pre-Prep', 'early_years', 3),
                                                                   ('reception', 'Reception', 'early_years', 4),

                                                                   -- Primary Years
                                                                   ('year_1', 'Year 1', 'primary', 10),
                                                                   ('year_2', 'Year 2', 'primary', 11),
                                                                   ('year_3', 'Year 3', 'primary', 12),
                                                                   ('year_4', 'Year 4', 'primary', 13),
                                                                   ('year_5', 'Year 5', 'primary', 14),
                                                                   ('year_6', 'Year 6', 'primary', 15),

                                                                   -- Secondary Years
                                                                   ('year_7', 'Year 7', 'secondary', 20),
                                                                   ('year_8', 'Year 8', 'secondary', 21),
                                                                   ('year_9', 'Year 9', 'secondary', 22),
                                                                   ('year_9_scholarship', 'Year 9 - Scholarship', 'secondary', 23),
                                                                   ('year_10', 'Year 10', 'secondary', 24),
                                                                   ('year_11', 'Year 11', 'secondary', 25),

                                                                   -- Sixth Form
                                                                   ('year_12', 'Year 12', 'sixth_form', 30),
                                                                   ('year_12_ib', 'Year 12_IB', 'sixth_form', 31),
                                                                   ('year_13', 'Year 13', 'sixth_form', 32),

                                                                   -- GCSE Programs
                                                                   ('1_year_gcse', '1 Year GCSE', 'gcse', 40),
                                                                   ('1_year_igcse', '1 Year IGCSE', 'gcse', 41),
                                                                   ('1_year_igcse_gcse', '1 Year IGCSE/GCSE', 'gcse', 42),
                                                                   ('2_year_igcse_gcse', '2 Years IGCSE/GCSE', 'gcse', 43),
                                                                   ('3_year_gcse', '3-Year GCSE', 'gcse', 44),
                                                                   ('pre_gcse', 'Pre-GCSE', 'gcse', 45),
                                                                   ('gcse_pathway_discovery_y9', 'GCSE Pathway Discovery Year 9 Entry', 'gcse', 46),
                                                                   ('gcse_academic_pathway_y10', 'GCSE Academic Pathway Year 10 Entry', 'gcse', 47),

                                                                   -- A-Level Programs
                                                                   ('1_year_al', '1 Year AL', 'a_level', 50),
                                                                   ('18_months_al', '18 months AL', 'a_level', 51),
                                                                   ('2_year_al', '2-Year AL', 'a_level', 52),
                                                                   ('3_year_al', '3 Years AL', 'a_level', 53),
                                                                   ('a_level', 'A Level', 'a_level', 54),
                                                                   ('al_plus', 'AL plus+', 'a_level', 55),

                                                                   -- Pre A-Level
                                                                   ('pre_al', 'Pre-AL', 'pre_al', 60),
                                                                   ('1_year_pre_al', '1-Year Pre-AL', 'pre_al', 61),
                                                                   ('2_year_pre_al', '2-Year Pre-AL', 'pre_al', 62),
                                                                   ('1_year_pre_sixth_form', '1 Year Pre-Sixth Form Programme', 'pre_al', 63),
                                                                   ('pre_sixth_form_course', 'Pre-Sixth Form Course', 'pre_al', 64),
                                                                   ('pre_6th_form', 'Pre-6th Form', 'pre_al', 65),

                                                                   -- IB Programs
                                                                   ('ib', 'IB', 'ib', 70),
                                                                   ('pre_ib', 'Pre-IB', 'ib', 71),

                                                                   -- Foundation Programs
                                                                   ('foundation', 'Foundation', 'foundation', 80),
                                                                   ('1_year_foundation', '1-Year Foundation', 'foundation', 81),
                                                                   ('international_foundation', 'International Foundation', 'foundation', 82),
                                                                   ('international_foundation_year', 'International Foundation Year', 'foundation', 83),
                                                                   ('sixth_form_foundation', 'Sixth Form Foundation', 'foundation', 84),
                                                                   ('sixth_form_foundation_year', 'Sixth Form Foundation Year', 'foundation', 85),
                                                                   ('6th_form_foundation', '6th Form Foundation', 'foundation', 86),
                                                                   ('pre_foundation', 'Pre-Foundation', 'foundation', 87),
                                                                   ('foundation_degree', 'Foundation Degree', 'foundation', 88),
                                                                   ('1_year_junior_foundation', '1-Year Junior Foundation Course', 'foundation', 89),

                                                                   -- English Programs
                                                                   ('english', 'English', 'english', 90),
                                                                   ('english_course', 'English Course', 'english', 91),
                                                                   ('english_for_education', 'English for Education', 'english', 92),
                                                                   ('english_plus_multi_activities', 'English Plus Multi-Activities', 'english', 93),
                                                                   ('english_preparation_pathways', 'English Preparation for Pathways (EPP)', 'english', 94),
                                                                   ('english_language_prep', 'English Language Preparation Programme (ELPP)', 'english', 95),
                                                                   ('pre_sessional_course', 'Pre-Sessional Course', 'english', 96),
                                                                   ('ielts', 'IELTS', 'english', 97),
                                                                   ('ielts_express', 'IELTS Express', 'english', 98),

                                                                   -- Vocational / Other
                                                                   ('btec', 'BTEC', 'vocational', 100),
                                                                   ('access_fe', 'Access to Further Education', 'vocational', 101),
                                                                   ('development_year', 'Development Year', 'other', 102),
                                                                   ('academic_preparation', 'Academic Preparation Programme', 'other', 103),
                                                                   ('accelerated_learning', 'Accelerated Learning Programme (BALP)', 'other', 104),

                                                                   -- Summer Programs
                                                                   ('summer', 'Summer', 'summer', 110),
                                                                   ('summer_4', 'Summer-4', 'summer', 111),
                                                                   ('summer_8', 'Summer-8', 'summer', 112),
                                                                   ('easter', 'Easter', 'summer', 113),

                                                                   -- Levels
                                                                   ('level_4', 'Level 4', 'level', 120),
                                                                   ('level_5', 'Level 5', 'level', 121),
                                                                   ('level_6', 'Level 6', 'level', 122),
                                                                   ('level_7', 'Level 7', 'level', 123),
                                                                   ('level_8', 'Level 8', 'level', 124),
                                                                   ('level_9', 'Level 9', 'level', 125),
                                                                   ('level_10', 'Level 10', 'level', 126);

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