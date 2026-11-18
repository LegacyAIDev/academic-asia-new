-- Enquiry stage for students (meeting with Jack, 18 Nov 2026): every new case
-- starts as an enquiry, handled by the front-line team; once the family
-- responds it moves on to New, Pending, Active and so on with a consultant.
-- It comes first in the status tabs. Safe to run more than once.

insert into public.student_statuses (code, label, description, color, sort_order, is_active)
select 'enquiry', 'Enquiry', 'A new case not yet qualified: the family has not responded yet', 'purple', -1, true
where not exists (select 1 from public.student_statuses where code = 'enquiry');
