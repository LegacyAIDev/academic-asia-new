-- ============================================================================
-- Migration: 032_create_school_bank_details_table
-- Description: School banking/payment details for fees, deposits, registration
-- Depends on: 005_create_schools_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- BANK ACCOUNT TYPES REFERENCE TABLE
-- ============================================================================

create table public.bank_account_types (
                                           id serial primary key,
                                           code text unique not null,
                                           label text not null,
                                           sort_order int default 0,
                                           is_active boolean default true
);

insert into public.bank_account_types (code, label, sort_order) values
                                                                    ('course', 'Course', 1),
                                                                    ('registration_fee', 'Registration Fee', 2),
                                                                    ('deposit', 'Deposit', 3),
                                                                    ('summer', 'Summer', 4),
                                                                    ('all', 'All', 5),
                                                                    ('others', 'Others', 6);

-- ============================================================================
-- CURRENCIES REFERENCE TABLE
-- ============================================================================

create table public.currencies (
                                   id serial primary key,
                                   code text unique not null,
                                   label text not null,
                                   symbol text,
                                   sort_order int default 0,
                                   is_active boolean default true
);

insert into public.currencies (code, label, symbol, sort_order) values
                                                                    ('GBP', 'British Pound', '£', 1),
                                                                    ('EUR', 'Euro', '€', 2),
                                                                    ('CHF', 'Swiss Franc', 'CHF', 3),
                                                                    ('USD', 'US Dollar', '$', 4),
                                                                    ('HKD', 'Hong Kong Dollar', 'HK$', 5);

-- ============================================================================
-- SCHOOL BANK DETAILS TABLE
-- ============================================================================

create table public.school_bank_details (
                                            id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                            school_id uuid not null references public.schools(id) on delete cascade,

    -- Account type & currency
                                            account_type_id int references public.bank_account_types(id),
                                            currency_id int references public.currencies(id),

    -- Bank details
                                            bank_name text,
                                            account_number text,
                                            bank_address text,
                                            account_holder text,                 -- "ibankacc" in legacy = account holder/beneficiary name
                                            swift_code text,
                                            sort_code text,
                                            iban_number text,

    -- Billing
                                            billing_name text,

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

create index bank_account_types_code_idx on public.bank_account_types(code);
create index currencies_code_idx on public.currencies(code);

create index school_bank_details_school_id_idx on public.school_bank_details(school_id);
create index school_bank_details_account_type_id_idx on public.school_bank_details(account_type_id);
create index school_bank_details_currency_id_idx on public.school_bank_details(currency_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.bank_account_types enable row level security;
alter table public.currencies enable row level security;
alter table public.school_bank_details enable row level security;

create policy "bank_account_types_select" on public.bank_account_types
    for select to authenticated using (true);
create policy "currencies_select" on public.currencies
    for select to authenticated using (true);

create policy "school_bank_details_select" on public.school_bank_details
    for select to authenticated using (true);
create policy "school_bank_details_insert" on public.school_bank_details
    for insert to authenticated with check (true);
create policy "school_bank_details_update" on public.school_bank_details
    for update to authenticated using (true) with check (true);
create policy "school_bank_details_delete" on public.school_bank_details
    for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_bank_details_updated_at
    before update on public.school_bank_details
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.bank_account_types is 'Reference table for school bank account purpose types';
comment on table public.currencies is 'Reference table for currencies';
comment on table public.school_bank_details is 'School banking/payment details for fees, deposits, registration';
comment on column public.school_bank_details.account_holder is 'Account holder / beneficiary name (legacy: ibankacc field)';
comment on column public.school_bank_details.billing_name is 'Billing name (may differ from school name)';