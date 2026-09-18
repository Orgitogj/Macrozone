create schema if not exists private;

revoke all on schema private from public;

create table if not exists public.sync_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_change_seq bigint not null default 0 check (last_change_seq >= 0),
  tombstones_purged_through_seq bigint not null default 0 check (tombstones_purged_through_seq >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_entities (
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('meal', 'food', 'saved_meal', 'recipe', 'nutrition_plan')),
  entity_id uuid not null,
  revision bigint not null check (revision > 0),
  change_seq bigint not null check (change_seq > 0),
  payload_version smallint not null check (payload_version = 1),
  payload jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id),
  unique (user_id, change_seq),
  constraint sync_entities_payload_matches_state check ((deleted_at is null) = (payload is not null))
);

create index if not exists idx_sync_entities_changes on public.sync_entities (user_id, change_seq);

create table if not exists public.sync_operations (
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  status text not null check (status in ('applied', 'rejected')),
  result_revision bigint,
  error_code text,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

create index if not exists idx_sync_operations_created on public.sync_operations (user_id, created_at);

alter table public.sync_accounts enable row level security;
alter table public.sync_entities enable row level security;
alter table public.sync_operations enable row level security;

alter table public.sync_accounts force row level security;
alter table public.sync_entities force row level security;
alter table public.sync_operations force row level security;

drop policy if exists sync_accounts_select_own on public.sync_accounts;
create policy sync_accounts_select_own on public.sync_accounts
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists sync_entities_select_own on public.sync_entities;
create policy sync_entities_select_own on public.sync_entities
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists sync_operations_select_own on public.sync_operations;
create policy sync_operations_select_own on public.sync_operations
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.sync_accounts from anon, authenticated;
revoke all on table public.sync_entities from anon, authenticated;
revoke all on table public.sync_operations from anon, authenticated;

grant select on table public.sync_accounts to authenticated;
grant select on table public.sync_entities to authenticated;
grant select on table public.sync_operations to authenticated;

create or replace function private.is_timestamp(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  parsed timestamptz;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'string' then
    return false;
  end if;
  begin
    parsed := (p_value #>> '{}')::timestamptz;
  exception when others then
    return false;
  end;
  return parsed is not null;
end;
$$;

create or replace function private.is_bounded_number(p_value jsonb, p_min numeric, p_max numeric)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_value is not null
    and jsonb_typeof(p_value) = 'number'
    and (p_value #>> '{}')::numeric between p_min and p_max;
$$;

create or replace function private.is_short_text(p_value jsonb, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_value is not null
    and jsonb_typeof(p_value) = 'string'
    and length(p_value #>> '{}') between 1 and p_max;
$$;

create or replace function private.validate_serving(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_value is not null
    and jsonb_typeof(p_value) = 'object'
    and private.is_bounded_number(p_value -> 'amount', 0.0001, 100000)
    and (p_value ->> 'unit') in ('g', 'ml', 'serving', 'piece', 'cup', 'tbsp', 'tsp');
$$;

create or replace function private.validate_macros(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_value is not null
    and jsonb_typeof(p_value) = 'object'
    and private.is_bounded_number(p_value -> 'calories', 0, 100000)
    and private.is_bounded_number(p_value -> 'protein', 0, 100000)
    and private.is_bounded_number(p_value -> 'carbs', 0, 100000)
    and private.is_bounded_number(p_value -> 'fat', 0, 100000);
$$;

create or replace function private.validate_portions(p_items jsonb, p_max integer)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return false;
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > p_max then
    return false;
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object'
      or not private.is_short_text(item -> 'foodName', 80)
      or not private.validate_serving(item -> 'serving')
      or not private.validate_macros(item -> 'nutrition')
      or not private.is_bounded_number(item -> 'amount', 0.0001, 100000)
      or not private.is_short_text(item -> 'id', 64)
      or (item -> 'foodId' is not null and jsonb_typeof(item -> 'foodId') not in ('null', 'string'))
    then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function private.validate_payload(
  p_entity_type text,
  p_entity_id uuid,
  p_payload_version integer,
  p_payload jsonb
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  body jsonb;
  barcode jsonb;
begin
  if p_payload_version <> 1 then
    return 'unsupported_payload_version';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return 'invalid_payload';
  end if;
  if length(p_payload::text) > 65536 then
    return 'payload_too_large';
  end if;

  if p_entity_type = 'meal' then
    body := p_payload -> 'meal';
    if body is null or jsonb_typeof(body) <> 'object'
      or (body ->> 'id') is distinct from p_entity_id::text
      or not private.is_short_text(body -> 'name', 120)
      or not private.validate_macros(body)
      or (body ->> 'mealType') not in ('breakfast', 'lunch', 'dinner', 'snack')
      or (body ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$'
      or (jsonb_typeof(body -> 'time') not in ('null', 'string'))
      or not private.is_timestamp(body -> 'createdAt')
      or not private.is_timestamp(body -> 'updatedAt')
    then
      return 'invalid_payload';
    end if;
    if jsonb_typeof(p_payload -> 'source') = 'object'
      and (p_payload -> 'source' ->> 'sourceType') not in ('food', 'recipe', 'ai', 'product')
    then
      return 'invalid_payload';
    end if;
    return null;
  elsif p_entity_type = 'food' then
    body := p_payload -> 'food';
    if body is null or jsonb_typeof(body) <> 'object'
      or (body ->> 'id') is distinct from p_entity_id::text
      or not private.is_short_text(body -> 'name', 80)
      or not private.validate_serving(body -> 'serving')
      or not private.validate_macros(body -> 'nutrition')
      or jsonb_typeof(body -> 'isFavorite') <> 'boolean'
      or not private.is_timestamp(body -> 'createdAt')
      or not private.is_timestamp(body -> 'updatedAt')
    then
      return 'invalid_payload';
    end if;
    if p_payload -> 'barcodes' is not null and jsonb_typeof(p_payload -> 'barcodes') <> 'array' then
      return 'invalid_payload';
    end if;
    for barcode in select value from jsonb_array_elements(coalesce(p_payload -> 'barcodes', '[]'::jsonb)) loop
      if (barcode ->> 'barcode') !~ '^[0-9]{8,14}$' or not private.is_timestamp(barcode -> 'linkedAt') then
        return 'invalid_payload';
      end if;
    end loop;
    return null;
  elsif p_entity_type = 'saved_meal' then
    body := p_payload -> 'savedMeal';
    if body is null or jsonb_typeof(body) <> 'object'
      or (body ->> 'id') is distinct from p_entity_id::text
      or not private.is_short_text(body -> 'name', 80)
      or not private.validate_portions(body -> 'items', 50)
      or not private.is_timestamp(body -> 'createdAt')
      or not private.is_timestamp(body -> 'updatedAt')
    then
      return 'invalid_payload';
    end if;
    return null;
  elsif p_entity_type = 'recipe' then
    body := p_payload -> 'recipe';
    if body is null or jsonb_typeof(body) <> 'object'
      or (body ->> 'id') is distinct from p_entity_id::text
      or not private.is_short_text(body -> 'name', 80)
      or not private.is_bounded_number(body -> 'servings', 0.0001, 1000)
      or not private.validate_portions(body -> 'ingredients', 100)
      or not private.is_timestamp(body -> 'createdAt')
      or not private.is_timestamp(body -> 'updatedAt')
    then
      return 'invalid_payload';
    end if;
    return null;
  elsif p_entity_type = 'nutrition_plan' then
    if p_entity_id <> '00000000-0000-4000-8000-000000000001'::uuid then
      return 'invalid_entity_id';
    end if;
    if jsonb_typeof(coalesce(p_payload -> 'profile', 'null'::jsonb)) not in ('null', 'object')
      or jsonb_typeof(coalesce(p_payload -> 'goals', 'null'::jsonb)) not in ('null', 'object')
      or coalesce(p_payload ->> 'onboardingStatus', 'completed') not in ('completed', 'skipped')
    then
      return 'invalid_payload';
    end if;
    return null;
  end if;

  return 'unsupported_entity_type';
end;
$$;

create or replace function public.sync_push(p_operations jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_operation jsonb;
  v_operation_id uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_operation_kind text;
  v_payload_version integer;
  v_base_revision bigint;
  v_payload jsonb;
  v_existing public.sync_entities%rowtype;
  v_stored public.sync_operations%rowtype;
  v_current_revision bigint;
  v_validation text;
  v_next_seq bigint;
  v_results jsonb := '[]'::jsonb;
begin
  if v_caller is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_operations is null or jsonb_typeof(p_operations) <> 'array' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if jsonb_array_length(p_operations) > 100 then
    raise exception 'too_many_operations' using errcode = '22023';
  end if;

  insert into public.sync_accounts (user_id) values (v_caller)
  on conflict (user_id) do nothing;

  perform 1 from public.sync_accounts where user_id = v_caller for update;

  for v_operation in select value from jsonb_array_elements(p_operations) loop
    begin
      v_operation_id := (v_operation ->> 'operationId')::uuid;
      v_entity_id := (v_operation ->> 'entityId')::uuid;
    exception when others then
      raise exception 'invalid_identifier' using errcode = '22023';
    end;
    v_entity_type := v_operation ->> 'entityType';
    v_operation_kind := v_operation ->> 'kind';
    v_payload_version := coalesce((v_operation ->> 'payloadVersion')::integer, 0);
    v_base_revision := coalesce((v_operation ->> 'baseRevision')::bigint, 0);
    v_payload := v_operation -> 'payload';

    if v_entity_type not in ('meal', 'food', 'saved_meal', 'recipe', 'nutrition_plan') or v_operation_kind not in ('upsert', 'delete') then
      raise exception 'invalid_operation' using errcode = '22023';
    end if;

    select * into v_stored from public.sync_operations
    where user_id = v_caller and sync_operations.operation_id = v_operation_id;

    if found then
      if v_stored.entity_type <> v_entity_type or v_stored.entity_id <> v_entity_id then
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'operationId', v_operation_id, 'status', 'rejected', 'errorCode', 'operation_mismatch'));
      elsif v_stored.status = 'applied' then
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'operationId', v_operation_id, 'status', 'applied', 'revision', v_stored.result_revision));
      else
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'operationId', v_operation_id, 'status', 'rejected', 'errorCode', v_stored.error_code));
      end if;
      continue;
    end if;

    select * into v_existing from public.sync_entities
    where user_id = v_caller and sync_entities.entity_type = v_entity_type and sync_entities.entity_id = v_entity_id;

    v_current_revision := coalesce(v_existing.revision, 0);

    if v_operation_kind = 'upsert' then
      v_validation := private.validate_payload(v_entity_type, v_entity_id, v_payload_version, v_payload);
      if v_validation is not null then
        insert into public.sync_operations (user_id, operation_id, entity_type, entity_id, status, error_code)
        values (v_caller, v_operation_id, v_entity_type, v_entity_id, 'rejected', v_validation);
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'operationId', v_operation_id, 'status', 'rejected', 'errorCode', v_validation));
        continue;
      end if;
    end if;

    if v_base_revision <> v_current_revision then
      if v_existing.user_id is not null
        and ((v_operation_kind = 'delete' and v_existing.deleted_at is not null)
          or (v_operation_kind = 'upsert' and v_existing.deleted_at is null and v_existing.payload = v_payload))
      then
        insert into public.sync_operations (user_id, operation_id, entity_type, entity_id, status, result_revision)
        values (v_caller, v_operation_id, v_entity_type, v_entity_id, 'applied', v_existing.revision);
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'operationId', v_operation_id, 'status', 'applied', 'revision', v_existing.revision));
        continue;
      end if;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'operationId', v_operation_id,
        'status', 'conflict',
        'revision', v_current_revision,
        'deleted', coalesce(v_existing.deleted_at is not null, false),
        'payload', v_existing.payload));
      continue;
    end if;

    if v_operation_kind = 'delete' and v_existing.user_id is null then
      insert into public.sync_operations (user_id, operation_id, entity_type, entity_id, status, result_revision)
      values (v_caller, v_operation_id, v_entity_type, v_entity_id, 'applied', 0);
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'operationId', v_operation_id, 'status', 'applied', 'revision', 0));
      continue;
    end if;

    update public.sync_accounts
    set last_change_seq = last_change_seq + 1, updated_at = now()
    where user_id = v_caller
    returning last_change_seq into v_next_seq;

    insert into public.sync_entities (
      user_id, entity_type, entity_id, revision, change_seq, payload_version, payload, deleted_at, created_at, updated_at
    )
    values (
      v_caller, v_entity_type, v_entity_id, v_current_revision + 1, v_next_seq, 1,
      case when v_operation_kind = 'delete' then null else v_payload end,
      case when v_operation_kind = 'delete' then now() else null end,
      now(), now()
    )
    on conflict (user_id, entity_type, entity_id) do update
    set revision = excluded.revision,
        change_seq = excluded.change_seq,
        payload_version = excluded.payload_version,
        payload = excluded.payload,
        deleted_at = excluded.deleted_at,
        updated_at = now();

    insert into public.sync_operations (user_id, operation_id, entity_type, entity_id, status, result_revision)
    values (v_caller, v_operation_id, v_entity_type, v_entity_id, 'applied', v_current_revision + 1);

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'operationId', v_operation_id, 'status', 'applied', 'revision', v_current_revision + 1));
  end loop;

  return jsonb_build_object('results', v_results);
