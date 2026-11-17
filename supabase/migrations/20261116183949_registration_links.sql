-- Online registration (client feedback, 13 Nov 2026): staff send a family a
-- link, the family fills in the registration form, and submitting it creates
-- the student (status New) for staff to check.
--
-- Each link is for one family: it works once and expires. Only a hash of the
-- link's secret is stored, so the table never holds a usable link. Families
-- never touch this table directly: the public form goes through a server
-- action with the service role, which checks and uses up the link in one step.

create table if not exists public.registration_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  -- Who the link is for, as staff typed it ("Chan family"), only for their reference.
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  student_id uuid references public.students(id) on delete set null,
  constraint registration_links_note_length check (char_length(note) <= 120)
);

create index if not exists registration_links_created_at_idx on public.registration_links (created_at desc);

alter table public.registration_links enable row level security;

-- Staff see and create links; the app's own guards decide who may (Students edit right).
drop policy if exists "Staff can read registration links" on public.registration_links;
create policy "Staff can read registration links" on public.registration_links
  for select to authenticated using (true);
drop policy if exists "Staff can create registration links" on public.registration_links;
create policy "Staff can create registration links" on public.registration_links
  for insert to authenticated with check (created_by = auth.uid());

comment on table public.registration_links is 'One-use, expiring links that let a family register a new student online.';
