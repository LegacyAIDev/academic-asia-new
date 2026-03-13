-- ============================================================================
-- Migration: 044_cleanup_entrance_exam_year_levels
-- Description: Normalize legacy year_level values to standard format
--              Valid values: Year 1-13, Foundation, Summer
-- Depends on: 022_create_school_entrance_exams_table
-- ============================================================================

UPDATE public.school_entrance_exams SET year_level = CASE year_level
  WHEN '1-Year GCSE' THEN 'Year 11'
  WHEN '1 Year GCSE' THEN 'Year 11'
  WHEN 'Pre-AL' THEN 'Year 11'
  WHEN '3-Year AL' THEN 'Year 11'
  WHEN '3 Years AL' THEN 'Year 11'
  WHEN 'Pre-IB' THEN 'Year 11'
  WHEN '1-Year IGCSE' THEN 'Year 11'
  WHEN '1-Year AL' THEN 'Year 12'
  WHEN '1 Year A-level' THEN 'Year 12'
  WHEN 'Year 12_IB' THEN 'Year 12'
  WHEN 'IB' THEN 'Year 12'
  WHEN 'Level 6' THEN 'Year 6'
  WHEN 'Level 7' THEN 'Year 7'
  WHEN 'Level 8' THEN 'Year 8'
  WHEN 'Level 9' THEN 'Year 9'
  WHEN 'Reception' THEN 'Year 1'
  WHEN 'Sixth Form Foundation Year' THEN 'Foundation'
  WHEN '6th Form Foundation' THEN 'Foundation'
  WHEN 'Development Year' THEN 'Foundation'
  WHEN 'Developement Year' THEN 'Foundation'
  WHEN 'Pre-Foundation' THEN 'Foundation'
  WHEN 'Academic Preparation Course' THEN 'Foundation'
END
WHERE year_level IN (
  '1-Year GCSE', '1 Year GCSE', 'Pre-AL', '3-Year AL', '3 Years AL', 'Pre-IB',
  '1-Year IGCSE', '1-Year AL', '1 Year A-level', 'Year 12_IB', 'IB',
  'Level 6', 'Level 7', 'Level 8', 'Level 9', 'Reception',
  'Sixth Form Foundation Year', '6th Form Foundation', 'Development Year',
  'Developement Year', 'Pre-Foundation', 'Academic Preparation Course'
);

comment on column public.school_entrance_exams.year_level is 'Year level: Year 1-13, Foundation, or Summer';
