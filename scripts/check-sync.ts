import assert from "node:assert/strict";
import { questionById } from "../src/questions.ts";
import {
  choiceOrder,
  CLEAR_RULE,
  grantPerfectRun,
  normalizeProgress,
  paperAnswer,
  PERFECTS_TO_CLEAR,
  PROGRESS_KEY,
  scoreRun,
  stageClearedBy,
  type Progress,
  type Run,
} from "../src/progress.ts";
import { buildSchoolRoster } from "../src/schoolRoster.ts";
import {
  claimDeviceProgress,
  clearScore,
  completedRuns,
  historyRunType,
  lastFromHistory,
  mergeProgress,
  mergeRun,
  OWNER_KEY,
  prepareAccountMerge,
  progressFromRemote,
  rememberDeviceProgress,
  snapshotForRemote,
  userProgressKey,
  type ProgressStore,
} from "../src/sync.ts";

function blank(partial: Partial<Progress> = {}): Progress {
  return normalizeProgress({
    clearRule: CLEAR_RULE,
    perfectRuns: {},
    cleared: [],
    used: {},
    last: {},
    run: null,
    ...partial,
  });
}

function starred(stageId: string): Record<string, string[]> {
  return { [stageId]: [`${stageId}-run-1`, `${stageId}-run-2`] };
}

function run(partial: Partial<Run> & Pick<Run, "stage" | "mode">): Run {
  return {
    ids: ["q1"],
    picks: {},
    index: 0,
    marked: false,
    ...partial,
  };
}

function memory(initial: Record<string, string> = {}): ProgressStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const guestPaper = blank({ perfectRuns: starred("J1"), used: { J1: ["J1-sample-q2"] } });
const accountPaper = blank({
  perfectRuns: starred("J2"),
  used: { J2: ["J2-kept"] },
  last: { J2: { correct: 4, total: 5, mode: "stage", at: "2026-10-01T00:00:00.000Z" } },
});

const merged = mergeProgress(guestPaper, accountPaper);
assert.deepEqual(merged.cleared, ["J1", "J2"]);
assert.deepEqual(merged.used.J1, ["J1-sample-q2"]);
assert.deepEqual(merged.used.J2, ["J2-kept"]);
assert.equal(merged.last.J2?.correct, 4);

const newerLocal = mergeProgress(
  blank({ last: { J1: { correct: 3, total: 5, mode: "drill", source: "generated", at: "2026-10-02T00:00:00.000Z" } } }),
  blank({ last: { J1: { correct: 5, total: 5, mode: "stage", at: "2026-10-01T00:00:00.000Z" } } }),
);
assert.equal(newerLocal.last.J1?.correct, 3);
assert.equal(newerLocal.last.J1?.mode, "drill");

const openLocal = run({ stage: "J1", mode: "stage", ids: ["a", "b"], picks: { b: "A" }, index: 1 });
const finishedRemote = run({
  stage: "J2",
  mode: "drill",
  source: "generated",
  ids: ["p"],
  marked: true,
  clientId: "remote-run",
});
assert.equal(mergeRun(openLocal, finishedRemote)?.stage, "J1");
assert.deepEqual(completedRuns(openLocal, finishedRemote).map((item) => item.clientId), ["remote-run"]);

const samePaper = mergeRun(
  run({ stage: "J1", mode: "stage", ids: ["a", "b"], picks: { a: "C" }, index: 1, seenIds: ["a"] }),
  run({ stage: "J1", mode: "stage", ids: ["a", "b"], picks: { a: "A", b: "B" }, index: 0, seenIds: ["b"] }),
);
assert.equal(samePaper?.picks.a, "C");
assert.equal(samePaper?.picks.b, "B");
assert.deepEqual(samePaper?.seenIds, ["b", "a"]);

const prepared = prepareAccountMerge(
  blank({
    run: run({ stage: "J1", mode: "stage", marked: true, picks: { q1: "A" } }),
  }),
  blank({
    perfectRuns: starred("J9"),
    run: run({ stage: "J7", mode: "drill", source: "generated", marked: true, clientId: "practice-1" }),
  }),
);
assert.equal(prepared.completed.length, 2);
assert.ok(prepared.progress.run?.clientId);
assert.equal(prepared.completed[0]?.clientId, prepared.progress.run?.clientId);
assert.equal(prepared.completed[1]?.clientId, "practice-1");
assert.deepEqual(prepared.progress.cleared, ["J9"]);

