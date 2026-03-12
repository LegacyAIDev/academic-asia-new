-- ============================================================================
-- Migration: 018_create_student_event_applications_table
-- Description: Student event applications (student registrations for events)
-- Depends on: 006_create_students_table, 010_create_events_table
-- ============================================================================

-- ============================================================================
-- EVENT APPLICATION STATUS
-- ============================================================================

create table public.event_application_statuses (
                                                   id serial primary key,
                                                   code text unique not null,
                                                   label text not null,
                                                   sort_order int default 0
);

insert into public.event_application_statuses (code, label, sort_order) values
                                                                            ('normal', 'Normal', 1),
                                                                            ('confirmed', 'Confirmed', 2),
                                                                            ('cancelled', 'Cancelled', 3),
                                                                            ('attended', 'Attended', 4),
                                                                            ('no_show', 'No Show', 5);

-- ============================================================================
-- STUDENT EVENT APPLICATIONS TABLE
-- ============================================================================

create table public.student_event_applications (
                                                   id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                                   student_id uuid not null references public.students(id) on delete cascade,
                                                   event_id uuid references public.events(id),

    -- Status
                                                   status_id int references public.event_application_statuses(id) default 1,

    -- Representative assignment
                                                   representative_id uuid references public.event_representatives(id) on delete set null,

    -- Scheduling
                                                   preferred_time text,

    -- Capacity events
                                                   seats_requested int,
                                                   seats_assigned int,

    -- Music events
                                                   piece text,
                                                   composer text,

    -- Communication
                                                   email_sent boolean default false,

    -- Remarks
                                                   remarks text,

    -- Legacy tracking
                                                   legacy_student_code text,
                                                   legacy_event_name text,              -- Original event name from CSV

    -- Assignment
                                                   assigned_to uuid references public.profiles(id),

    -- Audit
                                                   created_at timestamptz default now(),
                                                   updated_at timestamptz default now(),
                                                   legacy_last_update timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index event_application_statuses_code_idx on public.event_application_statuses(code);

create index student_event_apps_student_id_idx on public.student_event_applications(student_id);
create index student_event_apps_event_id_idx on public.student_event_applications(event_id);
create index student_event_apps_status_id_idx on public.student_event_applications(status_id);
create index student_event_apps_assigned_to_idx on public.student_event_applications(assigned_to);
create index student_event_apps_representative_id_idx on public.student_event_applications(representative_id);

-- Composite index for unique check
create index student_event_apps_student_event_idx on public.student_event_applications(student_id, event_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.event_application_statuses enable row level security;
alter table public.student_event_applications enable row level security;

create policy "event_application_statuses_select" on public.event_application_statuses
  for select to authenticated using (true);

create policy "student_event_apps_select" on public.student_event_applications
  for select to authenticated using (true);
create policy "student_event_apps_insert" on public.student_event_applications
  for insert to authenticated with check (true);
create policy "student_event_apps_update" on public.student_event_applications
  for update to authenticated using (true) with check (true);
create policy "student_event_apps_delete" on public.student_event_applications
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_event_apps_updated_at
    before update on public.student_event_applications
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.event_application_statuses is 'Status for student event applications';
comment on table public.student_event_applications is 'Student registrations for events (Expos, Top Schools, Interviews, etc.)';
comment on column public.student_event_applications.representative_id is 'Assigned representative for this student';
comment on column public.student_event_applications.preferred_time is 'Student/parent preferred time slot';
comment on column public.student_event_applications.seats_requested is 'Number of seats requested (capacity events)';
comment on column public.student_event_applications.seats_assigned is 'Number of seats assigned (capacity events)';
comment on column public.student_event_applications.piece is 'Music piece (music audition events)';
comment on column public.student_event_applications.composer is 'Composer of music piece (music audition events)';