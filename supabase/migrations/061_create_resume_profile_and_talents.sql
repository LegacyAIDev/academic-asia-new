-- Single resume profile per student (sections A + D)
CREATE TABLE student_resume_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  english_standard text CHECK (english_standard IN ('fluent', 'good', 'not_good')),
  interests_hobbies text,
  parents_input text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (student_id)
);

CREATE INDEX idx_student_resume_profile_student_id ON student_resume_profile(student_id);

COMMENT ON TABLE student_resume_profile IS 'Single resume profile per student — English standard, interests, parents input';

-- Special talents (section C) — multiple per student
CREATE TABLE student_resume_talents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('music', 'sports', 'academic', 'art', 'others')),
  instrument_sport text,
  award_name text,
  results text,
  video_path text,
  video_file_name text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_student_resume_talents_student_id ON student_resume_talents(student_id);

COMMENT ON TABLE student_resume_talents IS 'Student special talents — music, sports, academic, art awards with optional video';
