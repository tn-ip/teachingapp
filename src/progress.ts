import {
  byWarmup,
  CHOICES,
  questionById,
  questionsFor,
  RUN_SIZE,
  shuffle,
  type Choice,
} from "./bank";
import { generatedById, generatedQuestions, hasGeneratedPool } from "./drillPools";
import { pickFromPool, skillsForMisses } from "./drillPick";
import { questionById as questionOrDrillById } from "./questions";

export type Mode = "stage" | "drill";
export type DrillSource = "bank" | "generated";

/** Perfect stage runs required before a stage earns its star. */
export const PERFECTS_TO_CLEAR = 2;

/**
 * Saves from the one-perfect rule have no `clearRule`. Those clears are dropped.
 * 2 means perfect-run ids are the only source of stars.
 */
export const CLEAR_RULE = 2;

/** Reserved `used` keys so the existing trainer_state jsonb can carry the new rule. */
export const CLEAR_RULE_KEY = "$clearRule";
export const PERFECT_RUNS_KEY = "$perfectRuns";

/** Bank letters in display order. Index 0 is shown as A. */
export type ChoiceOrder = [Choice, Choice, Choice, Choice];

export type Run = {
  stage: string;
  mode: Mode;
  ids: string[];
  picks: Partial<Record<string, Choice>>;
  /**
   * Shuffle for this attempt, keyed by question id. Display A–D follow this
   * order of bank letters. Missing means the published A–D order (older runs).
   */
  optionOrders?: Partial<Record<string, ChoiceOrder>>;
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
  /** Always {@link CLEAR_RULE} after normalize. Older blobs omit it. */
  clearRule: typeof CLEAR_RULE;
  /**
   * Stages with at least {@link PERFECTS_TO_CLEAR} perfect stage runs.
   * Derived from `perfectRuns`. A stored list from the old rule is not trusted.
   */
  cleared: string[];
  /**
   * Client ids of perfect stage runs, per stage. Drills are never listed.
   * Two ids star the stage. The same id is not counted twice. Misses do not remove ids.
   */
  perfectRuns: Record<string, string[]>;
  used: Record<string, string[]>;
  last: Record<string, LastResult>;
  run: Run | null;
};

export const PROGRESS_KEY = "teachingapp.dse-paper2.v1";

export const emptyProgress = (): Progress => ({
  clearRule: CLEAR_RULE,
  cleared: [],
  perfectRuns: {},
  used: {},
  last: {},
  run: null,
});