const again = prepareAccountMerge(prepared.progress, prepared.progress);
assert.equal(again.completed.length, 1);
assert.equal(again.completed[0]?.clientId, prepared.progress.run?.clientId);

assert.equal(historyRunType(run({ stage: "J1", mode: "stage" })), "stage");
assert.equal(historyRunType(run({ stage: "J1", mode: "drill", source: "bank" })), "practice");
assert.equal(historyRunType(run({ stage: "J1", mode: "stage", source: "generated" })), "practice");

assert.deepEqual(
  clearScore(
    blank({ last: { J1: { correct: 5, total: 5, mode: "stage" } } }),
    "J1",
  ),
  { score: 5, total: 5 },
);
assert.equal(
  clearScore(
    blank({ last: { J1: { correct: 5, total: 5, mode: "drill", source: "generated" } } }),
    "J1",
  ),
  null,
);

const fromTables = progressFromRemote(null, ["J1"], [
  { stageId: "J1", runType: "stage", score: 5, total: 5, createdAt: "2026-10-03T00:00:00.000Z" },
  { stageId: "J1", runType: "practice", score: 1, total: 5, createdAt: "2026-10-04T00:00:00.000Z" },
]);
assert.deepEqual(fromTables.cleared, []);
assert.deepEqual(fromTables.perfectRuns, {});
assert.equal(fromTables.last.J1?.mode, "drill");
assert.equal(fromTables.last.J1?.correct, 1);

const fromState = progressFromRemote(
  { cleared: ["J2"], used: { J2: ["kept"] }, last: { J2: { correct: 2, total: 5, mode: "stage" } }, run: null },
  ["J1"],
  [{ stageId: "J2", runType: "stage", score: 5, total: 5, createdAt: "2026-10-05T00:00:00.000Z" }],
);
assert.deepEqual(fromState.cleared, []);
assert.deepEqual(fromState.perfectRuns, {});
assert.equal(fromState.last.J2?.correct, 2);
assert.deepEqual(fromState.used.J2, ["kept"]);

assert.deepEqual(normalizeProgress({ cleared: ["J1", "J1", 4], run: { mode: "nope" } }).cleared, []);
assert.deepEqual(normalizeProgress({ cleared: ["J1", "J1", 4], run: { mode: "nope" } }).perfectRuns, {});
assert.equal(normalizeProgress({ cleared: ["J1", "J1", 4], run: { mode: "nope" } }).run, null);
assert.deepEqual(lastFromHistory([]), {});

const shared = memory({
  [OWNER_KEY]: "user-a",
  [PROGRESS_KEY]: JSON.stringify(guestPaper),
  [userProgressKey("user-b")]: JSON.stringify(accountPaper),
});
const claimed = claimDeviceProgress(shared, "user-b");
assert.deepEqual(claimed.cleared, ["J2"]);
assert.equal(shared.getItem(OWNER_KEY), "user-b");
assert.deepEqual(JSON.parse(shared.getItem(userProgressKey("user-a")) ?? "{}").cleared, ["J1"]);

const guestStore = memory({ [PROGRESS_KEY]: JSON.stringify(guestPaper) });
const guestClaim = claimDeviceProgress(guestStore, "user-a");
assert.deepEqual(guestClaim.cleared, ["J1"]);
assert.equal(guestStore.getItem(OWNER_KEY), null);
rememberDeviceProgress(guestStore, "user-a", merged);
assert.equal(guestStore.getItem(OWNER_KEY), "user-a");
assert.deepEqual(JSON.parse(guestStore.getItem(userProgressKey("user-a")) ?? "{}").cleared, ["J1", "J2"]);

const sameStudent = memory({
  [OWNER_KEY]: "user-a",
  [PROGRESS_KEY]: JSON.stringify(guestPaper),
});
assert.deepEqual(claimDeviceProgress(sameStudent, "user-a").cleared, ["J1"]);
assert.equal(sameStudent.getItem(userProgressKey("user-a")), null);

