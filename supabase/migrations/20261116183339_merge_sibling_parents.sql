-- Brothers and sisters share their parents (client feedback, 13 Nov 2026).
--
-- The app now shows a student's parents together with those recorded on the
-- brothers and sisters they are linked to, and merges a parent held twice
-- when siblings are linked. This brings the families linked before that change
-- into line: where two linked siblings each hold the same parent (same
-- relationship, and the same email, the same phone number by its last eight
-- digits, or the same name), the older record is kept, takes any detail only
-- the other had, and the other is deleted. Different people in the same role
-- (a parent and a step-parent) are left alone.
--
-- Safe to run more than once: a second run finds nothing left to merge.

create or replace function public.merge_sibling_parents()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pair record;
  merged integer := 0;
begin
  for pair in
    with sibling_links as (
      select distinct least(c.student_id, c.related_student_id) as a, greatest(c.student_id, c.related_student_id) as b
      from student_contacts c
      join contact_relationships r on r.id = c.relationship_id
      where c.related_student_id is not null and r.code in ('brother', 'sister')
    ),
    parents as (
      select c.*, r.code as rel_code,
             nullif(lower(trim(c.email_1)), '') as email_key,
             nullif(right(regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g'), 8), '') as mobile_key,
             nullif(right(regexp_replace(coalesce(c.telephone, ''), '\D', '', 'g'), 8), '') as phone_key,
             nullif(lower(regexp_replace(trim(coalesce(c.first_name, '') || ' ' || coalesce(c.surname, '')), '\s+', ' ', 'g')), '') as name_key
      from student_contacts c
      join contact_relationships r on r.id = c.relationship_id
      where c.related_student_id is null and r.code in ('mother', 'father', 'guardian')
    )
    select distinct on (drop_row.id)
      case when pa.created_at <= pb.created_at then pa.id else pb.id end as keep_id,
      case when pa.created_at <= pb.created_at then pb.id else pa.id end as drop_id
    from sibling_links l
    join parents pa on pa.student_id = l.a
    join parents pb on pb.student_id = l.b and pb.rel_code = pa.rel_code
    cross join lateral (select case when pa.created_at <= pb.created_at then pb.id else pa.id end as id) drop_row
    where (pa.email_key is not null and pa.email_key = pb.email_key)
       or (length(coalesce(pa.mobile_key, '')) = 8 and pa.mobile_key in (pb.mobile_key, pb.phone_key))
       or (length(coalesce(pa.phone_key, '')) = 8 and pa.phone_key in (pb.mobile_key, pb.phone_key))
       or (length(coalesce(pa.name_key, '')) > 1 and pa.name_key = pb.name_key)
  loop
    -- Skip a pair whose records an earlier merge in this run already removed.
    continue when not exists (select 1 from student_contacts where id = pair.keep_id)
              or not exists (select 1 from student_contacts where id = pair.drop_id);

    update student_contacts k set
      title_id         = coalesce(k.title_id, d.title_id),
      surname          = coalesce(nullif(k.surname, ''), d.surname),
      first_name       = coalesce(nullif(k.first_name, ''), d.first_name),
      gender           = coalesce(nullif(k.gender, ''), d.gender),
      telephone        = coalesce(nullif(k.telephone, ''), d.telephone),
      mobile           = coalesce(nullif(k.mobile, ''), d.mobile),
      fax              = coalesce(nullif(k.fax, ''), d.fax),
      email_1          = coalesce(nullif(k.email_1, ''), d.email_1),
      email_2          = coalesce(nullif(k.email_2, ''), d.email_2),
      email_3          = coalesce(nullif(k.email_3, ''), d.email_3),
      address_1        = coalesce(nullif(k.address_1, ''), d.address_1),
      address_2        = coalesce(nullif(k.address_2, ''), d.address_2),
      occupation       = coalesce(nullif(k.occupation, ''), d.occupation),
      office_telephone = coalesce(nullif(k.office_telephone, ''), d.office_telephone),
      office_fax       = coalesce(nullif(k.office_fax, ''), d.office_fax),
      priority         = coalesce(k.priority, d.priority),
      remarks          = coalesce(nullif(k.remarks, ''), d.remarks)
    from student_contacts d
    where k.id = pair.keep_id and d.id = pair.drop_id;

    delete from student_contacts where id = pair.drop_id;
    merged := merged + 1;
  end loop;
  return merged;
end;
$$;

revoke all on function public.merge_sibling_parents() from public, anon, authenticated;

select public.merge_sibling_parents();
