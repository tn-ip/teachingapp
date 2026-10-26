-- Paper 2 account snapshot, idempotent run uploads, and a lock so a student
-- cannot grant themselves teacher. Applied on the hosted project
-- zjseatmkwpwsfcyhiivj (migrations trainer_state_and_profile_lock and
-- teacher_check_without_rls_recursion). This file is the resulting change
-- from init_progress_tables. Do not run it again on that database.

create table public.trainer_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  cleared text[] not null default '{}',
  used jsonb not null default '{}'::jsonb,
  last jsonb not null default '{}'::jsonb,
  run jsonb,
  updated_at timestamptz not null default now(),
  constraint trainer_state_used_object check (jsonb_typeof(used) = 'object'),
  constraint trainer_state_last_object check (jsonb_typeof(last) = 'object'),
  constraint trainer_state_run_object check (run is null or jsonb_typeof(run) = 'object')
);

comment on table public.trainer_state is
  'Latest Paper 2 trainer snapshot (cleared, used question ids, last result, open run).';

alter table public.trainer_state enable row level security;

revoke all on table public.trainer_state from anon, authenticated;
grant select, insert, update, delete on table public.trainer_state to authenticated;

create policy trainer_state_select_own
  on public.trainer_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy trainer_state_insert_own
  on public.trainer_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy trainer_state_update_own
  on public.trainer_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy trainer_state_delete_own
  on public.trainer_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.run_history
  add column client_run_id text;

comment on column public.run_history.client_run_id is
  'Device id for one finished run. Lets a sign-in merge upload the run once.';

alter table public.run_history
  add constraint run_history_user_client_run_key unique (user_id, client_run_id);

create policy stage_clears_delete_own
  on public.stage_clears
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy run_history_delete_own
  on public.run_history
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Teacher checks must not query profiles under the profiles RLS policy.
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'teacher'
  );
$$;

revoke all on function private.is_teacher() from public, anon, authenticated;
grant execute on function private.is_teacher() to authenticated;

comment on function private.is_teacher() is
  'True when the signed-in profile role is teacher. Security definer so profile policies do not recurse.';

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_teacher on public.profiles;
drop policy if exists run_history_select_own on public.run_history;
drop policy if exists run_history_select_teacher on public.run_history;
drop policy if exists stage_clears_select_own on public.stage_clears;
drop policy if exists stage_clears_select_teacher on public.stage_clears;

create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_teacher())
  );

create policy run_history_select
  on public.run_history
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select private.is_teacher())
  );

create policy stage_clears_select
  on public.stage_clears
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select private.is_teacher())
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists run_history_insert_own on public.run_history;
create policy run_history_insert_own
  on public.run_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists stage_clears_insert_own on public.stage_clears;
create policy stage_clears_insert_own
  on public.stage_clears
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists stage_clears_update_own on public.stage_clears;
create policy stage_clears_update_own
  on public.stage_clears
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Client updates cannot change role, class, or identity. auth.uid() is null
-- for the SQL editor and the service role, which can still set teacher.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.id := old.id;
    new.role := old.role;
    new.email := old.email;
    new.class_group := old.class_group;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_privileges() from public, anon;
grant execute on function public.protect_profile_privileges() to authenticated;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileges();
