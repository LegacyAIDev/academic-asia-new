-- ============================================================================
-- Migration: 071_create_school_documents
-- Description: Documents feature for schools — categories, table and a private
--              storage bucket. Mirrors the student document manager.
-- ============================================================================

-- School-specific document categories (reuse the shared 'other' for custom).
insert into public.document_categories (code, label, section, sort_order) values
  ('school_prospectus',   'Prospectus',    'school', 20),
  ('school_agreement',    'Agreement',     'school', 21),
  ('school_brochure',     'Brochure',      'school', 22),
  ('school_fee_schedule', 'Fee Schedule',  'school', 23)
on conflict (code) do nothing;

-- Documents table (one row per uploaded file)
create table if not exists public.school_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  category_id int not null references public.document_categories(id),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  title text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists school_documents_school_id_idx on public.school_documents(school_id);
create index if not exists school_documents_category_id_idx on public.school_documents(category_id);

alter table public.school_documents enable row level security;

drop policy if exists "school_documents_select" on public.school_documents;
drop policy if exists "school_documents_insert" on public.school_documents;
drop policy if exists "school_documents_update" on public.school_documents;
drop policy if exists "school_documents_delete" on public.school_documents;

create policy "school_documents_select" on public.school_documents for select to authenticated using (true);
create policy "school_documents_insert" on public.school_documents for insert to authenticated with check (true);
create policy "school_documents_update" on public.school_documents for update to authenticated using (true) with check (true);
create policy "school_documents_delete" on public.school_documents for delete to authenticated using (true);

drop trigger if exists school_documents_updated_at on public.school_documents;
create trigger school_documents_updated_at
  before update on public.school_documents
  for each row execute function public.handle_updated_at();

-- Private storage bucket (download via signed URLs, same as student docs)
insert into storage.buckets (id, name, public, file_size_limit)
values ('school-documents', 'school-documents', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "school_docs_insert" on storage.objects;
drop policy if exists "school_docs_select" on storage.objects;
drop policy if exists "school_docs_update" on storage.objects;
drop policy if exists "school_docs_delete" on storage.objects;

create policy "school_docs_insert" on storage.objects for insert to authenticated with check (bucket_id = 'school-documents');
create policy "school_docs_select" on storage.objects for select to authenticated using (bucket_id = 'school-documents');
create policy "school_docs_update" on storage.objects for update to authenticated using (bucket_id = 'school-documents');
create policy "school_docs_delete" on storage.objects for delete to authenticated using (bucket_id = 'school-documents');
