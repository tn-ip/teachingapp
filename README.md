# Count · Arrange · Chance

An iPad-friendly visual lab for Hong Kong S4–S5 (DSE) mathematics: **permutation 排列**, **combination 組合**, and **probability 概率**. English UI with bilingual labels on key terms. No backend — a static SPA.

## Modules

1. **Counting tree** — independent choices grow a tree diagram; live product of stage sizes.
2. **Permutations (nPr)** — arrange *n* distinct items taking *r*; animate ordered slots; contrast with unordered groups.
3. **Combinations (nCr)** — select *r* from *n*; the dashed “bag” is unordered; live nCr vs nPr.
4. **Probability P(A)** — equally likely sample space; shade favourable outcomes; optional relative-frequency trials toward theoretical P.

## Classroom link (GitHub Pages)

After this is merged to `main` and the **Deploy GitHub Pages** workflow succeeds, open the app on an iPad in Safari:

**https://tn-ip.github.io/teachingapp/**

Pages source is already **GitHub Actions** in the repo settings. No extra Pages setup is required. The first deploy after merge publishes the HTTPS link above; later pushes to `main` update it.

Hash routes (`#/counting`, `#/permutations`, …) work under that subpath, so a reload on a module URL does not 404.

## Run locally

```bash
npm install
npm run dev
```

Because the production site lives at `/teachingapp/`, the dev server uses the same base. Open:

`http://localhost:5173/teachingapp/`

(not the site root). Production build:

```bash
npm run build
npm run preview
```

Preview is at `http://localhost:4173/teachingapp/`.

## iPad / classroom notes

- **Safari on iPad** is the target. Large tap targets (48px+), no hover-only controls, portrait and landscape layouts.
- Prefer the public Pages URL on school Wi‑Fi so the classroom computer does not need to stay on the LAN.
- For a local demo, `npm run dev` binds `--host`; open `http://<teacher-laptop-ip>:5173/teachingapp/`.
- Add to Home Screen (Share → Add to Home Screen) for a full-tab teaching view.
- Landscape gives a side-by-side visualisation + formula panel; portrait stacks the same content.
- Keep *n* small on purpose so every arrangement or outcome can be drawn, not just counted.
- If the page feels zoomed after a double-tap, buttons use `touch-action: manipulation` to reduce accidental zoom.

## Stack

Vite + React + TypeScript. Visuals are SVG/DOM — no charting library.

## Notation

- Counting principle: \(n_1 \times n_2 \times \cdots\)
- \(nPr = n! / (n-r)!\)
- \(nCr = n! / (r!(n-r)!) = nPr / r!\)
- \(P(A) = n(A)/n(S)\) when outcomes are equally likely
