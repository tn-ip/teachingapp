# J4 Percentage Practice Drill — Report

## Enabled stages (after change)

`src/features.ts` `PRACTICE_DRILL_ENABLED.enabledStages`:

```
["J11", "J9", "J1", "J7", "J2", "J18", "C11", "J4"]
```

J4 is now a mapped remedial stage (`src/progress.ts` `MAPPED_DRILL_STAGES` includes `"J4"`),
removed from the "no tag / warm whole pool" group in `src/drillPick.ts`.

## Primary tag per J4 bank id

| Bank id | Primary |
|---------|---------|
| J4-sample-q10 | P1 |
| J4-sample-q12 | P2 |
| J4-practice-q10 | P5 |
| J4-2012-q8 | P4 |
| J4-2013-q10 | P1 |
| J4-2013-q11 | P3 |
| J4-2015-q9 | P2 |
| J4-2015-q10 | P3 |
| J4-2016-q10 | P6 |
| J4-2017-q10 | P3 |
| J4-2018-q9 | P3 |
| J4-2019-q11 | P3 |
| J4-2020-q9 | P5 |
| J4-2021-q9 | P4 |
| J4-2022-q11 | P3 |
| J4-2023-q11 | P5 |
| J4-2024-q11 | P4 |
| J4-2025-q10 | P3 |

Skill tags (P1–P6) follow the locked map: P1 equal-SP two sales, P2 successive
%/L×W area, P3 compound interest, P4 composition/population, P5
cost/marked/discount/profit or buy→resell, P6 relative salaries. Choose buckets
mirror the locked regroup: TR → P1|P5|P6, SC → P2|P4, CM → P3.

## Unmatched

Count: **0**

Ids: _(none)_

Every live J4 bank stem maps to a single primary skill tag, so the all-wrong
remedial plan has zero unmatched misses.

## Check command results

- `npx tsc -p tsconfig.json --noEmit` — passed (no output)
- `npm run check:drills` — `drill checks passed`
- `npm run check:sync` — `sync checks passed`
