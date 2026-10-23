import type { Choice, Question } from "./bank";
import j7 from "./data/drillPools/j7.json";
import j8 from "./data/drillPools/j8.json";
import j9 from "./data/drillPools/j9.json";
import j10 from "./data/drillPools/j10.json";

/**
 * Weekly Question Generator Paper 2 pools, committed as JSON
 * (see scripts/convert-drill-pools.mjs).
 *
 * J7 Indices ← POOLS.J7MC
 * J8 Identities ← POOLS.J8
 * J9 Factorization, expansion ← POOLS.J9MC
 * J10 Ratio, rate (map scale) ← POOLS.J10
 */

type PoolStep = { mark: string; text: string; note: string };

type PoolRecord = {
  id: string;
  tpl: string;
  stem: string;
  choices: Record<Choice, string>;
  answer: Choice;
  steps: PoolStep[];
};

const TITLES: Record<string, string> = {
  J7: "Indices",
  J8: "Identities",
  J9: "Factorization, expansion",
  J10: "Ratio, rate (map scale)",
};

const FILES: Record<string, PoolRecord[]> = {
  J7: j7 as PoolRecord[],
  J8: j8 as PoolRecord[],
  J9: j9 as PoolRecord[],
  J10: j10 as PoolRecord[],
};

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
    difficulty: "unknown",
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
