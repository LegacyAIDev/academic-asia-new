-- A student's own exam document (meeting with Jack, 18 Nov 2026): for online
-- entrance tests a school sends a PDF with an access code for one student. It
-- is attached to that student's exam record (student_individual_exams), seen
-- and printed only by the examination team, like the exam papers.
-- Safe to run more than once.

alter table public.student_documents drop constraint if exists student_documents_attachable_type_ck;
alter table public.student_documents add constraint student_documents_attachable_type_ck
  check (attachable_type is null or attachable_type in (
    'students', 'student_visas', 'student_travel', 'student_exam_results',
    'student_resume', 'student_applications', 'student_application_deposits',
    'student_individual_exams'));

insert into public.document_categories (code, label, section, sort_order)
select 'exam_access_document', 'Exam access document', 'documents', 55
where not exists (select 1 from public.document_categories where code = 'exam_access_document');
