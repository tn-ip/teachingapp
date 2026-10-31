import { scoreRun, type Progress, type Run } from "./progress";
import {
  buildSchoolRoster,
  type SchoolStudent,
} from "./schoolRoster";
import { clearScore, historyRunType, prepareAccountMerge, progressFromRemote, snapshotForRemote, type HistorySummary } from "./sync";
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
  const snapshot = snapshotForRemote(progress);
  const state = await supabase.from("trainer_state").upsert(
    {
      user_id: userId,
      cleared: snapshot.cleared,
      used: snapshot.used,
      last: snapshot.last,
      run: snapshot.run,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  fail(state.error);

  await replaceStageClears(userId, snapshot.cleared, progress);

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
          option_orders: run.optionOrders ?? {},
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
 * inserted once (`client_run_id`). `stage_clears` is rewritten to the starred
 * stages only, so a one-perfect clear does not stay on the teacher view.
 */

async function replaceStageClears(userId: string, starred: string[], progress: Progress): Promise<void> {
  if (!supabase) return;
  if (starred.length === 0) {
    const { error } = await supabase.from("stage_clears").delete().eq("user_id", userId);
    fail(error);
    return;
  }
  const keep = `(${starred.join(",")})`;
  const removed = await supabase.from("stage_clears").delete().eq("user_id", userId).not("stage_id", "in", keep);
  fail(removed.error);
  const clears = await supabase.from("stage_clears").upsert(
    starred.map((stageId) => {
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

export type AccountRole = "teacher" | "student";

export type OwnProfile = {
  label: string | null;
  /** Null when the profile row could not be read. Callers treat that as a student. */
  role: AccountRole | null;
};

export async function fetchOwnProfile(userId: string): Promise<OwnProfile> {
  if (!supabase) return { label: null, role: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email, role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return { label: null, role: null };
  const row = data as { display_name: string | null; email: string | null; role: string | null };
  const name = row.display_name?.trim();
  const email = row.email?.trim();
  return {
    label: name || email || null,
    role: row.role === "teacher" ? "teacher" : "student",
  };
}

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
};

type SchoolClearRow = {
  user_id: string;
  stage_id: string;
};

/** PostgREST caps a response at 1000 rows. Page so a full school still loads. */
async function eachPage(
  query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<unknown[]> {
  const pageSize = 1000;
  const rows: unknown[] = [];
  for (let from = 0; from < pageSize * 50; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    fail(error);
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

/** Whole-school clears. Teachers can read every row; other roles only see their own under RLS. */
export async function fetchSchoolRoster(stageOrder: readonly string[]): Promise<SchoolStudent[]> {
  if (!supabase) return [];
  const client = supabase;
  const [profileRows, clearRows] = await Promise.all([
    eachPage((from, to) =>
      client
        .from("profiles")
        .select("id, display_name, email, role")
        .order("id", { ascending: true })
        .range(from, to),
    ),
    eachPage((from, to) =>
      client
        .from("stage_clears")
        .select("user_id, stage_id")
        .order("user_id", { ascending: true })
        .order("stage_id", { ascending: true })
        .range(from, to),
    ),
  ]);
  return buildSchoolRoster(
    (profileRows as ProfileRow[]).map((row) => ({
      id: row.id,
      displayName: row.display_name,
      email: row.email,
      role: row.role,
    })),
    (clearRows as SchoolClearRow[]).map((row) => ({
      userId: row.user_id,
      stageId: row.stage_id,
    })),
    stageOrder,
  );
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
