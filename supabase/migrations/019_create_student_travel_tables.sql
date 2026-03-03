-- ============================================================================
-- Migration: 019_create_student_travel_tables
-- Description: Student travel/flight records and pickup arrangements
-- Depends on: 006_create_students_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- AIRLINES REFERENCE TABLE
-- ============================================================================

create table public.airlines (
                                 id serial primary key,
                                 code text unique not null,
                                 label text not null,
                                 sort_order int default 0,
                                 is_active boolean default true
);

insert into public.airlines (code, label, sort_order) values
                                                          ('air_france', 'Air France', 1),
                                                          ('air_new_zealand', 'Air New Zealand', 2),
                                                          ('british_airways', 'British Airways', 3),
                                                          ('cathay_pacific', 'Cathay Pacific', 4),
                                                          ('emirates', 'Emirates', 5),
                                                          ('klm', 'KLM Royal Dutch', 6),
                                                          ('lufthansa', 'Lufthansa', 7),
                                                          ('qantas', 'Qantas', 8),
                                                          ('qatar_airways', 'Qatar Airways', 9),
                                                          ('virgin_atlantic', 'Virgin Atlantic', 10);

-- ============================================================================
-- AIRPORTS REFERENCE TABLE
-- ============================================================================

create table public.airports (
                                 id serial primary key,
                                 code text unique not null,
                                 label text not null,
                                 city text,
                                 sort_order int default 0,
                                 is_active boolean default true
);

insert into public.airports (code, label, city, sort_order) values
                                                                -- Belfast
                                                                ('belfast_george_best', 'Belfast George Best City Airport', 'Belfast', 10),
                                                                ('belfast_international', 'Belfast International', 'Belfast', 11),
                                                                -- Birmingham
                                                                ('birmingham', 'Birmingham', 'Birmingham', 20),
                                                                -- Bristol
                                                                ('bristol', 'Bristol', 'Bristol', 30),
                                                                -- Edinburgh
                                                                ('edinburgh', 'Edinburgh', 'Edinburgh', 40),
                                                                -- Humberside
                                                                ('humberside', 'Humberside', 'Humberside', 50),
                                                                -- Isle of Man
                                                                ('isle_of_man', 'Isle of Man', 'Isle of Man', 60),
                                                                -- Leeds
                                                                ('leeds', 'Leeds', 'Leeds', 70),
                                                                -- London
                                                                ('london_gatwick', 'London Gatwick', 'London', 80),
                                                                ('london_heathrow_t1', 'London Heathrow T1', 'London', 81),
                                                                ('london_heathrow_t2', 'London Heathrow T2', 'London', 82),
                                                                ('london_heathrow_t3', 'London Heathrow T3', 'London', 83),
                                                                ('london_heathrow_t4', 'London Heathrow T4', 'London', 84),
                                                                ('london_heathrow_t5', 'London Heathrow T5', 'London', 85),
                                                                ('london_luton', 'London Luton', 'London', 86),
                                                                ('london_stansted', 'London Stansted', 'London', 87),
                                                                -- Manchester
                                                                ('manchester_t1', 'Manchester T1', 'Manchester', 90),
                                                                ('manchester_t2', 'Manchester T2', 'Manchester', 91),
                                                                ('manchester_t3', 'Manchester T3', 'Manchester', 92),
                                                                -- Newcastle
                                                                ('newcastle', 'Newcastle', 'Newcastle', 100),
                                                                -- Norwich
                                                                ('norwich', 'Norwich', 'Norwich', 110),
                                                                -- Dubai (international hub)
                                                                ('dubai_t3', 'Dubai T3', 'Dubai', 200);

-- ============================================================================
-- TRAVEL STATUS REFERENCE TABLE
-- ============================================================================

create table public.travel_statuses (
                                        id serial primary key,
                                        code text unique not null,
                                        label text not null,
                                        sort_order int default 0
);

insert into public.travel_statuses (code, label, sort_order) values
                                                                 ('normal', 'Normal', 1),
                                                                 ('confirmed', 'Confirmed', 2),
                                                                 ('cancelled', 'Cancelled', 3),
                                                                 ('completed', 'Completed', 4);

-- ============================================================================
-- PICKUP STATUS REFERENCE TABLE
-- ============================================================================

create table public.pickup_statuses (
                                        id serial primary key,
                                        code text unique not null,
                                        label text not null,
                                        sort_order int default 0
);

