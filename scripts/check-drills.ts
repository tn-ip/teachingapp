import assert from "node:assert/strict";
import {
  BAND_RANK,
  isStudentStage,
  mapStages,
  questionById as bankQuestionById,
  questionsFor,
  rankedStages,
  stages,
} from "../src/bank.ts";
import {
  DRILLS_PER_MISS,
  c11MissTarget,
  j1MissTarget,
  j2MissTarget,
  j7MissTarget,
  j9MissTarget,
  j11MissTarget,
  pickFromPool,
  pickMapped,
  planC11Misses,
  planJ1Misses,
  planJ2Misses,
  planJ7Misses,
  planJ9Misses,
  planJ11Misses,
  skillsForStem,
} from "../src/drillPick.ts";
import { generatedById, generatedQuestions, hasGeneratedPool } from "../src/drillPools.ts";
import { PRACTICE_DRILL_ENABLED, practiceDrillEnabled } from "../src/features.ts";
import { questionById } from "../src/questions.ts";
import {
  grantPerfectRun,
  j11RemedialOffer,
  remedialOffer,
  stageClearedBy,
  startRun,
  type Progress,
  type Run,
} from "../src/progress.ts";

const EXPECTED: Record<string, string[]> = {
  "J1-sample-q2": ["CS2"],
  "J1-practice-q2": ["CS3"],
  "J1-2013-q2": ["CS4"],
  "J1-2016-q2": ["CS7"],
  "J1-2017-q3": ["CS5"],
  "J1-2018-q2": ["CS8"],
  "J1-2019-q5": ["CS5"],
  "J1-2020-q2": ["CS1"],
  "J1-2021-q2": ["CS1"],
  "J1-2022-q5": ["CS7"],
  "J1-2023-q1": ["CS8"],
  "J1-2024-q3": ["CS5"],
  "J1-2025-q4": ["CS1"],
  "J2-practice-q14": ["RS3", "RS8"],
  "J2-2012-q13": ["RS3"],
  "J2-2013-q4": ["RS3"],
  "J2-2015-q4": ["RS3", "RS8"],
  "J2-2016-q4": ["RS3"],
  "J2-2017-q4": ["RS3"],
  "J2-2019-q6": ["RS4"],
  "J2-2021-q5": ["RS5"],
  "J2-2022-q6": ["RS6", "RS5"],
  "J2-2023-q7": ["RS5"],
  "J2-2024-q4": ["RS3"],
  "J2-2025-q6": ["RS5"],
  "J7-sample-q1": ["I1"],
  "J7-practice-q1": [],
  "J7-2012-q1": ["I2"],
  "J7-2013-q1": ["I5"],
  "J7-2014-q1": ["I3"],
  "J7-2015-q2": ["I2"],
  "J7-2016-q1": ["I5"],
  "J7-2017-q2": ["I6"],
  "J7-2018-q1": ["I4"],
  "J7-2019-q2": ["I2"],
  "J7-2020-q1": ["I3", "I2"],
  "J7-2021-q1": ["I4"],
  "J7-2022-q2": ["I4"],
  "J7-2023-q3": ["I5"],
  "J7-2024-q2": ["I3", "I2"],
  "J7-2025-q1": ["I3", "I2"],
  "J8-sample-q4": ["ID1"],
  "J8-practice-q4": ["ID1"],
  "J8-2012-q3": ["ID1"],
  "J8-2013-q8": ["ID2"],
  "J8-2014-q3": ["ID1"],
  "J8-2015-q5": ["ID1"],
  "J8-2017-q8": ["ID1"],
  "J8-2019-q4": ["ID4"],
  "J8-2020-q7": ["ID3"],
  "J8-2021-q6": ["ID2"],
  "J8-2022-q3": ["ID4"],
  "J8-2023-q5": ["ID1"],
  "J8-2025-q3": ["ID1"],
  "J9-sample-q3": ["F1"],
  "J9-practice-q3": ["F1"],
  "J9-2012-q2": ["F3"],
  "J9-2013-q3": [],
  "J9-2014-q2": ["F1"],
  "J9-2015-q1": ["F2"],
  "J9-2016-q3": ["F3"],
  "J9-2017-q1": ["F4"],
  "J9-2018-q3": ["F1"],
  "J9-2019-q1": ["F2"],
  "J9-2020-q4": ["F5"],
  "J9-2021-q3": ["F2"],
  "J9-2022-q1": ["F1"],
  "J9-2023-q4": ["F4"],
  "J9-2024-q1": ["F3"],
  "J9-2025-q2": ["F3"],
  "J10-sample-q13": [],
  "J10-practice-q12": [],
  "J10-2012-q9": [],
  "J10-2012-q11": [],
  "J10-2013-q12": ["M1"],
  "J10-2014-q12": [],
  "J10-2015-q11": [],
  "J10-2016-q11": [],
  "J10-2016-q13": [],
  "J10-2017-q11": ["M2"],
  "J10-2018-q10": [],
  "J10-2019-q12": [],
  "J10-2020-q10": ["M1"],
  "J10-2021-q11": [],
  "J10-2022-q12": [],
  "J10-2023-q12": ["M3"],
  "J10-2024-q6": [],
  "J10-2024-q12": [],
  "J10-2025-q11": [],
  "C11-sample-q14": ["V1"],
  "C11-practice-q13": ["V2"],
  "C11-2012-q10": ["V3", "V1"],
  "C11-2013-q13": ["V4"],
  "C11-2014-q13": ["V2"],
  "C11-2015-q12": ["V1"],
  "C11-2016-q12": ["V4"],
  "C11-2017-q12": ["V3", "V1"],
  "C11-2018-q11": ["V2"],
  "C11-2019-q13": ["V4"],
  "C11-2020-q11": ["V1"],
  "C11-2021-q12": ["V2"],
  "C11-2022-q13": ["V5"],
  "C11-2023-q13": ["V1"],
  "C11-2024-q13": ["V4"],
  "C11-2025-q12": ["V1"],
  "J11-2012-q5": ["SE1"],
  "J11-2014-q8": ["SE1"],
  "J11-2014-q9": ["SE2"],
  "J11-2015-q3": ["SE1"],
  "J11-2016-q5": ["SE1"],
  "J11-2019-q3": ["SE1"],
  "J11-2024-q5": ["SE1"],
};

const empty = (): Progress => ({ cleared: [], used: {}, last: {}, run: null });

function wrongLetter(answer: string): "A" | "B" | "C" | "D" {
  return answer === "A" ? "B" : "A";
}

const DRILL_STAGES = [
  "J1",
  "J2",
  "J4",
  "J7",
  "J8",
  "J9",
  "J10",
  "J11",
  "J16",
  "J18",
  "J19",
  "C2",
  "C3",
  "C4",
  "C11",
  "C17",
];
const UNBANDED = new Set(["J7", "J8", "J9"]);
const SKILL_STAGES = new Set(["J1", "J2", "J7", "J8", "J9", "J10", "J11", "C11"]);
const UNIQUE_STEMS: Record<string, number> = { C2: 286, C3: 299 };
const ARCHETYPE: Record<string, RegExp> = {
  J1: /^CS[1-8]$/,
  J7: /^I[1-6]$/,
  J9: /^F[1-5]$/,
  J2: /^RS[1-8]$/,
  J4: /^P[1-6]$/,
  J10: /^(?:M[1-3]|R[1-3])$/,
  J11: /^SE[1-7]$/,
  J16: /^ST[1-6]$/,
  J18: /^SQ[1-8]$/,
  J19: /^P[1-4]$/,
  C2: /^Q[1-4]$/,
  C3: /^F[1-5]$/,
  C4: /^(?:F[1-4]|H[1-4])$/,
  C11: /^V[1-5]$/,
  C17: /^I[1-6]$/,
};

function hasRawMathDollar(value: string): boolean {
  return value.replace(/\\\$/g, "").replace(/\$\d+(?:\.\d+)?/g, "").includes("$");
}

for (const stage of DRILL_STAGES) {
  assert.equal(hasGeneratedPool(stage), true, stage);
  const pool = generatedQuestions(stage);
  assert.equal(pool.length, 300, stage);
  const ids = new Set(pool.map((question) => question.id));
  const stems = new Set(pool.map((question) => question.stem));
  assert.equal(ids.size, 300, stage);
  assert.equal(stems.size, UNIQUE_STEMS[stage] ?? 300, `${stage} stems`);
  for (const question of pool) {
    assert.equal(question.generated, true);
    assert.ok(question.archetype);
    assert.ok(question.steps && question.steps.length > 0);
    assert.equal(question.topic, stages.find((item) => item.id === stage)?.title, question.id);
    assert.equal(bankQuestionById(question.id), undefined);
    assert.equal(questionById(question.id)?.id, question.id);
    for (const letter of ["A", "B", "C", "D"] as const) {
      assert.ok(question.choices[letter], `${question.id} ${letter}`);
      assert.equal(hasRawMathDollar(question.choices[letter]), false, `${question.id} ${letter}`);
    }
    assert.equal(hasRawMathDollar(question.stem), false, question.id);
    if (stage === "J2") {
      assert.equal(/how many significant figures/i.test(question.stem), false, question.id);
    }
    if (UNBANDED.has(stage)) {
      assert.equal(question.difficulty, "unknown", question.id);
    } else {
      assert.notEqual(question.difficulty, "unknown", question.id);
    }
    if (ARCHETYPE[stage]) assert.match(question.archetype ?? "", ARCHETYPE[stage], question.id);
  }
  if (!SKILL_STAGES.has(stage)) continue;
  for (const bankQuestion of questionsFor(stage)) {
    const got = skillsForStem(stage, bankQuestion.stem);
    const want = EXPECTED[bankQuestion.id];
    assert.ok(want, `missing expected skills for ${bankQuestion.id}`);
    assert.deepEqual(got, want, bankQuestion.id);
  }
}

assert.equal(hasGeneratedPool("J5"), false);
assert.equal(hasGeneratedPool("C1"), false);
assert.equal(hasGeneratedPool("C10"), false);
assert.equal(hasGeneratedPool("C23"), false);
assert.equal(startRun(empty(), "C5", "drill"), null);
assert.equal(startRun(empty(), "C19", "drill"), null);

const c4Drill = startRun(empty(), "C4", "drill");
assert.ok(c4Drill?.run);
assert.equal(c4Drill.run.source, "generated");
assert.equal(c4Drill.run.mode, "drill");
assert.deepEqual(c4Drill.run.focus, []);
assert.equal(c4Drill.run.ids.length, 5);
assert.ok(c4Drill.run.ids.every((id) => id.startsWith("wqg-C4-")));
assert.ok(c4Drill.run.ids.every((id) => generatedById(id)?.difficulty === "easy"));
assert.deepEqual(c4Drill.used, {});
assert.deepEqual(c4Drill.cleared, []);
assert.equal(stageClearedBy(c4Drill.run, 5, 5), false);

const firstJ7 = generatedQuestions("J7")[0];
assert.equal(firstJ7.archetype, "I1");
assert.equal(firstJ7.answer, "C");
assert.match(firstJ7.stem, /\(5a\)/);
const j7Tpls: Record<string, number> = {};
for (const question of generatedQuestions("J7")) {
  const tpl = question.archetype ?? "";
  j7Tpls[tpl] = (j7Tpls[tpl] ?? 0) + 1;
}
assert.deepEqual(j7Tpls, { I1: 50, I2: 50, I3: 50, I4: 50, I5: 50, I6: 50 });

const firstJ10 = generatedQuestions("J10")[0];
assert.equal(firstJ10.archetype, "M2");
assert.equal(firstJ10.answer, "B");
assert.equal(firstJ10.difficulty, "medium");
assert.match(firstJ10.stem, /zoo/);
assert.match(firstJ10.stem, /15000/);

