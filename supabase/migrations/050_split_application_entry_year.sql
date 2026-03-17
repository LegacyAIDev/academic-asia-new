-- ============================================================================
-- Migration: 050_split_application_entry_year
-- Description: Convert entry_year from YYYYMM text to integer year column
-- ============================================================================

-- Rename text entry_year to legacy
ALTER TABLE public.student_applications RENAME COLUMN entry_year TO legacy_entry_year;

-- Add integer entry_year
ALTER TABLE public.student_applications ADD COLUMN entry_year integer;

-- Migrate: extract year from YYYYMM text
UPDATE public.student_applications
SET entry_year = LEFT(legacy_entry_year, 4)::integer
WHERE legacy_entry_year IS NOT NULL
  AND LENGTH(legacy_entry_year) >= 4
  AND LEFT(legacy_entry_year, 4) ~ '^\d{4}$';
