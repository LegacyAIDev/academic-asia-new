-- ============================================================================
-- Migration: 005_create_student_contacts_table
-- Description: Create student contacts (parents/guardians) table
-- ============================================================================

create table public.student_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  relation text not null, -- Mother, Father, Guardian, etc.
  first_name text not null,
  surname text not null,
  title text,
  gender text check (gender in ('M', 'F', 'Other')),
  phone text,
  mobile text,
  email text,
  occupation text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index student_contacts_student_id_idx on public.student_contacts(student_id);

-- Enable RLS
alter table public.student_contacts enable row level security;

-- RLS Policies (inherit access from parent student)
create policy "Users can view contacts for viewable students"
  on public.student_contacts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = student_id
    )
  );

create policy "Users can create contacts for own students"
  on public.student_contacts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.students s
      where s.id = student_id
      and s.created_by = (select auth.uid())
    )
  );

create policy "Users can update contacts for own students"
  on public.student_contacts
  for update
  to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = student_id
      and s.created_by = (select auth.uid())
    )
  );

create policy "Users can delete contacts for own students"
  on public.student_contacts
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = student_id
      and s.created_by = (select auth.uid())
    )
  );

comment on table public.student_contacts is 'Parent/guardian contacts for students';
