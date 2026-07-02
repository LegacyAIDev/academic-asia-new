-- ============================================================================
-- Migration: 069_create_student_intro_images_bucket
-- Description: Public storage bucket for images embedded in the student brief
--              introduction (rich text). Public so embedded <img> URLs stay
--              valid in-app and when an intro is emailed to schools.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-intro-images',
  'student-intro-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Staff (authenticated) manage the images; anyone can read (public bucket).
drop policy if exists "intro_images_insert" on storage.objects;
drop policy if exists "intro_images_update" on storage.objects;
drop policy if exists "intro_images_delete" on storage.objects;
drop policy if exists "intro_images_select" on storage.objects;

create policy "intro_images_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-intro-images');

create policy "intro_images_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'student-intro-images');

create policy "intro_images_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-intro-images');

create policy "intro_images_select" on storage.objects
  for select to public
  using (bucket_id = 'student-intro-images');