export function normalizeProgress(value: unknown): Progress {
  if (!value || typeof value !== "object") return emptyProgress();
  const parsed = value as Partial<Progress>;
  const used = normalizeUsed(parsed.used);
  const ruleFromUsed = used.rule;
  delete used.used[CLEAR_RULE_KEY];
  delete used.used[PERFECT_RUNS_KEY];
  const migrated = parsed.clearRule === CLEAR_RULE || ruleFromUsed === String(CLEAR_RULE);
  const perfectRuns = migrated
    ? mergePerfectRuns(normalizePerfectRuns(parsed.perfectRuns), decodePerfectRuns(used.encoded))
    : {};
  return {
    clearRule: CLEAR_RULE,
    perfectRuns,
    cleared: clearedStageIds(perfectRuns),
    used: used.used,
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

function normalizeUsed(value: unknown): { used: Record<string, string[]>; rule: string | null; encoded: string[] } {
  const used: Record<string, string[]> = {};
  let rule: string | null = null;
  let encoded: string[] = [];
  if (!value || typeof value !== "object") return { used, rule, encoded };
  for (const [stage, ids] of Object.entries(value)) {
    const list = uniqueStrings(ids);
    if (stage === CLEAR_RULE_KEY) {
      rule = list[0] ?? null;
      continue;
    }
    if (stage === PERFECT_RUNS_KEY) {
      encoded = list;
      continue;
    }
    used[stage] = list;
  }
  return { used, rule, encoded };
}

function normalizePerfectRuns(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  const perfectRuns: Record<string, string[]> = {};
  for (const [stage, ids] of Object.entries(value)) {
    const list = uniqueStrings(ids);
    if (list.length === 0) continue;
    perfectRuns[stage] = list;
  }
  return perfectRuns;
}

export function mergePerfectRuns(
  local: Record<string, string[]>,
  remote: Record<string, string[]>,
): Record<string, string[]> {
  const stages = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const merged: Record<string, string[]> = {};
  for (const stage of stages) {
    const ids = uniqueStrings([...(remote[stage] ?? []), ...(local[stage] ?? [])]);
    if (ids.length > 0) merged[stage] = ids;
  }
  return merged;
}

export function clearedStageIds(perfectRuns: Record<string, string[]>): string[] {
  return Object.entries(perfectRuns)
    .filter(([, ids]) => ids.length >= PERFECTS_TO_CLEAR)
    .map(([stage]) => stage)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

export function encodePerfectRuns(perfectRuns: Record<string, string[]>): string[] {
  const encoded: string[] = [];
  const stages = Object.keys(perfectRuns).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  for (const stage of stages) {
    for (const id of perfectRuns[stage] ?? []) {
      if (!id || id.includes("|")) continue;
      encoded.push(`${stage}|${id}`);
    }
  }
  return encoded;
}

export function decodePerfectRuns(entries: readonly string[]): Record<string, string[]> {
  const perfectRuns: Record<string, string[]> = {};
  for (const entry of entries) {
    const split = entry.indexOf("|");
    if (split <= 0) continue;
    const stage = entry.slice(0, split);
    const id = entry.slice(split + 1);
    if (!stage || !id || id.includes("|")) continue;
    const list = perfectRuns[stage] ?? [];
    if (!list.includes(id)) list.push(id);
    perfectRuns[stage] = list;
  }
  return perfectRuns;
}

export function perfectCount(perfectRuns: Record<string, string[]>, stageId: string): number {
  return perfectRuns[stageId]?.length ?? 0;
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
  const optionOrders = normalizeOptionOrders(run.optionOrders);
  return {
    stage: run.stage,
    mode: run.mode,
    ids: run.ids,
    picks,
    optionOrders,
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

function isChoice(value: unknown): value is Choice {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function normalizeOptionOrders(value: unknown): Run["optionOrders"] {
  if (!value || typeof value !== "object") return undefined;
  const optionOrders: Partial<Record<string, ChoiceOrder>> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!Array.isArray(raw) || raw.length !== 4) continue;
    if (!raw.every(isChoice)) continue;
    if (new Set(raw).size !== 4) continue;
    optionOrders[id] = [raw[0], raw[1], raw[2], raw[3]];
  }
  return Object.keys(optionOrders).length > 0 ? optionOrders : undefined;
}

export function freshOptionOrders(ids: readonly string[]): Partial<Record<string, ChoiceOrder>> {
  const optionOrders: Partial<Record<string, ChoiceOrder>> = {};
  for (const id of ids) {
    const shuffled = shuffle([...CHOICES]);
    optionOrders[id] = [shuffled[0], shuffled[1], shuffled[2], shuffled[3]];
  }
  return optionOrders;
}

/** Display order for this question in this run. Older runs keep published A–D. */
export function choiceOrder(run: Run, questionId: string): ChoiceOrder {
  return run.optionOrders?.[questionId] ?? [CHOICES[0], CHOICES[1], CHOICES[2], CHOICES[3]];
}

/** Letter the student must tap after the shuffle. The bank answer stays the source of truth. */
export function paperAnswer(question: { answer: Choice }, order: readonly Choice[]): Choice {
  const index = order.indexOf(question.answer);
  return index >= 0 ? CHOICES[index] : question.answer;
}

export function pickIsCorrect(run: Run, question: { id: string; answer: Choice }): boolean {
  return run.picks[question.id] === paperAnswer(question, choiceOrder(run, question.id));
}

export function scoreRun(run: Run): { correct: number; total: number } {
  let correct = 0;
  for (const id of run.ids) {
    const question = questionOrDrillById(id);
    if (question && pickIsCorrect(run, question)) correct += 1;
  }
  return { correct, total: run.ids.length };
}

/** A perfect stage paper. Generated practice and other drills never qualify. */
export function isPerfectStageRun(run: Run, correct: number, total: number): boolean {
  return run.mode === "stage" && run.source !== "generated" && total > 0 && correct === total;
}

/**
 * A star is earned when this perfect stage run is the one that reaches
 * {@link PERFECTS_TO_CLEAR}. `already` is the count of other perfect stage runs.
 * A miss does not reset that count. One perfect run alone does not star the stage.
 */
export function stageClearedBy(run: Run, correct: number, total: number, already = 0): boolean {
  if (!isPerfectStageRun(run, correct, total)) return false;
  return already < PERFECTS_TO_CLEAR && already + 1 >= PERFECTS_TO_CLEAR;
}

/** Append this perfect stage run's client id. The same id is not counted twice. */
export function grantPerfectRun(
  progress: Progress,
  run: Run,
  correct: number,
  total: number,
): Progress {
  if (!isPerfectStageRun(run, correct, total) || !run.clientId) return progress;
  const existing = progress.perfectRuns[run.stage] ?? [];
  if (existing.includes(run.clientId)) return progress;
  const perfectRuns = {
    ...progress.perfectRuns,
    [run.stage]: [...existing, run.clientId],
  };
  return {
    ...progress,
    clearRule: CLEAR_RULE,
    perfectRuns,
    cleared: clearedStageIds(perfectRuns),
  };
}

function missedStems(run: Run | null, stageId: string): string[] {
  if (!run || run.stage !== stageId) return [];
  const stems: string[] = [];
  for (const id of run.ids) {
    const question = questionById(id);
    if (!question || question.generated) continue;
    if (pickIsCorrect(run, question)) continue;
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
      optionOrders: freshOptionOrders(ids),
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
    run: {
      stage: stageId,
      mode,
      ids,
      picks: {},
      optionOrders: freshOptionOrders(ids),
      index: 0,
      marked: false,
    },
  };
}
