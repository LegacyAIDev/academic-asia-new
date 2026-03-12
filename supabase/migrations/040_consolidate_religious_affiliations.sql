-- Consolidate religious affiliations from 11 → 7

begin;

-- Church of England (2) → Anglican (8)
update public.schools set religious_affiliation_id = 8 where religious_affiliation_id = 2;

-- Roman Catholic (3) → Catholic (11)
update public.schools set religious_affiliation_id = 11 where religious_affiliation_id = 3;

-- Church in Wales (10) → Anglican (8)
update public.schools set religious_affiliation_id = 8 where religious_affiliation_id = 10;

-- Inter denominational (5) → new "Other"
-- All Faiths (7) → new "Other"
-- Quaker (9) → new "Other"
-- We'll reuse id 5 as "Other" by renaming it
update public.school_religious_affiliations set code = 'other', label = 'Other' where id = 5;
update public.schools set religious_affiliation_id = 5 where religious_affiliation_id in (7, 9);

-- Rename Non denominational → Non-denominational
update public.school_religious_affiliations set label = 'Non-denominational' where id = 1;

-- Rename Catholic (11) label stays as Catholic, rename code
update public.school_religious_affiliations set code = 'catholic', label = 'Catholic' where id = 11;

-- Delete merged types: Church of England (2), Roman Catholic (3), All Faiths (7), Quaker (9), Church in Wales (10)
delete from public.school_religious_affiliations where id in (2, 3, 7, 9, 10);

-- Add N/A option
insert into public.school_religious_affiliations (code, label, sort_order) values ('na', 'N/A', 99);

commit;
