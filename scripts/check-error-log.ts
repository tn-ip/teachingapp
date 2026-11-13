import assert from "node:assert/strict";
import {
  applyEvent,
  conceptForQuestion,
  conceptLabel,
  errorSourceForRun,
  eventsForRun,
  reduceErrorLog,
  runFromDetail,
  type ErrorEvent,
} from "../src/errorLog.ts";
import { generatedQuestions } from "../src/drillPools.ts";
import {
  choiceOrder,
  emptyProgress,
  grantPerfectRun,
  isMapPracticeRun,
  isPerfectStageRun,
  normalizeProgress,
  paperAnswer,
  scoreRun,
  stageClearedBy,
  startLogbookRetry,
  type Run,
} from "../src/progress.ts";
import { questionById } from "../src/questions.ts";
import { progressFromRemote, snapshotForRemote } from "../src/sync.ts";

function wrong(partial: Partial<Extract<ErrorEvent, { kind: "wrong" }>> = {}): ErrorEvent {
  return {
    kind: "wrong",
    questionId: "q1",
    stageId: "J1",
    concept: "CS2",
    source: "stage",
    pick: "B",
    key: "A",
    at: "2026-11-01T00:00:00.000Z",
    ...partial,
  };
}

function correct(partial: Partial<Extract<ErrorEvent, { kind: "correct" }>> = {}): ErrorEvent {
  return {
    kind: "correct",
    questionId: "q1",
    stageId: "J1",
    concept: "CS2",
    source: "stage",
    at: "2026-11-02T00:00:00.000Z",
    ...partial,
  };
}

/* --- pure upsert reducer ------------------------------------------- */

const firstMiss = applyEvent(null, wrong());
assert.ok(firstMiss);
assert.equal(firstMiss.status, "open");
assert.equal(firstMiss.miss_count, 1);
assert.equal(firstMiss.first_missed_at, "2026-11-01T00:00:00.000Z");
assert.equal(firstMiss.last_missed_at, "2026-11-01T00:00:00.000Z");
assert.equal(firstMiss.pick, "B");
assert.equal(firstMiss.key, "A");
assert.equal(firstMiss.source, "stage");
assert.equal(firstMiss.last_corrected_at, null);

// wrong again while open: bump, keep first_missed_at, update last + pick.
const secondMiss = applyEvent(firstMiss, wrong({ at: "2026-11-03T00:00:00.000Z", pick: "C" }));
assert.equal(secondMiss?.status, "open");
assert.equal(secondMiss?.miss_count, 2);
assert.equal(secondMiss?.first_missed_at, "2026-11-01T00:00:00.000Z");
assert.equal(secondMiss?.last_missed_at, "2026-11-03T00:00:00.000Z");
assert.equal(secondMiss?.pick, "C");

// correct: mark corrected, keep miss_count / first / last wrong pick.
const markedCorrect = applyEvent(secondMiss, correct({ at: "2026-11-04T00:00:00.000Z" }));
assert.equal(markedCorrect?.status, "corrected");
assert.equal(markedCorrect?.last_corrected_at, "2026-11-04T00:00:00.000Z");
assert.equal(markedCorrect?.miss_count, 2);
assert.equal(markedCorrect?.first_missed_at, "2026-11-01T00:00:00.000Z");
assert.equal(markedCorrect?.pick, "C");

// miss after corrected: reopen, keep first, increment.
const reopened = applyEvent(markedCorrect, wrong({ at: "2026-11-05T00:00:00.000Z", pick: "D" }));
assert.equal(reopened?.status, "open");
assert.equal(reopened?.miss_count, 3);
assert.equal(reopened?.first_missed_at, "2026-11-01T00:00:00.000Z");
assert.equal(reopened?.last_missed_at, "2026-11-05T00:00:00.000Z");
assert.equal(reopened?.pick, "D");

// first-time correct is a no-op.
assert.equal(applyEvent(null, correct()), null);

/* --- chronological fold -------------------------------------------- */

const folded = reduceErrorLog([
  wrong(),
  correct({ source: "drill" }),
]);
assert.equal(folded.length, 1);
assert.equal(folded[0].status, "corrected");
assert.equal(folded[0].miss_count, 1);

const refolded = reduceErrorLog([
  wrong(),
  correct({ source: "drill" }),
  wrong({ source: "drill", at: "2026-11-06T00:00:00.000Z", pick: "D" }),
]);
assert.equal(refolded.length, 1);
assert.equal(refolded[0].status, "open");
assert.equal(refolded[0].miss_count, 2);
assert.equal(refolded[0].source, "drill"); // latest source wins
assert.equal(refolded[0].first_missed_at, "2026-11-01T00:00:00.000Z");

