import type { Choice, Question } from "./bank";
import { skillsForStem } from "./drillPick";
import { choiceOrder, isMapPracticeRun, paperAnswer, type ChoiceOrder, type Run } from "./progress";
import { questionById } from "./questions";

/**
 * Pure error-logbook model. Everything here is testable without Supabase or a
 * DOM: the concept mapping, the upsert reducer, and turning a run (or a
 * stored `run_history.detail`) into a chronological list of miss/correct
 * events.
 *
 * One row per `(user_id, question_id)`. The same bank or generated item is a
 * single entry even when missed in more than one mode.
 */

export type ErrorSource = "stage" | "map_practice" | "drill" | "logbook_retry";

export type ErrorStatus = "open" | "corrected";

/** One `public.error_log` row, after it has a stable id. */
export type ErrorLogRow = {
  id: string;
  user_id: string;
  question_id: string;
  stage_id: string;
  concept: string | null;
  source: ErrorSource;
  pick: string | null;
  key: string | null;
  status: ErrorStatus;
  miss_count: number;
  first_missed_at: string;
  last_missed_at: string;
  last_corrected_at: string | null;
};

/** Row contents the reducer produces, without the server-assigned id/user_id. */
export type ErrorLogEntry = Omit<ErrorLogRow, "id" | "user_id">;

/** One answered question, either a miss or a correct answer. */
export type ErrorEvent =
  | {
      kind: "wrong";
      questionId: string;
      stageId: string;
      concept: string | null;
      source: ErrorSource;
      /** Last wrong display letter the student tapped (A–D after shuffle). */
      pick: string | null;
      /** Display key for that attempt (paperAnswer + choiceOrder). */
      key: string | null;
      at: string;
    }
  | {
      kind: "correct";
      questionId: string;
      stageId: string;
      concept: string | null;
      source: ErrorSource;
      at: string;
    };

/** Source of a run's events, from its mode and entry. */
export function errorSourceForRun(run: Run): ErrorSource {
  if (isMapPracticeRun(run)) return "map_practice";
  if (run.entry === "logbook") return "logbook_retry";
  if (run.mode === "stage") return "stage";
  return "drill";
}

/**
 * Concept tag for a question id. Generated items use the pool archetype
 * (`tpl`); bank past-paper questions use the primary skill tag, or null when
 * the stem has no mapping. No new tags are invented here.
 */
export function conceptForQuestion(question: Question): string | null {
  if (question.generated) return question.archetype ?? null;
  return skillsForStem(question.stage, question.stem)[0] ?? null;
}

/**
 * The pure upsert reducer. `prev` is the current row (or null), `event` the
 * latest answered question. Returns the next row, or null when the event is a
 * no-op (a first-time correct answer must not create a row).
 *
 * Wrong: no row -> insert open; open -> bump miss_count; corrected -> reopen
 * keeping `first_missed_at`. Correct: existing row -> mark corrected, keep the
 * last wrong pick and the miss timestamps.
 */
export function applyEvent(prev: ErrorLogEntry | null, event: ErrorEvent): ErrorLogEntry | null {
  if (event.kind === "correct") {
    if (!prev) return null;
    return {
      ...prev,
      status: "corrected",
      last_corrected_at: event.at,
    };
  }
  if (!prev) {
    return {
      question_id: event.questionId,
      stage_id: event.stageId,
      concept: event.concept,
      source: event.source,
      pick: event.pick,
      key: event.key,
      status: "open",
      miss_count: 1,
      first_missed_at: event.at,
      last_missed_at: event.at,
      last_corrected_at: null,
    };
  }
  return {
    ...prev,
    question_id: event.questionId,
    stage_id: event.stageId,
    concept: event.concept ?? prev.concept,
    source: event.source,
    pick: event.pick,
    key: event.key,
    status: "open",
    miss_count: prev.miss_count + 1,
    last_missed_at: event.at,
  };
}

/** The single event for one answered question in a run, or null if unanswered/unknown. */
export function eventForQuestion(run: Run, questionId: string, at?: string): ErrorEvent | null {
  const question = questionById(questionId);
  if (!question) return null;
  const pick = run.picks[questionId];
  if (pick === undefined) return null;
  const key = paperAnswer(question, choiceOrder(run, questionId));
  const concept = conceptForQuestion(question);
  const source = errorSourceForRun(run);
  const ts = at ?? new Date().toISOString();
  if (pick === key) {
    return { kind: "correct", questionId, stageId: run.stage, concept, source, at: ts };
  }
  return { kind: "wrong", questionId, stageId: run.stage, concept, source, pick, key, at: ts };
}

/** Every answered item in a run, in paper order, as events. */
export function eventsForRun(run: Run, at?: string): ErrorEvent[] {
  const events: ErrorEvent[] = [];
  for (const id of run.ids) {
    const event = eventForQuestion(run, id, at);
    if (event) events.push(event);
  }
  return events;
}

/** Fold a chronological list of events onto existing rows, one row per question. */
export function reduceErrorLog(events: ErrorEvent[], existing: ErrorLogEntry[] = []): ErrorLogEntry[] {
  const byId = new Map<string, ErrorLogEntry>();
  for (const row of existing) byId.set(row.question_id, row);
  for (const event of events) {
    const next = applyEvent(byId.get(event.questionId) ?? null, event);
    if (next) byId.set(event.questionId, next);
  }
  return [...byId.values()];
}

