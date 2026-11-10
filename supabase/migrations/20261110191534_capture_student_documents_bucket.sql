-- The student-documents storage bucket and its access rules exist on the live
-- project but in no migration, so a database built from the repo could not
-- store student documents ("Bucket not found"). Recreated here as on live;
-- on the live database, where both already exist, this changes nothing.

insert into storage.buckets (id, name, public, file_size_limit)
values ('student-documents', 'student-documents', false, 52428800)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'auth_users_read') then
    create policy auth_users_read on storage.objects for select to authenticated using (bucket_id = 'student-documents');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'auth_users_upload') then
    create policy auth_users_upload on storage.objects for insert to authenticated with check (bucket_id = 'student-documents');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'auth_users_delete') then
    create policy auth_users_delete on storage.objects for delete to authenticated using (bucket_id = 'student-documents');
  end if;
end $$;
