-- Indexes for the busiest list and dashboard queries (latency review, Nov 2026).
-- Safe to run more than once.

-- Dashboard "latest changes" reads the newest entries across the whole log;
-- the existing indexes are per student, school or application only.
create index if not exists activity_log_occurred_at_id_idx
  on public.activity_log (occurred_at desc, id desc);

-- Students list: a status tab or a consultant filter, newest first (the default order).
create index if not exists students_status_created_at_id_idx
  on public.students (status_id, created_at desc, id desc);
create index if not exists students_assigned_to_created_at_id_idx
  on public.students (assigned_to, created_at desc, id desc);

-- Entry year range filter: only the legacy column had an index.
create index if not exists students_entry_year_value_idx
  on public.students (entry_year);
