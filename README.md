# DSE Maths Paper 2 trainer

Junior-stage trainer for HKDSE Mathematics Compulsory Part **Paper 2** multiple choice. Stage 1 is the Junior (J) topics. Act 2, the compulsory chapters, stays locked until those stages are cleared.

Open it on an iPad at [https://tn-ip.github.io/teachingapp/](https://tn-ip.github.io/teachingapp/) (after this branch is merged and GitHub Pages is set to deploy from Actions). In Safari, use **Share → Add to Home Screen** so it opens full screen. Progress stays on that iPad in `localStorage`. There is no login.

## How a stage works

- Any Junior stage can be started. Nothing inside the Junior path is sequential. J6 is not in the bank, so the map skips it.
- A stage run is up to **5 real DSE questions** from that stage. If the stage has fewer than 5, the run uses all of them.
- The stage clears only when **every** question in that run is correct (5/5, or 3/3, and so on).
- A wrong answer does not clear the stage. The next step is a **consolidate drill**: up to 5 questions from the same stage that have not been used yet. Drills are real bank questions only. A drill does not clear the stage.
- When a stage’s unused questions run out, retrying the stage draws from the full bank again.
- Act 2 (Compulsory Chapters 1–23) stays locked until every Junior stage on the map is cleared. Those chapters are stubs in this version.

## Question bank

`src/data/questions.json` holds the Junior questions (293). Each record has the stage, year, source tag, stem, choices A–D, the key, and a figure path when the paper has a diagram. Stems and choices use `\(...\)` for KaTeX. Diagrams are PNGs in `public/figures/`, extracted from the topic-sorted Paper 2 Word bank (Sample, Practice, and 2012–2025). Keys are the A–D letters in document order, aligned with all 683 tagged Paper 2 questions, then sliced to the Junior chapters.

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
