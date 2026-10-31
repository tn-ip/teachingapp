-- Two-perfect clear rule.
-- One perfect stage run no longer grants a star. Clears earned under the old
-- rule must not count, so this reset drops them. Stars after this file come
-- only from perfect-run ids the app stores in trainer_state.used
-- ($clearRule = ["2"], $perfectRuns = ["J1|<client-id>", ...]).
--
-- Safe to run once at deploy, including after a few new-rule snapshots exist:
-- a row already stamped $clearRule "2" is left alone, and its stage_clears
-- rows are kept only when trainer_state.cleared still lists that stage.
-- Do not run it again later. A second run is harmless only while those
-- stamps are still the source of truth; it will not invent stars.

update public.trainer_state
set cleared = '{}'::text[]
where coalesce(used->'$clearRule'->>0, '') <> '2';

delete from public.stage_clears as sc
where not exists (
  select 1
  from public.trainer_state as ts
  where ts.user_id = sc.user_id
    and ts.used->'$clearRule'->>0 = '2'
    and sc.stage_id = any (ts.cleared)
);
