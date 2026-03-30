-- Allow blockers (lunch, breaks) in the schedule grid
ALTER TABLE event_schedules ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS is_blocker boolean NOT NULL DEFAULT false;
