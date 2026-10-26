import {
  byWarmup,
  questionById,
  questionsFor,
  RUN_SIZE,
  type Choice,
} from "./bank";
import { generatedById, generatedQuestions, hasGeneratedPool } from "./drillPools";
import { pickFromPool, skillsForMisses } from "./drillPick";
import { questionById as questionOrDrillById } from "./questions";

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
   * "generated" on a Weekly Question Generator Paper 2 MC practice drill.
   * Those ids are not added to `used`. Stage runs omit this. Older saves may
   * still say "bank"; a new drill is not started from the past-paper bank.
   */
  source?: DrillSource;
  /** Archetypes preferred because they match the missed bank questions. */
  focus?: string[];
  /** Generated ids already shown in this drill session. */
  seenIds?: string[];
  /** Stable id for one finished attempt, so an account upload can skip duplicates. */
  clientId?: string;
};

export type LastResult = {
  correct: number;
  total: number;
  mode: Mode;
  source?: DrillSource;
  /** ISO time the attempt was marked. Older saves omit it. */
  at?: string;
};

export type Progress = {
  cleared: string[];
  used: Record<string, string[]>;
  last: Record<string, LastResult>;
  run: Run | null;
};

export const PROGRESS_KEY = "teachingapp.dse-paper2.v1";

export const emptyProgress = (): Progress => ({
  cleared: [],
  used: {},
  last: {},
  run: null,
});

export function normalizeProgress(value: unknown): Progress {
  if (!value || typeof value !== "object") return emptyProgress();
  const parsed = value as Partial<Progress>;
  return {
    cleared: uniqueStrings(parsed.cleared),
    used: normalizeUsed(parsed.used),
    last: normalizeLast(parsed.last),
    run: normalizeRun(parsed.run),
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || seen.has(item)) continue;
    seen.add(item);
    ids.push(item);
  }
  return ids;
}

function normalizeUsed(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  const used: Record<string, string[]> = {};
  for (const [stage, ids] of Object.entries(value)) {
    used[stage] = uniqueStrings(ids);
  }
  return used;
}

function normalizeLast(value: unknown): Record<string, LastResult> {
  if (!value || typeof value !== "object") return {};
  const last: Record<string, LastResult> = {};
  for (const [stage, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<LastResult>;
    if (item.mode !== "stage" && item.mode !== "drill") continue;
    if (typeof item.correct !== "number" || typeof item.total !== "number") continue;
    last[stage] = {
      correct: item.correct,
      total: item.total,
      mode: item.mode,
      source: item.source === "bank" || item.source === "generated" ? item.source : undefined,
      at: typeof item.at === "string" ? item.at : undefined,
    };
  }
  return last;
}

function normalizeRun(value: unknown): Run | null {
  if (!value || typeof value !== "object") return null;
  const run = value as Partial<Run>;
  if (typeof run.stage !== "string") return null;
  if (run.mode !== "stage" && run.mode !== "drill") return null;
  if (!Array.isArray(run.ids) || run.ids.some((id) => typeof id !== "string")) return null;
  const picks: Partial<Record<string, Choice>> = {};
  if (run.picks && typeof run.picks === "object") {
    for (const [id, letter] of Object.entries(run.picks)) {
      if (letter === "A" || letter === "B" || letter === "C" || letter === "D") picks[id] = letter;
    }
  }
  return {
    stage: run.stage,
    mode: run.mode,
    ids: run.ids,
    picks,
    index: typeof run.index === "number" && Number.isFinite(run.index) && run.index > 0
      ? Math.floor(run.index)
      : 0,
    marked: Boolean(run.marked),
    source: run.source === "bank" || run.source === "generated" ? run.source : undefined,
    focus: Array.isArray(run.focus) ? uniqueStrings(run.focus) : undefined,
    seenIds: Array.isArray(run.seenIds) ? uniqueStrings(run.seenIds) : undefined,
    clientId: typeof run.clientId === "string" && run.clientId ? run.clientId : undefined,
  };
}

export function scoreRun(run: Run): { correct: number; total: number } {
  let correct = 0;
  for (const id of run.ids) {
    const question = questionOrDrillById(id);
    if (question && run.picks[id] === question.answer) correct += 1;
  }
  return { correct, total: run.ids.length };
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
 * Practice drills for stages that have a Weekly Question Generator pool.
 * `used` is left as it was, so a practice drill does not burn real Paper 2
 * questions and does not change a cleared stage. Another drill in the same
 * session keeps the original focus and skips stems already shown, until the
 * pool cannot fill five fresh items. Items carry their generator band so the
 * draw can prefer Easy, then Medium, then Hard.
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
      difficulty: question.difficulty,
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
): Progress | null {
  if (mode === "drill") {
    if (!hasGeneratedPool(stageId)) return null;
    return startGeneratedDrill(progress, stageId);
  }
  const all = questionsFor(stageId);
  let usedIds = progress.used[stageId] ?? [];
  let pool = all.filter((q) => !usedIds.includes(q.id));
  if (pool.length === 0) {
    usedIds = [];
    pool = all.slice();
  }
  if (pool.length === 0) return null;
  const ids = byWarmup(pool).map((question) => question.id).slice(0, Math.min(RUN_SIZE, pool.length));
  return {
    ...progress,
    used: { ...progress.used, [stageId]: [...usedIds, ...ids] },
    run: { stage: stageId, mode, ids, picks: {}, index: 0, marked: false },
  };
}
