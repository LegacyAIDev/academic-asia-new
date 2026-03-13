-- ============================================================================
-- Migration: 046_remap_school_note_categories
-- Description: Consolidate 23 note categories into 11 active categories
-- Depends on: 024_create_school_notes_table
-- ============================================================================

-- Step 1: Remap notes from deprecated categories to their new targets
-- AL Subjects → Academic (id 2)
UPDATE public.school_notes SET category_id = 2 WHERE category_id = 3;
-- University Destination → Academic (id 2)
UPDATE public.school_notes SET category_id = 2 WHERE category_id = 16;

-- ISI → School (id 1)
UPDATE public.school_notes SET category_id = 1 WHERE category_id = 13;
-- Nationality Mix → School (id 1)
UPDATE public.school_notes SET category_id = 1 WHERE category_id = 17;

-- Competition → Application Procedure (id 8)
UPDATE public.school_notes SET category_id = 8 WHERE category_id = 15;
-- Early Entry Scheme → Application Procedure (id 8)
UPDATE public.school_notes SET category_id = 8 WHERE category_id = 19;
-- Visit → Application Procedure (id 8)
UPDATE public.school_notes SET category_id = 8 WHERE category_id = 20;

-- AA Only → Other (id 23)
UPDATE public.school_notes SET category_id = 23 WHERE category_id = 9;
-- Feature → Other (id 23)
UPDATE public.school_notes SET category_id = 23 WHERE category_id = 12;
-- Alumni → Other (id 23)
UPDATE public.school_notes SET category_id = 23 WHERE category_id = 14;
-- Portrait → Other (id 23)
UPDATE public.school_notes SET category_id = 23 WHERE category_id = 18;
-- Selected School List Remark (English) → Other (id 23)
UPDATE public.school_notes SET category_id = 23 WHERE category_id = 21;
-- Selected School List Remark (Chinese) → Other (id 23)
UPDATE public.school_notes SET category_id = 23 WHERE category_id = 22;

-- Step 2: Deactivate deprecated categories
UPDATE public.school_note_categories
SET is_active = false
WHERE code IN (
  'al_subjects', 'aa_only', 'feature', 'isi', 'alumni',
  'competition', 'university_destination', 'nationality_mix',
  'portrait', 'early_entry_scheme', 'visit',
  'selected_school_list_remark_eng', 'selected_school_list_remark_chi'
);

-- Step 3: Rename "Others" to "Other"
UPDATE public.school_note_categories SET label = 'Other' WHERE code = 'others';

-- Step 4: Add Guardian category
INSERT INTO public.school_note_categories (code, label, sort_order, is_active)
VALUES ('guardian', 'Guardian', 5, true)
ON CONFLICT (code) DO NOTHING;

-- Step 5: Update sort order (alphabetical, Other last)
UPDATE public.school_note_categories SET sort_order = 1  WHERE code = 'academic';
UPDATE public.school_note_categories SET sort_order = 2  WHERE code = 'accommodation';
UPDATE public.school_note_categories SET sort_order = 3  WHERE code = 'activities';
UPDATE public.school_note_categories SET sort_order = 4  WHERE code = 'application_procedure';
UPDATE public.school_note_categories SET sort_order = 5  WHERE code = 'guardian';
UPDATE public.school_note_categories SET sort_order = 6  WHERE code = 'music';
UPDATE public.school_note_categories SET sort_order = 7  WHERE code = 'school';
UPDATE public.school_note_categories SET sort_order = 8  WHERE code = 'scholarship';
UPDATE public.school_note_categories SET sort_order = 9  WHERE code = 'sports';
UPDATE public.school_note_categories SET sort_order = 10 WHERE code = 'ukiset';
UPDATE public.school_note_categories SET sort_order = 99 WHERE code = 'others';
