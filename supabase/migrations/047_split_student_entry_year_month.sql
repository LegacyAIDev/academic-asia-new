-- ============================================================================
-- Migration: 047_split_student_entry_year_month
-- Description: Split entry_year (YYYYMM text) into entry_year (int) and entry_month (int)
-- Depends on: 004_create_students_table
-- ============================================================================

ALTER TABLE public.students RENAME COLUMN entry_year TO legacy_entry_year;

ALTER TABLE public.students ADD COLUMN entry_year int;
ALTER TABLE public.students ADD COLUMN entry_month int;

UPDATE public.students
SET
  entry_year = LEFT(legacy_entry_year, 4)::int,
  entry_month = RIGHT(legacy_entry_year, 2)::int
WHERE legacy_entry_year IS NOT NULL
  AND LENGTH(legacy_entry_year) = 6
  AND LEFT(legacy_entry_year, 4) ~ '^\d{4}$'
  AND RIGHT(legacy_entry_year, 2)::int BETWEEN 1 AND 12;

COMMENT ON COLUMN public.students.entry_year IS 'Entry year (e.g. 2026)';
COMMENT ON COLUMN public.students.entry_month IS 'Entry month (1-12)';
COMMENT ON COLUMN public.students.legacy_entry_year IS 'Original YYYYMM entry year string before split';