function bandCounts(stageId: string) {
  const counts = { easy: 0, medium: 0, hard: 0, unknown: 0 };
  for (const question of generatedQuestions(stageId)) counts[question.difficulty] += 1;
  return counts;
}
assert.deepEqual(bandCounts("J1"), { easy: 76, medium: 114, hard: 110, unknown: 0 });
assert.deepEqual(bandCounts("J2"), { easy: 76, medium: 114, hard: 110, unknown: 0 });
assert.deepEqual(bandCounts("J11"), { easy: 74, medium: 128, hard: 98, unknown: 0 });
assert.deepEqual(bandCounts("J18"), { easy: 76, medium: 114, hard: 110, unknown: 0 });
assert.deepEqual(bandCounts("J4"), { easy: 34, medium: 259, hard: 7, unknown: 0 });
assert.deepEqual(bandCounts("J10"), { easy: 65, medium: 235, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("J16"), { easy: 150, medium: 150, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("J19"), { easy: 192, medium: 108, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("C2"), { easy: 150, medium: 150, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("C3"), { easy: 145, medium: 155, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("C4"), { easy: 115, medium: 185, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("C11"), { easy: 35, medium: 155, hard: 110, unknown: 0 });
const c11Tpls: Record<string, number> = {};
for (const question of generatedQuestions("C11")) {
  const tpl = question.archetype ?? "";
  c11Tpls[tpl] = (c11Tpls[tpl] ?? 0) + 1;
}
assert.deepEqual(c11Tpls, { V1: 70, V2: 60, V3: 60, V4: 60, V5: 50 });
assert.deepEqual(bandCounts("C17"), { easy: 72, medium: 198, hard: 30, unknown: 0 });
assert.deepEqual(bandCounts("J7"), { easy: 0, medium: 0, hard: 0, unknown: 300 });
assert.equal(questionsFor("J1").length, 13);
assert.equal(questionsFor("J2").length, 12);
assert.equal(questionsFor("J11").length, 7);
assert.equal(questionsFor("J18").length, 13);
assert.ok(questionsFor("J1").every((question) => !question.generated && !question.id.startsWith("wqg-")));
assert.ok(questionsFor("J2").every((question) => !question.generated && !question.id.startsWith("wqg-")));
assert.ok(questionsFor("J11").every((question) => !question.generated && !question.id.startsWith("wqg-")));
assert.ok(questionsFor("J18").every((question) => !question.generated && !question.id.startsWith("wqg-")));

const firstJ1 = generatedQuestions("J1")[0];
assert.equal(firstJ1.id, "wqg-J1-001");
assert.equal(firstJ1.archetype, "CS8");
assert.equal(firstJ1.answer, "D");
assert.equal(firstJ1.difficulty, "hard");
assert.match(firstJ1.stem, /c\+d/);

const firstJ11 = generatedQuestions("J11")[0];
assert.equal(firstJ11.id, "wqg-J11-001");
assert.equal(firstJ11.archetype, "SE3");
assert.equal(firstJ11.answer, "A");
assert.equal(firstJ11.difficulty, "medium");
assert.match(firstJ11.stem, /cinema/);
assert.match(firstJ11.stem, /2:3/);

const firstJ2 = generatedQuestions("J2")[0];
assert.equal(firstJ2.id, "wqg-J2-001");
assert.equal(firstJ2.topic, "Significant figure");
assert.equal(firstJ2.archetype, "RS5");
assert.equal(firstJ2.answer, "C");
assert.equal(firstJ2.difficulty, "medium");
assert.match(firstJ2.stem, /44\.8/);
assert.match(firstJ2.stem, /range of values/);

const firstJ18 = generatedQuestions("J18")[0];
assert.equal(firstJ18.id, "wqg-J18-001");
assert.equal(firstJ18.topic, "Sequences");
assert.equal(firstJ18.archetype, "SQ4");
assert.equal(firstJ18.answer, "D");
assert.equal(firstJ18.difficulty, "medium");
assert.match(firstJ18.stem, /common ratio/);
assert.match(firstJ18.stem, /16/);

const j7Stage = startRun(empty(), "J7", "stage");
assert.ok(j7Stage);
assert.equal(j7Stage.run?.source, undefined);
assert.equal(j7Stage.run?.mode, "stage");
assert.ok(j7Stage.run?.ids.every((id) => id.startsWith("J7-")));
assert.deepEqual(j7Stage.used.J7, j7Stage.run?.ids);
assert.deepEqual(j7Stage.cleared, []);

const scale = bankQuestionById("J10-2013-q12");
const ratio = bankQuestionById("J10-sample-q13");
assert.ok(scale && ratio);
const before: Progress = {
  cleared: ["J5"],
  used: { J10: ["J10-2012-q9"] },
  last: {},
  run: {
    stage: "J10",
    mode: "stage",
    ids: [scale.id, ratio.id],
    picks: {
      [scale.id]: wrongLetter(scale.answer),
      [ratio.id]: ratio.answer,
    },
    index: 1,
    marked: true,
  },
};
const drill = startRun(before, "J10", "drill");
assert.ok(drill?.run);
assert.equal(drill.run.source, "generated");
assert.equal(drill.run.mode, "drill");
assert.deepEqual(drill.run.focus, ["M1"]);
assert.equal(drill.run.ids.length, 5);
assert.ok(drill.run.ids.every((id) => id.startsWith("wqg-J10-")));
assert.deepEqual(drill.used, before.used);
assert.deepEqual(drill.cleared, ["J5"]);
const archetypes = drill.run.ids.map((id) => generatedById(id)?.archetype);
assert.deepEqual(
  archetypes.filter((tpl) => tpl === "M1").length,
  3,
);
for (let i = 1; i < archetypes.length; i += 1) {
  assert.notEqual(archetypes[i], archetypes[i - 1]);
}
assert.equal(stageClearedBy(drill.run, 5, 5), false);

const again = startRun(drill, "J10", "drill");
assert.ok(again?.run);
assert.deepEqual(again.run.focus, ["M1"]);
assert.deepEqual(again.used, before.used);
assert.deepEqual(again.cleared, ["J5"]);
const firstIds = new Set(drill.run.ids);
assert.ok(again.run.ids.every((id) => !firstIds.has(id)));

const beforeJ1: Progress = {
  cleared: ["J3"],
  used: { J1: ["J1-sample-q2"] },
  last: {},
  run: null,
};
assert.equal(startRun(beforeJ1, "J1", "drill"), null);
assert.deepEqual(beforeJ1.used, { J1: ["J1-sample-q2"] });
assert.deepEqual(beforeJ1.cleared, ["J3"]);
for (const stageId of ["J3", "J5", "J14"]) {
  assert.equal(hasGeneratedPool(stageId), false);
  assert.equal(startRun(beforeJ1, stageId, "drill"), null);
}
for (const bankQuestion of questionsFor("J18")) {
  assert.deepEqual(skillsForStem("J18", bankQuestion.stem), [], bankQuestion.id);
}
for (const stageId of ["J2", "J18"]) {
  const stageRun = startRun(beforeJ1, stageId, "stage");
  assert.ok(stageRun?.run);
  assert.equal(stageRun.run.source, undefined);
  assert.equal(stageRun.run.mode, "stage");
  assert.ok(stageRun.run.ids.every((id) => id.startsWith(`${stageId}-`) && !id.startsWith("wqg-")));
  assert.deepEqual(stageRun.cleared, ["J3"]);
}
const j1Stage = startRun(beforeJ1, "J1", "stage");
assert.ok(j1Stage?.run);
assert.equal(j1Stage.run.source, undefined);
assert.equal(j1Stage.run.mode, "stage");
assert.ok(j1Stage.run.ids.every((id) => id.startsWith("J1-") && !id.startsWith("wqg-")));
assert.ok(!j1Stage.run.ids.includes("J1-sample-q2"));
assert.deepEqual(j1Stage.cleared, ["J3"]);
assert.deepEqual(beforeJ1.used, { J1: ["J1-sample-q2"] });

const perfectStage: Run = {
  stage: "J1",
  mode: "stage",
  ids: j1Stage.run.ids,
  picks: {},
  index: 0,
  marked: true,
};
assert.equal(stageClearedBy(perfectStage, 5, 5), false);
assert.equal(stageClearedBy(perfectStage, 5, 5, 1), true);
assert.equal(stageClearedBy(perfectStage, 4, 5, 1), false);

const cs7 = bankQuestionById("J1-2016-q2");
const cs4 = bankQuestionById("J1-2013-q2");
const cs8 = bankQuestionById("J1-2018-q2");
const se2 = bankQuestionById("J11-2014-q9");
const se1 = bankQuestionById("J11-2015-q3");
assert.ok(cs7 && cs4 && cs8 && se2 && se1);

function wrongRun(stageId: string, questions: { id: string; answer: string }[]): Progress {
  return {
    cleared: ["J3"],
    used: { [stageId]: ["kept-bank-id"] },
    last: {},
    run: {
      stage: stageId,
      mode: "stage",
      ids: questions.map((question) => question.id),
      picks: Object.fromEntries(questions.map((question) => [question.id, wrongLetter(question.answer)])),
      index: questions.length - 1,
      marked: true,
    },
  };
}

assert.deepEqual([...PRACTICE_DRILL_ENABLED.enabledStages], ["J11", "J9", "J1", "J7", "J2", "C11"]);
for (const stage of stages) {
  assert.equal(
    practiceDrillEnabled(stage.id),
    stage.id === "J11" ||
      stage.id === "J9" ||
      stage.id === "J1" ||
      stage.id === "J7" ||
      stage.id === "J2" ||
      stage.id === "C11",
    stage.id,
  );
}
assert.equal(practiceDrillEnabled(null), false);
assert.equal(practiceDrillEnabled("C23"), false);
assert.equal(DRILLS_PER_MISS, 2);
assert.equal(startRun(empty(), "J11", "drill"), null);
assert.equal(startRun(empty(), "J9", "drill"), null);
assert.equal(startRun(empty(), "J1", "drill"), null);
assert.equal(startRun(empty(), "J7", "drill"), null);
assert.equal(startRun(empty(), "J2", "drill"), null);
assert.equal(startRun(empty(), "C11", "drill"), null);

for (const bankQuestion of questionsFor("J11")) {
  const target = j11MissTarget(bankQuestion.stem);
  assert.ok(target, bankQuestion.id);
  assert.equal(target.via, "skill", bankQuestion.id);
  assert.deepEqual(target.tpls, EXPECTED[bankQuestion.id], bankQuestion.id);
}

const priceStem = "The shop changes its prices by 10 percent overnight.";
assert.deepEqual(skillsForStem("J11", priceStem), []);
assert.deepEqual(j11MissTarget(priceStem), { tpls: ["SE1", "SE2"], via: "bucket" });
const ratioStem = "The ratio of boys to girls is 2 to 3.";
assert.deepEqual(skillsForStem("J11", ratioStem), []);
assert.deepEqual(j11MissTarget(ratioStem), { tpls: ["SE3", "SE4", "SE5"], via: "bucket" });
const speedStem = "Find the speed of each cyclist on the two roads.";
assert.deepEqual(skillsForStem("J11", speedStem), []);
assert.deepEqual(j11MissTarget(speedStem), { tpls: ["SE6", "SE7"], via: "bucket" });
const unmatchedStem = "Which figure is correct?";
assert.equal(j11MissTarget(unmatchedStem), null);

const j11Pool = generatedQuestions("J11").map((question) => ({
  id: question.id,
  tpl: question.archetype ?? "",
  stem: question.stem,
  difficulty: question.difficulty,
}));
const bucketPlan = planJ11Misses(
  [{ bankId: "ratio-miss", paperNumber: 1, stem: ratioStem }],
  j11Pool,
);
assert.equal(bucketPlan.repairs.length, 1);
assert.equal(bucketPlan.repairs[0].ids.length, 2);
assert.deepEqual(bucketPlan.focus, ["SE3", "SE4", "SE5"]);
assert.ok(
  bucketPlan.repairs[0].ids.every((id) => {
    const item = generatedById(id);
    return item?.difficulty === "medium" && ["SE3", "SE4", "SE5"].includes(item.archetype ?? "");
  }),
);
const mixedPlan = planJ11Misses(
  [
    { bankId: se2.id, paperNumber: 1, stem: se2.stem },
    { bankId: "mystery", paperNumber: 2, stem: unmatchedStem },
  ],
  j11Pool,
);
assert.equal(mixedPlan.repairs.length, 1);
assert.deepEqual(
  mixedPlan.repairs[0].ids.map((id) => generatedById(id)?.archetype),
  ["SE2", "SE2"],
);
assert.deepEqual(mixedPlan.unmatched, [{ bankId: "mystery", paperNumber: 2 }]);
assert.deepEqual(
  planJ11Misses([{ bankId: "mystery", paperNumber: 2, stem: unmatchedStem }], j11Pool),
  { repairs: [], unmatched: [{ bankId: "mystery", paperNumber: 2 }], focus: [] },
);

const short = planJ11Misses(
  [{ bankId: se2.id, paperNumber: 1, stem: se2.stem }],
  [{ id: "only", tpl: "SE2", stem: "only", difficulty: "easy" }],
);
assert.deepEqual(short.repairs, []);
assert.deepEqual(short.unmatched, [{ bankId: se2.id, paperNumber: 1 }]);
const starved = planJ11Misses(
  [
    { bankId: "m1", paperNumber: 1, stem: se2.stem },
    { bankId: "m2", paperNumber: 3, stem: se2.stem },
  ],
  [
    { id: "a", tpl: "SE2", stem: "a", difficulty: "easy" },
    { id: "b", tpl: "SE2", stem: "b", difficulty: "easy" },
    { id: "c", tpl: "SE2", stem: "c", difficulty: "easy" },
  ],
);
assert.equal(starved.repairs.length, 1);
assert.equal(starved.repairs[0].ids.length, 2);
assert.deepEqual(starved.unmatched, [{ bankId: "m2", paperNumber: 3 }]);
const sameStem = planJ11Misses(
  [{ bankId: se1.id, paperNumber: 1, stem: se1.stem }],
  [
    { id: "a", tpl: "SE1", stem: "same", difficulty: "easy" },
    { id: "b", tpl: "SE1", stem: "same", difficulty: "easy" },
    { id: "c", tpl: "SE1", stem: "other", difficulty: "easy" },
  ],
  () => 0,
);
assert.equal(sameStem.repairs.length, 1);
assert.deepEqual(
  sameStem.repairs[0].ids.map((id) => (id === "c" ? "other" : "same")).sort(),
  ["other", "same"],
);
assert.deepEqual(
  pickMapped(
    [
      { id: "h", tpl: "SE6", stem: "h", difficulty: "hard" },
      { id: "m", tpl: "SE3", stem: "m", difficulty: "medium" },
      { id: "e", tpl: "SE1", stem: "e", difficulty: "easy" },
    ],
    ["SE1", "SE3", "SE6"],
    new Set(),
    3,
    () => 0,
  ).map((item) => item.id),
  ["e", "m", "h"],
);

for (let trial = 0; trial < 8; trial += 1) {
  const ratioMiss = startRun(wrongRun("J11", [se2]), "J11", "drill");
  assert.ok(ratioMiss?.run);
  assert.equal(ratioMiss.run.ids.length, DRILLS_PER_MISS);
  assert.deepEqual(ratioMiss.run.focus, ["SE2"]);
  assert.deepEqual(ratioMiss.run.repairs, [
    { bankId: se2.id, paperNumber: 1, ids: ratioMiss.run.ids },
  ]);
  assert.deepEqual(ratioMiss.run.unmatchedMisses, []);
  assert.deepEqual(ratioMiss.used, { J11: ["kept-bank-id"] });
  assert.deepEqual(ratioMiss.cleared, ["J3"]);
  const kinds = ratioMiss.run.ids.map((id) => generatedById(id));
  assert.ok(kinds.every((question) => question?.archetype === "SE2"));
  assert.ok(kinds.every((question) => question?.difficulty === "easy"));
  assert.ok(kinds.every((question) => question?.id.startsWith("wqg-J11-")));
  assert.equal(new Set(kinds.map((question) => question?.stem)).size, 2);
  assert.equal(stageClearedBy(ratioMiss.run, 2, 2), false);
  assert.equal(grantPerfectRun(ratioMiss, ratioMiss.run, 2, 2), ratioMiss);
  for (const id of ratioMiss.run.ids) {
    const order = ratioMiss.run.optionOrders?.[id];
    assert.ok(order);
    assert.deepEqual([...order].sort(), ["A", "B", "C", "D"]);
  }
  assert.equal(startRun(ratioMiss, "J11", "drill"), null);

  const linear = startRun(wrongRun("J11", [se1]), "J11", "drill");
  assert.ok(linear?.run);
  assert.equal(linear.run.ids.length, 2);
  assert.deepEqual(linear.run.focus, ["SE1"]);
  const linearKinds = linear.run.ids.map((id) => generatedById(id));
  assert.ok(linearKinds.every((question) => question?.archetype === "SE1"));
  assert.ok(linearKinds.every((question) => question?.difficulty === "easy"));
  assert.equal(new Set(linearKinds.map((question) => question?.stem)).size, 2);
}

const pairedJ11 = startRun(wrongRun("J11", [se2, se1]), "J11", "drill");
assert.ok(pairedJ11?.run);
assert.deepEqual(
  pairedJ11.run.ids.map((id) => generatedById(id)?.archetype),
  ["SE2", "SE2", "SE1", "SE1"],
);
assert.equal(new Set(pairedJ11.run.ids).size, 4);
assert.equal(new Set(pairedJ11.run.ids.map((id) => generatedById(id)?.stem)).size, 4);
assert.deepEqual(pairedJ11.run.focus, ["SE2", "SE1"]);
assert.deepEqual(
  pairedJ11.run.repairs?.map((repair) => repair.bankId),
  [se2.id, se1.id],
);
assert.deepEqual(pairedJ11.run.repairs?.map((repair) => repair.paperNumber), [1, 2]);
assert.deepEqual(pairedJ11.used, { J11: ["kept-bank-id"] });
assert.deepEqual(pairedJ11.cleared, ["J3"]);
assert.deepEqual(j11RemedialOffer(wrongRun("J11", [se2, se1]).run ?? null), {
  mapped: 2,
  unmappedBankIds: [],
});

const oneWrong: Progress = {
  cleared: ["J3"],
  used: { J11: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "J11",
    mode: "stage",
    ids: [se2.id, se1.id],
    picks: {
      [se2.id]: se2.answer,
      [se1.id]: wrongLetter(se1.answer),
    },
    index: 1,
    marked: true,
  },
};
const onlySecond = startRun(oneWrong, "J11", "drill");
assert.ok(onlySecond?.run);
assert.equal(onlySecond.run.ids.length, 2);
assert.equal(onlySecond.run.repairs?.[0].bankId, se1.id);
assert.equal(onlySecond.run.repairs?.[0].paperNumber, 2);
assert.ok(onlySecond.run.ids.every((id) => generatedById(id)?.archetype === "SE1"));
assert.deepEqual(onlySecond.used, oneWrong.used);
assert.deepEqual(onlySecond.cleared, ["J3"]);
assert.deepEqual(j11RemedialOffer(oneWrong.run), { mapped: 1, unmappedBankIds: [] });

const perfectPaper: Progress = {
  cleared: ["J3"],
  used: { J11: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "J11",
    mode: "stage",
    ids: [se2.id, se1.id],
    picks: {
      [se2.id]: se2.answer,
      [se1.id]: se1.answer,
    },
    index: 1,
    marked: true,
  },
};
assert.equal(startRun(perfectPaper, "J11", "drill"), null);
assert.deepEqual(j11RemedialOffer(perfectPaper.run), { mapped: 0, unmappedBankIds: [] });

const f1q = bankQuestionById("J9-2014-q2");
const f2q = bankQuestionById("J9-2015-q1");
const f3q = bankQuestionById("J9-2012-q2");
const f4q = bankQuestionById("J9-2017-q1");
const f5q = bankQuestionById("J9-2020-q4");
const groupQ = bankQuestionById("J9-2013-q3");
assert.ok(f1q && f2q && f3q && f4q && f5q && groupQ);

for (const bankQuestion of questionsFor("J9")) {
  const target = j9MissTarget(bankQuestion.stem);
  assert.ok(target, bankQuestion.id);
  const want = EXPECTED[bankQuestion.id];
  if (want.length > 0) {
    assert.equal(target.via, "skill", bankQuestion.id);
    assert.deepEqual(target.tpls, want, bankQuestion.id);
  } else {
    assert.equal(target.via, "bucket", bankQuestion.id);
    assert.deepEqual(target.tpls, ["F1", "F4"], bankQuestion.id);
  }
}

const sumOfSquares = "\\(x^{2}+y^{2}=\\)";
assert.deepEqual(skillsForStem("J9", sumOfSquares), []);
assert.equal(j9MissTarget(sumOfSquares), null);
const pureDiff = "\\(x^{2}-y^{2}=\\)";
assert.deepEqual(skillsForStem("J9", pureDiff), ["F3"]);
assert.deepEqual(j9MissTarget(pureDiff), { tpls: ["F3"], via: "skill" });
const nearDiff = "\\(x^{2}-8=\\)";
assert.deepEqual(skillsForStem("J9", nearDiff), []);
assert.deepEqual(j9MissTarget(nearDiff), { tpls: ["F3"], via: "bucket" });
const scaledProduct = "\\(2(x+1)(x-1)=\\)";
assert.deepEqual(skillsForStem("J9", scaledProduct), []);
assert.deepEqual(j9MissTarget(scaledProduct), { tpls: ["F2", "F5"], via: "bucket" });
const oneVarQuad = "\\(x^{2}+5x+6=\\)";
assert.deepEqual(skillsForStem("J9", oneVarQuad), []);
assert.deepEqual(j9MissTarget(oneVarQuad), { tpls: ["F1", "F4"], via: "bucket" });
const linearOnly = "\\(x+y=\\)";
assert.deepEqual(skillsForStem("J9", linearOnly), []);
assert.equal(j9MissTarget(linearOnly), null);
assert.equal(j9MissTarget("Which figure is correct?"), null);

const j9Pool = generatedQuestions("J9").map((question) => ({
  id: question.id,
  tpl: question.archetype ?? "",
  stem: question.stem,
  difficulty: question.difficulty,
}));
const j9BucketPlan = planJ9Misses(
  [{ bankId: groupQ.id, paperNumber: 2, stem: groupQ.stem }],
  j9Pool,
  () => 0,
);
assert.equal(j9BucketPlan.repairs.length, 1);
assert.equal(j9BucketPlan.repairs[0].ids.length, 2);
assert.deepEqual(j9BucketPlan.focus, ["F1", "F4"]);
assert.deepEqual(j9BucketPlan.unmatched, []);
assert.ok(
  j9BucketPlan.repairs[0].ids.every((id) => ["F1", "F4"].includes(generatedById(id)?.archetype ?? "")),
);
const j9Mixed = planJ9Misses(
  [
    { bankId: f3q.id, paperNumber: 1, stem: f3q.stem },
    { bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" },
  ],
  j9Pool,
);
assert.equal(j9Mixed.repairs.length, 1);
assert.deepEqual(
  j9Mixed.repairs[0].ids.map((id) => generatedById(id)?.archetype),
  ["F3", "F3"],
);
assert.deepEqual(j9Mixed.unmatched, [{ bankId: "mystery", paperNumber: 4 }]);
assert.deepEqual(
  planJ9Misses([{ bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" }], j9Pool),
  { repairs: [], unmatched: [{ bankId: "mystery", paperNumber: 4 }], focus: [] },
);
const j9Short = planJ9Misses(
  [{ bankId: f1q.id, paperNumber: 1, stem: f1q.stem }],
  [{ id: "only", tpl: "F1", stem: "only", difficulty: "unknown" }],
);
assert.deepEqual(j9Short.repairs, []);
assert.deepEqual(j9Short.unmatched, [{ bankId: f1q.id, paperNumber: 1 }]);

for (let trial = 0; trial < 8; trial += 1) {
  for (const missed of [f1q, f2q, f3q, f4q, f5q]) {
    const drilled = startRun(wrongRun("J9", [missed]), "J9", "drill");
    assert.ok(drilled?.run);
    assert.equal(drilled.run.ids.length, DRILLS_PER_MISS);
    assert.deepEqual(drilled.run.focus, EXPECTED[missed.id]);
    assert.deepEqual(drilled.run.repairs, [
      { bankId: missed.id, paperNumber: 1, ids: drilled.run.ids },
    ]);
    assert.deepEqual(drilled.run.unmatchedMisses, []);
    assert.deepEqual(drilled.used, { J9: ["kept-bank-id"] });
    assert.deepEqual(drilled.cleared, ["J3"]);
    const kinds = drilled.run.ids.map((id) => generatedById(id));
    assert.ok(kinds.every((question) => question?.archetype === EXPECTED[missed.id][0]));
    assert.ok(kinds.every((question) => question?.id.startsWith("wqg-J9-")));
    assert.equal(new Set(kinds.map((question) => question?.stem)).size, 2);
    assert.equal(stageClearedBy(drilled.run, 2, 2), false);
    assert.equal(grantPerfectRun(drilled, drilled.run, 2, 2), drilled);
    assert.equal(startRun(drilled, "J9", "drill"), null);
  }
}

const pairedJ9 = startRun(wrongRun("J9", [f5q, f1q]), "J9", "drill");
assert.ok(pairedJ9?.run);
assert.deepEqual(
  pairedJ9.run.ids.map((id) => generatedById(id)?.archetype),
  ["F5", "F5", "F1", "F1"],
);
assert.equal(new Set(pairedJ9.run.ids).size, 4);
assert.equal(new Set(pairedJ9.run.ids.map((id) => generatedById(id)?.stem)).size, 4);
assert.deepEqual(pairedJ9.run.focus, ["F5", "F1"]);
assert.deepEqual(
  pairedJ9.run.repairs?.map((repair) => repair.bankId),
  [f5q.id, f1q.id],
);
assert.deepEqual(pairedJ9.run.repairs?.map((repair) => repair.paperNumber), [1, 2]);
assert.deepEqual(pairedJ9.used, { J9: ["kept-bank-id"] });
assert.deepEqual(pairedJ9.cleared, ["J3"]);
assert.deepEqual(remedialOffer(wrongRun("J9", [f5q, f1q]).run ?? null), {
  mapped: 2,
  unmappedBankIds: [],
});

const grouped = startRun(wrongRun("J9", [groupQ]), "J9", "drill");
assert.ok(grouped?.run);
assert.equal(grouped.run.ids.length, 2);
assert.deepEqual(grouped.run.focus, ["F1", "F4"]);
assert.ok(grouped.run.ids.every((id) => ["F1", "F4"].includes(generatedById(id)?.archetype ?? "")));
assert.equal(new Set(grouped.run.ids.map((id) => generatedById(id)?.stem)).size, 2);
assert.deepEqual(grouped.used, { J9: ["kept-bank-id"] });
assert.deepEqual(grouped.cleared, ["J3"]);
assert.equal(stageClearedBy(grouped.run, 2, 2), false);

const j9OneWrong: Progress = {
  cleared: ["J3"],
  used: { J9: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "J9",
    mode: "stage",
    ids: [f3q.id, f4q.id],
    picks: {
      [f3q.id]: f3q.answer,
      [f4q.id]: wrongLetter(f4q.answer),
    },
    index: 1,
    marked: true,
  },
};
const onlyJ9Second = startRun(j9OneWrong, "J9", "drill");
assert.ok(onlyJ9Second?.run);
assert.equal(onlyJ9Second.run.ids.length, 2);
assert.equal(onlyJ9Second.run.repairs?.[0].bankId, f4q.id);
assert.equal(onlyJ9Second.run.repairs?.[0].paperNumber, 2);
assert.ok(onlyJ9Second.run.ids.every((id) => generatedById(id)?.archetype === "F4"));
assert.deepEqual(onlyJ9Second.used, j9OneWrong.used);
assert.deepEqual(onlyJ9Second.cleared, ["J3"]);
assert.deepEqual(remedialOffer(j9OneWrong.run), { mapped: 1, unmappedBankIds: [] });

const perfectJ9: Progress = {
  cleared: ["J3"],
  used: { J9: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "J9",
    mode: "stage",
    ids: [f1q.id, f3q.id],
    picks: {
      [f1q.id]: f1q.answer,
      [f3q.id]: f3q.answer,
    },
    index: 1,
    marked: true,
  },
};
assert.equal(startRun(perfectJ9, "J9", "drill"), null);
assert.deepEqual(remedialOffer(perfectJ9.run), { mapped: 0, unmappedBankIds: [] });
assert.equal(remedialOffer(wrongRun("J10", [bankQuestionById("J10-2013-q12")!]).run ?? null), null);

for (const bankQuestion of questionsFor("J1")) {
  const target = j1MissTarget(bankQuestion.stem);
  assert.ok(target, bankQuestion.id);
  assert.equal(target.via, "skill", bankQuestion.id);
  assert.deepEqual(target.tpls, EXPECTED[bankQuestion.id], bankQuestion.id);
}

assert.deepEqual(skillsForStem("J1", "If \\(9(c+6d)=5c+6\\), then c ="), ["CS3"]);
assert.deepEqual(skillsForStem("J1", "If \\(a(b+2)=a+b\\), then b ="), ["CS1"]);
assert.deepEqual(skillsForStem("J1", "If \\(\\frac{6+s}{t}=2\\), then s ="), ["CS2"]);
assert.deepEqual(j1MissTarget("If \\(5-3m=2n\\), then m ="), { tpls: ["CS2"], via: "skill" });
assert.deepEqual(j1MissTarget("If \\(3a+1=3(b-2)\\), then b ="), { tpls: ["CS3"], via: "skill" });
assert.deepEqual(j1MissTarget("If \\(\\frac{a+4b}{2a}=2+\\frac{b}{a}\\), then a ="), {
  tpls: ["CS5"],
  via: "skill",
});
assert.deepEqual(j1MissTarget("If \\(a(a+b)=2(b-a)\\), then b ="), { tpls: ["CS1"], via: "skill" });
assert.deepEqual(j1MissTarget("If \\(m(m-a)=a(1-m)\\), then a ="), { tpls: ["CS1"], via: "skill" });
assert.deepEqual(j1MissTarget("If (3c+1)(d-4)=2d(5c-1), then c ="), { tpls: ["CS1"], via: "skill" });

const j1Proportion = "If \\(\\frac{y}{2c}=\\frac{y+1}{3d}\\), then y =";
assert.deepEqual(skillsForStem("J1", j1Proportion), []);
assert.deepEqual(j1MissTarget(j1Proportion), { tpls: ["CS4", "CS8"], via: "bucket" });
const j1Brackets = "If \\(9(c+d)=5c\\), then c =";
assert.deepEqual(skillsForStem("J1", j1Brackets), []);
assert.deepEqual(j1MissTarget(j1Brackets), { tpls: ["CS1", "CS3"], via: "bucket" });
const j1Formula = "If \\(\\frac{a+1}{x}+\\frac{b}{y}=3\\), then x =";
assert.deepEqual(skillsForStem("J1", j1Formula), []);
assert.deepEqual(j1MissTarget(j1Formula), { tpls: ["CS5", "CS6", "CS7"], via: "bucket" });
const j1Solved = "If \\(k=\\frac{5}{2m}+n\\), then n =";
assert.deepEqual(skillsForStem("J1", j1Solved), []);
assert.deepEqual(j1MissTarget(j1Solved), { tpls: ["CS5", "CS6", "CS7"], via: "bucket" });
const j1Linear = "If \\(\\frac{s+6}{t}=2\\), then s =";
assert.deepEqual(skillsForStem("J1", j1Linear), []);
assert.deepEqual(j1MissTarget(j1Linear), { tpls: ["CS2"], via: "bucket" });
assert.equal(j1MissTarget("Which figure is correct?"), null);
assert.equal(j1MissTarget("\\(x^{2}-y^{2}\\)"), null);

const j1Pool = generatedQuestions("J1").map((question) => ({
  id: question.id,
  tpl: question.archetype ?? "",
  stem: question.stem,
  difficulty: question.difficulty,
}));
function easiestRank(tpls: readonly string[]): number {
  const ranks = j1Pool.filter((item) => tpls.includes(item.tpl)).map((item) => BAND_RANK[item.difficulty]);
  assert.ok(ranks.length >= 2);
  return Math.min(...ranks);
}
const cfPlan = planJ1Misses([{ bankId: "cf", paperNumber: 1, stem: j1Proportion }], j1Pool, () => 0);
assert.equal(cfPlan.repairs.length, 1);
assert.equal(cfPlan.repairs[0].ids.length, 2);
assert.deepEqual(cfPlan.focus, ["CS4", "CS8"]);
assert.deepEqual(cfPlan.unmatched, []);
assert.ok(
  cfPlan.repairs[0].ids.every((id) => {
    const item = generatedById(id);
    return (
      ["CS4", "CS8"].includes(item?.archetype ?? "") &&
      BAND_RANK[item?.difficulty ?? "unknown"] === easiestRank(["CS4", "CS8"])
    );
  }),
);
const bracketPlan = planJ1Misses([{ bankId: "br", paperNumber: 1, stem: j1Brackets }], j1Pool, () => 0);
assert.deepEqual(bracketPlan.focus, ["CS1", "CS3"]);
assert.ok(
  bracketPlan.repairs[0].ids.every((id) => {
    const item = generatedById(id);
    return (
      ["CS1", "CS3"].includes(item?.archetype ?? "") &&
      BAND_RANK[item?.difficulty ?? "unknown"] === easiestRank(["CS1", "CS3"])
    );
  }),
);
const formulaPlan = planJ1Misses([{ bankId: "fr", paperNumber: 2, stem: j1Formula }], j1Pool, () => 0);
assert.deepEqual(formulaPlan.focus, ["CS5", "CS6", "CS7"]);
assert.ok(
  formulaPlan.repairs[0].ids.every((id) => {
    const item = generatedById(id);
    return (
      ["CS5", "CS6", "CS7"].includes(item?.archetype ?? "") &&
      BAND_RANK[item?.difficulty ?? "unknown"] === easiestRank(["CS5", "CS6", "CS7"])
    );
  }),
);
const linearPlan = planJ1Misses([{ bankId: "ln", paperNumber: 1, stem: j1Linear }], j1Pool, () => 0);
assert.deepEqual(linearPlan.focus, ["CS2"]);
assert.ok(
  linearPlan.repairs[0].ids.every((id) => generatedById(id)?.archetype === "CS2"),
);
assert.deepEqual(
  planJ1Misses([{ bankId: "cf-band", paperNumber: 1, stem: j1Proportion }], [
    { id: "h", tpl: "CS8", stem: "h", difficulty: "hard" },
    { id: "m", tpl: "CS4", stem: "m", difficulty: "medium" },
    { id: "e", tpl: "CS4", stem: "e", difficulty: "easy" },
  ], () => 0).repairs[0].ids,
  ["e", "m"],
);
const j1Mixed = planJ1Misses(
  [
    { bankId: cs7.id, paperNumber: 1, stem: cs7.stem },
    { bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" },
  ],
  j1Pool,
);
assert.equal(j1Mixed.repairs.length, 1);
assert.deepEqual(
  j1Mixed.repairs[0].ids.map((id) => generatedById(id)?.archetype),
  ["CS7", "CS7"],
);
assert.deepEqual(j1Mixed.unmatched, [{ bankId: "mystery", paperNumber: 4 }]);
assert.deepEqual(
  planJ1Misses([{ bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" }], j1Pool),
  { repairs: [], unmatched: [{ bankId: "mystery", paperNumber: 4 }], focus: [] },
);
const cs2Bank = bankQuestionById("J1-sample-q2");
const cs3Bank = bankQuestionById("J1-practice-q2");
const cs5Bank = bankQuestionById("J1-2017-q3");
const cs1Bank = bankQuestionById("J1-2020-q2");
assert.ok(cs2Bank && cs3Bank && cs5Bank && cs1Bank);
const j1Short = planJ1Misses(
  [{ bankId: cs2Bank.id, paperNumber: 1, stem: cs2Bank.stem }],
  [{ id: "only", tpl: "CS2", stem: "only", difficulty: "easy" }],
);
assert.deepEqual(j1Short.repairs, []);
assert.deepEqual(j1Short.unmatched, [{ bankId: cs2Bank.id, paperNumber: 1 }]);
const j1NoTopUp = planJ1Misses(
  [{ bankId: "m", paperNumber: 1, stem: "If \\(5-3m=2n\\), then m =" }],
  [
    { id: "a", tpl: "CS2", stem: "a", difficulty: "easy" },
    { id: "b", tpl: "CS4", stem: "b", difficulty: "easy" },
    { id: "c", tpl: "CS8", stem: "c", difficulty: "hard" },
  ],
);
assert.deepEqual(j1NoTopUp.repairs, []);
assert.deepEqual(j1NoTopUp.unmatched, [{ bankId: "m", paperNumber: 1 }]);

for (let trial = 0; trial < 4; trial += 1) {
  for (const missed of [cs2Bank, cs3Bank, cs5Bank, cs1Bank, cs7, cs4, cs8]) {
    const drilled = startRun(wrongRun("J1", [missed]), "J1", "drill");
    assert.ok(drilled?.run);
    assert.equal(drilled.run.ids.length, DRILLS_PER_MISS);
    assert.deepEqual(drilled.run.focus, EXPECTED[missed.id]);
    assert.deepEqual(drilled.run.repairs, [{ bankId: missed.id, paperNumber: 1, ids: drilled.run.ids }]);
    assert.deepEqual(drilled.run.unmatchedMisses, []);
    assert.deepEqual(drilled.used, { J1: ["kept-bank-id"] });
    assert.deepEqual(drilled.cleared, ["J3"]);
    const kinds = drilled.run.ids.map((id) => generatedById(id));
    assert.ok(kinds.every((question) => question?.archetype === EXPECTED[missed.id][0]));
    assert.ok(kinds.every((question) => question?.id.startsWith("wqg-J1-")));
    assert.equal(new Set(kinds.map((question) => question?.stem)).size, 2);
    const ranks = kinds.map((question) => BAND_RANK[question?.difficulty ?? "unknown"]);
    assert.ok(ranks[0] <= ranks[1]);
    assert.equal(stageClearedBy(drilled.run, 2, 2), false);
    assert.equal(grantPerfectRun(drilled, drilled.run, 2, 2), drilled);
    assert.equal(startRun(drilled, "J1", "drill"), null);
  }
}

const pairedJ1 = startRun(wrongRun("J1", [cs4, cs8]), "J1", "drill");
assert.ok(pairedJ1?.run);
assert.deepEqual(
  pairedJ1.run.ids.map((id) => generatedById(id)?.archetype),
  ["CS4", "CS4", "CS8", "CS8"],
);
assert.equal(new Set(pairedJ1.run.ids).size, 4);
assert.equal(new Set(pairedJ1.run.ids.map((id) => generatedById(id)?.stem)).size, 4);
assert.deepEqual(pairedJ1.run.focus, ["CS4", "CS8"]);
assert.deepEqual(
  pairedJ1.run.repairs?.map((repair) => repair.bankId),
  [cs4.id, cs8.id],
);
assert.deepEqual(pairedJ1.used, { J1: ["kept-bank-id"] });
assert.deepEqual(pairedJ1.cleared, ["J3"]);
assert.deepEqual(remedialOffer(wrongRun("J1", [cs4, cs8]).run ?? null), {
  mapped: 2,
  unmappedBankIds: [],
});
assert.equal(stageClearedBy(pairedJ1.run, 4, 4), false);

for (const bankQuestion of questionsFor("J7")) {
  const target = j7MissTarget(bankQuestion.stem);
  const want = EXPECTED[bankQuestion.id];
  assert.ok(want, bankQuestion.id);
  if (want.length === 0) {
    assert.equal(target, null, bankQuestion.id);
  } else {
    assert.ok(target, bankQuestion.id);
    assert.equal(target.via, "skill", bankQuestion.id);
    assert.deepEqual(target.tpls, [want[0]], bankQuestion.id);
  }
}

const j7Product = "\\(a^{3}\\cdot a^{2}=\\)";
assert.deepEqual(skillsForStem("J7", j7Product), []);
assert.deepEqual(j7MissTarget(j7Product), { tpls: ["I1", "I2", "I3"], via: "bucket" });
const j7Quotient = "\\((2x^{4})^{3}/2x^{5}=\\)";
assert.deepEqual(skillsForStem("J7", j7Quotient), []);
assert.deepEqual(j7MissTarget(j7Quotient), { tpls: ["I1", "I2", "I3"], via: "bucket" });
const j7Negative = "\\((2n^{3})^-5=\\)";
assert.deepEqual(skillsForStem("J7", j7Negative), []);
assert.deepEqual(j7MissTarget(j7Negative), { tpls: ["I1", "I2", "I3"], via: "bucket" });
const j7Paren = "\\((2a)^{3}a=\\)";
assert.deepEqual(skillsForStem("J7", j7Paren), []);
assert.deepEqual(j7MissTarget(j7Paren), { tpls: ["I1", "I2", "I3"], via: "bucket" });
const j7SameBase = "\\(8^n/4^n=\\)";
assert.deepEqual(skillsForStem("J7", j7SameBase), []);
assert.deepEqual(j7MissTarget(j7SameBase), { tpls: ["I4"], via: "bucket" });
const j7Different = "\\(8^n\\cdot 5^n=\\)";
assert.deepEqual(skillsForStem("J7", j7Different), []);
assert.deepEqual(j7MissTarget(j7Different), { tpls: ["I5", "I6"], via: "bucket" });
const j7Reciprocal = "\\((1/a^{3})\\cdot a^{2}=\\)";
assert.deepEqual(skillsForStem("J7", j7Reciprocal), []);
assert.deepEqual(j7MissTarget(j7Reciprocal), { tpls: ["I5", "I6"], via: "bucket" });
assert.equal(j7MissTarget("Which figure is correct?"), null);
assert.equal(j7MissTarget("\\(x^{3}(2x+x)=\\)"), null);

const j7SameBaseProduct = "\\((4n)^{2}\\cdot 2^{n}=\\)";
assert.deepEqual(skillsForStem("J7", j7SameBaseProduct), ["I1", "I4"]);
assert.deepEqual(j7MissTarget(j7SameBaseProduct), { tpls: ["I4"], via: "skill" });
const j7PlainProduct = "\\((5a)^{2}\\cdot a=\\)";
assert.deepEqual(skillsForStem("J7", j7PlainProduct), ["I1"]);
assert.deepEqual(j7MissTarget(j7PlainProduct), { tpls: ["I1"], via: "skill" });
const j7OuterReciprocal = "\\(\\frac{1}{9^{-2}}\\cdot 3^{4}=\\)";
assert.deepEqual(skillsForStem("J7", j7OuterReciprocal), ["I3", "I4", "I6"]);
assert.deepEqual(j7MissTarget(j7OuterReciprocal), { tpls: ["I6"], via: "skill" });
const j7NegativeOnReciprocal = "\\(\\left(\\frac{1}{9^{555}}\\right)^{-1}=\\)";
assert.deepEqual(skillsForStem("J7", j7NegativeOnReciprocal), ["I3", "I4"]);
assert.deepEqual(j7MissTarget(j7NegativeOnReciprocal), { tpls: ["I3"], via: "skill" });
const j7SameBaseNegative = "\\(\\frac{8^{-2n}}{4^{n}}=\\)";
assert.deepEqual(skillsForStem("J7", j7SameBaseNegative), ["I3", "I4"]);
assert.deepEqual(j7MissTarget(j7SameBaseNegative), { tpls: ["I4"], via: "skill" });
const j7LetterQuotient = bankQuestionById("J7-2020-q1");
assert.ok(j7LetterQuotient);
assert.deepEqual(skillsForStem("J7", j7LetterQuotient.stem), ["I3", "I2"]);
assert.deepEqual(j7MissTarget(j7LetterQuotient.stem), { tpls: ["I3"], via: "skill" });

const j7Pool = generatedQuestions("J7").map((question) => ({
  id: question.id,
  tpl: question.archetype ?? "",
  stem: question.stem,
  difficulty: question.difficulty,
}));
const pqnPlan = planJ7Misses([{ bankId: "pqn", paperNumber: 1, stem: j7Product }], j7Pool, () => 0);
assert.equal(pqnPlan.repairs.length, 1);
assert.equal(pqnPlan.repairs[0].ids.length, 2);
assert.deepEqual(pqnPlan.focus, ["I1", "I2", "I3"]);
assert.deepEqual(pqnPlan.unmatched, []);
assert.ok(
  pqnPlan.repairs[0].ids.every((id) => ["I1", "I2", "I3"].includes(generatedById(id)?.archetype ?? "")),
);
const i4Plan = planJ7Misses([{ bankId: "i4", paperNumber: 2, stem: j7SameBase }], j7Pool, () => 0);
assert.deepEqual(i4Plan.focus, ["I4"]);
assert.ok(i4Plan.repairs[0].ids.every((id) => generatedById(id)?.archetype === "I4"));
const dbrPlan = planJ7Misses([{ bankId: "dbr", paperNumber: 3, stem: j7Different }], j7Pool, () => 0);
assert.deepEqual(dbrPlan.focus, ["I5", "I6"]);
assert.ok(
  dbrPlan.repairs[0].ids.every((id) => ["I5", "I6"].includes(generatedById(id)?.archetype ?? "")),
);
assert.deepEqual(
  planJ7Misses([{ bankId: "band", paperNumber: 1, stem: j7Product }], [
    { id: "h", tpl: "I3", stem: "h", difficulty: "hard" },
    { id: "m", tpl: "I2", stem: "m", difficulty: "medium" },
    { id: "e", tpl: "I1", stem: "e", difficulty: "easy" },
  ], () => 0).repairs[0].ids,
  ["e", "m"],
);
const j7Mixed = planJ7Misses(
  [
    { bankId: "known", paperNumber: 1, stem: j7SameBase },
    { bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" },
  ],
  j7Pool,
);
assert.equal(j7Mixed.repairs.length, 1);
assert.deepEqual(
  j7Mixed.repairs[0].ids.map((id) => generatedById(id)?.archetype),
  ["I4", "I4"],
);
assert.deepEqual(j7Mixed.unmatched, [{ bankId: "mystery", paperNumber: 4 }]);
assert.deepEqual(
  planJ7Misses([{ bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" }], j7Pool),
  { repairs: [], unmatched: [{ bankId: "mystery", paperNumber: 4 }], focus: [] },
);
const j7Short = planJ7Misses(
  [{ bankId: "short", paperNumber: 1, stem: j7SameBase }],
  [{ id: "only", tpl: "I4", stem: "only", difficulty: "unknown" }],
);
assert.deepEqual(j7Short.repairs, []);
assert.deepEqual(j7Short.unmatched, [{ bankId: "short", paperNumber: 1 }]);
const j7NoTopUp = planJ7Misses(
  [{ bankId: "m", paperNumber: 1, stem: j7SameBase }],
  [
    { id: "a", tpl: "I4", stem: "a", difficulty: "unknown" },
    { id: "b", tpl: "I5", stem: "b", difficulty: "unknown" },
    { id: "c", tpl: "I6", stem: "c", difficulty: "unknown" },
  ],
);
assert.deepEqual(j7NoTopUp.repairs, []);
assert.deepEqual(j7NoTopUp.unmatched, [{ bankId: "m", paperNumber: 1 }]);

const i1q = bankQuestionById("J7-sample-q1");
const i2q = bankQuestionById("J7-2012-q1");
const i3q = bankQuestionById("J7-2014-q1");
const i4q = bankQuestionById("J7-2018-q1");
const i5q = bankQuestionById("J7-2016-q1");
const i6q = bankQuestionById("J7-2017-q2");
const i3dual = bankQuestionById("J7-2020-q1");
assert.ok(i1q && i2q && i3q && i4q && i5q && i6q && i3dual);
assert.deepEqual(skillsForStem("J7", i3dual.stem), ["I3", "I2"]);
assert.deepEqual(j7MissTarget(i3dual.stem), { tpls: ["I3"], via: "skill" });

for (let trial = 0; trial < 4; trial += 1) {
  for (const missed of [i1q, i2q, i3q, i4q, i5q, i6q, i3dual]) {
    const drilled = startRun(wrongRun("J7", [missed]), "J7", "drill");
    assert.ok(drilled?.run);
    assert.equal(drilled.run.ids.length, DRILLS_PER_MISS);
    assert.deepEqual(drilled.run.focus, [EXPECTED[missed.id][0]]);
    assert.deepEqual(drilled.run.repairs, [{ bankId: missed.id, paperNumber: 1, ids: drilled.run.ids }]);
    assert.deepEqual(drilled.run.unmatchedMisses, []);
    assert.deepEqual(drilled.used, { J7: ["kept-bank-id"] });
    assert.deepEqual(drilled.cleared, ["J3"]);
    const kinds = drilled.run.ids.map((id) => generatedById(id));
    assert.ok(kinds.every((question) => question?.archetype === EXPECTED[missed.id][0]));
    assert.ok(kinds.every((question) => question?.id.startsWith("wqg-J7-")));
    assert.equal(new Set(kinds.map((question) => question?.stem)).size, 2);
    assert.equal(stageClearedBy(drilled.run, 2, 2), false);
    assert.equal(grantPerfectRun(drilled, drilled.run, 2, 2), drilled);
    assert.equal(startRun(drilled, "J7", "drill"), null);
  }
}

const pairedJ7 = startRun(wrongRun("J7", [i6q, i1q]), "J7", "drill");
assert.ok(pairedJ7?.run);
assert.deepEqual(
  pairedJ7.run.ids.map((id) => generatedById(id)?.archetype),
  ["I6", "I6", "I1", "I1"],
);
assert.equal(new Set(pairedJ7.run.ids).size, 4);
assert.equal(new Set(pairedJ7.run.ids.map((id) => generatedById(id)?.stem)).size, 4);
assert.deepEqual(pairedJ7.run.focus, ["I6", "I1"]);
assert.deepEqual(
  pairedJ7.run.repairs?.map((repair) => repair.bankId),
  [i6q.id, i1q.id],
);
assert.deepEqual(pairedJ7.used, { J7: ["kept-bank-id"] });
assert.deepEqual(pairedJ7.cleared, ["J3"]);
assert.deepEqual(remedialOffer(wrongRun("J7", [i6q, i1q]).run ?? null), {
  mapped: 2,
  unmappedBankIds: [],
});
assert.equal(stageClearedBy(pairedJ7.run, 4, 4), false);

const j7OneWrong: Progress = {
  cleared: ["J3"],
  used: { J7: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "J7",
    mode: "stage",
    ids: [i4q.id, i5q.id],
    picks: {
      [i4q.id]: i4q.answer,
      [i5q.id]: wrongLetter(i5q.answer),
    },
    index: 1,
    marked: true,
  },
};
const onlyJ7Second = startRun(j7OneWrong, "J7", "drill");
assert.ok(onlyJ7Second?.run);
assert.equal(onlyJ7Second.run.ids.length, 2);
assert.equal(onlyJ7Second.run.repairs?.[0].bankId, i5q.id);
assert.equal(onlyJ7Second.run.repairs?.[0].paperNumber, 2);
assert.ok(onlyJ7Second.run.ids.every((id) => generatedById(id)?.archetype === "I5"));
assert.deepEqual(onlyJ7Second.used, j7OneWrong.used);
assert.deepEqual(onlyJ7Second.cleared, ["J3"]);
assert.deepEqual(remedialOffer(j7OneWrong.run), { mapped: 1, unmappedBankIds: [] });

const perfectJ7: Progress = {
  cleared: ["J3"],
  used: { J7: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "J7",
    mode: "stage",
    ids: [i1q.id, i6q.id],
    picks: {
      [i1q.id]: i1q.answer,
      [i6q.id]: i6q.answer,
    },
    index: 1,
    marked: true,
  },
};
assert.equal(startRun(perfectJ7, "J7", "drill"), null);
assert.deepEqual(remedialOffer(perfectJ7.run), { mapped: 0, unmappedBankIds: [] });

const J2_PRIMARY: Record<string, string> = {
  "J2-practice-q14": "RS8",
  "J2-2012-q13": "RS3",
  "J2-2013-q4": "RS3",
  "J2-2015-q4": "RS8",
  "J2-2016-q4": "RS3",
  "J2-2017-q4": "RS3",
  "J2-2019-q6": "RS4",
  "J2-2021-q5": "RS5",
  "J2-2022-q6": "RS6",
  "J2-2023-q7": "RS5",
  "J2-2024-q4": "RS3",
  "J2-2025-q6": "RS5",
};
const j2Bank = questionsFor("J2");
assert.equal(j2Bank.length, 12);
assert.deepEqual(
  j2Bank.map((question) => question.id),
  Object.keys(J2_PRIMARY),
);
for (const bankQuestion of j2Bank) {
  const target = j2MissTarget(bankQuestion.stem);
  assert.ok(target, bankQuestion.id);
  assert.equal(target.via, "skill", bankQuestion.id);
  assert.deepEqual(target.tpls, [J2_PRIMARY[bankQuestion.id]], bankQuestion.id);
  assert.deepEqual(skillsForStem("J2", bankQuestion.stem), EXPECTED[bankQuestion.id], bankQuestion.id);
}
const j2Pool = generatedQuestions("J2").map((question) => ({
  id: question.id,
  tpl: question.archetype ?? "",
  stem: question.stem,
  difficulty: question.difficulty,
}));
const j2AllPlan = planJ2Misses(
  j2Bank.map((question, index) => ({
    bankId: question.id,
    paperNumber: index + 1,
    stem: question.stem,
  })),
  j2Pool,
  () => 0,
);
assert.deepEqual(j2AllPlan.unmatched, []);
assert.equal(j2AllPlan.repairs.length, 12);
assert.deepEqual(j2AllPlan.focus, ["RS8", "RS3", "RS4", "RS5", "RS6"]);
for (const repair of j2AllPlan.repairs) {
  assert.equal(repair.ids.length, 2, repair.bankId);
  assert.ok(
    repair.ids.every((id) => generatedById(id)?.archetype === J2_PRIMARY[repair.bankId]),
    repair.bankId,
  );
  assert.equal(new Set(repair.ids.map((id) => generatedById(id)?.stem)).size, 2, repair.bankId);
}

const j2MixedLabels = "0.0322515 = (correct to 3 significant figures) (correct to 4 decimal places)";
assert.deepEqual(skillsForStem("J2", j2MixedLabels), ["RS1", "RS2", "RS3"]);
assert.deepEqual(j2MissTarget(j2MixedLabels), { tpls: ["RS3"], via: "skill" });
const j2AwkwardMixed = "0.009049999 = (correct to 3 significant figures) (correct to 3 decimal places)";
assert.deepEqual(skillsForStem("J2", j2AwkwardMixed), ["RS1", "RS2", "RS3", "RS8"]);
assert.deepEqual(j2MissTarget(j2AwkwardMixed), { tpls: ["RS8"], via: "skill" });
const j2SfOnly = "38.2576836 = (correct to 4 significant figures)";
assert.deepEqual(skillsForStem("J2", j2SfOnly), ["RS1"]);
assert.deepEqual(j2MissTarget(j2SfOnly), { tpls: ["RS1"], via: "skill" });
const j2DpOnly = "19.155 = (correct to 2 decimal places)";
assert.deepEqual(skillsForStem("J2", j2DpOnly), ["RS2"]);
assert.deepEqual(j2MissTarget(j2DpOnly), { tpls: ["RS2"], via: "skill" });
const j2DownRange =
  "If x is rounded down to 3 significant figures and is correct to 3 significant figures, find the range of values of x.";
assert.deepEqual(skillsForStem("J2", j2DownRange), ["RS6", "RS5"]);
assert.deepEqual(j2MissTarget(j2DownRange), { tpls: ["RS6"], via: "skill" });
const j2UpRange = "If x is rounded up to 3 decimal places, find the range of values of x.";
assert.deepEqual(skillsForStem("J2", j2UpRange), ["RS7", "RS5"]);
assert.deepEqual(j2MissTarget(j2UpRange), { tpls: ["RS7"], via: "skill" });
const j2IneqRange =
  "If 0.06557 < x < 0.06564, which of the following is true? Find the range of values correct to 2 decimal places.";
assert.deepEqual(skillsForStem("J2", j2IneqRange), ["RS4", "RS5"]);
assert.deepEqual(j2MissTarget(j2IneqRange), { tpls: ["RS4"], via: "skill" });

const j2RoundOff = "Round off 3.14159.";
assert.deepEqual(skillsForStem("J2", j2RoundOff), []);
assert.deepEqual(j2MissTarget(j2RoundOff), { tpls: ["RS1", "RS2", "RS3", "RS8"], via: "bucket" });
const j2RangeOnly = "Find the range of values of x.";
assert.deepEqual(skillsForStem("J2", j2RangeOnly), []);
assert.deepEqual(j2MissTarget(j2RangeOnly), { tpls: ["RS4", "RS5", "RS6", "RS7"], via: "bucket" });
const j2BothBuckets = "Round 3.14 and find the range of values.";
assert.deepEqual(skillsForStem("J2", j2BothBuckets), []);
assert.deepEqual(j2MissTarget(j2BothBuckets), { tpls: ["RS1", "RS2", "RS3", "RS8"], via: "bucket" });
assert.equal(j2MissTarget("Which figure is correct?"), null);

const roPlan = planJ2Misses(
  [{ bankId: "ro", paperNumber: 1, stem: j2RoundOff }],
  [
    { id: "h", tpl: "RS8", stem: "h", difficulty: "hard" },
    { id: "m", tpl: "RS3", stem: "m", difficulty: "medium" },
    { id: "e", tpl: "RS1", stem: "e", difficulty: "easy" },
  ],
  () => 0,
);
assert.deepEqual(roPlan.focus, ["RS1", "RS2", "RS3", "RS8"]);
assert.deepEqual(roPlan.repairs[0].ids, ["e", "m"]);
const irPlan = planJ2Misses(
  [{ bankId: "ir", paperNumber: 1, stem: j2RangeOnly }],
  [
    { id: "h6", tpl: "RS6", stem: "h6", difficulty: "hard" },
    { id: "h7", tpl: "RS7", stem: "h7", difficulty: "hard" },
    { id: "m4", tpl: "RS4", stem: "m4", difficulty: "medium" },
    { id: "m5", tpl: "RS5", stem: "m5", difficulty: "medium" },
  ],
  () => 0,
);
assert.deepEqual(irPlan.focus, ["RS4", "RS5", "RS6", "RS7"]);
assert.deepEqual(new Set(irPlan.repairs[0].ids), new Set(["m4", "m5"]));
const j2MixedPlan = planJ2Misses(
  [
    { bankId: "J2-2016-q4", paperNumber: 1, stem: bankQuestionById("J2-2016-q4")?.stem ?? "" },
    { bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" },
  ],
  j2Pool,
);
assert.equal(j2MixedPlan.repairs.length, 1);
assert.deepEqual(
  j2MixedPlan.repairs[0].ids.map((id) => generatedById(id)?.archetype),
  ["RS3", "RS3"],
);
assert.deepEqual(j2MixedPlan.unmatched, [{ bankId: "mystery", paperNumber: 4 }]);
assert.deepEqual(
  planJ2Misses([{ bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" }], j2Pool),
  { repairs: [], unmatched: [{ bankId: "mystery", paperNumber: 4 }], focus: [] },
);
const j2NoTopUp = planJ2Misses(
  [{ bankId: "m", paperNumber: 1, stem: bankQuestionById("J2-2012-q13")?.stem ?? "" }],
  [
    { id: "a", tpl: "RS3", stem: "a", difficulty: "medium" },
    { id: "b", tpl: "RS1", stem: "b", difficulty: "easy" },
    { id: "c", tpl: "RS8", stem: "c", difficulty: "hard" },
  ],
);
assert.deepEqual(j2NoTopUp.repairs, []);
assert.deepEqual(j2NoTopUp.unmatched, [{ bankId: "m", paperNumber: 1 }]);

const allWrongJ2 = startRun(wrongRun("J2", j2Bank), "J2", "drill");
assert.ok(allWrongJ2?.run);
assert.equal(allWrongJ2.run.ids.length, 24);
assert.equal(allWrongJ2.run.repairs?.length, 12);
assert.deepEqual(allWrongJ2.run.unmatchedMisses, []);
assert.deepEqual(allWrongJ2.run.focus, ["RS8", "RS3", "RS4", "RS5", "RS6"]);
assert.equal(new Set(allWrongJ2.run.ids).size, 24);
assert.equal(new Set(allWrongJ2.run.ids.map((id) => generatedById(id)?.stem)).size, 24);
for (const repair of allWrongJ2.run.repairs ?? []) {
  assert.ok(repair.ids.every((id) => generatedById(id)?.archetype === J2_PRIMARY[repair.bankId]));
}
assert.deepEqual(allWrongJ2.used, { J2: ["kept-bank-id"] });
assert.deepEqual(allWrongJ2.cleared, ["J3"]);
assert.equal(stageClearedBy(allWrongJ2.run, 24, 24), false);
assert.equal(grantPerfectRun(allWrongJ2, allWrongJ2.run, 24, 24), allWrongJ2);
assert.equal(startRun(allWrongJ2, "J2", "drill"), null);
assert.deepEqual(remedialOffer(wrongRun("J2", j2Bank).run ?? null), {
  mapped: 12,
  unmappedBankIds: [],
});

const rs3q = bankQuestionById("J2-2016-q4");
const rs8q = bankQuestionById("J2-practice-q14");
const rs6q = bankQuestionById("J2-2022-q6");
assert.ok(rs3q && rs8q && rs6q);
const pairedJ2 = startRun(wrongRun("J2", [rs8q, rs3q]), "J2", "drill");
assert.ok(pairedJ2?.run);
assert.deepEqual(
  pairedJ2.run.ids.map((id) => generatedById(id)?.archetype),
  ["RS8", "RS8", "RS3", "RS3"],
);
assert.equal(new Set(pairedJ2.run.ids).size, 4);
assert.deepEqual(pairedJ2.used, { J2: ["kept-bank-id"] });
assert.deepEqual(pairedJ2.cleared, ["J3"]);
assert.equal(stageClearedBy(pairedJ2.run, 4, 4), false);
const perfectJ2: Progress = {
  cleared: ["J3"],
  used: { J2: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "J2",
    mode: "stage",
    ids: [rs3q.id, rs6q.id],
    picks: {
      [rs3q.id]: rs3q.answer,
      [rs6q.id]: rs6q.answer,
    },
    index: 1,
    marked: true,
  },
};
assert.equal(startRun(perfectJ2, "J2", "drill"), null);
assert.deepEqual(remedialOffer(perfectJ2.run), { mapped: 0, unmappedBankIds: [] });
const j2OneWrong: Progress = {
  cleared: ["J3"],
  used: { J2: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "J2",
    mode: "stage",
    ids: [rs8q.id, rs6q.id],
    picks: {
      [rs8q.id]: rs8q.answer,
      [rs6q.id]: wrongLetter(rs6q.answer),
    },
    index: 1,
    marked: true,
  },
};
const onlyJ2Second = startRun(j2OneWrong, "J2", "drill");
assert.ok(onlyJ2Second?.run);
assert.equal(onlyJ2Second.run.ids.length, 2);
assert.equal(onlyJ2Second.run.repairs?.[0].bankId, rs6q.id);
assert.equal(onlyJ2Second.run.repairs?.[0].paperNumber, 2);
assert.ok(onlyJ2Second.run.ids.every((id) => generatedById(id)?.archetype === "RS6"));
assert.deepEqual(onlyJ2Second.used, j2OneWrong.used);
assert.deepEqual(onlyJ2Second.cleared, ["J3"]);
assert.equal(stageClearedBy(onlyJ2Second.run, 2, 2), false);

const C11_PRIMARY: Record<string, string> = {
  "C11-sample-q14": "V1",
  "C11-practice-q13": "V2",
  "C11-2012-q10": "V3",
  "C11-2013-q13": "V4",
  "C11-2014-q13": "V2",
  "C11-2015-q12": "V1",
  "C11-2016-q12": "V4",
  "C11-2017-q12": "V3",
  "C11-2018-q11": "V2",
  "C11-2019-q13": "V4",
  "C11-2020-q11": "V1",
  "C11-2021-q12": "V2",
  "C11-2022-q13": "V5",
  "C11-2023-q13": "V1",
  "C11-2024-q13": "V4",
  "C11-2025-q12": "V1",
};
const c11Bank = questionsFor("C11");
assert.equal(c11Bank.length, 16);
assert.deepEqual(
  c11Bank.map((question) => question.id),
  Object.keys(C11_PRIMARY),
);
for (const bankQuestion of c11Bank) {
  const target = c11MissTarget(bankQuestion.stem);
  assert.ok(target, bankQuestion.id);
  assert.equal(target.via, "skill", bankQuestion.id);
  assert.deepEqual(target.tpls, [C11_PRIMARY[bankQuestion.id]], bankQuestion.id);
  assert.deepEqual(skillsForStem("C11", bankQuestion.stem), EXPECTED[bankQuestion.id], bankQuestion.id);
}
const c11Pool = generatedQuestions("C11").map((question) => ({
  id: question.id,
  tpl: question.archetype ?? "",
  stem: question.stem,
  difficulty: question.difficulty,
}));
const c11AllPlan = planC11Misses(
  c11Bank.map((question, index) => ({
    bankId: question.id,
    paperNumber: index + 1,
    stem: question.stem,
  })),
  c11Pool,
  () => 0,
);
assert.deepEqual(c11AllPlan.unmatched, []);
assert.equal(c11AllPlan.repairs.length, 16);
assert.deepEqual(c11AllPlan.focus, ["V1", "V2", "V3", "V4", "V5"]);
for (const repair of c11AllPlan.repairs) {
  assert.equal(repair.ids.length, 2, repair.bankId);
  assert.ok(
    repair.ids.every((id) => generatedById(id)?.archetype === C11_PRIMARY[repair.bankId]),
    repair.bankId,
  );
  assert.equal(new Set(repair.ids.map((id) => generatedById(id)?.stem)).size, 2, repair.bankId);
}

const c11ConstantAndPercent =
  "If z varies as x, which of the following must be constant when x is increased by 20%?";
assert.deepEqual(skillsForStem("C11", c11ConstantAndPercent), ["V2", "V4"]);
assert.deepEqual(c11MissTarget(c11ConstantAndPercent), { tpls: ["V2"], via: "skill" });
const c11PercentAndRoman =
  "If z varies as x, which of the following are true? I. z is increased by 20%. II. z is decreased by 10%. III. z is unchanged.";
assert.deepEqual(skillsForStem("C11", c11PercentAndRoman), ["V4", "V5"]);
assert.deepEqual(c11MissTarget(c11PercentAndRoman), { tpls: ["V4"], via: "skill" });
const c11PartialAndRoman =
  "If y partly varies as x, which of the following are true? I. y varies as x. II. y has a constant part. III. y = k + x.";
assert.deepEqual(skillsForStem("C11", c11PartialAndRoman), ["V3", "V5"]);
assert.deepEqual(c11MissTarget(c11PartialAndRoman), { tpls: ["V3"], via: "skill" });
const c11PartialEvaluate =
  "It is given that y varies as x and y = k + 2x. When x = 1, y = 3. When x = 2, y =";
assert.deepEqual(skillsForStem("C11", c11PartialEvaluate), ["V3", "V1"]);
assert.deepEqual(c11MissTarget(c11PartialEvaluate), { tpls: ["V3"], via: "skill" });
const c11RomanAndEvaluate =
  "If z varies as x, which of the following are true? I. z = 1 when x = 1. II. z = 2 when x = 2. III. z varies directly as x.";
assert.deepEqual(skillsForStem("C11", c11RomanAndEvaluate), ["V5", "V1"]);
assert.deepEqual(c11MissTarget(c11RomanAndEvaluate), { tpls: ["V5"], via: "skill" });
const c11Plain =
  "It is given that z varies directly as x. When x = 2, z = 6. When x = 5, z =";
assert.deepEqual(skillsForStem("C11", c11Plain), ["V1"]);
assert.deepEqual(c11MissTarget(c11Plain), { tpls: ["V1"], via: "skill" });

const c11ConstantOnly = "Which of the following is constant?";
assert.deepEqual(skillsForStem("C11", c11ConstantOnly), []);
assert.deepEqual(c11MissTarget(c11ConstantOnly), { tpls: ["V2"], via: "bucket" });
const c11PercentOnly = "x changes by 20%.";
assert.deepEqual(skillsForStem("C11", c11PercentOnly), []);
assert.deepEqual(c11MissTarget(c11PercentOnly), { tpls: ["V4"], via: "bucket" });
const c11ConstantAndPercentBucket = "A constant changes by 20%.";
assert.deepEqual(skillsForStem("C11", c11ConstantAndPercentBucket), []);
assert.deepEqual(c11MissTarget(c11ConstantAndPercentBucket), { tpls: ["V2"], via: "bucket" });
const c11LawOnly = "y varies directly as x.";
assert.deepEqual(skillsForStem("C11", c11LawOnly), []);
assert.deepEqual(c11MissTarget(c11LawOnly), { tpls: ["V1", "V3", "V5"], via: "bucket" });
const c11SoftRoman = "y varies as x. I. one law. II. another law. III. a third law.";
assert.deepEqual(skillsForStem("C11", c11SoftRoman), []);
assert.deepEqual(c11MissTarget(c11SoftRoman), { tpls: ["V5"], via: "bucket" });
const c11SoftWhen = "When x grows, y varies as x.";
assert.deepEqual(skillsForStem("C11", c11SoftWhen), []);
assert.deepEqual(c11MissTarget(c11SoftWhen), { tpls: ["V1"], via: "bucket" });
const c11SoftPartial = "y varies by a partial law.";
assert.deepEqual(skillsForStem("C11", c11SoftPartial), []);
assert.deepEqual(c11MissTarget(c11SoftPartial), { tpls: ["V3"], via: "bucket" });
const c11SoftPartialAndRoman =
  "y varies by a partial law. I. one part. II. another part. III. a third part.";
assert.deepEqual(skillsForStem("C11", c11SoftPartialAndRoman), []);
assert.deepEqual(c11MissTarget(c11SoftPartialAndRoman), { tpls: ["V3"], via: "bucket" });
assert.equal(c11MissTarget("Which figure is correct?"), null);

const ctPlan = planC11Misses(
  [{ bankId: "ct", paperNumber: 1, stem: c11ConstantOnly }],
  [
    { id: "h", tpl: "V2", stem: "h", difficulty: "hard" },
    { id: "m", tpl: "V2", stem: "m", difficulty: "medium" },
    { id: "e", tpl: "V2", stem: "e", difficulty: "easy" },
  ],
  () => 0,
);
assert.deepEqual(ctPlan.focus, ["V2"]);
assert.deepEqual(ctPlan.repairs[0].ids, ["e", "m"]);
const vlPlan = planC11Misses(
  [{ bankId: "vl", paperNumber: 1, stem: c11LawOnly }],
  [
    { id: "h5", tpl: "V5", stem: "h5", difficulty: "hard" },
    { id: "h3", tpl: "V3", stem: "h3", difficulty: "hard" },
    { id: "m1", tpl: "V1", stem: "m1", difficulty: "medium" },
    { id: "e1", tpl: "V1", stem: "e1", difficulty: "easy" },
  ],
  () => 0,
);
assert.deepEqual(vlPlan.focus, ["V1", "V3", "V5"]);
assert.deepEqual(vlPlan.repairs[0].ids, ["e1", "m1"]);
const c11MixedPlan = planC11Misses(
  [
    { bankId: "C11-2012-q10", paperNumber: 1, stem: bankQuestionById("C11-2012-q10")?.stem ?? "" },
    { bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" },
  ],
  c11Pool,
);
assert.equal(c11MixedPlan.repairs.length, 1);
assert.deepEqual(
  c11MixedPlan.repairs[0].ids.map((id) => generatedById(id)?.archetype),
  ["V3", "V3"],
);
assert.deepEqual(c11MixedPlan.unmatched, [{ bankId: "mystery", paperNumber: 4 }]);
assert.deepEqual(
  planC11Misses([{ bankId: "mystery", paperNumber: 4, stem: "Which figure is correct?" }], c11Pool),
  { repairs: [], unmatched: [{ bankId: "mystery", paperNumber: 4 }], focus: [] },
);
const c11NoTopUp = planC11Misses(
  [{ bankId: "m", paperNumber: 1, stem: bankQuestionById("C11-2014-q13")?.stem ?? "" }],
  [
    { id: "a", tpl: "V2", stem: "a", difficulty: "medium" },
    { id: "b", tpl: "V1", stem: "b", difficulty: "easy" },
    { id: "c", tpl: "V4", stem: "c", difficulty: "hard" },
  ],
);
assert.deepEqual(c11NoTopUp.repairs, []);
assert.deepEqual(c11NoTopUp.unmatched, [{ bankId: "m", paperNumber: 1 }]);

const allWrongC11 = startRun(wrongRun("C11", c11Bank), "C11", "drill");
assert.ok(allWrongC11?.run);
assert.equal(allWrongC11.run.ids.length, 32);
assert.equal(allWrongC11.run.repairs?.length, 16);
assert.deepEqual(allWrongC11.run.unmatchedMisses, []);
assert.deepEqual(allWrongC11.run.focus, ["V1", "V2", "V3", "V4", "V5"]);
assert.equal(new Set(allWrongC11.run.ids).size, 32);
assert.equal(new Set(allWrongC11.run.ids.map((id) => generatedById(id)?.stem)).size, 32);
for (const repair of allWrongC11.run.repairs ?? []) {
  assert.ok(repair.ids.every((id) => generatedById(id)?.archetype === C11_PRIMARY[repair.bankId]));
}
assert.deepEqual(allWrongC11.used, { C11: ["kept-bank-id"] });
assert.deepEqual(allWrongC11.cleared, ["J3"]);
assert.equal(stageClearedBy(allWrongC11.run, 32, 32), false);
assert.equal(grantPerfectRun(allWrongC11, allWrongC11.run, 32, 32), allWrongC11);
assert.equal(startRun(allWrongC11, "C11", "drill"), null);
assert.deepEqual(remedialOffer(wrongRun("C11", c11Bank).run ?? null), {
  mapped: 16,
  unmappedBankIds: [],
});

const v3q = bankQuestionById("C11-2012-q10");
const v2q = bankQuestionById("C11-practice-q13");
const v5q = bankQuestionById("C11-2022-q13");
const v1q = bankQuestionById("C11-sample-q14");
assert.ok(v3q && v2q && v5q && v1q);
const pairedC11 = startRun(wrongRun("C11", [v2q, v3q]), "C11", "drill");
assert.ok(pairedC11?.run);
assert.deepEqual(
  pairedC11.run.ids.map((id) => generatedById(id)?.archetype),
  ["V2", "V2", "V3", "V3"],
);
assert.equal(new Set(pairedC11.run.ids).size, 4);
assert.deepEqual(pairedC11.used, { C11: ["kept-bank-id"] });
assert.deepEqual(pairedC11.cleared, ["J3"]);
assert.equal(stageClearedBy(pairedC11.run, 4, 4), false);
const perfectC11: Progress = {
  cleared: ["J3"],
  used: { C11: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "C11",
    mode: "stage",
    ids: [v1q.id, v5q.id],
    picks: {
      [v1q.id]: v1q.answer,
      [v5q.id]: v5q.answer,
    },
    index: 1,
    marked: true,
  },
};
assert.equal(startRun(perfectC11, "C11", "drill"), null);
assert.deepEqual(remedialOffer(perfectC11.run), { mapped: 0, unmappedBankIds: [] });
const c11OneWrong: Progress = {
  cleared: ["J3"],
  used: { C11: ["kept-bank-id"] },
  last: {},
  run: {
    stage: "C11",
    mode: "stage",
    ids: [v2q.id, v5q.id],
    picks: {
      [v2q.id]: v2q.answer,
      [v5q.id]: wrongLetter(v5q.answer),
    },
    index: 1,
    marked: true,
  },
};
const onlyC11Second = startRun(c11OneWrong, "C11", "drill");
assert.ok(onlyC11Second?.run);
assert.equal(onlyC11Second.run.ids.length, 2);
assert.equal(onlyC11Second.run.repairs?.[0].bankId, v5q.id);
assert.equal(onlyC11Second.run.repairs?.[0].paperNumber, 2);
assert.ok(onlyC11Second.run.ids.every((id) => generatedById(id)?.archetype === "V5"));
assert.deepEqual(onlyC11Second.used, c11OneWrong.used);
assert.deepEqual(onlyC11Second.cleared, ["J3"]);
assert.equal(stageClearedBy(onlyC11Second.run, 2, 2), false);

const sqMiss = bankQuestionById("J18-2016-q14");
assert.ok(sqMiss);
for (const missed of [sqMiss]) {
  const drilled = startRun(wrongRun(missed.stage, [missed]), missed.stage, "drill");
  assert.ok(drilled?.run);
  assert.equal(drilled.run.source, "generated");
  assert.equal(drilled.run.mode, "drill");
  assert.deepEqual(drilled.run.focus, []);
  assert.equal(drilled.run.ids.length, 5);
  assert.ok(drilled.run.ids.every((id) => id.startsWith(`wqg-${missed.stage}-`)));
  assert.ok(drilled.run.ids.every((id) => generatedById(id)?.difficulty === "easy"));
  assert.ok(drilled.run.ids.every((id) => generatedById(id)?.paper === "2"));
  assert.deepEqual(drilled.used, { [missed.stage]: ["kept-bank-id"] });
  assert.deepEqual(drilled.cleared, ["J3"]);
  assert.equal(stageClearedBy(drilled.run, 5, 5), false);
  for (let i = 1; i < drilled.run.ids.length; i += 1) {
    assert.notEqual(
      generatedById(drilled.run.ids[i])?.archetype,
      generatedById(drilled.run.ids[i - 1])?.archetype,
    );
  }
  const againStage = startRun(drilled, missed.stage, "drill");
  assert.ok(againStage?.run);
  assert.deepEqual(againStage.run.focus, []);
  assert.deepEqual(againStage.used, drilled.used);
  assert.deepEqual(againStage.cleared, ["J3"]);
  const seen = new Set(drilled.run.ids);
  assert.ok(againStage.run.ids.every((id) => !seen.has(id)));
  assert.ok(againStage.run.ids.every((id) => generatedById(id)?.difficulty === "easy"));
}

for (const stageId of ["J18"] as const) {
  const easyIds = generatedQuestions(stageId)
    .filter((question) => question.difficulty === "easy")
    .map((question) => question.id);
  const mediumIds = generatedQuestions(stageId)
    .filter((question) => question.difficulty === "medium")
    .map((question) => question.id);
  const afterEasyBand: Progress = {
    cleared: ["J3"],
    used: { [stageId]: ["kept-bank-id"] },
    last: {},
    run: {
      stage: stageId,
      mode: "drill",
      source: "generated",
      ids: easyIds.slice(0, 5),
      picks: {},
      index: 0,
      marked: true,
      focus: [],
      seenIds: easyIds,
    },
  };
  const mediumNext = startRun(afterEasyBand, stageId, "drill");
  assert.ok(mediumNext?.run);
  assert.deepEqual(mediumNext.run.focus, []);
  assert.deepEqual(mediumNext.used, afterEasyBand.used);
  assert.ok(mediumNext.run.ids.every((id) => generatedById(id)?.difficulty === "medium"));
  const afterMediumBand: Progress = {
    ...afterEasyBand,
    run: {
      ...afterEasyBand.run!,
      ids: mediumIds.slice(0, 5),
      seenIds: [...easyIds, ...mediumIds],
    },
  };
  const hardNext = startRun(afterMediumBand, stageId, "drill");
  assert.ok(hardNext?.run);
  assert.ok(hardNext.run.ids.every((id) => id.startsWith(`wqg-${stageId}-`)));
  assert.ok(hardNext.run.ids.every((id) => generatedById(id)?.difficulty === "hard"));
  assert.deepEqual(hardNext.used, { [stageId]: ["kept-bank-id"] });
  assert.deepEqual(hardNext.cleared, ["J3"]);
}

const easyJ1 = generatedQuestions("J1")
  .filter((question) => question.difficulty === "easy")
  .map((question) => question.id);
const afterEasy: Progress = {
  cleared: ["J3"],
  used: { J1: ["J1-sample-q2"] },
  last: {},
  run: {
    stage: "J1",
    mode: "drill",
    source: "generated",
    ids: easyJ1.slice(0, 5),
    picks: {},
    index: 0,
    marked: true,
    focus: [],
    seenIds: easyJ1,
  },
};
assert.equal(startRun(afterEasy, "J1", "drill"), null);
assert.deepEqual(afterEasy.used, { J1: ["J1-sample-q2"] });
assert.deepEqual(afterEasy.cleared, ["J3"]);

const pool = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, tpl: "I2", stem: `a${i}` })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, tpl: "I1", stem: `b${i}` })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, tpl: "I5", stem: `c${i}` })),
];
for (let trial = 0; trial < 30; trial += 1) {
  const picked = pickFromPool(pool, ["I2"], new Set(), 5);
  assert.equal(picked.length, 5);
  assert.equal(picked.filter((item) => item.tpl === "I2").length, 3);
  assert.equal(new Set(picked.map((item) => item.id)).size, 5);
  for (let i = 1; i < picked.length; i += 1) assert.notEqual(picked[i].tpl, picked[i - 1].tpl);
}

const avoided = new Set(pool.filter((item) => item.tpl === "I2").slice(0, 8).flatMap((item) => [item.id, item.stem]));
const partial = pickFromPool(pool, ["I2"], avoided, 5);
assert.equal(partial.filter((item) => item.tpl === "I2").length, 2);
assert.ok(partial.every((item) => !avoided.has(item.id)));

const only = Array.from({ length: 4 }, (_, i) => ({ id: `o${i}`, tpl: "F1", stem: `o${i}` }));
const reused = pickFromPool(only, ["F1"], new Set(only.flatMap((item) => [item.id, item.stem])), 4);
assert.equal(reused.length, 4);

const j7Practice = bankQuestionById("J7-practice-q1");
assert.ok(j7Practice);
assert.deepEqual(skillsForStem("J7", j7Practice.stem), []);
assert.equal(j7MissTarget(j7Practice.stem), null);
const j7UnmatchedRun = wrongRun("J7", [j7Practice]);
assert.equal(startRun(j7UnmatchedRun, "J7", "drill"), null);
assert.deepEqual(remedialOffer(j7UnmatchedRun.run), {
  mapped: 0,
  unmappedBankIds: [j7Practice.id],
});
assert.deepEqual(j7UnmatchedRun.used, { J7: ["kept-bank-id"] });
assert.deepEqual(j7UnmatchedRun.cleared, ["J3"]);

const stageIds = stages.map((stage) => stage.id);
for (let number = 1; number <= 23; number += 1) {
  assert.ok(stageIds.includes(`C${number}`), `missing C${number}`);
}
assert.equal(stageIds.some((id) => /^C\d+\./.test(id)), false);
assert.equal(stageIds.includes("J6"), false);
assert.equal(stageIds.filter((id) => id.startsWith("J")).length, 18);
assert.equal(
  stages.filter((stage) => stage.id.startsWith("J")).reduce((sum, stage) => sum + stage.questionCount, 0),
  293,
);
assert.ok(bankQuestionById("J1-sample-q2"));
assert.equal(bankQuestionById("J1-sample-q2")?.answer, "C");

const q36 = bankQuestionById("C18-2025-q36");
assert.ok(q36);
assert.equal(q36.answer, "B");
assert.equal(q36.facilityPct, 46);
assert.equal(q36.stage, "C18");

for (const [stageId, snippet] of [
  ["C4", "Factor, remainder theorem"],
  ["C4", "HCF, LCM, Rational Functions"],
  ["C10", "10.1-10.3"],
  ["C10", "10.4-10.6"],
  ["C14", "14.1-14.5"],
  ["C14", "14.6-14.7"],
  ["C19", "19.1"],
  ["C19", "19.2"],
  ["C19", "19.3"],
  ["C20", "Arithmetic Sequence"],
  ["C20", "Geometric Sequence"],
  ["C21", "Sum of Arithmetic Sequences"],
  ["C21", "Sum of Geometric Sequences"],
] as const) {
  assert.ok(
    questionsFor(stageId).some((question) => question.topic.includes(snippet)),
    `${stageId} ${snippet}`,
  );
}

const bandOrder = { easy: 0, medium: 1, hard: 2, unknown: 3 } as const;
for (let index = 1; index < rankedStages.length; index += 1) {
  const previous = rankedStages[index - 1];
  const next = rankedStages[index];
  assert.ok(bandOrder[previous.band] <= bandOrder[next.band]);
  if (
    previous.band === next.band &&
    previous.averageFacility != null &&
    next.averageFacility != null
  ) {
    assert.ok(previous.averageFacility >= next.averageFacility);
  }
}
assert.deepEqual(
  rankedStages.filter((stage) => stage.averageFacility == null).map((stage) => stage.id),
  ["C23"],
);
assert.equal(rankedStages.at(-1)?.id, "C23");
assert.equal(isStudentStage("C23"), false);
assert.equal(isStudentStage("C22"), true);
assert.equal(isStudentStage("J7"), true);
assert.equal(mapStages.some((stage) => stage.id === "C23"), false);
assert.equal(mapStages.length, rankedStages.length - 1);
assert.equal(stages.some((stage) => stage.id === "C23"), true);
assert.ok(questionsFor("C23").length > 0);
assert.equal(startRun(empty(), "C23", "stage"), null);

const compulsoryRun = startRun(empty(), "C1", "stage");
assert.ok(compulsoryRun?.run);
assert.equal(compulsoryRun.run.mode, "stage");
assert.equal(compulsoryRun.run.source, undefined);
assert.ok(compulsoryRun.run.ids.length > 0 && compulsoryRun.run.ids.length <= 5);
assert.ok(compulsoryRun.run.ids.every((id) => id.startsWith("C1-")));
const warmed = compulsoryRun.run.ids.map((id) => bankQuestionById(id)?.difficulty);
for (let index = 1; index < warmed.length; index += 1) {
  const before = warmed[index - 1];
  const after = warmed[index];
  assert.ok(before && after);
  assert.ok(BAND_RANK[before] <= BAND_RANK[after]);
}

console.log("drill checks passed");
