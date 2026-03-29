-- Allow representatives without a school assignment
ALTER TABLE public.event_representatives
  ALTER COLUMN school_id DROP NOT NULL;
