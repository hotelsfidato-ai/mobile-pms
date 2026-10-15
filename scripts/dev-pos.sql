-- THE TEST WAITER (M-9, 15 Oct) - the web's db/dev/dev-testers.sql pattern,
-- for the one role it lacks (R-10): a `pos` person rostered at 5EL, signed in
-- on a development run as `dev-pos`. Development databases only
-- (`fidato_mobile` and the helpers' scratch copies); never the PMS's.
--   bash "/d/fidato pms/.local/dbq.sh" psql ... -d fidato_mobile -f mobile/scripts/dev-pos.sql
do $$
declare
  v_hotel uuid;
  v_staff uuid;
begin
  select id into v_hotel from hotels where code = '5EL';
  if v_hotel is null then
    raise notice 'dev-pos: there is no 5EL here - run load-demo first. Nothing done.';
    return;
  end if;

  insert into staff (email, full_name, is_group_admin, is_active, firebase_uid)
  values ('dev-pos@fidato.in', 'Test Waiter', false, true, 'dev-pos')
  on conflict (email) do update
    set full_name = excluded.full_name, is_group_admin = false, is_active = true,
        firebase_uid = excluded.firebase_uid
  returning id into v_staff;

  insert into staff_hotels (staff_id, hotel_id, role)
  values (v_staff, v_hotel, 'pos')
  on conflict (staff_id, hotel_id) do update set role = excluded.role;

  raise notice 'dev-pos: the test waiter at 5EL';
end $$;
