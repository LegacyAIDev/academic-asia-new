-- ============================================================================
-- Migration: 024_create_school_notes_table
-- Description: Categorized school notes/information
-- Depends on: 005_create_schools_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- NOTE CATEGORY REFERENCE TABLE
-- ============================================================================

create table public.school_note_categories (
                                               id serial primary key,
                                               code text unique not null,
                                               label text not null,
                                               sort_order int default 0,
                                               is_active boolean default true
);

insert into public.school_note_categories (code, label, sort_order) values
                                                                        -- Main categories
                                                                        ('school', 'School', 1),
                                                                        ('academic', 'Academic', 2),
                                                                        ('al_subjects', 'AL Subjects', 3),
                                                                        ('accommodation', 'Accommodation', 4),
                                                                        ('sports', 'Sports', 5),
                                                                        ('activities', 'Activities', 6),
                                                                        ('music', 'Music', 7),
                                                                        ('application_procedure', 'Application Procedure', 8),
                                                                        ('aa_only', 'AA Only', 9),
                                                                        -- Less common
                                                                        ('scholarship', 'Scholarship', 10),
                                                                        ('ukiset', 'UKiset', 11),
                                                                        ('feature', 'Feature', 12),
                                                                        ('isi', 'ISI', 13),
                                                                        ('alumni', 'Alumni', 14),
                                                                        ('competition', 'Competition', 15),
                                                                        ('university_destination', 'University Destination', 16),
                                                                        ('nationality_mix', 'Nationality Mix', 17),
                                                                        ('portrait', 'Portrait', 18),
                                                                        ('early_entry_scheme', 'Early Entry Scheme', 19),
                                                                        ('visit', 'Visit', 20),
                                                                        ('selected_school_list_remark_eng', 'Selected School List Remark (English)', 21),
                                                                        ('selected_school_list_remark_chi', 'Selected School List Remark (Chinese)', 22),
                                                                        ('others', 'Others', 99);

-- ============================================================================
-- SCHOOL NOTES TABLE
-- ============================================================================

create table public.school_notes (
                                     id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                     school_id uuid not null references public.schools(id) on delete cascade,

    -- Note details
                                     category_id int references public.school_note_categories(id),
                                     detail text,                         -- The actual note content

    -- Flag (purpose unclear from data, mostly N)
                                     is_flagged boolean default false,    -- "case" field Y/N

    -- Legacy tracking
                                     legacy_school_id int,
                                     legacy_category text,

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

create index school_note_categories_code_idx on public.school_note_categories(code);

create index school_notes_school_id_idx on public.school_notes(school_id);
create index school_notes_category_id_idx on public.school_notes(category_id);
create index school_notes_assigned_to_idx on public.school_notes(assigned_to);

-- Composite for common queries
create index school_notes_school_category_idx on public.school_notes(school_id, category_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.school_note_categories enable row level security;
alter table public.school_notes enable row level security;

create policy "school_note_categories_select" on public.school_note_categories
  for select to authenticated using (true);

create policy "school_notes_select" on public.school_notes
  for select to authenticated using (true);
create policy "school_notes_insert" on public.school_notes
  for insert to authenticated with check (true);
create policy "school_notes_update" on public.school_notes
  for update to authenticated using (true) with check (true);
create policy "school_notes_delete" on public.school_notes
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger school_notes_updated_at
    before update on public.school_notes
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.school_note_categories is 'Categories for school notes: Academic, Sports, Accommodation, etc.';
comment on table public.school_notes is 'Categorized school notes and information';
comment on column public.school_notes.detail is 'The actual note content (can be multi-line)';