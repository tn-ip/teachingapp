# DSE Maths Paper 2 trainer

Trainer for HKDSE Mathematics Compulsory Part **Paper 2** multiple choice. One map holds the Junior stages and Compulsory chapters 1–23. Any stage can be started. Nothing is locked behind clearing another stage.

Open it on an iPad at [https://tn-ip.github.io/teachingapp/](https://tn-ip.github.io/teachingapp/). In Safari, use **Share → Add to Home Screen** so it opens full screen. With no sign-in, progress stays on that iPad in `localStorage`. When Microsoft sign-in is configured, that same progress is saved to the student's account.

## How a stage works

- Pick any stage. The map is a vertical honeycomb of Junior and Compulsory together, clustered **Easy → Medium → Hard → Untagged**. Easy is an average facility of 70% or higher, Medium is 40–69, Hard is below 40 (tagged questions only). Within a band, higher averages come first. A stage with no tagged facility sits in Untagged at the end. Each hex shows the stage code and chapter title. There are no neighbour lines. Nothing is locked. The map scrolls vertically. The header shows star completion, for example `★ 12 / 42`.
- J6 is not in the bank, so the map skips it. C23 Use and abuse of statistics stays in the question bank and the worked solutions, and it is not on the student map. Students cannot start it. The star total does not count it.
- A stage run is up to **5 real DSE questions** from that stage. If the stage has fewer than 5, the run uses all of them.
- The run warms up **Easy → Medium → Unknown → Hard**, filling from the easier pool first. Each question shows a light difficulty chip (Easy, Medium, Hard, or — when the facility is not tagged yet).
- A stage earns its star only after **two** perfect stage runs (every question correct: 5/5, or 3/3, and so on). The two runs do not have to be consecutive. A miss in between does not wipe a perfect already counted. After one perfect run the hex shows `1/2`. After the second it shows a star and no green ring. Practice drills never count.
- The options A–D are shuffled each time a question appears in a run. The same question keeps that shuffle if the student goes back during the attempt. Marking uses the shuffled letter. The review says so, because the published scheme letter may not match the letter they tapped. The bank key is unchanged.
- A wrong answer does not star the stage. The review offers another stage run.
- **J1 Change of subjects**, **J2 Significant figure**, **J7 Indices**, **J9 Factorization, expansion**, and **J11 Simultaneous equations** have Practice Drill in the student UI (`PRACTICE_DRILL_ENABLED.enabledStages` in `src/features.ts`). After a marked stage run that is not perfect, each wrong bank question opens **two** Weekly Question Generator items. The two stems in that pair differ. A perfect stage run has no practice button. The drill does not star the stage. After the drill, Map returns to the stage map.
- **J1** maps a miss to its CS skill (`skillsForStem`). With no CS tag, a WQG Choose bucket may still apply: CF cross / proportion → CS4|CS8, BR brackets / expand → CS1|CS3, FR formula / fractions → CS5|CS6|CS7, LN linear rearrange → CS2, Easy before Medium before Hard. A miss that still cannot be filled is skipped, and the result says so. Those slots are not filled from the rest of the pool. `src/data/drillPools/j1.json` is unchanged.
- **J2** maps a miss to its RS skill. RS1 is round-off in significant figures only. RS2 is round-off in decimal places only. RS3 is a mixed s.f./d.p. trap, including a bare value = and an expression such as \(1/\pi^{4}\) or \(\sqrt{333}\). RS4 is an inequality, then which rounding statement is true. RS5 is the range after “correct to”. RS6 is the range after rounding down. RS7 is the range after rounding up. RS8 is awkward leading zeros `0.00…` (`0.050`, `0.032`, and `0.076` stay RS3). A soft dual keeps the other reading on the pedigree. Awkward `0.00…` drills RS8 rather than RS3. Mixed s.f. and d.p. drills RS3 rather than RS1 or RS2. Rounding down drills RS6 rather than RS5. Rounding up drills RS7 rather than RS5. An inequality drills RS4 rather than the other range tags. With no RS tag, a WQG Choose bucket may still apply: RO round-off → RS1|RS2|RS3|RS8, IR inequality or range → RS4|RS5|RS6|RS7. RO is the easier bucket when a stem could sit in both. Easy before Medium before Hard. A miss that still cannot be filled is skipped, and the result says so. Those two slots stay empty. Unmatched stems are left for DSE Math Check and Weekly Question Generator. No ninth RS tag is invented. `src/data/drillPools/j2.json` is unchanged.
- **J7** maps a miss to its I skill. I1 is a product. I2 is a quotient. I3 is a negative index. I4 is the same base with \(n\). I5 is different bases. I6 is a reciprocal times a power. A soft dual keeps both tags on the pedigree. Same-base with parameter \(n\) drills I4 rather than I1. An outer reciprocal times a power drills I6 rather than I3. A negative index drills I3 only when the other tag is I2. With no I tag, a WQG Choose bucket may still apply: PQN product / quotient / negative → I1|I2|I3, I4 same-base with \(n\) → I4, DBR different bases or reciprocal × power → I5|I6, Easy before Medium before Hard. J7 pool items have no generator band. A miss that still cannot be filled is skipped, and the result says so. Those two slots stay empty. Unmatched stems, including \(x^{3}(2x+x)\), are left for DSE Math Check and Weekly Question Generator. No seventh I tag is invented. `src/data/drillPools/j7.json` is the current `POOLS.J7MC` pool: I1–I6, 50 each.
- **J11** maps a miss to its SE skill (`skillsForStem`). With no SE tag, a WQG Choose bucket may still apply: Prices/%% → SE1|SE2, story (ratio, transfer, tickets) → SE3|SE4|SE5, other equation or two-leg speed wording → SE6|SE7, Easy before Medium before Hard. A miss that still cannot be filled is skipped, and the result says so. Those slots are not filled from the rest of the pool.
- **J9** maps a miss to its F skill. F5 is a product of brackets, then ± another term. F2 is a product of brackets to expand. F3 is a difference of squares. F1 is grouping / difference of squares ± a linear part (for example \(u^{2}-v^{2}-5u+5v\)). F4 is a quadratic with a cross term plus linear terms. With no F tag, a WQG Choose bucket may still apply: QL → F1|F4, DS → F3, EX → F2|F5. J9 pool items have no generator band. A miss that still cannot be filled is skipped, and the result says so. Those two slots stay empty. Unmatched stems are left for DSE Math Check and Weekly Question Generator. `src/data/drillPools/j9.json` is unchanged.
- **Every other stage** keeps Practice Drill hidden: no map badge, no practice button, and no post-wrong drills. The result offers another stage run only. Practice does not fall back to unused past papers, and it does not use Paper 1 generator pools. Pool JSON under `src/data/drillPools/`, `scripts/convert-drill-pools.mjs`, and `npm run check:drills` stay in the repo for every stage.
- When a stage’s unused questions run out, retrying the stage draws from the full bank again.

The practice pools live in `src/data/drillPools/` (`j1.json`, `j2.json`, `j4.json`, `j7.json`, `j8.json`, `j9.json`, `j10.json`, `j11.json`, `j16.json`, `j18.json`, `j19.json`, `c2.json`, `c3.json`, `c4.json`, `c11.json`, `c17.json`), 300 multiple-choice items each. They were converted from the Paper 2 scripts `POOLS.J1MC`, `POOLS.J2MC`, `POOLS.J4MC`, `POOLS.J7MC`, `POOLS.J8`, `POOLS.J9MC`, `POOLS.J10`, `POOLS.J11MC`, `POOLS.J16MC`, `POOLS.J18MC`, `POOLS.J19MC`, `POOLS.C2MC`, `POOLS.C3MC`, `POOLS.C4MC`, `POOLS.C11MC`, and `POOLS.C17MC`. J7 is I1–I6, 50 each, with no generator band. J1, J2, and J18 are each 76 Easy, 114 Medium, and 110 Hard. J11 is 74 Easy, 128 Medium, and 98 Hard. J10 is 65 Easy and 235 Medium (map scale M1–M3 and ratio/rate R1–R3), and each item keeps the generator stem. J4 is 34 Easy, 259 Medium, and 7 Hard. J16 is 150 Easy and 150 Medium. J19 is 192 Easy and 108 Medium. C2 and C3 are 150/150 and 145/155 Easy/Medium. C4 is 115 Easy and 185 Medium. C11 is 35 Easy, 155 Medium, and 110 Hard. C17 is 72 Easy, 198 Medium, and 30 Hard. J2 items are RS1–RS8 rounding statements and ranges. C2 has 286 distinct stems and C3 has 299; the other pools have 300. `scripts/convert-drill-pools.mjs` repeats that conversion and keeps each item’s `band` when the pool has one. `npm run check:drills` checks the stage-to-archetype mapping, that every practice item has choices A–D, and that a practice drill does not touch `used` or `cleared`.

## Question bank

`src/data/questions.json` holds the Junior questions (293) and Compulsory chapters 1–23. Stage ids are `J1`–`J19` (no `J6`) and `C1`–`C23`. Compulsory is one stage per chapter number. The Word bank’s TOC splits are merged:

- Ch. 4 Factor/remainder and HCF/LCM/Rational → `C4`
- Ch. 10.1–10.3 and 10.4–10.6 → `C10`
- Ch. 14.1–14.5 and 14.6–14.7 → `C14`
- Ch. 19.1 Locus, 19.2 Equations of Circles, and 19.3 Intersection → `C19`
- Ch. 20 Arithmetic and Geometric sequence → `C20`
- Ch. 21 Sum of Arithmetic and Sum of Geometric → `C21`

Question ids stay `{stage}-{year}-q{number}` (Junior ids are unchanged, so saved progress still matches). Each record has the stage, year, source tag, stem, choices A–D, the key, a facility percentage when the HKEAA Keys include one (`facilityPct`, also kept as `correctPercent`), a `difficulty` band, and a figure path when the paper has a diagram. Stems and choices use `\(...\)` for KaTeX. Diagrams are PNGs in `public/figures/`, extracted from the topic-sorted Paper 2 Word bank (Sample, Practice, and 2012–2025). Keys are the A–D letters in document order, aligned with all 683 Paper 2 questions. A Keys line like `A (60)` means 60% of candidates chose the correct answer.

Difficulty bands use that facility percentage:

- **Easy:** 70% or higher
- **Medium:** 40% up to, but not including, 70%
- **Hard:** below 40%
- **Unknown:** no facility percentage yet

Sample Paper and Practice Paper questions have no percentage in the Keys, so they stay **unknown** until they are tagged later. A missing percentage is not a guessed band.

HKDSE 2025 Paper 2 Q13 (J18 Sequences, key A) is facility **60**. That Keys line has no percentage. HKDSE 2025 Paper 2 Q36 is not in this Junior bank (Compulsory Ch. 18 Linear Programming, key B). Its Keys line says `B (26)`; the published facility is **46%**, and `scripts/extract_bank.py` applies that correction if the chapter is extracted later.

To regenerate the JSON from that document:

```bash
python3 scripts/extract_bank.py /path/to/sort_paper2.docx
```

The script needs `emf2svg-conv`, `wmf2svg`, and `rsvg-convert` for the diagrams.

## Worked solutions

After a wrong answer on a stage run, the review shows the correct letter and then the worked steps for that question. A correct answer stays as it is. A J1, J2, J7, J9, or J11 practice drill shows the pool’s own short marking (1M / 1A) instead, and does not link to mathseasy.

Steps are adapted from [Thomas Fok’s Paper II 題解 on mathseasy.hk](https://mathseasy.hk/). They are not original to this trainer. The stage map credits that source once. A wrong-answer review does not repeat the credit. mathseasy does not publish a per-question anchor. Diagrams and whole-page captures are not stored; if a write-up depends on a figure, the review says so and links to the year’s page on the tab that contains the question (1–10, 11–20, and so on). Two mensuration questions also link to Thomas Fok’s YouTube video when that is how the page explains them.

`src/data/solutions.json` is the companion file, keyed by question id. Each record has `solutionSteps` (text plus `\(...\)` / `\[...\]` for KaTeX), `solutionSourceUrl`, and `solutionCredit`. The static site reads this file. It does not scrape mathseasy in the browser.

Refresh it from the repo root:

```bash
python3 scripts/fetch_solutions.py
```

The script walks `https://mathseasy.hk/articles/hkdse-YYYY-p2-ans/` for 2012–2026 and `hkdse-2012pp-p2-ans` for the Practice Paper, then matches year + question number to every Junior and Compulsory question in the bank. It prints questions it could not fill.

Coverage from the last run: **634 / 683** questions have steps (Junior 272 / 293, Compulsory 362 / 390). **C10 is 17 / 19.** Every matched letter agrees with this bank’s key.

Gaps, left blank because mathseasy has no usable text for them:

- **Sample Paper (44):** no Paper II 題解 page on mathseasy. That includes both C10 Sample items, `C10-sample-q38` and `C10-sample-q40`. The review shows the key only.
- **Diagram only (5):** Practice Q25 (J14), 2019 Q25 (J14), 2021 Q23 (J14), 2012 Q24 (C19), and 2015 Q24 (C19). The page is a figure (2012 Q24 and 2015 Q24 also point at a “常見軌跡” article and have no written steps). The review links out and does not embed the image.
- **2026:** the fetch URL is included, but this bank has no 2026 questions yet.

## Microsoft sign-in and Vercel

Sign-in uses Supabase Auth with the school Microsoft Entra tenant: `signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo } })`. Guests are not blocked. The map still runs from `localStorage` when nobody is signed in, and when the site is built without the env vars below (that is how GitHub Pages keeps working until cutover).

Copy `.env.example` to `.env.local` for `npm run dev`. On Vercel, set:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://zjseatmkwpwsfcyhiivj.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project publishable key (`sb_publishable_...`). `VITE_SUPABASE_ANON_KEY` is only the legacy anon JWT fallback. |

Vercel sets `VERCEL=1` during the build, and Vite then uses base `/` so scripts load from `/assets/...`. GitHub Pages does not set `VERCEL`, so its base stays `/teachingapp/`. Do not set `VITE_BASE_PATH` on either host unless you need to override that. The Pages workflow passes the Supabase names from repository secrets when they exist, and an empty secret leaves Pages as a guest trainer.

Add `https://teachingapp-tn-ip.vercel.app/` under Supabase → Authentication → URL configuration → Redirect URLs. The entry has to match `redirectTo`, including the trailing slash. Also allow `http://localhost:5173/teachingapp/` for local dev, and `https://tn-ip.github.io/teachingapp/` if Pages should sign in before cutover. `vercel.json` sends other paths to `index.html` so a host refresh still opens the app.

Signing in unions this iPad with the account. Perfect-run ids and used question ids are kept from either side. A star is two distinct perfect stage-run ids, not a stored cleared flag. Each finished stage or practice run is appended once. The open paper stays the one on the device you are holding, including its option shuffle. Sign out leaves that copy on the iPad. Reset while signed in clears the account too. A different Microsoft account on the same iPad does not receive the previous student's paper.

The two-perfect rule starts everyone at 0 stars. A save or `stage_clears` row from the old one-perfect rule does not grant a star. On sync the app rewrites `stage_clears` to the starred stages only. Apply `supabase/migrations/20261031120000_two_perfect_clear_reset.sql` once so the teacher view drops old stars before each student opens the new app. Do not run that file again after students have earned stars under this rule. Perfect-run ids are stored in `trainer_state.used` under `$clearRule` and `$perfectRuns` so the existing columns stay in place.

The per-question timer is not stored, so `run_history.elapsed_ms` is empty.

A signed-in teacher (`profiles.role` is `teacher`) sees **School progress** at the top of the stage map. That list is the whole school: each student’s display name (email underneath when both exist), their star count, and the stages they have starred. Search by name, or show only students who starred one stage. A single perfect run is not a star, so it does not appear here. Students never see the button. If the role cannot be read, the app treats the account as a student. No class group is required.

## Develop

```bash
npm install
npm run dev
npm run build
```

The Vite `base` is `/teachingapp/` for GitHub Pages and `/` when `VERCEL` is set. `.github/workflows/pages.yml` builds the site and deploys `dist` from `main` with the Actions source. That workflow does not set `VERCEL`.
