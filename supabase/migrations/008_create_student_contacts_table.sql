-- ============================================================================
-- Migration: 008_create_student_contacts_table
-- Description: Student contacts (parents, guardians, etc.) - one-to-many with students
-- Depends on: 003_create_profiles_table, 006_create_students_table, 007_create_contact_reference_tables
-- ============================================================================

create table public.student_contacts (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to student (required)
  student_id uuid not null references public.students(id) on delete cascade,
  
  -- Relationship type (FK)
  relationship_id int references public.contact_relationships(id),
  
  -- Personal Information
  title_id int references public.contact_titles(id),
  surname text,
  first_name text,
  gender text check (gender in ('M', 'F')),
  
  -- Contact Information
  telephone text,
  mobile text,
  fax text,
  email_1 text,
  email_2 text,
  email_3 text,
  
  -- Address
  address_1 text,
  address_2 text,
  
  -- Office Information
  occupation text,
  office_telephone text,
  office_fax text,
  
  -- Priority (1-10, lower = higher priority)
  priority int check (priority >= 1 and priority <= 10),
  
  -- Status
  status text default 'normal' check (status in ('normal', 'suspended')),
  
  -- Notes
  remarks text,
  
  -- Staff assignment (UUID reference to profiles)
  assigned_to uuid references public.profiles(id),
  
  -- Audit fields
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  
  -- Legacy timestamp
  legacy_last_update timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index student_contacts_student_id_idx on public.student_contacts(student_id);
create index student_contacts_relationship_id_idx on public.student_contacts(relationship_id);
create index student_contacts_title_id_idx on public.student_contacts(title_id);
create index student_contacts_priority_idx on public.student_contacts(priority);
create index student_contacts_status_idx on public.student_contacts(status);
create index student_contacts_email_1_idx on public.student_contacts(email_1);
create index student_contacts_surname_idx on public.student_contacts(surname);
create index student_contacts_assigned_to_idx on public.student_contacts(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.student_contacts enable row level security;

create policy "student_contacts_select_policy" on public.student_contacts
  for select to authenticated using (true);
create policy "student_contacts_insert_policy" on public.student_contacts
  for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "student_contacts_update_policy" on public.student_contacts
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);
create policy "student_contacts_delete_policy" on public.student_contacts
  for delete to authenticated
  using ((select auth.uid()) = created_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_contacts_updated_at
  before update on public.student_contacts
  for each row
  execute function public.handle_updated_at();
