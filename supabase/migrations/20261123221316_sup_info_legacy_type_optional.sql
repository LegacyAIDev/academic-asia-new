-- Supplementary information added in the app failed: legacy_info_type (the old
-- system's free-text type) was NOT NULL with no default, and the app files new
-- entries under category_id instead. Only imported rows carry the legacy type.
-- Safe to run more than once.
alter table public.school_supplementary_info alter column legacy_info_type drop not null;
