-- Consolidate 243 free-text info types into 9 categories via reference table

begin;

-- Create reference table
create table public.school_sup_info_categories (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.school_sup_info_categories (code, label, sort_order) values
  ('admissions', 'Admissions', 0),
  ('academic', 'Academic', 1),
  ('boarding_holidays', 'Boarding & Holidays', 2),
  ('fees', 'Fees', 3),
  ('travel', 'Travel', 4),
  ('visa', 'Visa', 5),
  ('welfare', 'Welfare', 6),
  ('general', 'General', 7),
  ('other', 'Other', 8);

create index school_sup_info_categories_code_idx on public.school_sup_info_categories(code);

alter table public.school_sup_info_categories enable row level security;
create policy "school_sup_info_categories_select" on public.school_sup_info_categories
  for select to authenticated using (true);

-- Add category FK and rename old column
alter table public.school_supplementary_info
  rename column info_type to legacy_info_type;

alter table public.school_supplementary_info
  add column category_id int references public.school_sup_info_categories(id);

-- Map legacy values to category IDs
-- Boarding & Holidays (id 3)
update public.school_supplementary_info set category_id = 3
where legacy_info_type in (
  'Long Weekend Arrangement', 'Accommodation', 'Long Weekend', 'Accommodation Remark',
  'Half Term Arrangement', 'Holiday Arrangement', 'Term Begins Arrangement', 'Term Break Arrangement',
  'Xmas Break Boarding arranement', 'Boarding options', 'Shopping trips', 'Exeats',
  'Term Dates', 'Induction', 'Short-term stay places', 'Sixth form accommodation',
  'Term break arrangements', 'Video of Boarding Life at Prep School', 'Weekend Activities Programme',
  'Weekly boarding info', 'Proportion of British boarders stay at school over weekends',
  'Accommodation and recruitment update', 'Accommodation Deadline', 'Boarding', 'Boarding arrangement',
  'Boarding House', 'Boarding house tour (Virtual)', 'Boarding info', 'Boarding introduction',
  'Exeats remark', 'Host Family', 'Host family arrangement', 'Leave weekends',
  'New boarding house'
);

-- Admissions (id 1)
update public.school_supplementary_info set category_id = 1
where legacy_info_type in (
  'Admissions Info', 'No. of Chinese Student', 'Scholarship Info', 'ACL Code', 'ACL',
  'Entrance Exam', 'Online Application Form', 'Online form link', 'Joining Pack',
  'ACL code', 'Application', 'Online Registration Link', 'Reference from HK school',
  'School Visit', 'No. of Hong Kong & Chinese students', 'UKiset', 'Nationality Mix',
  'Intake from HK for Y12', 'Admissions & Assessment Info', 'Day place',
  'Proportion of International students', 'Scholarhip Info', 'No. of boarders',
  'No. of students', 'Nationality', 'Day Place Policy', 'Music Scholarship',
  'Registration deadline', 'Age Issue', 'No. of HK students', 'VISIT', 'Girls intake',
  'Age policy', 'Admissions Info (Day place)', 'School visit', 'Boarder No. and Nationality Mix',
  'Online Reg Link', 'Proportion of HK and mainland students', 'Application procedures',
  'Y9 2026 entry', 'Change from boarding to day place', 'Proportion of HK vs mainland students',
  'Q&A (Admissions Info)', 'Recruitment policy', 'Registration form links',
  'Scholarship & Exam Preparation Info', 'Scholarship Application Procedure',
  'Scholarship Deadline', 'Scholarship form', 'Sixth Form Offers',
  'Sixth Form Online Form Link', 'Sixth Form Open Morning Link', 'Taster Day',
  'Tonbridge Assessment Format', 'Ukiset vs CAT4:', 'Visitor Morning',
  'Withdrawing an acceptance', 'Y10 application for Sep 2023', 'Y10 day place',
  'Y12 application for Sep 2022', 'Y12 Online registration link',
  'Y8 & Y10 Sep-2023 Entry', 'Y8 day place', 'Y9 & 10 Online registration link',
  'Y9 2024 entry', 'Y9 2025 entry', 'Y9 2027 entry', 'Y9 Admissions',
  'Y9 assessment', 'Year Group Sizes', 'Year of Entry', '2020 CNY Open Day Visit',
  'Accept AA test', 'acl', 'Additional Info on Year 7', 'Admissions Info (Y9)',
  'Admissions Info for Mainland Chinese students', 'Admissions timeline for Y12 - Sep 2025',
  'Age', 'Applicants in UK schools', 'Application Deadline',
  'Application link for Dallam Experience', 'Application process', 'Application_Arrange Visit',
  'Deferral policy', 'Day Place', 'Day place 2023 & 2024', 'Deadlines',
  'Eng and Math Requirement', 'Entrance assessments',
  'Entrance Exam for UK based students', 'Entrance Exam Past Papers', 'Ethnicity',
  'Handwritten Personal Statement', 'IELTS', 'IELTS exemption',
  'Info for Sep 2021 entry', 'ISEB', 'Key dates for 2023 entry',
  'Late applications', 'Latest info about Y7 & 8', 'Music scholarship for Y9',
  'New Admissions Portal', 'No Year 10 entry', 'No. of HK & mainland students',
  'No. of international students', 'No. of students and % of boarders',
  'Note on Sep 2021 entry students', 'Online Application Link', 'Online Application Links',
  'Online form link (Y7)', 'Online Registration Form', 'Online registration link',
  'Online Scholarship Form', 'Online Sixth Form Application Form', 'Overseas application',
  'Past paper link', 'Percentage of Prep pupils progress to Brighton', 'Pre-screening',
  'Y9 Entry fee'
);

-- Fees (id 4)
update public.school_supplementary_info set category_id = 4
where legacy_info_type in (
  'EFL Cost', 'Music Tuition', 'Extras', 'Sibling Discount', 'Early Payment Discount',
  'Discounts', 'Pocket Money', 'Fees', 'OEA Fees', 'Visa fees', 'School fees',
  'EAL cost', 'Fees Refund Scheme', 'VAT', 'Sibling discount', 'Spring Term Fees 2021',
  'Refund', 'Registration fee', 'Bank accounts', 'Bursaries', 'Bursaries available',
  'Charges', 'Commission', 'Deposit in advance', 'Discount'
);

-- Academic (id 2)
update public.school_supplementary_info set category_id = 2
where legacy_info_type in (
  'Teacher/Pupil Ratio', 'EFL', 'Exam', 'Academic',
  'Summer school', 'IB', 'Reform of AL', 'Subject choices', 'Remote learning',
  'Sixth Form Info', 'A-Level Options', 'Oxbridge application', 'Oxbridge Offers',
  '1-Year GCSE Programme', 'IB Programme', 'EAL lessons', 'Ratio', 'SAT', 'SAT & ACT',
  'Saturday programmes', 'Short term courses', 'Sixth Form Handbook', 'Sports',
  'Summer school link', 'Year 12 Exam', '1 Year GCSE', 'Activities programme link',
  'Chinese lessons', 'Chinese Teaching',
  'Course info', 'Dancing class', 'Exam board', 'GCSE courses',
  'International Academic Pathway', 'Languages', 'Lesson arrangements under Covid',
  'Music info', 'Organ', 'Pre-AL course', 'Prep School Progression',
  'Preparation for Y12 students', 'School Results Information', 'Tutor group structure'
);

-- Travel (id 5)
update public.school_supplementary_info set category_id = 5
where legacy_info_type in (
  'Airport Pickup', 'Airport Pickup Remark', 'Hotel/B&B', 'Travel Info',
  'Airport Transfer', 'Taxi', 'Airport', 'End of Term flight dates', 'Hotel'
);

-- Visa (id 6)
update public.school_supplementary_info set category_id = 6
where legacy_info_type in (
  'Visa', 'visa', 'VISA', 'BNO Policy', 'Visa_Sponsor Liciense Name',
  'BNO', 'BNO day applicants', 'BRP letter'
);

-- Welfare (id 7)
update public.school_supplementary_info set category_id = 7
where legacy_info_type in (
  'Guardianship', 'Insurance', 'Coronavirus arrangements', 'Quarantine',
  'Quarantine update', 'Safeguarding', 'Temporary Guardianship', 'Underage Policy',
  'Vaccinations', 'Buddy scheme', 'Covid arrangements', 'Med-related Info',
  'PCR test'
);

-- Other (id 9)
update public.school_supplementary_info set category_id = 9
where legacy_info_type = 'Others';

-- General (id 8) — everything not yet mapped
update public.school_supplementary_info set category_id = 8
where category_id is null;

-- Also handle Leavers' Destination and Boarders' results (Academic)
update public.school_supplementary_info set category_id = 2
where legacy_info_type in ('Leavers'' Destination', 'Boarders'' results and destination');

-- Also handle Definition of "Home student" (Admissions)
update public.school_supplementary_info set category_id = 1
where legacy_info_type like 'Definition of%';

commit;
