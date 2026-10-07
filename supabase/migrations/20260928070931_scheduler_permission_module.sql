-- ============================================================================
-- SCHEDULER PERMISSION MODULE
-- Registers the scheduler in the permission matrix. Every staff level can see
-- the calendar; consultants, customer service, exam officers and managers can
-- create bookings. Rooms and confirmation are additionally gated on EXAMS WRITE
-- in the application layer.
-- ============================================================================

insert into public.permission_modules (key, label, sort_order)
values ('scheduler', 'Scheduler', 8)
on conflict (key) do nothing;

insert into public.admin_level_permissions (admin_level, module_id, access)
select v.admin_level, m.id, v.access
from public.permission_modules m
join (values (0, 2), (3, 2), (4, 2), (6, 2), (7, 1), (8, 1)) as v(admin_level, access) on true
where m.key = 'scheduler'
on conflict (admin_level, module_id) do nothing;