/* ------------------------------------------------------------------ */
/* Concept display labels, taken from the skill/tpl comments already
 * locked in src/drillPick.ts. Codes not listed here are shown as-is.  */
/* ------------------------------------------------------------------ */

const CONCEPT_LABELS: Record<string, string> = {
  // J8 Identities
  ID1: "Identities",
  ID2: "Ratio",
  // J4 Percentage
  P1: "Equal selling price",
  P2: "Successive % change",
  P3: "Compound interest",
  P4: "Population / composition",
  P5: "Cost / discount / profit",
  P6: "Relative salaries",
  // J7 Indices
  I1: "Letter base with a power",
  I2: "Quotient with a letter base",
  I3: "Negative index",
  I4: "Same-base quotient",
  I5: "Integer bases",
  I6: "Reciprocal of a power",
  // J1 Change of subjects
  CS1: "Letter bracket",
  CS2: "Linear rearrange",
  CS3: "Integer bracket",
  CS4: "Simple denominators",
  CS5: "Letter in a denominator",
  CS6: "Capital identity",
  CS7: "Two fractions = integer",
  CS8: "Fraction = fraction",
  // J2 Significant figure
  RS1: "Significant figures",
  RS2: "Decimal places",
  RS3: "Mixed s.f. / d.p.",
  RS4: "Inequality",
  RS5: "Range after “correct to”",
  RS6: "Round down",
  RS7: "Round up",
  RS8: "Leading zeros",
  // J9 Factorization, expansion
  F1: "Grouping / difference of squares",
  F2: "Expand a product",
  F3: "Difference of squares",
  F4: "Quadratic with a cross term",
  F5: "Product then add or subtract",
  // J10 Ratio, rate, map scale
  M1: "Ask for the scale",
  M2: "Ask for the actual area",
  M3: "Ask for the map area",
  // J11 Simultaneous equations
  SE1: "Two linear equations",
  SE2: "Percentage more or less",
  SE3: "Ratio and a total",
  SE4: "Transfer",
  SE5: "Tickets",
  SE6: "Sum and product",
  SE7: "Two-speed journey",
  // J18 Sequences
  DP: "Constant dots each step",
  DV: "Expression in n dots",
  // C11 Variations
  V1: "Evaluate the law",
  V2: "Must be constant",
  V3: "Partial variation",
  V4: "Percentage change",
  V5: "Which are true",
};

/** `ID2 · Ratio`, the bare code when unmapped in the map, or `Unmapped`. */
export function conceptLabel(code: string | null): string {
  if (!code) return "Unmapped";
  const label = CONCEPT_LABELS[code];
  return label ? `${code} · ${label}` : code;
}

/** Short, scannable identity for a question row: source tag for bank, generated marker otherwise. */
export function questionIdentity(question: Question): string {
  if (question.generated) {
    return question.archetype ? `Generated · ${question.archetype}` : "Generated practice";
  }
  return question.sourceTag;
}

const CHOICE_LETTERS: Choice[] = ["A", "B", "C", "D"];

/**
 * Rebuild a run from a `run_history.detail` blob, or null when it has no ids.
 * Source is inferred later by {@link errorSourceForRun}: a stage run is
 * "stage", a stored `entry === "map"` is "map_practice", and any other
 * generated practice is "drill" (legacy marked map Practice that predates the
 * `entry` field cannot be told apart and falls back to "drill").
 */
export function runFromDetail(detail: unknown, stageId: string): Run | null {
  if (!detail || typeof detail !== "object") return null;
  const row = detail as {
    mode?: unknown;
    source?: unknown;
    entry?: unknown;
    ids?: unknown;
    picks?: unknown;
    option_orders?: unknown;
  };
  if (!Array.isArray(row.ids) || row.ids.length === 0) return null;
  const ids = row.ids.filter((id): id is string => typeof id === "string");
  if (ids.length === 0) return null;

  const picks: Partial<Record<string, Choice>> = {};
  if (row.picks && typeof row.picks === "object") {
    for (const [id, letter] of Object.entries(row.picks)) {
      if ((CHOICE_LETTERS as string[]).includes(letter)) picks[id] = letter as Choice;
    }
  }

  const optionOrders: Partial<Record<string, ChoiceOrder>> = {};
  if (row.option_orders && typeof row.option_orders === "object") {
    for (const [id, raw] of Object.entries(row.option_orders)) {
      if (!Array.isArray(raw) || raw.length !== 4) continue;
      if (!raw.every((letter) => (CHOICE_LETTERS as string[]).includes(letter))) continue;
      if (new Set(raw).size !== 4) continue;
      optionOrders[id] = [raw[0], raw[1], raw[2], raw[3]] as ChoiceOrder;
    }
  }

  const entry = row.entry === "map" ? "map" : row.entry === "logbook" ? "logbook" : undefined;

  return {
    stage: stageId,
    mode: row.mode === "stage" ? "stage" : "drill",
    source: row.source === "generated" || row.source === "bank" ? row.source : undefined,
    ids,
    picks,
    optionOrders: Object.keys(optionOrders).length > 0 ? optionOrders : undefined,
    index: 0,
    marked: true,
    entry,
  };
}
