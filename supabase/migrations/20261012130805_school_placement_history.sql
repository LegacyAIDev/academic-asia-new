-- ============================================================================
-- SCHOOLS: PLACEMENT HISTORY
-- Counts, per academic year, how many of our students applied to a school, got
-- an offer and were placed. The counting happens here because a single school
-- can have more than ten thousand applications, far more than the API returns
-- in one request.
--
-- The lists of status codes below are the working definitions agreed for the
-- first version; changing what counts as an offer or a placement means
-- changing them here.
--   offer   = any Offered or Deposited status, Joined School but Left After,
--             Declined (the family turned an offer down), or a deposit record
--   placed  = any Deposited status, or Joined School but Left After
--   not an application at all = General Enquiry, Check Place, Test Only (Refer)
-- The academic year runs from September: an entry in January to August belongs
-- to the year that started the September before.
-- ============================================================================

create or replace function public.school_placement_history(p_school_id uuid)
returns table (academic_year_start int, applications int, offers int, placed int)
language sql stable security invoker set search_path = '' as $$
  select
    case when a.entry_year is null then null
         when a.entry_month between 1 and 8 then a.entry_year - 1
         else a.entry_year end,
    count(*)::int,
    (count(*) filter (where s.code = any (array[
        'offered','offered_c','offered_wo_reg','offered_without_reg','offered_scholarship',
        'deposited','deposited_cond','deposited_cond_cfmed','deposited_scholarship','deposited_scholarship_c',
        'joined_school_left_after','declined'])
      or exists (select 1 from public.student_application_deposits d where d.application_id = a.id)))::int,
    (count(*) filter (where s.code = any (array[
        'deposited','deposited_cond','deposited_cond_cfmed','deposited_scholarship','deposited_scholarship_c',
        'joined_school_left_after'])))::int
  from public.student_applications a
  left join public.application_statuses s on s.id = a.status_id
  where a.school_id = p_school_id
    and (s.code is null or s.code <> all (array['general_enquiry','check_place','test_only_refer']))
  group by 1
$$;

revoke execute on function public.school_placement_history(uuid) from public, anon;
grant execute on function public.school_placement_history(uuid) to authenticated;
