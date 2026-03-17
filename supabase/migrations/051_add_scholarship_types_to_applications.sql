-- ============================================================================
-- Migration: 051_add_scholarship_types_to_applications
-- Description: Add scholarship_types array column for multi-select categories
--              (music, arts, academic, sports, others)
-- ============================================================================

ALTER TABLE public.student_applications
ADD COLUMN scholarship_types text[] DEFAULT '{}';