insert into public.pickup_statuses (code, label, sort_order) values
                                                                 ('booking_made_awaiting_contact', 'booking made & awt contact details', 1),
                                                                 ('confirmation_emailed_family', 'confirmation emailed family', 2),
                                                                 ('consultant_handle', 'Consultant handle', 3),
                                                                 ('details_confirmed', 'details confirmed', 4),
                                                                 ('family_acknowledged', 'family acknowledged confirmation', 5),
                                                                 ('family_self_arrange', 'Family self-arrange', 6),
                                                                 ('itin_received', 'itin received', 7),
                                                                 ('itin_requested', 'itin requested', 8),
                                                                 ('request_made', 'request made', 9),
                                                                 ('sch_guardian_booking', 'sch/guardian cfm booking will be made', 10);

-- ============================================================================
-- PICKUP BY REFERENCE TABLE
-- ============================================================================

create table public.pickup_providers (
                                         id serial primary key,
                                         code text unique not null,
                                         label text not null,
                                         sort_order int default 0,
                                         is_active boolean default true
);

insert into public.pickup_providers (code, label, sort_order) values
                                                                  ('school', 'School', 1),
                                                                  ('whg', 'WHG', 2),
                                                                  ('quest', 'Quest', 3),
                                                                  ('others', 'Others', 4);

-- ============================================================================
-- STUDENT TRAVEL TABLE
-- ============================================================================

create table public.student_travel (
                                       id uuid primary key default gen_random_uuid(),

    -- Core foreign keys
                                       student_id uuid not null references public.students(id) on delete cascade,

    -- Journey info
                                       journey_no int default 0,
                                       route int default 1,

    -- Pickup required?
                                       requires_pickup boolean default false,

    -- Status
                                       status_id int references public.travel_statuses(id) default 1,

    -- Flight details
                                       flight_number text,                  -- e.g., "CX255", "CZ303"
                                       airline_id int references public.airlines(id),
                                       legacy_airline text,                 -- Original airline value from CSV

    -- Arrival details
                                       airport_id int references public.airports(id),
                                       legacy_airport text,                 -- Original airport value from CSV
                                       arrival_date date,
                                       arrival_time text,                   -- Stored as text (various formats: "0620", "19:05")

    -- Pickup confirmation
                                       pickup_status_id int references public.pickup_statuses(id),
                                       legacy_pickup_status text,           -- Original pickup status from CSV
                                       pickup_provider_id int references public.pickup_providers(id),
                                       pickup_by text,                      -- Can include custom values like "Etherton Education (Francessa Palmer)"
                                       meeting_point_details text,          -- Meeting point / pickup person / contact no
                                       fee decimal(10,2) default 0,

    -- Remarks
                                       remarks text,

    -- Legacy tracking
                                       legacy_student_code text,

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

create index airlines_code_idx on public.airlines(code);
create index airports_code_idx on public.airports(code);
create index airports_city_idx on public.airports(city);
create index travel_statuses_code_idx on public.travel_statuses(code);
create index pickup_statuses_code_idx on public.pickup_statuses(code);
create index pickup_providers_code_idx on public.pickup_providers(code);

create index student_travel_student_id_idx on public.student_travel(student_id);
create index student_travel_arrival_date_idx on public.student_travel(arrival_date);
create index student_travel_airport_id_idx on public.student_travel(airport_id);
create index student_travel_status_id_idx on public.student_travel(status_id);
create index student_travel_assigned_to_idx on public.student_travel(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.airlines enable row level security;
alter table public.airports enable row level security;
alter table public.travel_statuses enable row level security;
alter table public.pickup_statuses enable row level security;
alter table public.pickup_providers enable row level security;
alter table public.student_travel enable row level security;

create policy "airlines_select" on public.airlines for select to authenticated using (true);
create policy "airports_select" on public.airports for select to authenticated using (true);
create policy "travel_statuses_select" on public.travel_statuses for select to authenticated using (true);
create policy "pickup_statuses_select" on public.pickup_statuses for select to authenticated using (true);
create policy "pickup_providers_select" on public.pickup_providers for select to authenticated using (true);

create policy "student_travel_select" on public.student_travel
  for select to authenticated using (true);
create policy "student_travel_insert" on public.student_travel
  for insert to authenticated with check (true);
create policy "student_travel_update" on public.student_travel
  for update to authenticated using (true) with check (true);
create policy "student_travel_delete" on public.student_travel
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_travel_updated_at
    before update on public.student_travel
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.airlines is 'Airlines reference table';
comment on table public.airports is 'Airports/arrival locations reference table';
comment on table public.travel_statuses is 'Travel record status';
comment on table public.pickup_statuses is 'Pickup confirmation status workflow';
comment on table public.pickup_providers is 'Who arranges the pickup (School, WHG, Quest, etc.)';
comment on table public.student_travel is 'Student travel records with flight details and pickup arrangements';