ALTER TABLE student_individual_exams
  ADD COLUMN application_id uuid REFERENCES student_applications(id) ON DELETE SET NULL;

CREATE INDEX student_individual_exams_application_id_idx
  ON student_individual_exams(application_id);
