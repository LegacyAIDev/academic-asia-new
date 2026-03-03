-- ============================================================================
-- Migration: 017_create_student_visa_table
-- Description: Student visa applications
-- Depends on: 006_create_students_table, 005_create_schools_table
-- ============================================================================

-- ============================================================================
-- VISA STATUS REFERENCE TABLE
-- ============================================================================

create table public.visa_statuses (
                                      id serial primary key,
                                      code text unique not null,
                                      label text not null,
                                      sort_order int default 0
);

insert into public.visa_statuses (code, label, sort_order) values
                                                               ('normal', 'Normal', 1),
                                                               ('suspended', 'Suspended', 2),
                                                               ('completed', 'Completed', 3),
                                                               ('cancelled', 'Cancelled', 4);

-- ============================================================================
-- STUDENT VISA TABLE
-- ============================================================================

create table public.student_visas (
                                      id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                      student_id uuid not null references public.students(id) on delete cascade,
                                      school_id uuid references public.schools(id),  -- School they're applying visa for

    -- Application details
                                      application text,                    -- Application reference/notes
                                      entry_year text,                     -- "201309" format (YYYYMM)
                                      entry_month int,                     -- Extracted month
                                      entry_year_value int,                -- Extracted year

    -- Status
                                      status_id int references public.visa_statuses(id) default 1,

    -- Checklist flags (visa application workflow)
                                      request_sent_to_parent boolean default false,    -- SR
                                      passport_received boolean default false,         -- PR
                                      passport_sent_to_school boolean default false,   -- PS
                                      sent_visa_information boolean default false,     -- SV
                                      cas_received boolean default false,              -- CAS
                                      visa_granted boolean default false,              -- VG
                                      visa_copy boolean default false,                 -- VC
                                      visa_copy_sent boolean default false,            -- VCS
                                      appointment boolean default false,               -- AP

    -- Appointment
                                      appointment_date timestamptz,

    -- Financial
                                      amount decimal(10,2) default 0,
                                      receipt text,

    -- Remarks
                                      remarks text,

    -- Legacy fields (additional checkboxes from CSV)
                                      legacy_case_10 boolean default false,
                                      legacy_case_11 boolean default false,
                                      legacy_case_15 boolean default false,
                                      legacy_case_17 boolean default false,
                                      legacy_case_20 boolean default false,
                                      legacy_case_21 boolean default false,
                                      legacy_case_22 boolean default false,
                                      legacy_case_23 boolean default false,

    -- Legacy tracking
                                      legacy_student_code text,
                                      legacy_school_name text,             -- Original school name from CSV

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

create index visa_statuses_code_idx on public.visa_statuses(code);

create index student_visas_student_id_idx on public.student_visas(student_id);
create index student_visas_school_id_idx on public.student_visas(school_id);
create index student_visas_status_id_idx on public.student_visas(status_id);
create index student_visas_entry_year_idx on public.student_visas(entry_year);
create index student_visas_assigned_to_idx on public.student_visas(assigned_to);

-- Composite index for common query
create index student_visas_student_school_idx on public.student_visas(student_id, school_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.visa_statuses enable row level security;
alter table public.student_visas enable row level security;

create policy "visa_statuses_select" on public.visa_statuses
  for select to authenticated using (true);

create policy "student_visas_select" on public.student_visas
  for select to authenticated using (true);
create policy "student_visas_insert" on public.student_visas
  for insert to authenticated with check (true);
create policy "student_visas_update" on public.student_visas
  for update to authenticated using (true) with check (true);
create policy "student_visas_delete" on public.student_visas
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_visas_updated_at
    before update on public.student_visas
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.visa_statuses is 'Visa application status reference';
comment on table public.student_visas is 'Student visa applications linked to school applications';
comment on column public.student_visas.request_sent_to_parent is 'SR - Request sent to parent';
comment on column public.student_visas.passport_received is 'PR - Passport received';
comment on column public.student_visas.passport_sent_to_school is 'PS - Passport sent to school';
comment on column public.student_visas.sent_visa_information is 'SV - Sent visa information';
comment on column public.student_visas.cas_received is 'CAS - CAS received';
comment on column public.student_visas.visa_granted is 'VG - Visa granted';
comment on column public.student_visas.visa_copy is 'VC - Visa copy';
comment on column public.student_visas.visa_copy_sent is 'VCS - Visa copy sent';
comment on column public.student_visas.appointment is 'AP - Appointment';