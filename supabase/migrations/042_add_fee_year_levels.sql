-- Add year_levels column to school_fees for multi-select year level tracking
alter table public.school_fees add column year_levels text;

comment on column public.school_fees.year_levels is 'Comma-separated year levels (e.g. "All" or "Year 1,Year 5,Year 12")';
