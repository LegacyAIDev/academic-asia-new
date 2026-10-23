-- Offer / accepted / placed flags for every real application, the single home
-- of the status rules behind the school statistics (mirrored in
-- src/lib/applications/placement-statuses.ts; a test keeps the two in step):
--   offer    = offered*, declined, deposited*, joined_school_left_after, or any deposit record
--   accepted = deposited*, joined_school_left_after, or any deposit record (the family paid)
--   placed   = currently deposited* or joined_school_left_after, and the entry date has arrived
--   not an application = general_enquiry, check_place, test_only_refer
-- The academic year runs from September: entry in months 1–8 belongs to the year before.
-- An entry month outside 1–12 is read as September; no entry year means nothing to wait for.
create or replace view public.application_placement_outcomes with (security_invoker = true) as
select
  b.application_id, b.school_id, b.student_id, b.status_id, b.year_group,
  b.entry_year, b.entry_month, b.academic_year_start,
  (b.placed_status or b.has_deposit or b.offer_status) as is_offer,
  (b.placed_status or b.has_deposit)                    as is_accepted,
  (b.placed_status and b.entry_started)                 as is_placed
from (
  select
    a.id as application_id, a.school_id, a.student_id, a.status_id, a.year_group,
    a.entry_year, a.entry_month,
    case when a.entry_year is null then null
         when a.entry_month between 1 and 8 then a.entry_year - 1
         else a.entry_year end as academic_year_start,
    coalesce(s.code = any (array[
      'deposited','deposited_cond','deposited_cond_cfmed','deposited_scholarship','deposited_scholarship_c',
      'joined_school_left_after']), false) as placed_status,
    coalesce(s.code = any (array[
      'offered','offered_c','offered_wo_reg','offered_without_reg','offered_scholarship','declined']), false) as offer_status,
    exists (select 1 from public.student_application_deposits d where d.application_id = a.id) as has_deposit,
    (a.entry_year is null
      or make_date(a.entry_year, case when a.entry_month between 1 and 12 then a.entry_month else 9 end, 1)
         <= (now() at time zone 'Asia/Hong_Kong')::date) as entry_started
  from public.student_applications a
  left join public.application_statuses s on s.id = a.status_id
  where s.code is null or s.code <> all (array['general_enquiry','check_place','test_only_refer'])
) b;

comment on view public.application_placement_outcomes is
  'Offer / accepted / placed flags per application, used for school placement (and commission) figures.';
revoke all on public.application_placement_outcomes from anon;
grant select on public.application_placement_outcomes to authenticated;

-- The result gains an "accepted" column, so the function is dropped and recreated.
drop function if exists public.school_placement_history(uuid);
create function public.school_placement_history(p_school_id uuid)
returns table (academic_year_start int, applications int, offers int, accepted int, placed int)
language sql stable security invoker set search_path = '' as $$
  select o.academic_year_start,
         count(*)::int,
         (count(*) filter (where o.is_offer))::int,
         (count(*) filter (where o.is_accepted))::int,
         (count(*) filter (where o.is_placed))::int
  from public.application_placement_outcomes o
  where o.school_id = p_school_id
  group by 1
$$;
revoke execute on function public.school_placement_history(uuid) from public, anon;
grant execute on function public.school_placement_history(uuid) to authenticated;
