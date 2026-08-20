-- ============================================================================
-- Migration: 075_enable_row_level_security
-- Description: Enables RLS across the public schema and fills the three gaps
--              where no policies had been written.
--
-- Why this matters: the app authenticates every route and uses the publishable
-- key for all queries. That key is designed to ship in the browser bundle, so
-- its privileges are enforced entirely by RLS. With RLS disabled, every row in
-- every table — students, contacts, visas, documents — was readable and
-- writable by anyone holding a key that is public by design.
--
-- Safe to apply: 197 existing policies already apply to the `authenticated`
-- role exclusively, and no public route reads from the database before login.
-- Staff sessions are unaffected; anonymous access stops.
-- ============================================================================


-- ============================================================================
-- PART 1: POLICIES FOR THE THREE TABLES THAT HAD NONE
-- ============================================================================
-- student_internal_notes, student_resume_profile, student_resume_talents.
-- Same permissive authenticated-staff pattern as the other 90 tables. This is
-- an internal tool: any signed-in staff member may read and write. Narrower
-- per-user rules can be layered on later without re-enabling anything.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array['student_internal_notes', 'student_resume_profile', 'student_resume_talents']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);

    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (true)', t || '_delete', t);
  end loop;
end $$;


-- ============================================================================
-- PART 2: ENABLE RLS ON EVERY PUBLIC TABLE
-- ============================================================================
-- Driven off the catalog rather than a hand-written list of 93 names: no typos,
-- and any table created before this runs is covered too. Idempotent.
-- ============================================================================

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;
