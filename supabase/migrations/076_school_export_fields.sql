-- Fields required by the "Selected School List" comparison export.
--
-- Three gaps between what the printed sheet shows and what we store:
--   1. the whole-school age range (the legacy report printed it bracketed
--      after the boarding range, e.g. "13-19 (11-19)")
--   2. whether a school runs IB / A-Level at all, so the sheet can say
--      "not offered" rather than implying the figures were withheld
--   3. a resolved year-level range per fee band, for display and fee filtering

alter table public.schools
  add column if not exists school_age_min  int,
  add column if not exists school_age_max  int,
  add column if not exists offers_ib       boolean,
  add column if not exists offers_a_level  boolean;

comment on column public.schools.school_age_min is
  'Youngest age accepted by the whole school. Distinct from boarder_age_min, which covers boarders only.';
comment on column public.schools.school_age_max is
  'Oldest age accepted by the whole school. Distinct from boarder_age_max.';
comment on column public.schools.offers_ib is
  'Whether the school runs the IB Diploma. NULL means unknown - the export prints NP. FALSE prints "not offered".';
comment on column public.schools.offers_a_level is
  'Whether the school runs A-Levels. NULL means unknown - the export prints NP. FALSE prints "not offered".';

alter table public.schools
  drop constraint if exists schools_school_age_range_check;
alter table public.schools
  add constraint schools_school_age_range_check
  check (
    school_age_min is null
    or school_age_max is null
    or school_age_min <= school_age_max
  );

-- Fee bands: migration 042 added `year_levels` as a comma-separated multi-select
-- but it was never populated (empty across all rows). The export needs an ordered
-- from/to pair to render "Year 9 - Year 13", so store it explicitly rather than
-- re-parsing the free-text description on every render.
alter table public.school_fees
  add column if not exists year_level_from text,
  add column if not exists year_level_to   text;

comment on column public.school_fees.year_level_from is
  'Lowest year level this fee band covers, e.g. "Year 9". Backfilled from the free-text description.';
comment on column public.school_fees.year_level_to is
  'Highest year level this fee band covers, e.g. "Year 13". Equals year_level_from for a single-year band.';

-- Supports resolving the current fee: latest financial_year holding an actual
-- course fee, per school.
create index if not exists idx_school_fees_school_year_type
  on public.school_fees (school_id, financial_year, fee_type_id);
