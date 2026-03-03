-- ============================================================================
-- Migration: 014_create_application_reference_tables
-- Description: Reference tables for student school applications
-- ============================================================================

-- ============================================================================
-- APPLICATION STATUS (Enrol Status)
-- ============================================================================

create table public.application_statuses (
                                             id serial primary key,
                                             code text unique not null,
                                             label text not null,
                                             category text,           -- 'awaiting', 'offered', 'deposited', 'rejected', 'other'
                                             sort_order int default 0,
                                             is_active boolean default true
);

insert into public.application_statuses (code, label, category, sort_order) values
                                                                                -- Awaiting statuses
                                                                                ('awaiting_aa_test', 'Awaiting AA Test', 'awaiting', 10),
                                                                                ('awaiting_exam_paper', 'Awaiting Exam Paper', 'awaiting', 11),
                                                                                ('awaiting_expo_result', 'Awaiting Expo Result', 'awaiting', 12),
                                                                                ('awaiting_interview', 'Awaiting Interview', 'awaiting', 13),
                                                                                ('awaiting_interview_wl', 'Awaiting Interview (WL)', 'awaiting', 14),
                                                                                ('awaiting_interview_reg', 'Awaiting Interview (Reg)', 'awaiting', 15),
                                                                                ('awaiting_offer', 'Awaiting Offer', 'awaiting', 16),
                                                                                ('awaiting_offer_wo_reg', 'Awaiting Offer wo Reg', 'awaiting', 17),
                                                                                ('awaiting_response_s', 'Awaiting Response (S)', 'awaiting', 18),
                                                                                ('awaiting_response_p', 'Awaiting Response (P)', 'awaiting', 19),
                                                                                ('awaiting_school_after_ukiset', 'Awaiting School after UKiset', 'awaiting', 20),
                                                                                ('awaiting_testing', 'Awaiting Testing', 'awaiting', 21),
                                                                                ('awaiting_testing_after_deposit', 'Awaiting Testing after Deposit', 'awaiting', 22),
                                                                                ('awaiting_testing_after_offered', 'Awaiting Testing after Offered', 'awaiting', 23),
                                                                                ('awaiting_testing_wo_reg', 'Awaiting Testing wo Reg', 'awaiting', 24),
                                                                                ('awaiting_ts_result', 'Awaiting TS Result', 'awaiting', 25),

                                                                                -- Offered statuses
                                                                                ('offered', 'Offered', 'offered', 30),
                                                                                ('offered_c', 'Offered (C)', 'offered', 31),
                                                                                ('offered_wo_reg', 'Offered wo Reg', 'offered', 32),
                                                                                ('offered_without_reg', 'Offered without Reg', 'offered', 33),
                                                                                ('offered_scholarship', 'Offered-scholarship', 'offered', 34),

                                                                                -- Deposited statuses
                                                                                ('deposited', 'DEPOSITED', 'deposited', 40),
                                                                                ('deposited_cond', 'DEPOSITED-Cond', 'deposited', 41),
                                                                                ('deposited_cond_cfmed', 'DEPOSITED-Cond-cfmed', 'deposited', 42),
                                                                                ('deposited_scholarship', 'DEPOSITED-Scholarship', 'deposited', 43),
                                                                                ('deposited_scholarship_c', 'DEPOSITED-Scholarship (C)', 'deposited', 44),

                                                                                -- Waiting list statuses
                                                                                ('waiting_list', 'Waiting List', 'waiting', 50),
                                                                                ('waiting_list_after_exam', 'Waiting List after Exam', 'waiting', 51),

                                                                                -- Completed/Positive outcomes
                                                                                ('completed', 'Completed', 'positive', 60),
                                                                                ('confirmed', 'Confirmed', 'positive', 61),
                                                                                ('proceed', 'Proceed', 'positive', 62),
                                                                                ('proceed_after_ukiset', 'Proceed after UKiset', 'positive', 63),
                                                                                ('result_received', 'Result Received', 'positive', 64),
                                                                                ('joined_school_left_after', 'Joined School but Left After', 'positive', 65),

                                                                                -- Negative outcomes
                                                                                ('rejected', 'Rejected', 'negative', 70),
                                                                                ('declined', 'Declined', 'negative', 71),
                                                                                ('withdrawn', 'Withdrawn', 'negative', 72),
                                                                                ('drop', 'Drop', 'negative', 73),
                                                                                ('cannot_proceed', 'Cannot Proceed', 'negative', 74),
                                                                                ('tnfa', 'TNFA', 'negative', 75),
                                                                                ('no_show_interview', 'No Show-Interview', 'negative', 76),

                                                                                -- Full/Unavailable
                                                                                ('full', 'FULL', 'unavailable', 80),
                                                                                ('full_check_later', 'FULL-check later', 'unavailable', 81),
                                                                                ('full_wl', 'FULL-WL', 'unavailable', 82),

                                                                                -- Other
                                                                                ('general_enquiry', 'General Enquiry', 'other', 90),
                                                                                ('check_place', 'Check Place', 'other', 91),
                                                                                ('hold', 'Hold', 'other', 92),
                                                                                ('remind_p', 'Remind P', 'other', 93),
                                                                                ('test_only_refer', 'Test Only (Refer)', 'other', 94),
                                                                                ('re_assess_after_exam', 'Re-assess after Exam', 'other', 95);

