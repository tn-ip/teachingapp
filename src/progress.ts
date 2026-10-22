import {
  BAND_RANK,
  byWarmup,
  questionById,
  questionsFor,
  RUN_SIZE,
  type Choice,
  type Difficulty,
  type Question,
} from "./bank";

export type Mode = "stage" | "drill";

export type Run = {
  stage: string;
  mode: Mode;
  ids: string[];
  picks: Partial<Record<string, Choice>>;
  index: number;
  marked: boolean;
};

export type LastResult = {
  correct: number;
  total: number;
  mode: Mode;
};

export type Progress = {
  cleared: string[];
  used: Record<string, string[]>;
  last: Record<string, LastResult>;
  run: Run | null;
};

const KEY = "teachingapp.dse-paper2.v1";

const empty = (): Progress => ({
  cleared: [],
  used: {},
  last: {},
  run: null,
});

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Progress;
    return {
      cleared: parsed.cleared ?? [],
      used: parsed.used ?? {},
      last: parsed.last ?? {},
      run: parsed.run ?? null,
    };
  } catch {
    return empty();
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(KEY, JSON.stringify(progress));
}

export function unusedCount(progress: Progress, stageId: string): number {
  const used = new Set(progress.used[stageId] ?? []);
  return questionsFor(stageId).filter((q) => !used.has(q.id)).length;
}

/** Hardest missed band in a marked run. Drill stays at or below this band when it can. */
export function anchorForMisses(run: Run): Difficulty | undefined {
  let anchor: Difficulty | undefined;
  for (const id of run.ids) {
    const question = questionById(id);
    if (!question || run.picks[id] === question.answer) continue;
    if (!anchor || BAND_RANK[question.difficulty] > BAND_RANK[anchor]) {
      anchor = question.difficulty;
    }
  }
  return anchor;
}

/**
 * Stage runs fill Easy, then Medium, then Unknown, then Hard.
 * A drill prefers unused questions at or easier than the missed item, in that
 * same warm-up order, and only then draws a harder band to fill the run.
 */
export function orderPool(pool: Question[], mode: Mode, anchor?: Difficulty): string[] {
  if (mode === "drill" && anchor) {
    const ceiling = BAND_RANK[anchor];
    const preferred = pool.filter((q) => BAND_RANK[q.difficulty] <= ceiling);
    const harder = pool.filter((q) => BAND_RANK[q.difficulty] > ceiling);
    return [...byWarmup(preferred), ...byWarmup(harder)].map((q) => q.id);
  }
  return byWarmup(pool).map((q) => q.id);
}

export function startRun(
  progress: Progress,
  stageId: string,
  mode: Mode,
  anchor?: Difficulty,
): Progress | null {
  const all = questionsFor(stageId);
  let usedIds = progress.used[stageId] ?? [];
  let pool = all.filter((q) => !usedIds.includes(q.id));
  if (mode === "stage" && pool.length === 0) {
    usedIds = [];
    pool = all.slice();
  }
  if (pool.length === 0) return null;
  const ids = orderPool(pool, mode, anchor).slice(0, Math.min(RUN_SIZE, pool.length));
  return {
    ...progress,
    used: { ...progress.used, [stageId]: [...usedIds, ...ids] },
    run: { stage: stageId, mode, ids, picks: {}, index: 0, marked: false },
  };
}

export function allJuniorCleared(progress: Progress, stageIds: string[]): boolean {
  return stageIds.every((id) => progress.cleared.includes(id));
}
