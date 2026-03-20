-- ============================================================================
-- Migration: 036_add_school_intro_approval
-- Description: Add approval workflow and sent history to student_brief_intro
--              for the School Intro feature.
--
--   - Approval gate: is_approved checkbox + who/when
--   - Sent history: audit trail of intros sent to schools
--
-- Depends on: 026_create_student_brief_intro_table, 005_create_schools_table
-- ============================================================================


-- ============================================================================
-- PART 1: ADD APPROVAL COLUMNS TO STUDENT_BRIEF_INTRO
-- ============================================================================

alter table public.student_brief_intro
    add column is_approved boolean default false,
  add column approved_at timestamptz,
  add column approved_by uuid references public.profiles(id);

comment on column public.student_brief_intro.is_approved is 'Senior consultant review gate — must be ticked before intro can be sent';
comment on column public.student_brief_intro.approved_at is 'When the intro was approved';
comment on column public.student_brief_intro.approved_by is 'Who approved the intro';


-- ============================================================================
-- PART 2: SENT HISTORY TABLE
-- ============================================================================
-- One intro can be sent to multiple schools at different times.
-- System-generated audit trail — not user-editable.
-- ============================================================================

create table public.student_intro_sent_history (
                                                   id uuid primary key default gen_random_uuid(),

    -- What was sent
                                                   brief_intro_id uuid not null references public.student_brief_intro(id) on delete cascade,

    -- Where it was sent
                                                   school_id uuid not null references public.schools(id) on delete cascade,

    -- When and by whom
                                                   sent_at timestamptz default now(),
                                                   sent_by uuid references public.profiles(id),

    -- How it was sent
                                                   method text                            -- 'email', 'whatsapp', etc.
);

create index student_intro_sent_brief_intro_id_idx
    on public.student_intro_sent_history(brief_intro_id);
create index student_intro_sent_school_id_idx
    on public.student_intro_sent_history(school_id);
create index student_intro_sent_at_idx
    on public.student_intro_sent_history(sent_at);

alter table public.student_intro_sent_history enable row level security;

create policy "student_intro_sent_select" on public.student_intro_sent_history
  for select to authenticated using (true);
create policy "student_intro_sent_insert" on public.student_intro_sent_history
  for insert to authenticated with check (true);

comment on table public.student_intro_sent_history is 'Audit trail: when student intros were sent to which schools';
comment on column public.student_intro_sent_history.method is 'Delivery method: email, whatsapp, etc.';