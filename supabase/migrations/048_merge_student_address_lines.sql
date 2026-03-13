-- ============================================================================
-- Migration: 048_merge_student_address_lines
-- Description: Merge address_line_2 into address_line_1, keep single address field
-- Depends on: 004_create_students_table
-- ============================================================================

-- Append line 2 to line 1 with comma separator
UPDATE public.students
SET address_line_1 = address_line_1 || ', ' || address_line_2
WHERE address_line_1 IS NOT NULL AND address_line_2 IS NOT NULL;

-- Move standalone line 2 values to line 1
UPDATE public.students
SET address_line_1 = address_line_2
WHERE address_line_1 IS NULL AND address_line_2 IS NOT NULL;

-- Rename old column to legacy
ALTER TABLE public.students RENAME COLUMN address_line_2 TO legacy_address_line_2;

COMMENT ON COLUMN public.students.legacy_address_line_2 IS 'Original address line 2 before merge into address_line_1';
