-- Task planner (Phase 1 spec, 22 Sep meeting note 2, Phase 1.5): a simple
-- personal to-do list for staff. Create a task, give it a priority and a
-- deadline, mark it complete, and keep completed tasks out of the active list.

create table if not exists public.staff_tasks (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  notes         text check (char_length(notes) <= 2000),
  priority      text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  -- A calendar day in Hong Kong; tasks have deadlines, not appointments.
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists staff_tasks_owner_open_idx
  on public.staff_tasks (owner_id, due_date) where completed_at is null;
create index if not exists staff_tasks_owner_done_idx
  on public.staff_tasks (owner_id, completed_at desc) where completed_at is not null;

drop trigger if exists staff_tasks_updated_at on public.staff_tasks;
create trigger staff_tasks_updated_at before update on public.staff_tasks
  for each row execute function public.handle_updated_at();

comment on table public.staff_tasks is 'Personal to-do list per staff member; only the owner sees or changes their tasks.';

-- A personal list: every operation is limited to the owner, so a direct API
-- call cannot read or change a colleague's tasks either.
alter table public.staff_tasks enable row level security;
drop policy if exists staff_tasks_select on public.staff_tasks;
drop policy if exists staff_tasks_insert on public.staff_tasks;
drop policy if exists staff_tasks_update on public.staff_tasks;
drop policy if exists staff_tasks_delete on public.staff_tasks;
create policy staff_tasks_select on public.staff_tasks for select to authenticated
  using (owner_id = (select auth.uid()));
create policy staff_tasks_insert on public.staff_tasks for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy staff_tasks_update on public.staff_tasks for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy staff_tasks_delete on public.staff_tasks for delete to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.staff_tasks from anon;
