-- ============================================================================
-- STUDENTS: "POSSIBLY FAMILY" SUGGESTIONS
-- Many siblings are already in the system without a link: on 2026-10-22, 6,441
-- parent mobiles and 4,680 parent emails were shared by more than one student,
-- and 89 % of those student pairs share the surname with a different first
-- name. This lists, for one student, the other students whose family contacts
-- share a mobile number (digits only, 8 or more) or an email with this
-- student's family contacts, so staff can link them with one click.
--
-- A shared number is a hint, never proof, so nothing is linked here. Left out:
--   - numbers and emails shared by more than 6 students (agencies, offices);
--   - students with the same full name (most likely one student entered twice);
--   - students already linked to this one, in either direction.
-- Same surname first, then the students sharing the most details.
-- Security invoker: it reads with the caller's rights, like the tables do.
-- ============================================================================

-- The match compares normalised values; these let it look them up instead of
-- scanning all family contacts on every student page.
create index if not exists student_contacts_mobile_digits_idx
  on public.student_contacts ((regexp_replace(mobile, '\D', '', 'g')))
  where mobile is not null;
create index if not exists student_contacts_email_lower_idx
  on public.student_contacts ((lower(btrim(email_1))))
  where email_1 is not null;

create or replace function public.student_family_suggestions(p_student_id uuid)
returns table (
  student_id uuid,
  student_code text,
  first_name text,
  surname text,
  chinese_name text,
  gender text,
  date_of_birth date,
  present_school text,
  matched_on text
)
language sql stable security invoker set search_path = '' as $$
  with me as (
    select s.id, lower(btrim(s.surname)) as surname, lower(btrim(s.first_name)) as first_name
    from public.students s where s.id = p_student_id
  ),
  my_keys as (
    select 'mobile' as kind, regexp_replace(c.mobile, '\D', '', 'g') as key, c.relationship_id
    from public.student_contacts c join me on c.student_id = me.id
    where c.mobile is not null and length(regexp_replace(c.mobile, '\D', '', 'g')) >= 8
    union
    select 'email', lower(btrim(c.email_1)), c.relationship_id
    from public.student_contacts c join me on c.student_id = me.id
    where c.email_1 is not null and c.email_1 like '%@%'
  ),
  matches as (
    select c.student_id as other_id, k.kind, k.key, k.relationship_id
    from my_keys k join public.student_contacts c
      on c.mobile is not null and regexp_replace(c.mobile, '\D', '', 'g') = k.key
    where k.kind = 'mobile'
    union all
    select c.student_id, k.kind, k.key, k.relationship_id
    from my_keys k join public.student_contacts c
      on c.email_1 is not null and lower(btrim(c.email_1)) = k.key
    where k.kind = 'email'
  ),
  family_sized as (
    select key from matches group by key having count(distinct other_id) <= 6
  )
  select s.id, s.student_code, s.first_name, s.surname, s.chinese_name, s.gender, s.date_of_birth, s.present_school,
         string_agg(distinct coalesce(r.label || '''s ', 'Family ') || m.kind, ', ')
  from matches m
  join family_sized f on f.key = m.key
  join public.students s on s.id = m.other_id
  left join public.contact_relationships r on r.id = m.relationship_id
  cross join me
  where s.id <> me.id
    and not (lower(btrim(s.surname)) = me.surname and lower(btrim(s.first_name)) = me.first_name)
    and not exists (
      select 1 from public.student_contacts l
      where (l.student_id = me.id and l.related_student_id = s.id)
         or (l.student_id = s.id and l.related_student_id = me.id)
    )
  group by s.id, s.student_code, s.first_name, s.surname, s.chinese_name, s.gender, s.date_of_birth, s.present_school, me.surname
  order by (lower(btrim(s.surname)) = me.surname) desc, count(*) desc, s.surname, s.first_name
$$;

revoke execute on function public.student_family_suggestions(uuid) from public, anon;
grant execute on function public.student_family_suggestions(uuid) to authenticated;
