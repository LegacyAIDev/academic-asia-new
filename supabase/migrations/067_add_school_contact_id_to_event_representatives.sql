-- Link event representatives to school contacts
ALTER TABLE event_representatives
  ADD COLUMN IF NOT EXISTS school_contact_id uuid REFERENCES school_contacts(id) ON DELETE SET NULL;
