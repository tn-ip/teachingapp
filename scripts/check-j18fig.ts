import assert from "node:assert/strict";
import { generatedQuestions } from "../src/drillPools.ts";
import { dotsFor, T } from "../src/j18FigureLayout.ts";
import type { FigureFamily } from "../src/bank.ts";

/**
 * Exact-count and family-quota check for every J18FIG item: for each of the 3
 * shown frames the layout must place exactly `T(a, rule, frame)` unique dots.
 * Exits non-zero on any mismatch.
 */
let checked = 0;
let mismatches = 0;

const familyCounts: Record<string, number> = {};
const diamondYScales: Record<string, number> = {};
let trap2020 = 0;
let diamondHalf = 0;

for (const question of generatedQuestions("J18")) {
  const spec = question.figureSpec;
  assert.ok(spec, `${question.id} has no figureSpec`);

  const family = spec.family as string;
  familyCounts[family] = (familyCounts[family] ?? 0) + 1;

  // The retired L / tri / leftover-count U packers must not appear.
  assert.ok(
    family !== "L" && family !== "tri",
    `${question.id} uses retired family ${family}`,
  );

  if (family === "hook") {
    assert.ok(spec.layout && spec.layout.bar != null, `${question.id} hook has no layout.bar`);
    assert.ok(spec.layout && spec.layout.arm != null, `${question.id} hook has no layout.arm`);
  }
  if (family === "U") {
    assert.equal(spec.layout?.frames?.length, 3, `${question.id} U must have 3 frames`);
  }
  if (family === "diamond") {
    const yScale = spec.layout?.yScale ?? NaN;
    diamondYScales[String(yScale)] = (diamondYScales[String(yScale)] ?? 0) + 1;
    if (yScale === 0.5) diamondHalf += 1;
  }
  if (family === "trap" && spec.layout?.style === "trap2020") trap2020 += 1;

  for (let frame = 1; frame <= spec.show; frame += 1) {
    const want = T(spec.a, spec.rule, frame);
    const dots = dotsFor(spec.family as FigureFamily, spec.a, frame, spec.rule, spec.layout);
    const unique = new Set(dots.map((dot) => `${dot.x.toFixed(5)},${dot.y.toFixed(5)}`));
    checked += 1;
    if (dots.length !== want) {
      mismatches += 1;
      console.error(`${question.id} frame ${frame}: layout ${dots.length} dots, T = ${want}`);
    }
    if (unique.size !== dots.length) {
      mismatches += 1;
      console.error(`${question.id} frame ${frame}: ${dots.length - unique.size} overlapping dots`);
    }
  }
}

assert.equal(checked, 300 * 3);
assert.equal(mismatches, 0, `${mismatches} mismatches across ${checked} frames`);

assert.deepEqual(familyCounts, {
  plus: 40,
  hook: 40,
  grid: 40,
  cluster: 60,
  trap: 53,
  U: 53,
  diamond: 14,
});

assert.deepEqual(diamondYScales, { "0.75": 7, "1": 7 });
assert.equal(trap2020, 4);
assert.equal(diamondHalf, 0);

console.log(
  `J18FIG exact-count check passed: ${checked} frames, 0 mismatches, ` +
    `families ${JSON.stringify(familyCounts)}`,
);