end;
$$;

create or replace function public.sync_pull(p_after_seq bigint, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  page_size integer := least(greatest(coalesce(p_limit, 100), 1), 500);
  after_seq bigint := greatest(coalesce(p_after_seq, 0), 0);
  purged_through bigint;
  rows jsonb;
  next_cursor bigint;
  total bigint;
begin
  if caller is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select tombstones_purged_through_seq into purged_through from public.sync_accounts where user_id = caller;
  if purged_through is not null and after_seq > 0 and after_seq < purged_through then
    raise exception 'cursor_expired' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(change order by change ->> 'changeSeq'), '[]'::jsonb), count(*)
  into rows, total
  from (
    select jsonb_build_object(
      'entityType', entity_type,
      'entityId', entity_id,
      'revision', revision,
      'changeSeq', change_seq,
      'payloadVersion', payload_version,
      'deleted', deleted_at is not null,
      'payload', payload
    ) as change
    from public.sync_entities
    where user_id = caller and change_seq > after_seq
    order by change_seq
    limit page_size
  ) as page;

  select coalesce(max((change ->> 'changeSeq')::bigint), after_seq) into next_cursor
  from jsonb_array_elements(rows) as change;

  return jsonb_build_object(
    'changes', rows,
    'nextCursor', next_cursor,
    'hasMore', exists (
      select 1 from public.sync_entities
      where user_id = caller and change_seq > next_cursor
    )
  );
