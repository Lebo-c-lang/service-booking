drop policy if exists "business owners upload their service images" on storage.objects;
create policy "business owners upload their service images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-images'
    and exists (
      select 1 from public.businesses
      where businesses.id::text = (storage.foldername(storage.objects.name))[1]
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
      where businesses.id::text = (storage.foldername(storage.objects.name))[1]
        and businesses.owner_id = auth.uid()
    )
  );