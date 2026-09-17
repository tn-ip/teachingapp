# Count · Arrange · Chance

An iPad-friendly visual lab for Hong Kong S4–S5 (DSE) mathematics: **permutation 排列**, **combination 組合**, and **probability 概率**. English UI with bilingual labels on key terms. No backend — a static SPA.

## Modules

1. **Counting tree** — independent choices grow a tree diagram; live product of stage sizes.
2. **Permutations (nPr)** — arrange *n* distinct items taking *r*; animate ordered slots; contrast with unordered groups.
3. **Combinations (nCr)** — select *r* from *n*; the dashed “bag” is unordered; live nCr vs nPr.
4. **Probability P(A)** — equally likely sample space; shade favourable outcomes; optional relative-frequency trials toward theoretical P.

## Run locally

```bash
npm install
npm run dev
```

Then open the printed URL (typically `http://localhost:5173`) in a browser.

Production build:

```bash
npm run build
npm run preview
```

## iPad / classroom notes

- **Safari on iPad** is the target. Large tap targets (48px+), no hover-only controls, portrait and landscape layouts.
- On a classroom network, `npm run dev` already binds `--host` so other devices can open `http://<teacher-laptop-ip>:5173`.
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
