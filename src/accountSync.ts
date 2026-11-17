import { scoreRun, type Progress, type Run } from "./progress";
import {
  buildSchoolRoster,
  type SchoolStudent,
} from "./schoolRoster";
import { clearScore, historyRunType, prepareAccountMerge, progressFromRemote, snapshotForRemote, type HistorySummary } from "./sync";
import { supabase } from "./supabase";
import {
  applyEvent,
  eventsForRun,
  reduceErrorLog,
  runFromDetail,
  type ErrorEvent,
  type ErrorLogEntry,
  type ErrorLogRow,
} from "./errorLog";

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
          entry: run.entry ?? null,
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
  let progress = prepared.progress;
  // Run the error-log backfill once per account, before writing the snapshot,
  // so it only ever sees historical run_history rows (this session's marked
  // runs are logged live at onMarked / choose time). Stamp the flag only on
  // success, in the same snapshot write path.
  if (!progress.errorLogBackfilled) {
    const backfilled = await backfillErrorLog(userId, progress);
    if (backfilled) progress = { ...progress, errorLogBackfilled: true };
  }
  await writeSnapshot(userId, progress, prepared.completed);
  return progress;
}

export async function deleteAccountProgress(userId: string): Promise<void> {
  if (!supabase) return;
  for (const table of ["run_history", "stage_clears", "trainer_state", "error_log"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    fail(error);
  }
}

/* ------------------------------------------------------------------ */
/* Error logbook I/O                                                   */
/* ------------------------------------------------------------------ */

function rowToEntry(row: ErrorLogRow): ErrorLogEntry {
  return {
    question_id: row.question_id,
    stage_id: row.stage_id,
    concept: row.concept,
    source: row.source,
    pick: row.pick,
    key: row.key,
    status: row.status,
    miss_count: row.miss_count,
    first_missed_at: row.first_missed_at,
    last_missed_at: row.last_missed_at,
    last_corrected_at: row.last_corrected_at,
  };
}

/** All logbook rows for a user (or, for a teacher, any student). Newest miss first. */
export async function fetchErrorLog(userId: string): Promise<ErrorLogRow[]> {
  if (!supabase) return [];
  const client = supabase;
  const rows = await eachPage((from, to) =>
    client
      .from("error_log")
      .select("*")
      .eq("user_id", userId)
      .order("last_missed_at", { ascending: false })
      .order("question_id", { ascending: true })
      .range(from, to),
  );
  return rows as ErrorLogRow[];
}

async function fetchErrorLogEntries(userId: string): Promise<ErrorLogEntry[]> {
  const rows = await fetchErrorLog(userId);
  return rows.map(rowToEntry);
}

async function upsertErrorLogEntry(userId: string, entry: ErrorLogEntry): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("error_log").upsert(
    {
      user_id: userId,
      question_id: entry.question_id,
      stage_id: entry.stage_id,
      concept: entry.concept,
      source: entry.source,
      pick: entry.pick,
      key: entry.key,
      status: entry.status,
      miss_count: entry.miss_count,
      first_missed_at: entry.first_missed_at,
      last_missed_at: entry.last_missed_at,
      last_corrected_at: entry.last_corrected_at,
    },
    { onConflict: "user_id,question_id" },
  );
  fail(error);
}

/**
 * Apply one answered question to the logbook. Reads the current row (if any),
 * runs the pure reducer, and upserts the result. A first-time correct answer
 * is a no-op.
 */
export async function recordErrorLogEvent(userId: string, event: ErrorEvent): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase
    .from("error_log")
    .select("*")
    .eq("user_id", userId)
    .eq("question_id", event.questionId)
    .maybeSingle();
  fail(error);
  const next = applyEvent(data ? rowToEntry(data as ErrorLogRow) : null, event);
  if (!next) return;
  await upsertErrorLogEntry(userId, next);
}

/** Queued, serialized logbook write. Failures are logged and never crash the quiz. */
export function queueErrorLogEvent(userId: string, event: ErrorEvent): void {
  if (!supabase) return;
  void enqueueSync(() => recordErrorLogEvent(userId, event)).catch((reason: unknown) => {
    console.error("error_log write failed", reason);
  });
}

async function writeErrorLogEntries(userId: string, entries: ErrorLogEntry[]): Promise<void> {
  for (const entry of entries) {
    await upsertErrorLogEntry(userId, entry);
  }
}

type RunDetailRow = {
  stage_id: string;
  created_at: string;
  detail: unknown;
};

/**
 * Rebuild the logbook from `run_history.detail`, in chronological order, plus
 * the current open run's already-answered picks. Returns true on success so
 * the caller can stamp the backfill flag. Never throws.
 */
async function backfillErrorLog(userId: string, progress: Progress): Promise<boolean> {
  if (!supabase) return false;
  try {
    const client = supabase;
    const rows = (await eachPage((from, to) =>
      client
        .from("run_history")
        .select("stage_id, created_at, detail")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .order("stage_id", { ascending: true })
        .range(from, to),
    )) as RunDetailRow[];

    const events: ErrorEvent[] = [];
    for (const row of rows) {
      const run = runFromDetail(row.detail, row.stage_id);
      if (!run) continue;
      events.push(...eventsForRun(run, row.created_at));
    }
    // Map Practice and logbook retries are never marked, so their only record
    // is the open run. Include their already-answered picks (a signed-in
    // user's stage/drill runs are live-logged at onMarked, so only the
    // never-marked single-item runs are recovered here).
    if (progress.run && (progress.run.entry === "map" || progress.run.entry === "logbook")) {
      events.push(...eventsForRun(progress.run));
    }

    // Reconstruct from history only. Starting from existing rows and replaying
    // the same events would double miss_count if this once-per-account job is
    // retried after a partial write. Keep any live-only rows whose question
    // id is not in the reconstruction (a race with a brand-new miss).
    const reconstructed = reduceErrorLog(events, []);
    const existing = await fetchErrorLogEntries(userId);
    const seen = new Set(reconstructed.map((row) => row.question_id));
    const kept = existing.filter((row) => !seen.has(row.question_id));
    await writeErrorLogEntries(userId, [...reconstructed, ...kept]);
    return true;
  } catch (reason) {
    console.error("error_log backfill failed", reason);
    return false;
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
