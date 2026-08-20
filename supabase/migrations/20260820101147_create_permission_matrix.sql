-- ============================================================================
-- Migration: 20260820101147_create_permission_matrix
-- Description: Per-module access rights for staff — level defaults plus
--              per-person overrides, and a resolver that combines them.
-- Depends on: 002_create_profile_reference_tables, 003_create_profiles_table
--
-- Replaces the legacy "Operator - Detail → Access Right" grid. Access is an
-- ordered integer (0 none / 1 read / 2 write) rather than the legacy pair of
-- Read-Write and Read-Only flags, which could express a contradiction. An
-- ordered scalar makes every check a single `access >= 1` comparison.
-- ============================================================================


-- ============================================================================
-- MODULES (the "Function" column in the legacy grid)
-- ============================================================================

create table public.permission_modules (
  id         serial primary key,
  key        text unique not null,
  label      text not null,
  sort_order int default 0
);

insert into public.permission_modules (key, label, sort_order) values
  ('dashboard', 'Dashboard', 0),
  ('students',  'Students',  1),
  ('schools',   'Schools',   2),
  ('events',    'Events',    3),
  ('exams',     'Exams',     4),
  ('staff',     'Staff',     5),
  ('reports',   'Reports',   6),
  ('settings',  'Settings',  7)
on conflict (key) do nothing;


-- ============================================================================
-- LEVEL DEFAULTS
-- ============================================================================
-- Inherited by every staff member on that level. FK targets admin_levels.level
-- (not .id) to match profiles.admin_level.
-- ============================================================================

create table public.admin_level_permissions (
  admin_level int      not null references public.admin_levels(level) on delete cascade,
  module_id   int      not null references public.permission_modules(id) on delete cascade,
  access      smallint not null default 0 check (access between 0 and 2),
  primary key (admin_level, module_id)
);


-- ============================================================================
-- PER-STAFF OVERRIDES
-- ============================================================================
-- A row here wins over the level default. Only genuine deviations are stored,
-- so changing a level default still propagates to everyone who never deviated.
-- ============================================================================

create table public.profile_permission_overrides (
  profile_id uuid     not null references public.profiles(id) on delete cascade,
  module_id  int      not null references public.permission_modules(id) on delete cascade,
  access     smallint not null check (access between 0 and 2),
  primary key (profile_id, module_id)
);


-- ============================================================================
-- INDEXES
-- ============================================================================

create index permission_modules_sort_order_idx on public.permission_modules(sort_order);
create index profile_permission_overrides_profile_idx on public.profile_permission_overrides(profile_id);


-- ============================================================================
-- SEED: LEVEL DEFAULTS
-- ============================================================================
-- 2 = write, 1 = read, 0 = none. Levels are 0 Super Admin, 3 Manager,
-- 4 Senior Staff, 6 Staff, 7 Junior Staff, 8 Basic (lower = more access).
--
-- Level 0 rows are seeded for completeness only; resolve_permissions() below
-- short-circuits Super Admin to full write so the last admin can never be
-- locked out of the app by a bad edit.
-- ============================================================================

insert into public.admin_level_permissions (admin_level, module_id, access)
select v.admin_level, m.id, v.access
from public.permission_modules m
join (values
  -- level, module key,  access
  (0, 'dashboard', 2), (0, 'students', 2), (0, 'schools', 2), (0, 'events', 2),
  (0, 'exams',     2), (0, 'staff',    2), (0, 'reports', 2), (0, 'settings', 2),

  (3, 'dashboard', 1), (3, 'students', 2), (3, 'schools', 2), (3, 'events', 2),
  (3, 'exams',     2), (3, 'staff',    1), (3, 'reports', 2), (3, 'settings', 1),

  (4, 'dashboard', 1), (4, 'students', 2), (4, 'schools', 2), (4, 'events', 2),
  (4, 'exams',     2), (4, 'staff',    0), (4, 'reports', 1), (4, 'settings', 0),

  (6, 'dashboard', 1), (6, 'students', 2), (6, 'schools', 1), (6, 'events', 2),
  (6, 'exams',     1), (6, 'staff',    0), (6, 'reports', 1), (6, 'settings', 0),

  (7, 'dashboard', 1), (7, 'students', 1), (7, 'schools', 1), (7, 'events', 1),
  (7, 'exams',     1), (7, 'staff',    0), (7, 'reports', 0), (7, 'settings', 0),

  (8, 'dashboard', 1), (8, 'students', 1), (8, 'schools', 1), (8, 'events', 1),
  (8, 'exams',     1), (8, 'staff',    0), (8, 'reports', 0), (8, 'settings', 0)
) as v(admin_level, module_key, access) on v.module_key = m.key
on conflict (admin_level, module_id) do nothing;


-- ============================================================================
-- RESOLVER
-- ============================================================================
-- Effective access per module for one profile: override, else level default,
-- else none. security definer so a signed-in user can resolve their own rights
-- without needing select privileges on the underlying tables.
--
-- The cross join onto a one-row subselect (rather than a join on profiles) is
-- deliberate: a profile with a null admin_level still yields eight rows of 0,
-- so callers never have to tell "no permissions" apart from "profile missing".
-- ============================================================================

create or replace function public.resolve_permissions(p_profile_id uuid)
returns table (module_key text, access smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.key,
    case
      when p.admin_level = 0 then 2::smallint
      else coalesce(o.access, d.access, 0::smallint)
    end
  from public.permission_modules m
  cross join (
    select admin_level from public.profiles where id = p_profile_id
  ) p
  left join public.admin_level_permissions d
    on d.module_id = m.id and d.admin_level = p.admin_level
  left join public.profile_permission_overrides o
    on o.module_id = m.id and o.profile_id = p_profile_id
  order by m.sort_order;
$$;

revoke execute on function public.resolve_permissions(uuid) from public, anon;
grant execute on function public.resolve_permissions(uuid) to authenticated;


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Read to any signed-in staff member — the UI needs the module list and the
-- level defaults to render the access grid. No write policies: all mutations
-- go through server actions on the service-role client, which is where the
-- anti-escalation rules live.
-- ============================================================================

alter table public.permission_modules           enable row level security;
alter table public.admin_level_permissions      enable row level security;
alter table public.profile_permission_overrides enable row level security;

create policy "permission_modules_select" on public.permission_modules
  for select to authenticated using (true);

create policy "admin_level_permissions_select" on public.admin_level_permissions
  for select to authenticated using (true);

create policy "profile_permission_overrides_select" on public.profile_permission_overrides
  for select to authenticated using (true);
