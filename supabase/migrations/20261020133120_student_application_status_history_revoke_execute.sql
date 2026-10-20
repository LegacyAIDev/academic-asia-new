-- The status history trigger function only ever runs as a trigger; nobody calls
-- it through the API. Postgres checks EXECUTE when a trigger is created, not
-- when it fires, so revoking it keeps the trigger working.
revoke execute on function public.log_student_application_status_change() from public, anon, authenticated;
