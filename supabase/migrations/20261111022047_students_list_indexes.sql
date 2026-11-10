-- Students list speed (26k+ students).
--
-- Search matches any part of a name, code or email (ilike '%term%'), which a
-- plain b-tree cannot serve, so every search read the whole table twice (rows
-- and count). Trigram indexes let Postgres combine one index per column.
-- The newest-first list is ordered by created_at with id as a tie-breaker:
-- imports gave thousands of students the same created_at, and without a unique
-- order the same student could appear on two pages and another on none.

create extension if not exists pg_trgm;

create index if not exists students_first_name_trgm_idx on public.students using gin (first_name gin_trgm_ops);
create index if not exists students_surname_trgm_idx on public.students using gin (surname gin_trgm_ops);
create index if not exists students_chinese_name_trgm_idx on public.students using gin (chinese_name gin_trgm_ops);
create index if not exists students_student_code_trgm_idx on public.students using gin (student_code gin_trgm_ops);
create index if not exists students_email_trgm_idx on public.students using gin (email gin_trgm_ops);

create index if not exists students_created_at_id_idx on public.students (created_at desc, id desc);
create index if not exists students_surname_first_name_id_idx on public.students (surname, first_name, id);
