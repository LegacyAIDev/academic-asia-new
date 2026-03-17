-- ============================================================================
-- Migration: 052_restructure_student_lead_source
-- Description: Replace single lead_source_id with category-based approach:
--   walk_in, referral (+freetext), events (+event FK), direct
-- ============================================================================

ALTER TABLE public.students
ADD COLUMN lead_source_category text,
ADD COLUMN lead_source_referral_detail text,
ADD COLUMN lead_source_event_id uuid REFERENCES public.events(id);

-- Walk in: Walk-In (1)
UPDATE public.students SET lead_source_category = 'walk_in'
WHERE lead_source_id = 1;

-- Direct: Direct Mail(26), Email & Courier(27), Newspaper(28), Website(29)
UPDATE public.students SET lead_source_category = 'direct'
WHERE lead_source_id IN (26, 27, 28, 29);

-- Referral: Walk-In Friends(2), Referral School(3), Own Referral(4), partners(30-34), Other(35)
UPDATE public.students SET lead_source_category = 'referral'
WHERE lead_source_id IN (2, 3, 4, 30, 31, 32, 33, 34, 35);

-- Events: Top Schools(5-14), Expos(15-23), Concord Events(24-25)
UPDATE public.students SET lead_source_category = 'events'
WHERE lead_source_id IN (5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25);

-- Preserve old label as referral detail
UPDATE public.students s
SET lead_source_referral_detail = ls.label
FROM public.lead_sources ls
WHERE s.lead_source_id = ls.id
AND s.lead_source_category = 'referral';
