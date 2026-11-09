-- Students, schools, events and family contacts are shared records: any staff
-- member with write access in the app edits them, the same as applications,
-- documents, bookings and filed emails. Their first migrations limited update
-- and delete to the row's creator, and imported rows have no creator, so on the
-- live data almost every edit or delete matched no row and reported success
-- without saving (found while fixing UAT DEV24-002).
--
-- Who may change these records is decided by the app's access levels
-- (assertAccess on every action), as for the other shared tables.

do $$
declare
  t text;
begin
  foreach t in array array['students', 'schools', 'events', 'student_contacts'] loop
    execute format('drop policy if exists %I on public.%I', t || '_update_policy', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update_policy', t
    );
    execute format('drop policy if exists %I on public.%I', t || '_delete_policy', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      t || '_delete_policy', t
    );
  end loop;
end $$;
