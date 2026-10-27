import assert from "node:assert/strict";
import {
  BAND_RANK,
  questionById as bankQuestionById,
  questionsFor,
  rankedStages,
  stages,
} from "../src/bank.ts";
import { pickFromPool, skillsForStem } from "../src/drillPick.ts";
import { generatedById, generatedQuestions, hasGeneratedPool } from "../src/drillPools.ts";
import { questionById } from "../src/questions.ts";
import { stageClearedBy, startRun, type Progress, type Run } from "../src/progress.ts";

const EXPECTED: Record<string, string[]> = {
  "J1-sample-q2": [],
  "J1-practice-q2": [],
  "J1-2013-q2": ["CS4"],
  "J1-2016-q2": ["CS7"],
  "J1-2017-q3": [],
  "J1-2018-q2": ["CS8"],
  "J1-2019-q5": ["CS5"],
  "J1-2020-q2": [],
  "J1-2021-q2": [],
  "J1-2022-q5": ["CS7"],
  "J1-2023-q1": ["CS8"],
  "J1-2024-q3": ["CS5"],
  "J1-2025-q4": [],
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
  "J9-2013-q3": ["F4"],
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
const SKILL_STAGES = new Set(["J1", "J7", "J8", "J9", "J10", "J11"]);
const UNIQUE_STEMS: Record<string, number> = { C2: 285, C3: 299 };
const ARCHETYPE: Record<string, RegExp> = {
  J1: /^CS[1-8]$/,
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

const firstJ10 = generatedQuestions("J10")[0];
assert.equal(firstJ10.archetype, "M1");
assert.equal(firstJ10.answer, "C");
assert.equal(firstJ10.difficulty, "easy");
assert.match(firstJ10.stem, /garden/);
assert.match(firstJ10.stem, /12500/);

function bandCounts(stageId: string) {
  const counts = { easy: 0, medium: 0, hard: 0, unknown: 0 };
  for (const question of generatedQuestions(stageId)) counts[question.difficulty] += 1;
  return counts;
}
assert.deepEqual(bandCounts("J1"), { easy: 76, medium: 114, hard: 110, unknown: 0 });
assert.deepEqual(bandCounts("J2"), { easy: 76, medium: 114, hard: 110, unknown: 0 });
assert.deepEqual(bandCounts("J11"), { easy: 88, medium: 128, hard: 84, unknown: 0 });
assert.deepEqual(bandCounts("J18"), { easy: 76, medium: 114, hard: 110, unknown: 0 });
assert.deepEqual(bandCounts("J4"), { easy: 33, medium: 258, hard: 9, unknown: 0 });
assert.deepEqual(bandCounts("J10"), { easy: 61, medium: 239, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("J16"), { easy: 150, medium: 150, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("J19"), { easy: 185, medium: 115, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("C2"), { easy: 150, medium: 150, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("C3"), { easy: 142, medium: 158, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("C4"), { easy: 115, medium: 185, hard: 0, unknown: 0 });
assert.deepEqual(bandCounts("C11"), { easy: 35, medium: 155, hard: 110, unknown: 0 });
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
assert.equal(firstJ11.archetype, "SE1");
assert.equal(firstJ11.answer, "A");
assert.equal(firstJ11.difficulty, "easy");
assert.match(firstJ11.stem, /2p\+3q/);

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
assert.equal(firstJ18.archetype, "SQ6");
assert.equal(firstJ18.answer, "C");
assert.equal(firstJ18.difficulty, "hard");
assert.match(firstJ18.stem, /a=13/);

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
const strayJ1 = startRun(beforeJ1, "J1", "drill");
assert.ok(strayJ1?.run);
assert.equal(strayJ1.run.source, "generated");
assert.equal(strayJ1.run.mode, "drill");
assert.deepEqual(strayJ1.run.focus, []);
assert.equal(strayJ1.run.ids.length, 5);
assert.ok(strayJ1.run.ids.every((id) => id.startsWith("wqg-J1-")));
assert.ok(strayJ1.run.ids.every((id) => generatedById(id)?.difficulty === "easy"));
assert.deepEqual(strayJ1.used, beforeJ1.used);
assert.deepEqual(strayJ1.cleared, ["J3"]);
for (const stageId of ["J3", "J5", "J14"]) {
  assert.equal(hasGeneratedPool(stageId), false);
  assert.equal(startRun(beforeJ1, stageId, "drill"), null);
}
for (const stageId of ["J2", "J18"]) {
  for (const bankQuestion of questionsFor(stageId)) {
    assert.deepEqual(skillsForStem(stageId, bankQuestion.stem), [], bankQuestion.id);
  }
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
assert.equal(stageClearedBy(perfectStage, 5, 5), true);
assert.equal(stageClearedBy(perfectStage, 4, 5), false);

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

for (let trial = 0; trial < 12; trial += 1) {
  const focused = startRun(wrongRun("J1", [cs7]), "J1", "drill");
  assert.ok(focused?.run);
  assert.deepEqual(focused.run.focus, ["CS7"]);
  assert.equal(focused.run.ids.length, 5);
  assert.deepEqual(focused.used, { J1: ["kept-bank-id"] });
  assert.deepEqual(focused.cleared, ["J3"]);
  assert.equal(stageClearedBy(focused.run, 5, 5), false);
  const kinds = focused.run.ids.map((id) => generatedById(id));
  assert.equal(kinds.filter((question) => question?.archetype === "CS7").length, 3);
  assert.ok(
    kinds.filter((question) => question?.archetype !== "CS7").every((question) => question?.difficulty === "easy"),
  );
  for (let i = 1; i < kinds.length; i += 1) {
    assert.notEqual(kinds[i]?.archetype, kinds[i - 1]?.archetype);
  }
  const againJ1 = startRun(focused, "J1", "drill");
  assert.ok(againJ1?.run);
  assert.deepEqual(againJ1.run.focus, ["CS7"]);
  assert.deepEqual(againJ1.used, focused.used);
  const seen = new Set(focused.run.ids);
  assert.ok(againJ1.run.ids.every((id) => !seen.has(id)));
}

const paired = startRun(wrongRun("J1", [cs4, cs8]), "J1", "drill");
assert.ok(paired?.run);
assert.deepEqual(paired.run.focus, ["CS4", "CS8"]);
assert.deepEqual(
  paired.run.ids.map((id) => generatedById(id)?.archetype),
  ["CS4", "CS8", "CS4", "CS8", "CS4"],
);
assert.deepEqual(paired.used, { J1: ["kept-bank-id"] });

for (let trial = 0; trial < 8; trial += 1) {
  const ratioMiss = startRun(wrongRun("J11", [se2]), "J11", "drill");
  assert.ok(ratioMiss?.run);
  assert.deepEqual(ratioMiss.run.focus, ["SE2"]);
  assert.deepEqual(ratioMiss.used, { J11: ["kept-bank-id"] });
  assert.deepEqual(ratioMiss.cleared, ["J3"]);
  const kinds = ratioMiss.run.ids.map((id) => generatedById(id));
  assert.equal(kinds.filter((question) => question?.archetype === "SE2").length, 3);
  assert.ok(kinds.every((question) => question?.difficulty === "easy"));
  assert.ok(kinds.every((question) => question?.id.startsWith("wqg-J11-")));
  for (let i = 1; i < kinds.length; i += 1) {
    assert.notEqual(kinds[i]?.archetype, kinds[i - 1]?.archetype);
  }

  const linear = startRun(wrongRun("J11", [se1]), "J11", "drill");
  assert.ok(linear?.run);
  assert.deepEqual(linear.run.focus, ["SE1"]);
  const linearKinds = linear.run.ids.map((id) => generatedById(id));
  assert.equal(linearKinds.filter((question) => question?.archetype === "SE1").length, 3);
  assert.ok(linearKinds.every((question) => question?.difficulty === "easy"));
}

const sfMiss = bankQuestionById("J2-2016-q4");
const sqMiss = bankQuestionById("J18-2016-q14");
assert.ok(sfMiss && sqMiss);
for (const missed of [sfMiss, sqMiss]) {
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

for (const stageId of ["J2", "J18"] as const) {
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

const easyJ1 = generatedQuestions("J1").filter((question) => question.difficulty === "easy").map((question) => question.id);
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
const mediumDrill = startRun(afterEasy, "J1", "drill");
assert.ok(mediumDrill?.run);
assert.deepEqual(mediumDrill.run.focus, []);
assert.deepEqual(mediumDrill.used, afterEasy.used);
assert.ok(mediumDrill.run.ids.every((id) => generatedById(id)?.difficulty === "medium"));
for (let i = 1; i < mediumDrill.run.ids.length; i += 1) {
  assert.notEqual(generatedById(mediumDrill.run.ids[i])?.archetype, generatedById(mediumDrill.run.ids[i - 1])?.archetype);
}
const mediumIds = generatedQuestions("J1").filter((question) => question.difficulty === "medium").map((question) => question.id);
const afterMedium: Progress = {
  ...afterEasy,
  run: {
    ...afterEasy.run!,
    ids: mediumIds.slice(0, 5),
    seenIds: [...easyJ1, ...mediumIds],
  },
};
const hardDrill = startRun(afterMedium, "J1", "drill");
assert.ok(hardDrill?.run);
assert.ok(hardDrill.run.ids.every((id) => generatedById(id)?.difficulty === "hard"));
assert.deepEqual(hardDrill.used, { J1: ["J1-sample-q2"] });
assert.deepEqual(hardDrill.cleared, ["J3"]);

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

const untagged = startRun(
  {
    cleared: [],
    used: {},
    last: {},
    run: {
      stage: "J7",
      mode: "stage",
      ids: ["J7-practice-q1"],
      picks: { "J7-practice-q1": wrongLetter(bankQuestionById("J7-practice-q1")!.answer) },
      index: 0,
      marked: true,
    },
  },
  "J7",
  "drill",
);
assert.ok(untagged?.run);
assert.deepEqual(untagged.run.focus, []);
assert.equal(untagged.run.ids.length, 5);
assert.deepEqual(untagged.used, {});

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
