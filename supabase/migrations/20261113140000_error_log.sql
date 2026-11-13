-- Student + teacher error logbook.
-- One row per (user_id, question_id), no matter how many modes that item was
-- missed in. A later correct answer keeps the row and marks it `corrected`;
-- a later miss reopens it (`open`), keeps `first_missed_at`, bumps
-- `last_missed_at` and `miss_count`.
--
-- Teachers can read everyone's rows (same idea as run_history_select +
-- private.is_teacher()); students can only read/write their own. Anon can do
-- nothing: guests never write a logbook row.
--
-- Must be applied to the hosted project zjseatmkwpwsfcyhiivj before Vercel
-- can use the logbook. Do not apply this file to the live database from the
-- client; leave that to a maintained Supabase CLI or SQL editor path.

create table public.error_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null,
  stage_id text not null,
  concept text null,
  source text not null,
  pick text null,
  key text null,
  status text not null default 'open',
  miss_count integer not null default 1,
  first_missed_at timestamptz not null default now(),
  last_missed_at timestamptz not null default now(),
  last_corrected_at timestamptz null,
  constraint error_log_user_question_key unique (user_id, question_id),
  constraint error_log_source_check check (source in ('stage', 'map_practice', 'drill', 'logbook_retry')),
  constraint error_log_status_check check (status in ('open', 'corrected')),
  constraint error_log_miss_count_positive check (miss_count > 0)
);

comment on table public.error_log is
  'One row per student and question they have missed, across past-paper stage runs, infinite map Practice, post-wrong Practice Drills, and logbook retries. A later correct answer marks the row corrected without deleting it; a later miss reopens it.';

comment on column public.error_log.pick is
  'Last wrong display letter the student tapped (A–D as shown after the option shuffle), not the unpublished bank letter.';

comment on column public.error_log.key is
  'Display key (paperAnswer + choiceOrder) for that attempt, so it matches the letter the student saw.';

comment on column public.error_log.source is
  'Source of the latest miss: stage, map_practice, drill, or logbook_retry.';

create index error_log_user_status_idx on public.error_log (user_id, status);
create index error_log_user_stage_idx on public.error_log (user_id, stage_id);

alter table public.error_log enable row level security;

revoke all on table public.error_log from anon, authenticated;
grant select, insert, update, delete on table public.error_log to authenticated;

create policy error_log_select
  on public.error_log
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select private.is_teacher())
  );

create policy error_log_insert_own
  on public.error_log
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy error_log_update_own
  on public.error_log
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy error_log_delete_own
  on public.error_log
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
