-- ============================================================================
-- Migration: 029_create_student_officers_table
-- Description: Student-consultant assignment (which consultants handle which students)
-- Depends on: 006_create_students_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- OFFICER ROLE TYPES REFERENCE TABLE
-- ============================================================================

create table public.officer_role_types (
                                           id serial primary key,
                                           code text unique not null,
                                           label text not null,
                                           sort_order int default 0,
                                           is_active boolean default true
);

insert into public.officer_role_types (code, label, sort_order) values
                                                                    ('major', 'Major', 1),
                                                                    ('minor', 'Minor', 2);

-- ============================================================================
-- STUDENT OFFICERS TABLE
-- ============================================================================

create table public.student_officers (
                                         id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                         student_id uuid not null references public.students(id) on delete cascade,
                                         consultant_id uuid references public.profiles(id) on delete set null,

    -- Priority & role
                                         priority int default 1,              -- Ordering priority (1 = primary, 2 = secondary, etc.)
                                         role_id int references public.officer_role_types(id),

    -- Remarks
                                         remarks text,

    -- Legacy tracking
                                         legacy_student_code text,
                                         legacy_consultant_id text,           -- Original "AA00007" consultant code

    -- Assignment (who made this assignment)
                                         assigned_to uuid references public.profiles(id),

    -- Audit
                                         created_at timestamptz default now(),
                                         updated_at timestamptz default now(),
                                         legacy_last_update timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index officer_role_types_code_idx on public.officer_role_types(code);

create index student_officers_student_id_idx on public.student_officers(student_id);
create index student_officers_consultant_id_idx on public.student_officers(consultant_id);
create index student_officers_priority_idx on public.student_officers(priority);
create index student_officers_role_id_idx on public.student_officers(role_id);
create index student_officers_assigned_to_idx on public.student_officers(assigned_to);

-- Composite: find all students for a consultant
create index student_officers_consultant_priority_idx on public.student_officers(consultant_id, priority);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.officer_role_types enable row level security;
alter table public.student_officers enable row level security;

create policy "officer_role_types_select" on public.officer_role_types
    for select to authenticated using (true);

create policy "student_officers_select" on public.student_officers
    for select to authenticated using (true);
create policy "student_officers_insert" on public.student_officers
    for insert to authenticated with check (true);
create policy "student_officers_update" on public.student_officers
    for update to authenticated using (true) with check (true);
create policy "student_officers_delete" on public.student_officers
    for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_officers_updated_at
    before update on public.student_officers
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.officer_role_types is 'Reference table for officer role types (major/minor)';
comment on table public.student_officers is 'Student-consultant assignments - which consultants handle which students';
comment on column public.student_officers.consultant_id is 'The consultant/officer assigned to this student';
comment on column public.student_officers.priority is 'Assignment priority (1=primary, 2=secondary, etc.)';
comment on column public.student_officers.role_id is 'Role type - major or minor case handler';