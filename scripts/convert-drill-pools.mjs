/**
 * Turn Weekly Question Generator Paper 2 pool scripts into JSON the Vite app can import.
 *
 *   node scripts/convert-drill-pools.mjs j7mc_pool.js j8_pool.js j9mc_pool.js j10_pool.js
 *
 * Pool keys: J7MC, J8, J9MC, J10. J10 items have no stem; this script builds one
 * from the area / scale fields. `$...$` becomes `\(...\)` for MathView.
 */
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("src/data/drillPools");

const SOURCES = [
  { file: 0, key: "J7MC", stage: "J7" },
  { file: 1, key: "J8", stage: "J8" },
  { file: 2, key: "J9MC", stage: "J9" },
  { file: 3, key: "J10", stage: "J10" },
];

function loadPool(file, key) {
  const src = fs.readFileSync(file, "utf8");
  const pool = new Function(
    "POOLS",
    `${src}\nreturn POOLS[${JSON.stringify(key)}];`,
  )({});
  if (!pool?.questions?.length) {
    throw new Error(`No questions in ${file} (POOLS.${key})`);
  }
  return pool.questions;
}

function dollarsToKatex(value) {
  return String(value ?? "").replace(/\$([^$]*)\$/g, (_, inner) => `\\(${inner}\\)`);
}

function fmt(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1e6) / 1e6);
}

function unitName(unit) {
  const name = String(unit ?? "")
    .replace(/\\textsuperscript\{2\}/g, "")
    .replace(/[^a-zA-Z]/g, "");
  return name || "cm";
}

function quantity(n, unit) {
  return `\\(${fmt(n)}\\ \\mathrm{${unitName(unit)}}^{2}\\)`;
}

function article(item) {
  const first = String(item).trim().split(/\s+/)[0] ?? "";
  if (first.toLowerCase() === "university") return "a";
  return /^[aeiou]/i.test(first) ? "an" : "a";
}

function stemJ10(q) {
  const item = String(q.item);
  const art = article(item);
  if (q.subtype === 1) {
    return `The actual area of ${art} ${item} is ${quantity(q.A, q.unitA)}. If the area of the ${item} on a map is ${quantity(q.M, q.unitM)}, then the scale of the map is`;
  }
  if (q.subtype === 2) {
    return `The scale of a map is \\(1 : ${fmt(q.scale)}\\). If the area of ${art} ${item} on the map is ${quantity(q.M, "cm\\textsuperscript{2}")}, then the actual area of the ${item} is`;
  }
  if (q.subtype === 3) {
    return `The scale of a map is \\(1 : ${fmt(q.scale)}\\). If the actual area of ${art} ${item} is ${quantity(q.A, q.unitA)}, then the area of the ${item} on the map is`;
  }
  throw new Error(`Unknown J10 subtype ${q.subtype}`);
}

function choicesOf(options, label) {
  const choices = {};
  let answer = null;
  for (const opt of options ?? []) {
    const letter = String(opt.l ?? "").trim().toUpperCase();
    if (!"ABCD".includes(letter) || letter.length !== 1) {
      throw new Error(`${label} has option letter ${opt.l}`);
    }
    choices[letter] = dollarsToKatex(opt.v);
    if (opt.c) {
      if (answer) throw new Error(`${label} has two correct options`);
      answer = letter;
    }
  }
  for (const letter of ["A", "B", "C", "D"]) {
    if (!choices[letter]) throw new Error(`${label} is missing option ${letter}`);
  }
  if (!answer) throw new Error(`${label} has no correct option`);
  return { choices, answer };
}

function convert(raw, stage, index) {
  const id = `wqg-${stage}-${String(index + 1).padStart(3, "0")}`;
  const { choices, answer } = choicesOf(raw.options, id);
  const ansLetter = String(raw.ans ?? "").trim().charAt(0).toUpperCase();
  if (ansLetter && ansLetter !== answer) {
    throw new Error(`${id} ans ${raw.ans} disagrees with c:true (${answer})`);
  }
  const stem = stage === "J10" ? stemJ10(raw) : dollarsToKatex(raw.q);
  if (!stem || stem.includes("$")) throw new Error(`${id} stem still has $ or is empty`);
  for (const letter of ["A", "B", "C", "D"]) {
    if (choices[letter].includes("$")) throw new Error(`${id} option ${letter} still has $`);
  }
  const tpl = stage === "J10" ? `S${raw.subtype}` : String(raw.tpl || raw.subtype || "");
  if (!tpl) throw new Error(`${id} has no tpl`);
  const steps = (raw.steps ?? []).map((step) => {
    const text = dollarsToKatex(step.ex);
    if (text.includes("$")) throw new Error(`${id} step still has $`);
    return { mark: String(step.m ?? ""), text, note: String(step.note ?? "") };
  });
  if (steps.length === 0) throw new Error(`${id} has no steps`);
  return { id, tpl, stem, choices, answer, steps };
}

const args = process.argv.slice(2);
if (args.length !== 4) {
  console.error("Usage: node scripts/convert-drill-pools.mjs <j7mc> <j8> <j9mc> <j10>");
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const source of SOURCES) {
  const raws = loadPool(args[source.file], source.key);
  const items = raws.map((raw, index) => convert(raw, source.stage, index));
  const stems = new Set(items.map((item) => item.stem));
  const tpls = {};
  for (const item of items) tpls[item.tpl] = (tpls[item.tpl] ?? 0) + 1;
  const file = path.join(OUT_DIR, `${source.stage.toLowerCase()}.json`);
  fs.writeFileSync(file, `[\n${items.map((item) => JSON.stringify(item)).join(",\n")}\n]\n`);
  console.log(
    `${source.stage} ← POOLS.${source.key}: ${items.length} items, ${stems.size} unique stems, tpl ${JSON.stringify(tpls)} → ${path.relative(process.cwd(), file)}`,
  );
}
