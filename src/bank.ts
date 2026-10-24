import raw from "./data/questions.json";
import solutionFile from "./data/solutions.json";

export type Choice = "A" | "B" | "C" | "D";

/** Facility bands from the HKEAA percent who answered correctly. */
export type Difficulty = "easy" | "medium" | "hard" | "unknown";

export type Question = {
  id: string;
  stage: string;
  topic: string;
  year: string;
  paper: string;
  sourceTag: string;
  stem: string;
  choices: Record<Choice, string>;
  answer: Choice;
  correctPercent: number | null;
  /** Same value as correctPercent. Null when the Keys have no facility %. */
  facilityPct: number | null;
  difficulty: Difficulty;
  hasFigure: boolean;
  figure: string | null;
  figures: string[];
  /** WQG practice item. Real Paper 2 questions leave this unset. */
  generated?: boolean;
  /** Pool tpl / subtype, used to vary a generated drill. */
  archetype?: string;
  /** Short marking for a generated practice item. */
  steps?: { mark: string; text: string; note: string }[];
};

export type StageInfo = {
  id: string;
  title: string;
  questionCount: number;
};

type BankFile = {
  stages: StageInfo[];
  questions: Question[];
};

const bank = raw as BankFile;

/**
 * Easy ≥ 70, Medium 40–69, Hard below 40.
 * No facility % (Sample Paper, Practice Paper, or not yet tagged) is unknown.
 */
export function difficultyOf(facilityPct: number | null | undefined): Difficulty {
  if (facilityPct == null) return "unknown";
  if (facilityPct >= 70) return "easy";
  if (facilityPct >= 40) return "medium";
  return "hard";
}

/** Warm-up order. Unknown sits after Medium and before Hard. */
export const BAND_ORDER: Difficulty[] = ["easy", "medium", "unknown", "hard"];

export const BAND_RANK: Record<Difficulty, number> = {
  easy: 0,
  medium: 1,
  unknown: 2,
  hard: 3,
};

export function difficultyLabel(difficulty: Difficulty): string {
  if (difficulty === "easy") return "Easy";
  if (difficulty === "medium") return "Medium";
  if (difficulty === "hard") return "Hard";
  return "—";
}

/**
 * Stage ids: Junior stays J1–J19 (there is no J6). Compulsory is C1–C23,
 * one stage per chapter number. TOC splits of chapters 4, 10, 14, 19, 20,
 * and 21 are already merged into that chapter in the bank.
 */
export const stages: StageInfo[] = bank.stages;
export const questions: Question[] = bank.questions.map((question) => {
  const facilityPct = question.facilityPct ?? question.correctPercent ?? null;
  return {
    ...question,
    facilityPct,
    correctPercent: facilityPct,
    difficulty: difficultyOf(facilityPct),
  };
});

export const CHOICES: Choice[] = ["A", "B", "C", "D"];
export const RUN_SIZE = 5;

export function questionsFor(stageId: string): Question[] {
  return questions.filter((q) => q.stage === stageId);
}

/** Bank ids only. Generated practice ids (`wqg-…`) resolve in `questions.ts`. */
export function questionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function stageById(stageId: string): StageInfo | undefined {
  return stages.find((s) => s.id === stageId);
}

export type WorkedSolution = {
  year: string;
  number: number | null;
  solutionSteps: string;
  solutionSourceUrl: string | null;
  solutionCredit: string;
  sourceAnswer: string | null;
  hasDiagram: boolean;
  videoUrl: string | null;
  answerMatches: boolean;
};

type SolutionFile = {
  credit: string;
  solutions: Record<string, WorkedSolution>;
};

const solutionBank = solutionFile as SolutionFile;

/** Thomas Fok / mathseasy write-up for a bank question, when the fetch script matched one. */
export function solutionFor(id: string): WorkedSolution | undefined {
  return solutionBank.solutions[id];
}

export type StageCard = StageInfo & {
  /** Mean facility of tagged questions. Null when none are tagged. */
  averageFacility: number | null;
  band: Difficulty;
  taggedCount: number;
};

export function formatFacility(value: number): string {
  const tenths = Math.round(value * 10) / 10;
  return Number.isInteger(tenths) ? String(tenths) : tenths.toFixed(1);
}

export function stageFacility(stageId: string): {
  averageFacility: number | null;
  taggedCount: number;
  band: Difficulty;
} {
  const tagged = questionsFor(stageId)
    .map((question) => question.facilityPct)
    .filter((value): value is number => value != null);
  if (tagged.length === 0) {
    return { averageFacility: null, taggedCount: 0, band: "unknown" };
  }
  const averageFacility = tagged.reduce((sum, value) => sum + value, 0) / tagged.length;
  return {
    averageFacility,
    taggedCount: tagged.length,
    band: difficultyOf(averageFacility),
  };
}

/** Map order is Easy, then Medium, then Hard. Untagged stages are not a warm-up band. */
const MAP_BAND_RANK: Record<Difficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  unknown: 3,
};

/** Easy → Medium → Hard by descending average facility. Stages with no tagged % last. */
export const rankedStages: StageCard[] = stages
  .map((stage, index) => ({
    ...stage,
    ...stageFacility(stage.id),
    index,
  }))
  .sort((left, right) => {
    const bandDelta = MAP_BAND_RANK[left.band] - MAP_BAND_RANK[right.band];
    if (bandDelta !== 0) return bandDelta;
    if (
      left.averageFacility != null &&
      right.averageFacility != null &&
      left.averageFacility !== right.averageFacility
    ) {
      return right.averageFacility - left.averageFacility;
    }
    return left.index - right.index;
  })
  .map(({ index: _index, ...stage }) => stage);

export function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/** Shuffle inside each band, then Easy → Medium → Unknown → Hard. */
export function byWarmup(items: Question[]): Question[] {
  const groups = new Map<Difficulty, Question[]>(BAND_ORDER.map((band) => [band, []]));
  for (const question of items) {
    groups.get(question.difficulty)?.push(question);
  }
  return BAND_ORDER.flatMap((band) => shuffle(groups.get(band) ?? []));
}
