-- Brings a database built from these migrations in line with the live project.
-- These columns were added on the live database outside any migration file, so
-- a fresh build (local tests, a new environment) lacked them and the school
-- form and event applications failed there. Every statement is conditional:
-- on the live database, where all of this already exists, it changes nothing.

-- Boarder ages as numbers; the old free-text range is kept for reference.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'schools' and column_name = 'boarder_age_range')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'schools' and column_name = 'legacy_boarder_age_range') then
    alter table public.schools rename column boarder_age_range to legacy_boarder_age_range;
  end if;
end $$;
alter table public.schools
  add column if not exists legacy_boarder_age_range text,
  add column if not exists boarder_age_min integer,
  add column if not exists boarder_age_max integer;
comment on column public.schools.legacy_boarder_age_range is 'Legacy free-text boarder age range, kept for reference';
comment on column public.schools.boarder_age_min is 'Minimum boarder age';
comment on column public.schools.boarder_age_max is 'Maximum boarder age';

-- Music audition pieces as one list (035 part 6); the single piece and composer fields are gone.
alter table public.student_event_applications
  add column if not exists pieces jsonb default '[]';
comment on column public.student_event_applications.pieces is 'Music pieces array: [{piece, composer}, ...] for music audition events';
alter table public.student_event_applications
  drop column if exists piece,
  drop column if exists composer;

-- Fields kept from the AA Test import.
alter table public.student_individual_exams
  add column if not exists legacy_student_code text,
  add column if not exists legacy_test_type text,
  add column if not exists legacy_action text;
comment on column public.student_individual_exams.legacy_student_code is 'Original aa_id from AA_Test CSV';
comment on column public.student_individual_exams.legacy_test_type is 'Original aatesttype from AA_Test CSV';
comment on column public.student_individual_exams.legacy_action is 'Original aatestaction from AA_Test CSV';
