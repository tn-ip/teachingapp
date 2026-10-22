import raw from "./data/questions.json";

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

export function questionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function stageById(stageId: string): StageInfo | undefined {
  return stages.find((s) => s.id === stageId);
}

/** Compulsory Part chapters shown as the locked Act 2 map. */
export const act2Chapters: { id: string; title: string }[] = [
  { id: "C1", title: "Quadratic equations (I)" },
  { id: "C2", title: "Quadratic equations (II)" },
  { id: "C3", title: "Functions" },
  { id: "C4", title: "Polynomials" },
  { id: "C5", title: "Straight lines" },
  { id: "C6", title: "Exponential functions" },
  { id: "C7", title: "Logarithms" },
  { id: "C8", title: "More about equations" },
  { id: "C9", title: "More about trigonometry" },
  { id: "C10", title: "Trigonometry applications" },
  { id: "C11", title: "Variations" },
  { id: "C12", title: "Circles" },
  { id: "C13", title: "Tangents to circles" },
  { id: "C14", title: "Dispersion" },
  { id: "C15", title: "Permutation and combination" },
  { id: "C16", title: "More about probability" },
  { id: "C17", title: "Inequalities" },
  { id: "C18", title: "Linear programming" },
  { id: "C19", title: "Locus and circles" },
  { id: "C20", title: "Sequences" },
  { id: "C21", title: "Sum of sequences" },
  { id: "C22", title: "Graphs of functions" },
  { id: "C23", title: "Use and abuse of statistics" },
];

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