const roster = buildSchoolRoster(
  [
    { id: "t", displayName: "Ms Wong", email: "ipcm@taknga.edu.hk", role: "teacher" },
    { id: "b", displayName: "1A 10 Chan", email: "chan@school.test", role: "student" },
    { id: "a", displayName: "1A 2 Lee", email: "lee@school.test", role: "student" },
    { id: "c", displayName: null, email: "no-name@school.test", role: "student" },
    { id: "d", displayName: "  ", email: null, role: null },
  ],
  [
    { userId: "t", stageId: "J1" },
    { userId: "a", stageId: "C2" },
    { userId: "a", stageId: "J1" },
    { userId: "a", stageId: "J1" },
    { userId: "a", stageId: "Z9" },
    { userId: "b", stageId: "J2" },
    { userId: "missing", stageId: "J1" },
  ],
  ["J1", "J2", "C2"],
);
assert.deepEqual(
  roster.map((student) => student.displayName),
  ["1A 2 Lee", "1A 10 Chan", "no-name@school.test", "Student"],
);
assert.deepEqual(roster[0]?.cleared, ["J1", "C2", "Z9"]);
assert.equal(roster[0]?.email, "lee@school.test");
assert.deepEqual(roster[1]?.cleared, ["J2"]);
assert.equal(roster[2]?.email, null);
assert.deepEqual(roster[3]?.cleared, []);
assert.equal(roster.some((student) => student.id === "t"), false);

const legacy = normalizeProgress({
  cleared: ["J5", "C2"],
  used: { J5: ["J5-2012-q1"] },
  last: { J5: { correct: 5, total: 5, mode: "stage" } },
});
assert.equal(legacy.clearRule, CLEAR_RULE);
assert.deepEqual(legacy.cleared, []);
assert.deepEqual(legacy.perfectRuns, {});
assert.deepEqual(legacy.used.J5, ["J5-2012-q1"]);

const one = grantPerfectRun(
  blank(),
  run({ stage: "J3", mode: "stage", marked: true, clientId: "once" }),
  5,
  5,
);
assert.deepEqual(one.perfectRuns.J3, ["once"]);
assert.deepEqual(one.cleared, []);
assert.equal(stageClearedBy(run({ stage: "J3", mode: "stage" }), 5, 5, 0), false);
assert.equal(stageClearedBy(run({ stage: "J3", mode: "stage" }), 5, 5, 1), true);
assert.equal(PERFECTS_TO_CLEAR, 2);

const two = grantPerfectRun(
  one,
  run({ stage: "J3", mode: "stage", marked: true, clientId: "twice" }),
  5,
  5,
);
assert.deepEqual(two.cleared, ["J3"]);
const againSame = grantPerfectRun(
  two,
  run({ stage: "J3", mode: "stage", marked: true, clientId: "twice" }),
  5,
  5,
);
assert.deepEqual(againSame.perfectRuns.J3, ["once", "twice"]);

const missedBetween = grantPerfectRun(
  one,
  run({ stage: "J3", mode: "stage", marked: true, clientId: "miss" }),
  4,
  5,
);
assert.deepEqual(missedBetween.perfectRuns.J3, ["once"]);
const drillPerfect = grantPerfectRun(
  one,
  run({ stage: "J3", mode: "drill", source: "generated", marked: true, clientId: "drill" }),
  5,
  5,
);
assert.deepEqual(drillPerfect.perfectRuns.J3, ["once"]);

const offline = mergeProgress(
  blank({ perfectRuns: { C1: ["local-only"] } }),
  blank({ perfectRuns: { C1: ["remote-only"] } }),
);
assert.deepEqual(offline.perfectRuns.C1, ["remote-only", "local-only"]);
assert.deepEqual(offline.cleared, ["C1"]);

const roundTrip = progressFromRemote(
  snapshotForRemote(two),
  ["J1", "J9"],
  [],
);
assert.deepEqual(roundTrip.cleared, ["J3"]);
assert.deepEqual(roundTrip.perfectRuns.J3, ["once", "twice"]);
assert.equal(roundTrip.used.$clearRule, undefined);
assert.equal(roundTrip.used.$perfectRuns, undefined);

const sample = questionById("J1-sample-q2");
assert.ok(sample);
const order = ["B", "D", "A", "C"] as const;
const shuffledRun = run({
  stage: "J1",
  mode: "stage",
  ids: [sample.id],
  picks: { [sample.id]: "D" },
  optionOrders: { [sample.id]: [order[0], order[1], order[2], order[3]] },
  marked: true,
});
assert.equal(paperAnswer(sample, choiceOrder(shuffledRun, sample.id)), "D");
assert.equal(scoreRun(shuffledRun).correct, 1);
assert.equal(scoreRun({ ...shuffledRun, picks: { [sample.id]: "A" } }).correct, 0);
assert.equal(sample.answer, "C");

console.log("sync checks passed");
