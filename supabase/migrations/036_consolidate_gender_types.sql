-- Consolidate gender types: merge boys_6g and boys_6g_day into boys
-- Affected: 17 schools (11 boys_6g + 6 boys_6g_day) → reassigned to boys (id 2)

begin;

-- Reassign schools from boys_6g (4) and boys_6g_day (5) to boys (2)
update public.schools
set gender_type_id = 2
where gender_type_id in (4, 5);

-- Remove obsolete gender types
delete from public.school_gender_types
where id in (4, 5);

commit;
