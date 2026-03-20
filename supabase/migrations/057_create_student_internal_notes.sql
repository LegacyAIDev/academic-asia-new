CREATE TABLE student_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  character text,
  strategy text,
  parent_expectations text,
  disability_sen text,
  medical_notes text,
  guardianship_notes text,
  additional_remarks text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (student_id)
);

CREATE INDEX idx_student_internal_notes_student_id ON student_internal_notes(student_id);

COMMENT ON TABLE student_internal_notes IS 'Confidential internal staff notes per student — character, strategy, medical, SEN, etc.';
