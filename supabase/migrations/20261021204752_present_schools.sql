-- ============================================================================
-- STUDENTS: PRESENT SCHOOLS
-- The school a student attends now, chosen from one shared list instead of
-- typed each time. Loaded from the Hong Kong list of primary and secondary
-- schools (scripts/43_import-present-schools.ts); schools missing from it are
-- added by staff from the student form and marked source = 'staff' so they can
-- be reviewed later.
--
-- Not the same thing as public.schools, which holds the UK partner schools
-- students apply to.
--
-- match_key and search_keys come from presentSchoolKey() in
-- src/lib/students/present-school-name.ts (case, dots, commas, apostrophes and
-- a leading "THE" ignored). search_keys holds the keys of the name and of every
-- alternative spelling, so a lookup by any spelling finds the school.
--
-- students.present_school (text) stays: the student list, search, exports and
-- overview read it. Choosing a school sets present_school_id and copies the
-- list name into present_school.
-- ============================================================================

create table if not exists public.present_schools (
  id          integer generated always as identity primary key,
  name        text not null,
  aliases     text[] not null default '{}',
  match_key   text not null unique,
  search_keys text[] not null default '{}',
  source      text not null default 'hk_list' check (source in ('hk_list', 'staff')),
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists present_schools_search_keys_idx
  on public.present_schools using gin (search_keys);

drop trigger if exists present_schools_updated_at on public.present_schools;
create trigger present_schools_updated_at
  before update on public.present_schools
  for each row execute function public.handle_updated_at();

comment on table public.present_schools is
  'Schools students attend now (Hong Kong list plus schools added by staff); not the UK partner schools';

alter table public.students
  add column if not exists present_school_id integer
  references public.present_schools(id) on delete set null;
create index if not exists students_present_school_id_idx
  on public.students (present_school_id);

-- Same signed-in staff pattern as the other tables. No delete policy: a school
-- chosen for students is deactivated, never removed.
alter table public.present_schools enable row level security;
drop policy if exists present_schools_select on public.present_schools;
drop policy if exists present_schools_insert on public.present_schools;
drop policy if exists present_schools_update on public.present_schools;
create policy present_schools_select on public.present_schools
  for select to authenticated using (true);
create policy present_schools_insert on public.present_schools
  for insert to authenticated with check (true);
create policy present_schools_update on public.present_schools
  for update to authenticated using (true) with check (true);
revoke all on public.present_schools from anon;
