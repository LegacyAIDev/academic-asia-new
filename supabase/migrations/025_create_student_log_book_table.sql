-- ============================================================================
-- Migration: 025_create_student_log_book_table
-- Description: Student activity log/journal
-- Depends on: 006_create_students_table, 003_create_profiles_table
-- ============================================================================

-- ============================================================================
-- STUDENT LOG BOOK TABLE
-- ============================================================================

create table public.student_log_book (
                                         id uuid primary key default gen_random_uuid(),

    -- Core foreign key
                                         student_id uuid not null references public.students(id) on delete cascade,

    -- Log content
                                         remarks text,                        -- Activity log content (can be large/multi-line)

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

create index student_log_book_student_id_idx on public.student_log_book(student_id);
create index student_log_book_assigned_to_idx on public.student_log_book(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.student_log_book enable row level security;

create policy "student_log_book_select" on public.student_log_book
  for select to authenticated using (true);
create policy "student_log_book_insert" on public.student_log_book
  for insert to authenticated with check (true);
create policy "student_log_book_update" on public.student_log_book
  for update to authenticated using (true) with check (true);
create policy "student_log_book_delete" on public.student_log_book
  for delete to authenticated using (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger student_log_book_updated_at
    before update on public.student_log_book
    for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.student_log_book is 'Student activity log/journal entries';
comment on column public.student_log_book.remarks is 'Log content - can contain multi-line activity history';