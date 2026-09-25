# Count · Arrange · Chance · Interest

An iPad-friendly visual lab for Hong Kong S4–S5 (DSE) mathematics: **permutation 排列**, **combination 組合**, **probability 概率**, **sequence 數列**, and **interest 利息**, plus a **HuLA / educational drone** simulator and **3D-print / Tinkercad** classroom labs for a Bambu Lab H2D. English UI with bilingual labels on key terms. No backend — a static SPA.

## Modules

1. **Counting tree** — independent choices grow a tree diagram; live product of stage sizes.
2. **Permutations (nPr)** — arrange *n* distinct items taking *r*; animate ordered slots; contrast with unordered groups.
3. **Combinations (nCr)** — select *r* from *n*; the dashed “bag” is unordered; live nCr vs nPr.
4. **Probability** — three labs (`#/probability`, `#/probability/sample`, `#/probability/exclusive`, `#/probability/independent`).

   - **Sample space 樣本空間** — equally likely outcomes; shade favourable A; relative-frequency trials toward theoretical P(A).
   - **Mutually exclusive 互斥** — eight-sector spinner. Shade A, B, and A ∩ B. When the events cannot happen together, P(A ∩ B) = 0 and P(A ∪ B) = P(A) + P(B). Turn on **Allow overlap 可重疊** to see why P(A) + P(B) double-counts the intersection.
   - **Independent 獨立** — two draws from a bag of 2 red and 2 blue, **with replacement 有放回** or **without replacement 不放回**, plus a coin-then-die check. P(A ∩ B) equals P(A) × P(B) only when the stages are independent. The tree and the equally likely grid stay in step.

5. **Sequence (Tₙ)** — four interactive pattern-growth labs (`#/sequence`, `#/sequence/1` … `#/sequence/4`). Step the figure with a slider, live-count the dots, read the recurrence, then MCQ. Closed-form reasoning stays behind a teacher toggle.

   | Lab | Recurrence | Geometry | Asked term |
   | --- | --- | --- | --- |
   | Q1 | T₁ = 4, Tₙ₊₁ = Tₙ + 4 | Hollow (n+1)×(n+1) frame | T₉ |
   | Q2 | T₁ = 4, Tₙ₊₁ = Tₙ + 3 | 2×2 corner, then an L of 3 each step | T₈ |
   | Q3 | T₁ = 3, Tₙ₊₁ = Tₙ + (2n+3) | (n+1)×(n+1) square minus one corner | T₆ |
   | Q4 | T₁ = 10, Tₙ₊₁ = Tₙ + (2n+5) | (n+2)×(n+2) square plus a tail dot | T₇ |

6. **Interest (P, I, A, R%)** — simple vs compound lab (`#/interest`, `#/interest/simple`, `#/interest/compound`, `#/interest/compare`). Sliders for principal, annual rate, and years; compound frequency yearly / half-yearly / quarterly / monthly. Stacked bars and a stepped timeline split principal from interest. Live substitution of the revision formulae; a short MCQ strip (MC16 J4 flavour, not the full paper).

   - Simple: \(I = P \times R\% \times n\), \(A = P(1 + R\% \times n)\)
   - Compound: \(A = P(1 + R\%)^n\), \(I = P(1 + R\%)^n - P\)
   - More frequent compounding uses period rate \(R\%/m\) and \(n \times m\) periods (\(m = 1,2,4,12\)).

7. **Drone / HuLA** — indoor educational-drone simulator (`#/drone`, `#/drone/manual`, `#/drone/program`, `#/drone/compare`). No aircraft and no HuLA APP required. The arena is a top-down classroom floor with a start pad, cones, and glowing waypoints. Grid squares are 50 cm. The red triangle on the drone is the nose.

   - **Manual 手動飛行** — Mode 2 (American) sticks: left hand is throttle and yaw, right hand is pitch and roll. Large buttons cover forward/back, strafe, yaw, take off, land, and hover. Live height, heading, and distance to the next waypoint. Visit the points in order. Battery drains while airborne.
   - **Program 程式飛行** — Scratch-like blocks: Take off, Land, Move forward (cm), Turn left/right (degrees), Wait (seconds), Repeat N. Run, Stop, and Clear. Run starts on the pad. Load an example: first hop (take off → forward → land), square path, or L around a cone. Line patrol is a fourth corridor script.
   - **Compare 比較** — the same mission by hand and with the matching sample program, then two reflection prompts (repeated demo vs flying by hand).

   This lab teaches manual control versus program control. It does not replace the HuLA APP, and it does not connect to a real HuLA EDU drone. Real flights need a clear indoor space and adult supervision.

