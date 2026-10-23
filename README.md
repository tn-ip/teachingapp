# DSE Maths Paper 2 trainer

Junior-stage trainer for HKDSE Mathematics Compulsory Part **Paper 2** multiple choice. Stage 1 is the Junior (J) topics. Act 2, the compulsory chapters, stays locked until those stages are cleared.

Open it on an iPad at [https://tn-ip.github.io/teachingapp/](https://tn-ip.github.io/teachingapp/) (after this branch is merged and GitHub Pages is set to deploy from Actions). In Safari, use **Share → Add to Home Screen** so it opens full screen. Progress stays on that iPad in `localStorage`. There is no login.

## How a stage works

- Any Junior stage can be started. Nothing inside the Junior path is sequential. J6 is not in the bank, so the map skips it.
- A stage run is up to **5 real DSE questions** from that stage. If the stage has fewer than 5, the run uses all of them.
- The run warms up **Easy → Medium → Unknown → Hard**, filling from the easier pool first. Each question shows a light difficulty chip (Easy, Medium, Hard, or — when the facility is not tagged yet).
- The stage clears only when **every** question in that run is correct (5/5, or 3/3, and so on).
- A wrong answer does not clear the stage. The next step is a **consolidate drill**: up to 5 questions from the same stage that have not been used yet. The drill prefers the missed question’s band, or an easier band, when those questions are still unused. Drills are real bank questions only. A drill does not clear the stage.
- When a stage’s unused questions run out, retrying the stage draws from the full bank again.
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

## Develop

```bash
npm install
npm run dev
npm run build
```

The Vite `base` is `/teachingapp/`, which matches GitHub Pages for this repository. `.github/workflows/pages.yml` builds the site and deploys `dist` from `main` with the Actions source.
