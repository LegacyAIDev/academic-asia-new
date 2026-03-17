-- ============================================================================
-- Migration: 054_add_event_types_briefing_reception
-- Description: Add Briefing/Meeting and Reception/Social event types (E&G)
-- ============================================================================

INSERT INTO public.event_types (code, label, description, color, sort_order, category_id) VALUES
('briefing_meeting', 'Briefing / Meeting', 'Briefing sessions and meetings with schools', 'slate', 10,
 (SELECT id FROM public.event_categories WHERE code = 'engagement_guidance')),
('reception_social', 'Reception / Social', 'Receptions, social events, and networking', 'rose', 11,
 (SELECT id FROM public.event_categories WHERE code = 'engagement_guidance'));
