import type { Choice, Difficulty, Question } from "./bank";
import j1 from "./data/drillPools/j1.json";
import j2 from "./data/drillPools/j2.json";
import j4 from "./data/drillPools/j4.json";
import j7 from "./data/drillPools/j7.json";
import j8 from "./data/drillPools/j8.json";
import j9 from "./data/drillPools/j9.json";
import j10 from "./data/drillPools/j10.json";
import j11 from "./data/drillPools/j11.json";
import j16 from "./data/drillPools/j16.json";
import j18 from "./data/drillPools/j18.json";
import j19 from "./data/drillPools/j19.json";
import c2 from "./data/drillPools/c2.json";
import c3 from "./data/drillPools/c3.json";
import c4 from "./data/drillPools/c4.json";
import c11 from "./data/drillPools/c11.json";
import c17 from "./data/drillPools/c17.json";

/**
 * Weekly Question Generator Paper 2 MC pools only, committed as JSON
 * (see scripts/convert-drill-pools.mjs). Paper 1 conventional pools are not used.
 *
 * J1 Change of subjects ← POOLS.J1MC
 * J2 Significant figure ← POOLS.J2MC
 * J4 Percentage ← POOLS.J4MC
 * J7 Indices ← POOLS.J7MC
 * J8 Identities ← POOLS.J8
 * J9 Factorization, expansion ← POOLS.J9MC
 * J10 Ratio, rate (map scale) ← POOLS.J10
 * J11 Simultaneous equations ← POOLS.J11MC
 * J16 Statistics ← POOLS.J16MC
 * J18 Sequences ← POOLS.J18MC
 * J19 S3 Probability ← POOLS.J19MC
 * C2 Quadratic equations in one unknown (II) ← POOLS.C2MC
 * C3 Functions and Graphs ← POOLS.C3MC
 * C4 More about polynomials ← POOLS.C4MC
 * C11 Variations ← POOLS.C11MC
 * C17 Inequalities in one unknown ← POOLS.C17MC
 */

type PoolStep = { mark: string; text: string; note: string };

type PoolBand = "Easy" | "Medium" | "Hard";

type PoolRecord = {
  id: string;
  tpl: string;
  /** Generator band. J7–J9 pools omit it. */
  band?: PoolBand;
  stem: string;
  choices: Record<Choice, string>;
  answer: Choice;
  steps: PoolStep[];
};

const TITLES: Record<string, string> = {
  J1: "Change of subjects",
  J2: "Significant figure",
  J4: "Percentage",
  J7: "Indices",
  J8: "Identities",
  J9: "Factorization, expansion",
  J10: "Ratio, rate (map scale)",
  J11: "Simultaneous equations",
  J16: "Statistics",
  J18: "Sequences",
  J19: "S3 Probability",
  C2: "Quadratic equations in one unknown (II)",
  C3: "Functions and Graphs",
  C4: "More about polynomials",
  C11: "Variations",
  C17: "Inequalities in one unknown",
};

const FILES: Record<string, PoolRecord[]> = {
  J1: j1 as PoolRecord[],
  J2: j2 as PoolRecord[],
  J4: j4 as PoolRecord[],
  J7: j7 as PoolRecord[],
  J8: j8 as PoolRecord[],
  J9: j9 as PoolRecord[],
  J10: j10 as PoolRecord[],
  J11: j11 as PoolRecord[],
  J16: j16 as PoolRecord[],
  J18: j18 as PoolRecord[],
  J19: j19 as PoolRecord[],
  C2: c2 as PoolRecord[],
  C3: c3 as PoolRecord[],
  C4: c4 as PoolRecord[],
  C11: c11 as PoolRecord[],
  C17: c17 as PoolRecord[],
};

function difficultyFromBand(band: PoolBand | undefined): Difficulty {
  if (band === "Easy") return "easy";
  if (band === "Medium") return "medium";
  if (band === "Hard") return "hard";
  return "unknown";
}

const byStage = new Map<string, Question[]>();
const byId = new Map<string, Question>();

for (const [stageId, records] of Object.entries(FILES)) {
  const questions = records.map((record) => toQuestion(stageId, record));
  byStage.set(stageId, questions);
  for (const question of questions) byId.set(question.id, question);
}

function toQuestion(stageId: string, record: PoolRecord): Question {
  return {
    id: record.id,
    stage: stageId,
    topic: TITLES[stageId] ?? stageId,
    year: "",
    paper: "2",
    sourceTag: "Generated practice",
    stem: record.stem,
    choices: record.choices,
    answer: record.answer,
    correctPercent: null,
    facilityPct: null,
    difficulty: difficultyFromBand(record.band),
    hasFigure: false,
    figure: null,
    figures: [],
    generated: true,
    archetype: record.tpl,
    steps: record.steps,
  };
}

export function hasGeneratedPool(stageId: string): boolean {
  return byStage.has(stageId);
}

export function generatedQuestions(stageId: string): Question[] {
  return byStage.get(stageId) ?? [];
}

export function generatedById(id: string): Question | undefined {
  return byId.get(id);
}
