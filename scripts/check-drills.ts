import assert from "node:assert/strict";
import { questionById as bankQuestionById, questionsFor } from "../src/bank.ts";
import { pickFromPool, skillsForStem } from "../src/drillPick.ts";
import { generatedById, generatedQuestions, hasGeneratedPool } from "../src/drillPools.ts";
import { questionById } from "../src/questions.ts";
import { stageClearedBy, startRun, type Progress, type Run } from "../src/progress.ts";

const EXPECTED: Record<string, string[]> = {
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
  "J10-2013-q12": ["S1"],
  "J10-2014-q12": [],
  "J10-2015-q11": [],
  "J10-2016-q11": [],
  "J10-2016-q13": [],
  "J10-2017-q11": ["S2"],
  "J10-2018-q10": [],
  "J10-2019-q12": [],
  "J10-2020-q10": ["S1"],
  "J10-2021-q11": [],
  "J10-2022-q12": [],
  "J10-2023-q12": ["S3"],
  "J10-2024-q6": [],
  "J10-2024-q12": [],
  "J10-2025-q11": [],
};

const empty = (): Progress => ({ cleared: [], used: {}, last: {}, run: null });

function wrongLetter(answer: string): "A" | "B" | "C" | "D" {
  return answer === "A" ? "B" : "A";
}

for (const stage of ["J7", "J8", "J9", "J10"]) {
  assert.equal(hasGeneratedPool(stage), true);
  const pool = generatedQuestions(stage);
  assert.equal(pool.length, 300, stage);
  const ids = new Set(pool.map((question) => question.id));
  const stems = new Set(pool.map((question) => question.stem));
  assert.equal(ids.size, 300, stage);
  assert.equal(stems.size, 300, `${stage} stems`);
  for (const question of pool) {
    assert.equal(question.generated, true);
    assert.ok(question.archetype);
    assert.ok(question.steps && question.steps.length > 0);
    assert.equal(bankQuestionById(question.id), undefined);
    assert.equal(questionById(question.id)?.id, question.id);
    for (const letter of ["A", "B", "C", "D"] as const) {
      assert.ok(question.choices[letter], `${question.id} ${letter}`);
      assert.equal(question.choices[letter].includes("$"), false);
    }
    assert.equal(question.stem.includes("$"), false);
  }
  for (const bankQuestion of questionsFor(stage)) {
    const got = skillsForStem(stage, bankQuestion.stem);
    const want = EXPECTED[bankQuestion.id];
    assert.ok(want, `missing expected skills for ${bankQuestion.id}`);
    assert.deepEqual(got, want, bankQuestion.id);
  }
}

assert.equal(hasGeneratedPool("J1"), false);
assert.equal(hasGeneratedPool("J5"), false);

const firstJ7 = generatedQuestions("J7")[0];
assert.equal(firstJ7.archetype, "I1");
assert.equal(firstJ7.answer, "C");
assert.match(firstJ7.stem, /\(5a\)/);

const firstJ10 = generatedQuestions("J10")[0];
assert.equal(firstJ10.archetype, "S1");
assert.equal(firstJ10.answer, "B");
assert.match(firstJ10.stem, /playground/);
assert.match(firstJ10.stem, /250000/);

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
assert.deepEqual(drill.run.focus, ["S1"]);
assert.equal(drill.run.ids.length, 5);
assert.ok(drill.run.ids.every((id) => id.startsWith("wqg-J10-")));
assert.deepEqual(drill.used, before.used);
assert.deepEqual(drill.cleared, ["J5"]);
const archetypes = drill.run.ids.map((id) => generatedById(id)?.archetype);
assert.deepEqual(
  archetypes.filter((tpl) => tpl === "S1").length,
  3,
);
for (let i = 1; i < archetypes.length; i += 1) {
  assert.notEqual(archetypes[i], archetypes[i - 1]);
}
assert.equal(stageClearedBy(drill.run, 5, 5), false);

const again = startRun(drill, "J10", "drill");
assert.ok(again?.run);
assert.deepEqual(again.run.focus, ["S1"]);
assert.deepEqual(again.used, before.used);
assert.deepEqual(again.cleared, ["J5"]);
const firstIds = new Set(drill.run.ids);
assert.ok(again.run.ids.every((id) => !firstIds.has(id)));

const j1 = startRun(
  { cleared: ["J3"], used: {}, last: {}, run: null },
  "J1",
  "drill",
  "medium",
);
assert.ok(j1?.run);
assert.equal(j1.run.source, undefined);
assert.equal(j1.run.mode, "drill");
assert.ok(j1.run.ids.every((id) => id.startsWith("J1-")));
assert.deepEqual(j1.used.J1, j1.run.ids);
assert.deepEqual(j1.cleared, ["J3"]);

const perfectStage: Run = {
  stage: "J1",
  mode: "stage",
  ids: j1.run.ids,
  picks: {},
  index: 0,
  marked: true,
};
assert.equal(stageClearedBy(perfectStage, 5, 5), true);
assert.equal(stageClearedBy(perfectStage, 4, 5), false);

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

console.log("drill checks passed");
