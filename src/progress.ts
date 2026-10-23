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
import { generatedById, generatedQuestions, hasGeneratedPool } from "./drillPools";
import { pickFromPool, skillsForMisses } from "./drillPick";

export type Mode = "stage" | "drill";
export type DrillSource = "bank" | "generated";

export type Run = {
  stage: string;
  mode: Mode;
  ids: string[];
  picks: Partial<Record<string, Choice>>;
  index: number;
  marked: boolean;
  /**
   * Generated drills draw new WQG questions and do not add those ids to `used`.
   * Bank drills omit this.
   */
  source?: DrillSource;
  /** Archetypes preferred because they match the missed bank questions. */
  focus?: string[];
  /** Generated ids already shown in this drill session. */
  seenIds?: string[];
};

export type LastResult = {
  correct: number;
  total: number;
  mode: Mode;
  source?: DrillSource;
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

/** A stage clears only on a perfect stage run. A drill, including generated practice, does not. */
export function stageClearedBy(run: Run, correct: number, total: number): boolean {
  return run.mode === "stage" && run.source !== "generated" && total > 0 && correct === total;
}

function missedStems(run: Run | null, stageId: string): string[] {
  if (!run || run.stage !== stageId) return [];
  const stems: string[] = [];
  for (const id of run.ids) {
    const question = questionById(id);
    if (!question || question.generated) continue;
    if (run.picks[id] === question.answer) continue;
    stems.push(question.stem);
  }
  return stems;
}

/**
 * J7–J10 practice drills. `used` is left as it was, so a practice drill
 * does not burn real Paper 2 questions and does not change a cleared stage.
 * Another drill in the same session keeps the original focus and skips stems
 * already shown, until the pool cannot fill five fresh items.
 */
function startGeneratedDrill(progress: Progress, stageId: string): Progress | null {
  const pool = generatedQuestions(stageId);
  if (pool.length === 0) return null;
  const prev = progress.run;
  const continued =
    prev != null &&
    prev.stage === stageId &&
    prev.mode === "drill" &&
    prev.source === "generated";
  const focus = continued
    ? (prev.focus ?? [])
    : skillsForMisses(stageId, missedStems(prev, stageId));
  let avoidIds = continued ? (prev.seenIds ?? []) : [];
  if (avoidIds.length >= pool.length) avoidIds = continued ? prev.ids : [];
  const avoid = new Set<string>();
  for (const id of avoidIds) {
    avoid.add(id);
    const stem = generatedById(id)?.stem;
    if (stem) avoid.add(stem);
  }
  const picked = pickFromPool(
    pool.map((question) => ({
      id: question.id,
      tpl: question.archetype ?? "",
      stem: question.stem,
    })),
    focus,
    avoid,
    RUN_SIZE,
  );
  if (picked.length === 0) return null;
  const ids = picked.map((question) => question.id);
  const seen = new Set(avoidIds);
  for (const id of ids) seen.add(id);
  return {
    ...progress,
    run: {
      stage: stageId,
      mode: "drill",
      source: "generated",
      ids,
      picks: {},
      index: 0,
      marked: false,
      focus,
      seenIds: seen.size >= pool.length ? ids : [...seen],
    },
  };
}

export function startRun(
  progress: Progress,
  stageId: string,
  mode: Mode,
  anchor?: Difficulty,
): Progress | null {
  if (mode === "drill" && hasGeneratedPool(stageId)) {
    return startGeneratedDrill(progress, stageId);
  }
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
