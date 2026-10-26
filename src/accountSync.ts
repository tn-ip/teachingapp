import { scoreRun, type Progress, type Run } from "./progress";
import { clearScore, historyRunType, prepareAccountMerge, progressFromRemote, type HistorySummary } from "./sync";
import { supabase } from "./supabase";

type StateRow = {
  cleared: unknown;
  used: unknown;
  last: unknown;
  run: unknown;
};

type ClearRow = { stage_id: string };
type RunRow = {
  stage_id: string;
  run_type: "stage" | "practice";
  score: number;
  total: number;
  created_at: string;
};

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function fetchRemote(userId: string): Promise<Progress> {
  if (!supabase) return progressFromRemote(null, [], []);
  const [stateRes, clearsRes, runsRes] = await Promise.all([
    supabase.from("trainer_state").select("cleared, used, last, run").eq("user_id", userId).maybeSingle(),
    supabase.from("stage_clears").select("stage_id").eq("user_id", userId),
    supabase
      .from("run_history")
      .select("stage_id, run_type, score, total, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  fail(stateRes.error);
  fail(clearsRes.error);
  fail(runsRes.error);
  const state = stateRes.data as StateRow | null;
  const stageIds = ((clearsRes.data ?? []) as ClearRow[]).map((row) => row.stage_id);
  const history: HistorySummary[] = ((runsRes.data ?? []) as RunRow[]).map((row) => ({
    stageId: row.stage_id,
    runType: row.run_type,
    score: row.score,
    total: row.total,
    createdAt: row.created_at,
  }));
  return progressFromRemote(state, stageIds, history);
}

async function writeSnapshot(userId: string, progress: Progress, completed: Run[]): Promise<void> {
  if (!supabase) return;
  const state = await supabase.from("trainer_state").upsert(
    {
      user_id: userId,
      cleared: progress.cleared,
      used: progress.used,
      last: progress.last,
      run: progress.run,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  fail(state.error);

  if (progress.cleared.length > 0) {
    const clears = await supabase.from("stage_clears").upsert(
      progress.cleared.map((stageId) => {
        const score = clearScore(progress, stageId);
        return {
          user_id: userId,
          stage_id: stageId,
          score: score?.score ?? null,
          total: score?.total ?? null,
        };
      }),
      { onConflict: "user_id,stage_id", ignoreDuplicates: true },
    );
    fail(clears.error);
  }

  if (completed.length > 0) {
    const runs = await supabase.from("run_history").upsert(
      completed.map((run) => ({
        user_id: userId,
        stage_id: run.stage,
        run_type: historyRunType(run),
        score: scoreRun(run).correct,
        total: run.ids.length,
        elapsed_ms: null,
        client_run_id: run.clientId,
        detail: {
          client_id: run.clientId,
          mode: run.mode,
          source: run.source ?? null,
          ids: run.ids,
          picks: run.picks,
          focus: run.focus ?? [],
          seen_ids: run.seenIds ?? [],
        },
      })),
      { onConflict: "user_id,client_run_id", ignoreDuplicates: true },
    );
    fail(runs.error);
  }
}

/**
 * Union `local` with the account, then write the snapshot. Finished runs are
 * inserted once (`client_run_id`). Existing clears are left in place.
 */
export async function syncProgress(userId: string, readLocal: () => Progress): Promise<Progress> {
  const remote = await fetchRemote(userId);
  const prepared = prepareAccountMerge(readLocal(), remote);
  await writeSnapshot(userId, prepared.progress, prepared.completed);
  return prepared.progress;
}

export async function deleteAccountProgress(userId: string): Promise<void> {
  if (!supabase) return;
  for (const table of ["run_history", "stage_clears", "trainer_state"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    fail(error);
  }
}

export async function fetchDisplayName(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { display_name: string | null; email: string | null };
  const name = row.display_name?.trim();
  if (name) return name;
  const email = row.email?.trim();
  return email || null;
}

let chain: Promise<void> = Promise.resolve();

export function enqueueSync(task: () => Promise<void>): Promise<void> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
