import {
  emptyProgress,
  normalizeProgress,
  PROGRESS_KEY,
  scoreRun,
  stageClearedBy,
  type LastResult,
  type Progress,
  type Run,
} from "./progress";

export const OWNER_KEY = "teachingapp.dse-paper2.owner";

export function userProgressKey(userId: string): string {
  return `${PROGRESS_KEY}.${userId}`;
}

export type ProgressStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function readStored(store: ProgressStore, key: string): Progress {
  const raw = store.getItem(key);
  if (!raw) return emptyProgress();
  try {
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

/**
 * Progress on a shared iPad stays in `PROGRESS_KEY`. The owner is `guest`
 * until someone signs in. Signing in as a different person stashes the
 * previous copy under that person's id and does not upload it.
 */
export function claimDeviceProgress(store: ProgressStore, userId: string): Progress {
  const owner = store.getItem(OWNER_KEY) ?? "guest";
  const current = readStored(store, PROGRESS_KEY);
  if (owner === "guest" || owner === userId) return current;
  store.setItem(userProgressKey(owner), JSON.stringify(current));
  const cached = readStored(store, userProgressKey(userId));
  store.setItem(OWNER_KEY, userId);
  store.setItem(PROGRESS_KEY, JSON.stringify(cached));
  return cached;
}

export function rememberDeviceProgress(store: ProgressStore, userId: string, progress: Progress): void {
  const raw = JSON.stringify(progress);
  store.setItem(OWNER_KEY, userId);
  store.setItem(PROGRESS_KEY, raw);
  store.setItem(userProgressKey(userId), raw);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function preferLast(local?: LastResult, remote?: LastResult): LastResult | undefined {
  if (!local) return remote;
  if (!remote) return local;
  if (local.at && remote.at) return local.at >= remote.at ? local : remote;
  if (local.at) return local;
  if (remote.at) return remote;
  return local;
}

function samePaper(local: Run, remote: Run): boolean {
  return (
    local.stage === remote.stage &&
    local.mode === remote.mode &&
    local.source === remote.source &&
    JSON.stringify(local.ids) === JSON.stringify(remote.ids)
  );
}

/** Keep this device's open paper. Union answers when both sides are the same paper. */
export function mergeRun(local: Run | null, remote: Run | null): Run | null {
  if (!local) return remote;
  if (!remote) return local;
  if (local.clientId && local.clientId === remote.clientId) {
    return samePaper(local, remote) ? mergeSamePaper(local, remote) : local;
  }
  if (samePaper(local, remote)) return mergeSamePaper(local, remote);
  if (local.marked !== remote.marked) return local.marked ? remote : local;
  return local;
}

function mergeSamePaper(local: Run, remote: Run): Run {
  if (local.marked || remote.marked) {
    const finished = local.marked ? local : remote;
    const other = finished === local ? remote : local;
    return { ...finished, clientId: finished.clientId ?? other.clientId };
  }
  return {
    ...local,
    picks: { ...remote.picks, ...local.picks },
    index: Math.max(local.index, remote.index),
    focus: local.focus && local.focus.length > 0 ? local.focus : remote.focus,
    seenIds: unique([...(remote.seenIds ?? []), ...(local.seenIds ?? [])]),
    clientId: local.clientId ?? remote.clientId,
  };
}

/**
 * Union of the two trainer blobs. Cleared stages and used question ids are
 * kept from either side. A finished run is not deleted; `completedRuns`
 * lists every marked run that should be appended to history.
 */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const stages = new Set([...Object.keys(local.used), ...Object.keys(remote.used)]);
  const used: Record<string, string[]> = {};
  for (const stage of stages) {
    used[stage] = unique([...(remote.used[stage] ?? []), ...(local.used[stage] ?? [])]);
  }
  const stagesLast = new Set([...Object.keys(local.last), ...Object.keys(remote.last)]);
  const last: Record<string, LastResult> = {};
  for (const stage of stagesLast) {
    const chosen = preferLast(local.last[stage], remote.last[stage]);
    if (chosen) last[stage] = chosen;
  }
  return {
    cleared: unique([...remote.cleared, ...local.cleared]),
    used,
    last,
    run: mergeRun(local.run, remote.run),
  };
}

export function stampMarkedRun(progress: Progress): Progress {
  if (!progress.run?.marked || progress.run.clientId) return progress;
  return {
    ...progress,
    run: { ...progress.run, clientId: crypto.randomUUID() },
  };
}

export function completedRuns(local: Run | null, remote: Run | null): Run[] {
  const runs: Run[] = [];
  const seen = new Set<string>();
  for (const run of [local, remote]) {
    if (!run?.marked || !run.clientId || seen.has(run.clientId)) continue;
    seen.add(run.clientId);
    runs.push(run);
  }
  return runs;
}

export function prepareAccountMerge(local: Progress, remote: Progress): { progress: Progress; completed: Run[] } {
  const stampedLocal = stampMarkedRun(local);
  const stampedRemote = stampMarkedRun(remote);
  return {
    progress: mergeProgress(stampedLocal, stampedRemote),
    completed: completedRuns(stampedLocal.run, stampedRemote.run),
  };
}

export function historyRunType(run: Run): "stage" | "practice" {
  if (run.mode === "drill" || run.source === "generated") return "practice";
  return "stage";
}

/** Score stored on `stage_clears` when this snapshot records a perfect stage run. */
export function clearScore(progress: Progress, stageId: string): { score: number; total: number } | null {
  const run = progress.run;
  if (run?.marked && run.stage === stageId) {
    const result = scoreRun(run);
    if (stageClearedBy(run, result.correct, result.total)) return { score: result.correct, total: result.total };
  }
  const last = progress.last[stageId];
  if (
    last &&
    last.mode === "stage" &&
    last.source !== "generated" &&
    last.total > 0 &&
    last.correct === last.total
  ) {
    return { score: last.correct, total: last.total };
  }
  return null;
}

export type HistorySummary = {
  stageId: string;
  runType: "stage" | "practice";
  score: number;
  total: number;
  createdAt: string;
};

export function lastFromHistory(rows: HistorySummary[]): Record<string, LastResult> {
  const sorted = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const last: Record<string, LastResult> = {};
  for (const row of sorted) {
    if (last[row.stageId]) continue;
    last[row.stageId] = {
      correct: row.score,
      total: row.total,
      mode: row.runType === "practice" ? "drill" : "stage",
      source: row.runType === "practice" ? "generated" : undefined,
      at: row.createdAt,
    };
  }
  return last;
}

export function progressFromRemote(
  state: { cleared?: unknown; used?: unknown; last?: unknown; run?: unknown } | null,
  stageIds: string[],
  history: HistorySummary[],
): Progress {
  if (!state) {
    return normalizeProgress({
      cleared: stageIds,
      used: {},
      last: lastFromHistory(history),
      run: null,
    });
  }
  const base = normalizeProgress({
    cleared: state.cleared ?? [],
    used: state.used ?? {},
    last: state.last ?? {},
    run: state.run ?? null,
  });
  return { ...base, cleared: unique([...base.cleared, ...stageIds]) };
}
