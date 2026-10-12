-- ============================================================================
-- SCHOOL ENTRANCE EXAMS: "REQUEST FROM SCHOOL" PAPERS
-- Some schools ask us not to keep their paper. Such a paper is requested from
-- the school for each sitting instead of being uploaded, and the exam desk
-- shows it as "request from school" rather than as missing.
-- ============================================================================

alter table public.school_entrance_exams
  add column if not exists paper_request_from_school boolean not null default false;

comment on column public.school_entrance_exams.paper_request_from_school is
  'The school asked us not to keep this paper; the exam team requests it for each sitting. Separate from has_paper, which marks a physical copy held in the office.';
