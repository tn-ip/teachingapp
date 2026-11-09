import assert from "node:assert/strict";
import { generatedQuestions } from "../src/drillPools.ts";
import { dotsForFrame, T } from "../src/j18FigureLayout.ts";

/**
 * Exact-count check for every J18FIG item: for each of the 3 shown frames the
 * SVG layout must place exactly T(a, rule, frame) dots. Exits non-zero on any
 * mismatch.
 */
let checked = 0;
let mismatches = 0;

for (const question of generatedQuestions("J18")) {
  const spec = question.figureSpec;
  assert.ok(spec, `${question.id} has no figureSpec`);
  for (let frame = 1; frame <= spec.show; frame += 1) {
    const want = T(spec.a, spec.rule, frame);
    const got = dotsForFrame(spec.family, want).length;
    checked += 1;
    if (got !== want) {
      mismatches += 1;
      console.error(`${question.id} frame ${frame}: layout ${got} dots, T = ${want}`);
    }
  }
}

assert.equal(checked, 300 * 3);
assert.equal(mismatches, 0, `${mismatches} mismatches across ${checked} frames`);
console.log(`J18FIG exact-count check passed: ${checked} frames, 0 mismatches`);
