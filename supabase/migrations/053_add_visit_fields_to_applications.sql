-- ============================================================================
-- Migration: 053_add_visit_fields_to_applications
-- Description: Add visit date/time, school contact, and visit remarks
-- ============================================================================

ALTER TABLE public.student_applications
ADD COLUMN visit_date date,
ADD COLUMN visit_time text,
ADD COLUMN school_contact text,
ADD COLUMN visit_remarks text;
