-- MacroZone account deletion moves behind a trusted server path.
--
-- The previous public.delete_my_account() RPC was callable by any authenticated
-- client and proved "recent authentication" from the amr claim of the caller's
-- access token. That claim is carried by a signed JWT, but its refresh semantics
-- are not guaranteed by contract, so it is not used as the only gate any more.
--
-- From this migration on, deletion is performed by public.delete_account_data(),
-- which no client role may execute. Only the service_role key held by the
-- delete-account Edge Function can call it, and that function derives the user id
-- from a verified access token after re-verifying the user's password with GoTrue.

revoke all on function public.delete_my_account() from public, anon, authenticated;

drop function if exists public.delete_my_account();

create or replace function public.delete_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer := 0;
begin
  if p_user_id is null then
    raise exception 'invalid_request' using errcode = '22023';
  end if;

  delete from public.sync_entities where user_id = p_user_id;
  delete from public.sync_operations where user_id = p_user_id;
  delete from public.sync_accounts where user_id = p_user_id;
  delete from auth.users where id = p_user_id;
  get diagnostics removed = row_count;

  return jsonb_build_object('status', case when removed > 0 then 'deleted' else 'already_deleted' end);
end;
$$;

revoke all on function public.delete_account_data(uuid) from public, anon, authenticated;

grant execute on function public.delete_account_data(uuid) to service_role;

comment on function public.delete_account_data(uuid) is
  'Privileged account deletion. Callable only with the service_role key from the delete-account Edge Function, which verifies the access token and re-verifies the password with GoTrue before passing the user id it derived from that token. Never grant this to anon or authenticated.';
