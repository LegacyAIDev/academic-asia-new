-- Consolidate institution types from 10 → 5

begin;

-- Merge Independent School 1 (2) and Independent College (3) → Independent School (1)
update public.schools set institution_type_id = 1 where institution_type_id in (2, 3);

-- Rename Sixth Form College - Government → Sixth Form College
update public.school_institution_types set code = 'sixth_form_college', label = 'Sixth Form College' where id = 5;

-- Merge Stabis School_Comm (8) and Stabis (9) → Stabis School (7)
update public.schools set institution_type_id = 7 where institution_type_id in (8, 9);

-- Merge Summer (10) → Summer School (6)
update public.schools set institution_type_id = 6 where institution_type_id = 10;

-- Delete obsolete types
delete from public.school_institution_types where id in (2, 3, 8, 9, 10);

commit;
