-- ============================================================================
-- Migration: 055_consolidate_event_types
-- Description: Consolidate 12 event types → 8 target types
-- Mapping:
--   top_schools (34 events) → expo_fair
--   expo (30 events) → expo_fair (rename)
--   event (74 events) → seminar_webinar (rename)
--   music_audition (15 events) → audition_day (rename)
--   school_assessment (0) → school_assessment_scholarship (rename)
--   DELETE: top_schools, webinar, exhibition, scholarship_audition
-- ============================================================================

BEGIN;

-- Step 1: Reassign top_schools events → expo (before renaming)
UPDATE events SET event_type_id = (SELECT id FROM event_types WHERE code = 'expo')
WHERE event_type_id = (SELECT id FROM event_types WHERE code = 'top_schools');

-- Step 2: Rename expo → expo_fair
UPDATE event_types SET code = 'expo_fair', label = 'Expo / Fair',
  description = 'Education expos, exhibitions, and fairs'
WHERE code = 'expo';

-- Step 3: Rename event → seminar_webinar
UPDATE event_types SET code = 'seminar_webinar', label = 'Seminar / Webinar',
  description = 'Seminars, webinars, and workshops'
WHERE code = 'event';

-- Step 4: Rename music_audition → audition_day
UPDATE event_types SET code = 'audition_day', label = 'Audition Day',
  description = 'Music and scholarship auditions'
WHERE code = 'music_audition';

-- Step 5: Rename school_assessment → school_assessment_scholarship
UPDATE event_types SET code = 'school_assessment_scholarship',
  label = 'School Assessment / Scholarship',
  description = 'School assessments and scholarship evaluations'
WHERE code = 'school_assessment';

-- Step 6: Delete unused types (all have 0 events)
DELETE FROM event_types WHERE code IN ('top_schools', 'webinar', 'exhibition', 'scholarship_audition');

-- Step 7: Update sort orders for clean display
UPDATE event_types SET sort_order = 1 WHERE code = 'expo_fair';
UPDATE event_types SET sort_order = 2 WHERE code = 'seminar_webinar';
UPDATE event_types SET sort_order = 3 WHERE code = 'briefing_meeting';
UPDATE event_types SET sort_order = 4 WHERE code = 'reception_social';
UPDATE event_types SET sort_order = 10 WHERE code = 'interview';
UPDATE event_types SET sort_order = 11 WHERE code = 'audition_day';
UPDATE event_types SET sort_order = 12 WHERE code = 'group_entrance_exam';
UPDATE event_types SET sort_order = 13 WHERE code = 'school_assessment_scholarship';

-- Step 8: Remove "No Scheduling" mode (set events to NULL first)
UPDATE events SET scheduling_mode_id = NULL
WHERE scheduling_mode_id = (SELECT id FROM scheduling_modes WHERE code = 'no_scheduling');
DELETE FROM scheduling_modes WHERE code = 'no_scheduling';

COMMIT;
