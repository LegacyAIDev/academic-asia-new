-- ============================================================================
-- Migration: 045_split_academic_result_grade_range
-- Description: Split grade_range into grade_from and grade_to columns
-- Depends on: 023_create_school_academic_results_table
-- ============================================================================

ALTER TABLE public.school_academic_results
  ADD COLUMN grade_from text,
  ADD COLUMN grade_to text;

ALTER TABLE public.school_academic_results
  RENAME COLUMN grade_range TO legacy_grade_range;

UPDATE public.school_academic_results SET
  grade_from = CASE legacy_grade_range
    WHEN 'A* - A' THEN 'A*' WHEN 'A*' THEN 'A*' WHEN 'A* - B' THEN 'A*' WHEN 'A* - C' THEN 'A*'
    WHEN 'A* - D' THEN 'A*' WHEN 'A* - E' THEN 'A*' WHEN 'A* -  C' THEN 'A*'
    WHEN 'A*-C' THEN 'A*' WHEN 'A*- B' THEN 'A*' WHEN 'A*- C' THEN 'A*'
    WHEN 'A-B' THEN 'A' WHEN 'A-C' THEN 'A' WHEN 'A' THEN 'A'
    WHEN 'A - B' THEN 'A' WHEN 'A - C' THEN 'A'
    WHEN 'B' THEN 'B' WHEN 'B - C' THEN 'B'
    WHEN 'A* - A(7-9)' THEN 'A*' WHEN 'A* - A (7-9)' THEN 'A*' WHEN 'A*-A(7-9)' THEN 'A*'
    WHEN 'A* - A(9-7)' THEN 'A*' WHEN 'A* - A(8-9)' THEN 'A*' WHEN 'A* - A(4-9)' THEN 'A*'
    WHEN 'A* - C(4-9)' THEN 'A*' WHEN 'A* - C (4-9)' THEN 'A*' WHEN 'A* - C(4-7)' THEN 'A*'
    WHEN 'A* - C(9-4)' THEN 'A*' WHEN 'A*- C (4-9)' THEN 'A*' WHEN 'A*-C (4-9)' THEN 'A*'
    WHEN 'A* - B(6-9)' THEN 'A*' WHEN 'A* - B (6-9)' THEN 'A*' WHEN 'A* - B(5-9)' THEN 'A*'
    WHEN 'A* - B(9-5)' THEN 'A*'
    WHEN 'A*(8-9)' THEN 'A*' WHEN 'A*(9-8)' THEN 'A*' WHEN 'A*(9)' THEN 'A*'
    WHEN 'A* (8-9)' THEN 'A*' WHEN 'A*(9-9)' THEN 'A*'
    WHEN '9' THEN '9' WHEN '9 - 7' THEN '9' WHEN '9 - 8' THEN '9' WHEN '9 - 6' THEN '9'
    WHEN '9 - 5' THEN '9' WHEN '9 - 4' THEN '9' WHEN '9 - 3' THEN '9'
    WHEN '9-7' THEN '9' WHEN '9-4' THEN '9'
    WHEN '7' THEN '7' WHEN '6-7' THEN '6' WHEN '5-7' THEN '5' WHEN '4-7' THEN '4'
    WHEN 'Distinction' THEN 'Distinction' WHEN 'Distinction - Merit' THEN 'Distinction'
    WHEN 'Distinction - Pass' THEN 'Distinction'
    WHEN 'D1' THEN 'D1' WHEN 'D1 - M2' THEN 'D1' WHEN 'D1 - M3' THEN 'D1'
    WHEN 'D1-D2' THEN 'D1' WHEN 'D1-D3' THEN 'D1'
    WHEN 'D*-M' THEN 'D*' WHEN 'D*/D' THEN 'D*'
    WHEN 'HL - 7' THEN 'HL 7' WHEN 'HL - 6' THEN 'HL 6' WHEN 'HL - 5' THEN 'HL 5'
    WHEN 'HL - 4' THEN 'HL 4' WHEN 'HL - 3' THEN 'HL 3'
    WHEN 'HL 7' THEN 'HL 7' WHEN 'HL 6-7' THEN 'HL 6' WHEN 'HL 5-7' THEN 'HL 5'
    WHEN 'SL - 7' THEN 'SL 7' WHEN 'SL - 6' THEN 'SL 6' WHEN 'SL - 5' THEN 'SL 5'
    WHEN 'SL - 4' THEN 'SL 4' WHEN 'SL - 3' THEN 'SL 3'
    WHEN 'SL 7' THEN 'SL 7' WHEN 'SL 6-7' THEN 'SL 6' WHEN 'SL 5-7' THEN 'SL 5'
    ELSE NULL
  END,
  grade_to = CASE legacy_grade_range
    WHEN 'A* - A' THEN 'A' WHEN 'A* - B' THEN 'B' WHEN 'A* - C' THEN 'C'
    WHEN 'A* - D' THEN 'D' WHEN 'A* - E' THEN 'E' WHEN 'A* -  C' THEN 'C'
    WHEN 'A*-C' THEN 'C' WHEN 'A*- B' THEN 'B' WHEN 'A*- C' THEN 'C'
    WHEN 'A-B' THEN 'B' WHEN 'A-C' THEN 'C' WHEN 'A - B' THEN 'B' WHEN 'A - C' THEN 'C'
    WHEN 'B - C' THEN 'C'
    WHEN 'A* - A(7-9)' THEN 'A' WHEN 'A* - A (7-9)' THEN 'A' WHEN 'A*-A(7-9)' THEN 'A'
    WHEN 'A* - A(9-7)' THEN 'A' WHEN 'A* - A(8-9)' THEN 'A' WHEN 'A* - A(4-9)' THEN 'A'
    WHEN 'A* - C(4-9)' THEN 'C' WHEN 'A* - C (4-9)' THEN 'C' WHEN 'A* - C(4-7)' THEN 'C'
    WHEN 'A* - C(9-4)' THEN 'C' WHEN 'A*- C (4-9)' THEN 'C' WHEN 'A*-C (4-9)' THEN 'C'
    WHEN 'A* - B(6-9)' THEN 'B' WHEN 'A* - B (6-9)' THEN 'B' WHEN 'A* - B(5-9)' THEN 'B'
    WHEN 'A* - B(9-5)' THEN 'B'
    WHEN '9 - 7' THEN '7' WHEN '9 - 8' THEN '8' WHEN '9 - 6' THEN '6'
    WHEN '9 - 5' THEN '5' WHEN '9 - 4' THEN '4' WHEN '9 - 3' THEN '3'
    WHEN '9-7' THEN '7' WHEN '9-4' THEN '4'
    WHEN '6-7' THEN '7' WHEN '5-7' THEN '7' WHEN '4-7' THEN '7'
    WHEN 'Distinction - Merit' THEN 'Merit' WHEN 'Distinction - Pass' THEN 'Pass'
    WHEN 'D1 - M2' THEN 'M2' WHEN 'D1 - M3' THEN 'M3'
    WHEN 'D1-D2' THEN 'D2' WHEN 'D1-D3' THEN 'D3'
    WHEN 'D*-M' THEN 'M' WHEN 'D*/D' THEN 'D'
    WHEN 'HL 6-7' THEN 'HL 7' WHEN 'HL 5-7' THEN 'HL 7'
    WHEN 'SL 6-7' THEN 'SL 7' WHEN 'SL 5-7' THEN 'SL 7'
    ELSE NULL
  END
WHERE legacy_grade_range IS NOT NULL;

comment on column public.school_academic_results.grade_from is 'Grade range start (e.g. A*, 9, Distinction, HL 7)';
comment on column public.school_academic_results.grade_to is 'Grade range end (e.g. A, 7, Merit). Null if single grade.';
comment on column public.school_academic_results.legacy_grade_range is 'Original combined grade range text before split';
