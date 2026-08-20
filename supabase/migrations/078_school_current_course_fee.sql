-- A filterable "current fee" per school, for the schools list.
--
-- The comparison export already resolves the current fee in TypeScript
-- (src/lib/schools/export-shaping.ts): the latest financial year that actually
-- holds a course fee, because registration-fee-only years run ahead of the
-- course-fee schedule and would otherwise be mistaken for the current year.
--
-- The list needs the same figure to answer "fee <= X" across all 707 schools
-- while paginating. That cannot be a join from PostgREST, and passing a list of
-- matching ids back into the query overflows the URL at this row count, so the
-- resolved figure is denormalised onto schools and indexed.
--
-- refresh_school_current_fee() below is the single SQL definition of that rule.
-- The backfill script and the fee mutations both call it, so the column cannot
-- drift from school_fees.

alter table public.schools
  add column if not exists current_course_fee      numeric(12,2),
  add column if not exists current_course_fee_year text;

comment on column public.schools.current_course_fee is
  'Lowest course-fee band of the latest financial year holding a course fee. Derived — maintained by refresh_school_current_fee(); do not hand-edit.';
comment on column public.schools.current_course_fee_year is
  'Financial year current_course_fee was taken from, e.g. "2024-25".';

create index if not exists idx_schools_current_course_fee
  on public.schools (current_course_fee)
  where current_course_fee is not null;

/**
 * Recompute the cached current fee for one school, or for every school when
 * called with NULL.
 *
 * Mirrors resolveCurrentFee() in the application: course fees only, positive
 * amounts only, latest financial year present, lowest band of that year.
 */
create or replace function public.refresh_school_current_fee(target_school_id uuid default null)
returns void
language sql
security definer
set search_path = public
as $$
  with course_fees as (
    select f.school_id, f.financial_year, f.amount
    from public.school_fees f
    join public.fee_types t on t.id = f.fee_type_id
    where t.code = 'course'
      and f.amount is not null
      and f.amount > 0
      and f.financial_year is not null
      and btrim(f.financial_year) <> ''
      and (target_school_id is null or f.school_id = target_school_id)
  ),
  latest as (
    select school_id, max(financial_year) as financial_year
    from course_fees
    group by school_id
  ),
  resolved as (
    select l.school_id, l.financial_year, min(c.amount) as min_amount
    from latest l
    join course_fees c
      on c.school_id = l.school_id
     and c.financial_year = l.financial_year
    group by l.school_id, l.financial_year
  )
  update public.schools s
  set current_course_fee = r.min_amount,
      current_course_fee_year = r.financial_year
  from resolved r
  where s.id = r.school_id
    and (target_school_id is null or s.id = target_school_id)
    and (s.current_course_fee is distinct from r.min_amount
      or s.current_course_fee_year is distinct from r.financial_year);

  -- Clear schools whose last course fee has gone, so the cache cannot keep a
  -- figure that school_fees no longer supports.
  update public.schools s
  set current_course_fee = null,
      current_course_fee_year = null
  where (target_school_id is null or s.id = target_school_id)
    and (s.current_course_fee is not null or s.current_course_fee_year is not null)
    and not exists (
      select 1
      from public.school_fees f
      join public.fee_types t on t.id = f.fee_type_id
      where f.school_id = s.id
        and t.code = 'course'
        and f.amount is not null
        and f.amount > 0
        and f.financial_year is not null
        and btrim(f.financial_year) <> ''
    );
$$;

revoke all on function public.refresh_school_current_fee(uuid) from public, anon;
grant execute on function public.refresh_school_current_fee(uuid) to authenticated, service_role;

comment on function public.refresh_school_current_fee(uuid) is
  'Recompute schools.current_course_fee from school_fees. Pass a school id, or NULL for all schools.';
