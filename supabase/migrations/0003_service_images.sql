alter table public.services
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "service images are publicly readable" on storage.objects;
create policy "service images are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'service-images');

drop policy if exists "business owners upload their service images" on storage.objects;
create policy "business owners upload their service images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-images'
    and exists (
      select 1 from public.businesses
      where businesses.id::text = (storage.foldername(name))[1]
        and businesses.owner_id = auth.uid()
    )
  );

drop policy if exists "business owners delete their service images" on storage.objects;
create policy "business owners delete their service images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'service-images'
    and exists (
      select 1 from public.businesses
      where businesses.id::text = (storage.foldername(name))[1]
        and businesses.owner_id = auth.uid()
    )
  );