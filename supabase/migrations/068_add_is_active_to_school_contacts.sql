-- Track whether a school contact is still active at the school
ALTER TABLE school_contacts ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
