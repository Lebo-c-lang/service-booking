-- Limit anonymous booking reads to fields needed for slot availability and confirmation.
drop policy if exists "anyone can read a booking by exact id" on public.bookings;

create policy "anonymous users read non-sensitive booking fields"
  on public.bookings for select to anon using (true);

revoke select on table public.bookings from anon;
grant select (
  id,
  business_id,
  service_id,
  slot_start,
  slot_end,
  status,
  deposit_amount,
  deposit_status,
  created_at
) on table public.bookings to anon;

-- Anonymous customers cannot update bookings directly under RLS. Confirm free bookings
-- through this narrow function instead of granting them broader update permissions.
create or replace function public.confirm_no_deposit_booking(booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmed boolean;
begin
  update public.bookings
  set status = 'confirmed'
  where id = booking_id
    and status = 'pending'
    and deposit_amount = 0
  returning true into confirmed;

  return coalesce(confirmed, false);
end;
$$;

revoke all on function public.confirm_no_deposit_booking(uuid) from public;
grant execute on function public.confirm_no_deposit_booking(uuid) to anon, authenticated;