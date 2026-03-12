-- Consolidate phases: merge Prep_S into Prep

begin;

update public.schools set phase_id = 2 where phase_id = 3;
delete from public.school_phases where id = 3;

commit;
