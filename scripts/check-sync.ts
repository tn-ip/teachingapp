import assert from "node:assert/strict";
import { normalizeProgress, PROGRESS_KEY, type Progress, type Run } from "../src/progress.ts";
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
  userProgressKey,
  type ProgressStore,
} from "../src/sync.ts";

function blank(partial: Partial<Progress> = {}): Progress {
  return { cleared: [], used: {}, last: {}, run: null, ...partial };
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

const guestPaper = blank({ cleared: ["J1"], used: { J1: ["J1-sample-q2"] } });
const accountPaper = blank({
  cleared: ["J2"],
  used: { J2: ["J2-kept"] },
  last: { J2: { correct: 4, total: 5, mode: "stage", at: "2026-10-01T00:00:00.000Z" } },
});

const merged = mergeProgress(guestPaper, accountPaper);
assert.deepEqual(merged.cleared, ["J2", "J1"]);
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
    cleared: ["J9"],
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
assert.deepEqual(fromTables.cleared, ["J1"]);
assert.equal(fromTables.last.J1?.mode, "drill");
assert.equal(fromTables.last.J1?.correct, 1);

const fromState = progressFromRemote(
  { cleared: ["J2"], used: { J2: ["kept"] }, last: { J2: { correct: 2, total: 5, mode: "stage" } }, run: null },
  ["J1"],
  [{ stageId: "J2", runType: "stage", score: 5, total: 5, createdAt: "2026-10-05T00:00:00.000Z" }],
);
assert.deepEqual(fromState.cleared, ["J2", "J1"]);
assert.equal(fromState.last.J2?.correct, 2);
assert.deepEqual(fromState.used.J2, ["kept"]);

assert.equal(normalizeProgress({ cleared: ["J1", "J1", 4], run: { mode: "nope" } }).cleared.length, 1);
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
assert.deepEqual(JSON.parse(guestStore.getItem(userProgressKey("user-a")) ?? "{}").cleared, ["J2", "J1"]);

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

console.log("sync checks passed");