end;
$$;

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  authenticated_at timestamptz;
  removed integer;
begin
  if caller is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select max(to_timestamp((entry ->> 'timestamp')::bigint))
  into authenticated_at
  from jsonb_array_elements(coalesce((select auth.jwt() -> 'amr'), '[]'::jsonb)) as entry;

  if authenticated_at is null or authenticated_at < now() - interval '10 minutes' then
    raise exception 'reauthentication_required' using errcode = '28000';
  end if;

  delete from public.sync_entities where user_id = caller;
  delete from public.sync_operations where user_id = caller;
  delete from public.sync_accounts where user_id = caller;
  delete from auth.users where id = caller;
  get diagnostics removed = row_count;

  return jsonb_build_object('status', case when removed > 0 then 'deleted' else 'already_deleted' end);
end;
$$;

create or replace function private.purge_tombstones(p_older_than interval default interval '365 days')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer := 0;
begin
  with removed as (
    delete from public.sync_entities
    where deleted_at is not null and deleted_at < now() - p_older_than
    returning user_id, change_seq
  ), watermarks as (
    select user_id, max(change_seq) as seq from removed group by user_id
  )
  update public.sync_accounts
  set tombstones_purged_through_seq = greatest(sync_accounts.tombstones_purged_through_seq, watermarks.seq)
  from watermarks
  where sync_accounts.user_id = watermarks.user_id;

  get diagnostics purged = row_count;
  return purged;
end;
$$;

revoke all on function public.sync_push(jsonb) from public, anon;
revoke all on function public.sync_pull(bigint, integer) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function private.purge_tombstones(interval) from public, anon, authenticated;
revoke all on function private.validate_payload(text, uuid, integer, jsonb) from public, anon, authenticated;

grant execute on function public.sync_push(jsonb) to authenticated;
grant execute on function public.sync_pull(bigint, integer) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
