/**
 * Student-facing Practice Drill: generated Weekly Question Generator sets
 * inside this app. Pool JSON, `scripts/convert-drill-pools.mjs`, and
 * `npm run check:drills` stay in the repo for every stage.
 *
 * `enabledStages` is the only student-facing switch. J11 Simultaneous
 * equations, J9 Factorization, expansion, J1 Change of subjects, J7
 * Indices, and J2 Significant figure are on. Every other stage stays
 * hidden: no map badge, no practice button, and no post-wrong drills.
 */
export const PRACTICE_DRILL_ENABLED = {
  enabledStages: ["J11", "J9", "J1", "J7", "J2"],
} as const;

export function practiceDrillEnabled(stageId: string | null | undefined): boolean {
  if (!stageId) return false;
  return (PRACTICE_DRILL_ENABLED.enabledStages as readonly string[]).includes(stageId);
}

/** A generated practice set, or any run stored as a drill. */
export function isPracticeDrillRun(
  run: { mode: string; source?: string } | null | undefined,
): boolean {
  if (!run) return false;
  return run.mode === "drill" || run.source === "generated";
}
