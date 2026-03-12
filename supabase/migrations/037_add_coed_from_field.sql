-- "Going Co-ed from" dropdown for schools

create table public.school_coed_from (
  id serial primary key,
  code text unique not null,
  label text not null,
  sort_order int default 0
);

insert into public.school_coed_from (code, label, sort_order) values
  ('never', 'Never', 0),
  ('year_9', 'Year 9', 1),
  ('year_10', 'Year 10', 2),
  ('year_11', 'Year 11', 3),
  ('year_12', 'Year 12', 4);

create index school_coed_from_code_idx on public.school_coed_from(code);

alter table public.school_coed_from enable row level security;
create policy "school_coed_from_select" on public.school_coed_from
  for select to authenticated using (true);

-- Add FK column to schools
alter table public.schools
  add column coed_from_id int references public.school_coed_from(id);