// same question_id across stage and drill stays one row.
const twoSources = reduceErrorLog([
  wrong({ questionId: "shared", source: "stage" }),
  wrong({ questionId: "shared", source: "drill", at: "2026-11-07T00:00:00.000Z" }),
]);
assert.equal(twoSources.length, 1);
assert.equal(twoSources[0].miss_count, 2);
assert.equal(twoSources[0].source, "drill");

/* --- event + concept derivation ------------------------------------ */

const sample = questionById("J1-sample-q2");
assert.ok(sample);
const runWithWrongPick: Run = {
  stage: "J1",
  mode: "stage",
  ids: [sample.id],
  picks: { [sample.id]: "A" },
  index: 0,
  marked: false,
};
const events = eventsForRun(runWithWrongPick, "2026-11-01T00:00:00.000Z");
assert.equal(events.length, 1);
const firstEvent = events[0];
assert.equal(firstEvent.kind, "wrong");
if (firstEvent.kind === "wrong") {
  assert.equal(firstEvent.source, "stage");
  assert.equal(firstEvent.pick, "A");
  assert.equal(firstEvent.key, sample.answer);
}

assert.equal(errorSourceForRun(runWithWrongPick), "stage");
assert.equal(
  errorSourceForRun({ ...runWithWrongPick, entry: "map" } as Run),
  "map_practice",
);
assert.equal(
  errorSourceForRun({ ...runWithWrongPick, entry: "logbook" } as Run),
  "logbook_retry",
);
assert.equal(
  errorSourceForRun({ ...runWithWrongPick, mode: "drill", source: "generated" } as Run),
  "drill",
);

// Concept label map.
assert.equal(conceptLabel(null), "Unmapped");
assert.equal(conceptLabel("ID2"), "ID2 · Ratio");
assert.equal(conceptLabel("ZZZ"), "ZZZ");

// Generated items carry their archetype as the concept.
const generated = generatedQuestions("J8")[0];
assert.ok(generated);
assert.equal(conceptForQuestion(generated), generated.archetype);

/* --- backfill detail rebuild --------------------------------------- */

const detailRun = runFromDetail(
  {
    mode: "stage",
    ids: [sample.id],
    picks: { [sample.id]: "A" },
    option_orders: {},
  },
  "J1",
);
assert.ok(detailRun);
assert.equal(detailRun.ids.length, 1);
const detailEvents = eventsForRun(detailRun, "2026-11-01T00:00:00.000Z");
assert.equal(detailEvents[0].source, "stage");

/* --- reserved-key plumbing ----------------------------------------- */

const stamped = normalizeProgress({
  used: { J1: ["x"], $errorLogBackfill: ["1"] },
});
assert.deepEqual(stamped.used, { J1: ["x"] });
assert.equal(stamped.used.$errorLogBackfill, undefined);
assert.equal(stamped.errorLogBackfilled, true);

const snap = snapshotForRemote({ ...emptyProgress(), used: { J1: ["x"] }, errorLogBackfilled: true });
assert.deepEqual(snap.used.$errorLogBackfill, ["1"]);

const round = progressFromRemote(snap, [], []);
assert.equal(round.errorLogBackfilled, true);
assert.equal(round.used.$errorLogBackfill, undefined);
assert.equal(round.used.$clearRule, undefined);
assert.equal(round.used.$perfectRuns, undefined);

const unsnapped = snapshotForRemote(emptyProgress());
assert.deepEqual(unsnapped.used.$errorLogBackfill, []);
assert.equal(progressFromRemote(unsnapped, [], []).errorLogBackfilled, false);

/* --- logbook retry -------------------------------------------------- */

const retry = startLogbookRetry(emptyProgress(), sample.id, "J1");
assert.ok(retry);
assert.equal(retry.run?.ids.length, 1);
assert.equal(retry.run?.marked, false);
assert.equal(isMapPracticeRun(retry.run), false);
assert.equal(retry.run?.entry, "logbook");

// A perfect answer on a logbook retry never stars.
const retryRun = retry.run as Run;
const retryKey = paperAnswer(sample, choiceOrder(retryRun, sample.id));
const perfectRetry: Run = { ...retryRun, picks: { [sample.id]: retryKey } };
const result = scoreRun(perfectRetry);
assert.equal(result.correct, 1);
assert.equal(isPerfectStageRun(perfectRetry, result.correct, result.total), false);
assert.equal(stageClearedBy(perfectRetry, result.correct, result.total, 0), false);
const starred = grantPerfectRun(retry, { ...perfectRetry, clientId: "retry-id" }, result.correct, result.total);
assert.deepEqual(starred.perfectRuns, {});
assert.deepEqual(starred.cleared, []);

// Missing question -> no run, no crash.
assert.equal(startLogbookRetry(emptyProgress(), "does-not-exist", "J1"), null);

console.log("error log checks passed");