-- ============================================================================
-- APPLICATION SUB-STATUS (Sub-Enrol Status)
-- ============================================================================

create table public.application_sub_statuses (
                                                 id serial primary key,
                                                 code text unique not null,
                                                 label text not null,
                                                 category text,
                                                 sort_order int default 0,
                                                 is_active boolean default true
);

insert into public.application_sub_statuses (code, label, category, sort_order) values
                                                                                    -- Scholarship types
                                                                                    ('scholarship_academic', 'Scholarship-Academic Scholarship', 'scholarship', 10),
                                                                                    ('scholarship_music', 'Scholarship-Music Scholarship', 'scholarship', 11),
                                                                                    ('scholarship_music_exhibition', 'Scholarship-Music Exhibition', 'scholarship', 12),
                                                                                    ('scholarship_academic_exhibition', 'Scholarship-Academic Exhibition', 'scholarship', 13),
                                                                                    ('scholarship_sports', 'Scholarship-Sports Scholarship', 'scholarship', 14),
                                                                                    ('scholarship_art', 'Scholarship-Art Scholarship', 'scholarship', 15),
                                                                                    ('scholarship_boarding', 'Scholarship-Boarding Scholarship', 'scholarship', 16),
                                                                                    ('scholarship_academic_music', 'Scholarship-Academic & Music Scholarship', 'scholarship', 17),
                                                                                    ('scholarship_academic_music_ex', 'Scholarship-Academic Scholarship & Music Exhibition', 'scholarship', 18),
                                                                                    ('scholarship_academic_ex_music', 'Scholarship-Academic Exhibition & Music Scholarship', 'scholarship', 19),
                                                                                    ('scholarship_art_music', 'Scholarship-Art and Music Scholarship', 'scholarship', 20),
                                                                                    ('scholarship_academic_music_exhibition', 'Scholarship-Academic & Music Exhibition', 'scholarship', 21),
                                                                                    ('scholarship_conditional_cfmed', 'Scholarship-Conditional-Cfmed', 'scholarship', 22),
                                                                                    ('other_awards', 'Other Awards', 'scholarship', 23),

                                                                                    -- Conditional
                                                                                    ('conditional', 'Conditional', 'conditional', 30),
                                                                                    ('conditional_cfmed', 'Conditional-Cfmed', 'conditional', 31),
                                                                                    ('conditional_offer', 'Conditional Offer', 'conditional', 32),

                                                                                    -- Process statuses
                                                                                    ('awaiting_exam_paper', 'Awaiting Exam Paper', 'process', 40),
                                                                                    ('await_offer_letter', 'Await Offer Letter', 'process', 41),
                                                                                    ('without_offer_letter', 'Without Offer Letter', 'process', 42),
                                                                                    ('await_ukiset', 'Await UKiset', 'process', 43),
                                                                                    ('check_later', 'Check Later (select date)', 'process', 44),
                                                                                    ('check_place', 'check place', 'process', 45),
                                                                                    ('informed_school', 'Informed school', 'process', 46),
                                                                                    ('student_info_emailed_school', 'Student info emailed school', 'process', 47),
                                                                                    ('decided_not_to_sit_exam', 'Decided not to sit for exam', 'process', 48),

                                                                                    -- Registration sent
                                                                                    ('regff_sent_email_post', 'Regff sent by email & reg post (bankers draft or cheque)', 'registration', 50),
                                                                                    ('regff_sent_await_ukiset', 'Regff sent and await UKiset', 'registration', 51),
                                                                                    ('exam_papers_email_airmail', 'exam papers sent by email and air mail', 'registration', 52),
                                                                                    ('exam_papers_email_courier', 'exam papers sent by email and courier', 'registration', 53),
                                                                                    ('exam_papers_bulk_courier', 'exam papers BULK sent by courier', 'registration', 54),

                                                                                    -- Other
                                                                                    ('normal', 'Normal', 'other', 60),
                                                                                    ('summer', 'Summer', 'other', 61);

-- ============================================================================
-- APPLICATION MODES
-- ============================================================================

create table public.application_modes (
                                          id serial primary key,
                                          code text unique not null,
                                          label text not null,
                                          sort_order int default 0
);

insert into public.application_modes (code, label, sort_order) values
                                                                   ('normal', 'Normal', 1),
                                                                   ('suspended', 'Suspended', 2);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index application_statuses_code_idx on public.application_statuses(code);
create index application_statuses_category_idx on public.application_statuses(category);
create index application_sub_statuses_code_idx on public.application_sub_statuses(code);
create index application_modes_code_idx on public.application_modes(code);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.application_statuses enable row level security;
alter table public.application_sub_statuses enable row level security;
alter table public.application_modes enable row level security;

create policy "application_statuses_select" on public.application_statuses
  for select to authenticated using (true);
create policy "application_sub_statuses_select" on public.application_sub_statuses
  for select to authenticated using (true);
create policy "application_modes_select" on public.application_modes
  for select to authenticated using (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.application_statuses is 'Student application enrollment status reference';
comment on table public.application_sub_statuses is 'Student application sub-status reference';
comment on table public.application_modes is 'Application mode: Normal or Suspended';