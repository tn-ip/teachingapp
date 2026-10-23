# DSE Maths Paper 2 trainer

Junior-stage trainer for HKDSE Mathematics Compulsory Part **Paper 2** multiple choice. Stage 1 is the Junior (J) topics. Act 2, the compulsory chapters, stays locked until those stages are cleared.

Open it on an iPad at [https://tn-ip.github.io/teachingapp/](https://tn-ip.github.io/teachingapp/) (after this branch is merged and GitHub Pages is set to deploy from Actions). In Safari, use **Share → Add to Home Screen** so it opens full screen. Progress stays on that iPad in `localStorage`. There is no login.

## How a stage works

- Any Junior stage can be started. Nothing inside the Junior path is sequential. J6 is not in the bank, so the map skips it.
- A stage run is up to **5 real DSE questions** from that stage. If the stage has fewer than 5, the run uses all of them.
- The run warms up **Easy → Medium → Unknown → Hard**, filling from the easier pool first. Each question shows a light difficulty chip (Easy, Medium, Hard, or — when the facility is not tagged yet).
- The stage clears only when **every** question in that run is correct (5/5, or 3/3, and so on).
- A wrong answer does not clear the stage. Practice is optional, and it never clears the stage.
- **J7 Indices, J8 Identities, J9 Factorization, and J10 Ratio / rate** can drill 5 new Weekly Question Generator **Paper 2 MC** questions. The draw prefers the pool archetype that matches each missed bank question, then varies the archetype so two items in a row are not the same kind. Another drill in that session skips stems already shown.
- **Every other Junior stage** has no practice drill. The result offers another stage run only. Practice does not fall back to unused past papers, and it does not use Paper 1 generator pools.
- When a stage’s unused questions run out, retrying the stage draws from the full bank again.

The four practice pools live in `src/data/drillPools/` (`j7.json`, `j8.json`, `j9.json`, `j10.json`), 300 multiple-choice items each. They were converted from the Paper 2 scripts `POOLS.J7MC`, `POOLS.J8`, `POOLS.J9MC`, and `POOLS.J10`. J10 stems are built from the area and scale fields. `scripts/convert-drill-pools.mjs` repeats that conversion. `npm run check:drills` checks the stage-to-archetype mapping, that every practice item has choices A–D, and that a practice drill does not touch `used` or `cleared`.
- Act 2 (Compulsory Chapters 1–23) stays locked until every Junior stage on the map is cleared. Those chapters are stubs in this version.

## Question bank

`src/data/questions.json` holds the Junior questions (293). Each record has the stage, year, source tag, stem, choices A–D, the key, a facility percentage when the HKEAA Keys include one (`facilityPct`, also kept as `correctPercent`), a `difficulty` band, and a figure path when the paper has a diagram. Stems and choices use `\(...\)` for KaTeX. Diagrams are PNGs in `public/figures/`, extracted from the topic-sorted Paper 2 Word bank (Sample, Practice, and 2012–2025). Keys are the A–D letters in document order, aligned with all 683 tagged Paper 2 questions, then sliced to the Junior chapters. A Keys line like `A (60)` means 60% of candidates chose the correct answer.

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

After a wrong answer on a stage run, the review shows the correct letter and then the worked steps for that question. A correct answer stays as it is. A generated practice drill shows the pool’s own short marking (1M / 1A) instead, and does not link to mathseasy.

Steps are adapted from [Thomas Fok’s Paper II 題解 on mathseasy.hk](https://mathseasy.hk/). They are not original to this trainer. The review always shows that credit, and the link opens the year’s page on the tab that contains the question (1–10, 11–20, and so on). mathseasy does not publish a per-question anchor. Diagrams and whole-page captures are not stored; if a write-up depends on a figure, the app says so and links out. Two mensuration questions also link to Thomas Fok’s YouTube video when that is how the page explains them.

`src/data/solutions.json` is the companion file, keyed by question id. Each record has `solutionSteps` (text plus `\(...\)` / `\[...\]` for KaTeX), `solutionSourceUrl`, and `solutionCredit`. The static site reads this file. It does not scrape mathseasy in the browser.

Refresh it from the repo root:

```bash
python3 scripts/fetch_solutions.py
```

The script walks `https://mathseasy.hk/articles/hkdse-YYYY-p2-ans/` for 2012–2026 and `hkdse-2012pp-p2-ans` for the Practice Paper, then matches year + question number to the Junior bank. It prints questions it could not fill.

Coverage from the last run: **272 / 293** questions have steps. Every matched letter agrees with this bank’s key.

Gaps:

- **Sample Paper (18):** no Paper II 題解 page on mathseasy. The review shows the key only.
- **Diagram only (3):** Practice Q25, 2019 Q25, 2021 Q23. The page is a figure. The review links out and does not embed the image.
- **2026:** the fetch URL is included, but this Junior bank has no 2026 questions yet.

## Develop

```bash
npm install
npm run dev
npm run build
```

The Vite `base` is `/teachingapp/`, which matches GitHub Pages for this repository. `.github/workflows/pages.yml` builds the site and deploys `dist` from `main` with the Actions source.
