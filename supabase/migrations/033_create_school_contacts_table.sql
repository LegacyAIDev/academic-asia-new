-- ============================================================================
-- Migration: 033_create_school_contacts_table
-- Description: School contact persons (admissions, accounts, registrars, etc.)
-- Depends on: 005_create_schools_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- SCHOOL CONTACTS TABLE
-- ============================================================================

create table public.school_contacts (
                                        id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                        school_id uuid not null references public.schools(id) on delete cascade,

    -- Contact person details
                                        position text,                       -- "Headmistress", "Registrar", "Accounts", etc.
                                        surname text,
                                        first_name text,
                                        title text,                          -- "Mr", "Mrs", "Ms", "Dr", etc.
                                        gender text,                         -- "M", "F"

    -- Contact info
                                        telephone text,
                                        mobile text,
                                        fax text,
                                        email_1 text,
                                        email_2 text,
                                        email_3 text,

    -- Address
                                        address_1 text,
                                        address_2 text,

    -- Priority & responsibility
                                        priority int,                        -- Contact priority ordering
                                        responsible text,                    -- Area of responsibility ("Admissions", "Expo", "Accounts & Expo", etc.)

    -- Remarks
                                        remarks text,

    -- Legacy tracking
                                        legacy_school_id int,

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

create index school_contacts_school_id_idx on public.school_contacts(school_id);
create index school_contacts_priority_idx on public.school_contacts(priority);
create index school_contacts_assigned_to_idx on public.school_contacts(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.school_contacts enable row level security;

create policy "school_contacts_select" on public.school_contacts
    for select to authenticated using (true);
create policy "school_contacts_insert" on public.school_contacts
    for insert to authenticated with check (true);
create policy "school_contacts_update" on public.school_contacts
    for update to authenticated using (true) with check (true);
create policy "school_contacts_delete" on public.school_contacts
    for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_contacts_updated_at
    before update on public.school_contacts
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.school_contacts is 'School contact persons - admissions, registrars, accounts staff, etc.';
comment on column public.school_contacts.position is 'Contact person role/position at the school';
comment on column public.school_contacts.responsible is 'Area of responsibility - free text, can be compound (e.g. "Admissions & Expo")';
comment on column public.school_contacts.priority is 'Contact priority ordering (1 = primary)';