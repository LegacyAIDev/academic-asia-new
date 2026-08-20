-- A filterable county for the schools list.
--
-- `schools.county` is free text and holds 101 distinct values for 707 schools:
-- placeholders ("N/A", "-", "UK"), nations rather than counties ("Scotland",
-- "Northern Ireland"), four spellings of London, towns used in place of their
-- county ("Cambridge", "Guildford"), and a handful of non-UK locations.
-- Filtering on it directly gives a dropdown that is unusable.
--
-- The raw value stays untouched — it is what staff typed and what the school
-- detail page shows. This column is the cleaned copy used for filtering only,
-- populated by scripts/40_normalise-school-county.ts. NULL means "no usable
-- county", which the filter excludes rather than offering as an option.

alter table public.schools
  add column if not exists county_normalised text;

comment on column public.schools.county_normalised is
  'Cleaned copy of county for filtering. NULL where the raw value is a placeholder, a nation, or non-UK. Populated by scripts/40_normalise-school-county.ts; do not hand-edit.';

create index if not exists idx_schools_county_normalised
  on public.schools (county_normalised)
  where county_normalised is not null;
