-- ============================================================================
-- Migration: 031_create_student_enquiries_table
-- Description: Student enquiry tracking (initial contact/follow-up actions)
-- Depends on: 006_create_students_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- ENQUIRY ACTION TYPES REFERENCE TABLE
-- ============================================================================

create table public.enquiry_action_types (
                                             id serial primary key,
                                             code text unique not null,
                                             label text not null,
                                             sort_order int default 0,
                                             is_active boolean default true
);

insert into public.enquiry_action_types (code, label, sort_order) values
                                                                      ('aa_test_oral_con', 'AA Test + Oral & Con Booked', 1),
                                                                      ('oral_con_booked', 'Oral & Con Booked', 2),
                                                                      ('left_message', 'Left Message to Con Team', 3);

-- ============================================================================
-- STUDENT ENQUIRIES TABLE
-- ============================================================================

create table public.student_enquiries (
                                          id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                          student_id uuid not null references public.students(id) on delete cascade,

    -- Enquiry details
                                          action_type_id int references public.enquiry_action_types(id),
                                          contact_refused boolean default false,
                                          enquiry_log text,

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

create index enquiry_action_types_code_idx on public.enquiry_action_types(code);

create index student_enquiries_student_id_idx on public.student_enquiries(student_id);
create index student_enquiries_action_type_id_idx on public.student_enquiries(action_type_id);
create index student_enquiries_assigned_to_idx on public.student_enquiries(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.enquiry_action_types enable row level security;
alter table public.student_enquiries enable row level security;

create policy "enquiry_action_types_select" on public.enquiry_action_types
    for select to authenticated using (true);

create policy "student_enquiries_select" on public.student_enquiries
    for select to authenticated using (true);
create policy "student_enquiries_insert" on public.student_enquiries
    for insert to authenticated with check (true);
create policy "student_enquiries_update" on public.student_enquiries
    for update to authenticated using (true) with check (true);
create policy "student_enquiries_delete" on public.student_enquiries
    for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_enquiries_updated_at
    before update on public.student_enquiries
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.enquiry_action_types is 'Reference table for enquiry follow-up action types';
comment on table public.student_enquiries is 'Student enquiry tracking - initial contact and follow-up actions';
comment on column public.student_enquiries.contact_refused is 'Whether the contact/student refused further contact';
comment on column public.student_enquiries.enquiry_log is 'Free-text enquiry activity log';