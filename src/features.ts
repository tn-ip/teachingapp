/**
 * Student-facing Practice Drill: generated Weekly Question Generator sets
 * inside this app. Pool JSON, `scripts/convert-drill-pools.mjs`, and
 * `npm run check:drills` stay in the repo when this is false.
 * Set it to true to show the drill in the UI again.
 */
export const PRACTICE_DRILL_ENABLED = false;

/** A generated practice set, or any run stored as a drill. */
export function isPracticeDrillRun(
  run: { mode: string; source?: string } | null | undefined,
): boolean {
  if (!run) return false;
  return run.mode === "drill" || run.source === "generated";
}