8. **3D Print / Tinkercad** — browser sims before the real printer (`#/print3d`, also accepts `#/tinkercad`). Home card bilingual: 雙面文字 · 實用設計 · AI. These labs do not slice, do not call Meshy or Tripo3D, and do not send a file to the Bambu Lab H2D. Students rebuild the idea in Tinkercad, then an adult slices PLA in Bambu Studio (one object on the plate for a first print).

   | Lab | Route | What students do |
   | --- | --- | --- |
   | Hub | `#/print3d` | Three cycles. Safety note: the hotend stays in the real room, not in the browser. |
   | Cycle 7 · Dual text illusion 雙面文字 | `#/print3d/dual-text` | Short words for view A and view B (HI/BYE, YES/NO, 愛/心, school initials TN/IP). Orbit plus locked Front / Side / Top. Construction toggle shows extrude directions and the mirror plane. Stroke ≥ 3 mm, flat base, plate fit, then a simulated Export .stl that celebrates “ready for Tinkercad / Bambu Studio”. Real Tinkercad path: Text → Extrude → Mirror → Align. |
   | Cycle 8 · Functional design 實用設計 | `#/print3d/gadget` | Cable organizer 理線夾, bookmark 書籤, earphone holder 耳機座, or desk name stand 姓名座. Millimetre worksheet, live box-and-cylinder preview, group roles Measurer / Designer / Checker. Fit checks: hole ≥ 3 mm, wall ≥ 2–3 mm, flat base, overhang, H2D plate. Readiness score. Rebuild the numbers in Tinkercad — no browser STL. |
   | AI → Tinkercad | `#/print3d/ai` | Prompt coach (symmetry, flat base, solid, no thin spikes, simple silhouette) → simulated good/bad mesh gallery → evaluate → bounding-box size check (Tinkercad comfort about 200 mm, grid up to 1000 mm, H2D single nozzle 325 × 320 × 325 mm) → edit toggles (cut, hollow with walls, flat pad, thicken) → print check → Delightex checklist (cleaned, named, sized, flat). |

## Classroom link (GitHub Pages)

iPad Safari URL (public HTTPS, no classroom laptop on the LAN):

**https://tn-ip.github.io/teachingapp/**

1. Enable Pages (already done on this repo; listed for forks or a reset): **Settings → Pages → Source: GitHub Actions**.
2. Merge this branch to `main`.
3. Wait for the **Deploy GitHub Pages** workflow to succeed (Actions tab).
4. On the iPad, open the link above in Safari. Later pushes to `main` refresh the same URL.

Routing is hash-based (`#/counting`, `#/permutations`, `#/probability`, `#/probability/exclusive`, `#/probability/independent`, `#/sequence`, `#/sequence/1`, `#/interest`, `#/interest/compound`, `#/drone`, `#/drone/manual`, `#/drone/program`, `#/drone/compare`, `#/print3d`, `#/print3d/dual-text`, `#/print3d/gadget`, `#/print3d/ai`, …), so modules work under the `/teachingapp/` subpath and a reload does not 404. Sequence, Interest, probability, the drone labs, and the 3D-print labs ship in the same static build — no extra workflow. Later pushes to `main` refresh **https://tn-ip.github.io/teachingapp/** via the existing **Deploy GitHub Pages** action.

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

Vite + React + TypeScript. Visuals are SVG/DOM — no charting library. Probability formulae use KaTeX.

## Notation

- Counting principle: \(n_1 \times n_2 \times \cdots\)
- \(nPr = n! / (n-r)!\)
- \(nCr = n! / (r!(n-r)!) = nPr / r!\)
- \(P(A) = n(A)/n(S)\) when outcomes are equally likely
- Mutually exclusive 互斥: \(P(A \cap B) = 0\) and \(P(A \cup B) = P(A) + P(B)\)
- In general: \(P(A \cup B) = P(A) + P(B) - P(A \cap B)\)
- Independent 獨立: \(P(A \cap B) = P(A) \times P(B)\). Without replacement the product rule fails.
- Sequences: \(T_1\) given, \(T_{n+1} = T_n + d(n)\); arithmetic when \(d\) is constant
- Simple interest: \(I = P \times R\% \times n\), \(A = P(1 + R\% \times n)\)
- Compound interest: \(A = P(1 + R\%)^n\), \(I = A - P\); period rate \(R\%/m\) when compounded \(m\) times a year
