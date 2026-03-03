-- ============================================================================
-- Migration: 021_create_school_fees_table
-- Description: School fee structure (tuition, deposits, registration fees)
-- Depends on: 005_create_schools_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- FEE TYPE REFERENCE TABLE
-- ============================================================================

create table public.fee_types (
                                  id serial primary key,
                                  code text unique not null,
                                  label text not null,
                                  sort_order int default 0,
                                  is_active boolean default true
);

insert into public.fee_types (code, label, sort_order) values
                                                           ('course', 'Course', 1),
                                                           ('registration_fee', 'Registration Fee', 2),
                                                           ('deposit', 'Deposit', 3),
                                                           ('others', 'Others', 4);

-- ============================================================================
-- SCHOOL FEES TABLE
-- ============================================================================

create table public.school_fees (
                                    id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                    school_id uuid not null references public.schools(id) on delete cascade,

    -- Financial year (e.g., "2023-24")
                                    financial_year text,

    -- Fee details
                                    fee_type_id int references public.fee_types(id),
                                    description text,                    -- Year level or description (e.g., "Year 12", "Deposit")
                                    amount decimal(12,2) default 0,      -- Fee amount in GBP

    -- Payable to (usually school name, redundant but kept for legacy)
                                    payable_to text,

    -- Date range (when applicable)
                                    start_date date,
                                    end_date date,

    -- Remarks
                                    remarks text,

    -- Legacy tracking
                                    legacy_school_id int,
                                    legacy_fee_type text,

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

create index fee_types_code_idx on public.fee_types(code);

create index school_fees_school_id_idx on public.school_fees(school_id);
create index school_fees_fee_type_id_idx on public.school_fees(fee_type_id);
create index school_fees_financial_year_idx on public.school_fees(financial_year);
create index school_fees_assigned_to_idx on public.school_fees(assigned_to);

-- Composite for common queries
create index school_fees_school_year_idx on public.school_fees(school_id, financial_year);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.fee_types enable row level security;
alter table public.school_fees enable row level security;

create policy "fee_types_select" on public.fee_types
  for select to authenticated using (true);

create policy "school_fees_select" on public.school_fees
  for select to authenticated using (true);
create policy "school_fees_insert" on public.school_fees
  for insert to authenticated with check (true);
create policy "school_fees_update" on public.school_fees
  for update to authenticated using (true) with check (true);
create policy "school_fees_delete" on public.school_fees
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_fees_updated_at
    before update on public.school_fees
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.fee_types is 'Fee type reference: Course, Registration Fee, Deposit, Others';
comment on table public.school_fees is 'School fee structure by year level and financial year';
comment on column public.school_fees.description is 'Year level or fee description (e.g., Year 12, Deposit)';
comment on column public.school_fees.amount is 'Fee amount in GBP';