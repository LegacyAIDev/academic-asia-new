-- Add year group (Year 1-13) to school applications
ALTER TABLE student_applications ADD COLUMN IF NOT EXISTS year_group integer;
