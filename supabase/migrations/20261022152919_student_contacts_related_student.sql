-- ============================================================================
-- STUDENT CONTACTS: LINK A FAMILY MEMBER TO ANOTHER STUDENT
-- A brother, sister or other relative who is a student too is picked from the
-- students instead of typed again. The contact row then points at that student;
-- the family tab shows the student's live details, and the linked student's own
-- family tab shows the link the other way round (no mirrored row is kept).
--
-- On delete set null: if the linked student is deleted, the row stays with the
-- name that was copied into it when the link was made.
-- A student cannot be linked to themself, nor to the same student twice.
-- ============================================================================

alter table public.student_contacts
  add column if not exists related_student_id uuid references public.students(id) on delete set null;

alter table public.student_contacts drop constraint if exists student_contacts_related_not_self;
alter table public.student_contacts add constraint student_contacts_related_not_self
  check (related_student_id is null or related_student_id <> student_id);

-- Finds the links other students made to a student (their family tab).
create index if not exists student_contacts_related_student_idx
  on public.student_contacts (related_student_id) where related_student_id is not null;

create unique index if not exists student_contacts_one_link_per_pair
  on public.student_contacts (student_id, related_student_id) where related_student_id is not null;

comment on column public.student_contacts.related_student_id is
  'The student this family member is, when they are a student too';
