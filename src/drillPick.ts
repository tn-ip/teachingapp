/**
 * Skill tags for a missed bank question, and the draw for a generated drill.
 *
 * Archetypes are the pool `tpl` values (J10 map scale is M1–M3; ratio and rate are R1–R3).
 * A miss maps onto those tags only when the stem is a clear example of that pattern.
 * Anything else is left untagged. For stages other than J1, J7, J9, and J11,
 * an untagged miss still shuffles the whole pool. J1, J7, J9, and J11 do not:
 * each wrong bank question draws exactly two items of its own tag, or a
 * Choose bucket, or nothing.
 *
 * Anti-adjacent is the stronger rule for that five-item draw: the next item
 * is a different tpl whenever another one is still available. One matched tag
 * therefore fills 3 of 5 places (1st, 3rd, 5th) and the other two places are
 * different tags. Generator bands break the remaining ties. An unmatched
 * drill takes Easy archetypes before Medium and Hard. A filler is the easiest
 * different archetype still available. J7–J9 items have no band, so this
 * tie-break does not change those draws. The J1, J7, J9, and J11 remedial
 * pairs do not use that five-item draw.
 *
 * J7 Indices
 * - I6 reciprocal of a power, times another power: (1/9^555)·3^444
 * - I3 negative index, and also I2 or I4 when that negative index sits in a quotient
 * - I4 quotient of integer bases with the same prime (8^n/4^n)
 * - I2 quotient with a letter base: (2x^4)^3 / 2x^5
 * - I5 integer bases, no fraction: 8^222·5^666, 4^{n+2}3^{2n+4}
 * - I1 (number × letter)^power times a power of that letter
 * - no tag when the stem is none of those (for example x^3(2x+x))
 * A mapped miss then takes exactly two pool items of the primary tpl (a
 * different stem in the pair). A soft dual stays on the pedigree. The drill
 * uses the dominant trap only: a negative index wins over the quotient it
 * sits in (I3, not I2 or I4). There is no seventh I tag. With no I tag, a
 * WQG Choose bucket may still apply: PQN product / quotient / negative →
 * I1|I2|I3, I4 same-base with n → I4, DBR different bases or reciprocal ×
 * power → I5|I6. Easy before Medium before Hard inside the bucket. J7 items
 * have no generator band, so a Choose pair is a shuffle when every item is
 * unbanded. A stem that matches none of those is left unmatched. Those two
 * slots are skipped. They are not filled from the rest of the pool, and no
 * new I tag is invented for them. Teaching App will ask DSE Math Check +
 * Weekly Question Generator for unmatched stems.
 *
 * J8 Identities
 * - ID2 the asked value is a ratio (a:b or a:b:c)
 * - ID4 a binomial square and a product that has an extra added term
 * - ID3 product of two linears equal to a binomial square plus a constant
 * - ID1 every other identity (compare coefficients for one constant)
 *
 * J9 Factorization / expansion
 * - F5 product of brackets, then add or subtract another term
 * - F3 a square minus a square: a bracket or a whole number as one square,
 *   or a pure difference of squares (x^2 − y^2, x^2 − 9) with nothing else
 * - F2 a product of brackets to expand
 * - F1 grouping / difference of squares ± linear terms (u^2 − v^2 − 5u + 5v,
 *   or a^2 − b^2 + 2b − 1). The square coefficients are perfect squares.
 *   There is no cross term (mn, xy).
 * - F4 a quadratic with a cross term plus at least one linear term
 * - no tag when the stem is none of those
 * A mapped miss then takes exactly two pool items of that tpl (a different
 * stem in the pair). With no F tag, a WQG Choose bucket may still apply:
 * QL → F1|F4, DS → F3, EX → F2|F5. J9 items have no generator band, so the
 * pair is a shuffle inside the bucket. A stem that matches none of those is
 * left unmatched. Those two slots are skipped. They are not filled from the
 * rest of the pool, and no new F tag is invented for them. Teaching App will
 * ask DSE Math Check + Weekly Question Generator for unmatched stems.
 *
 * J10 Ratio, rate, map scale
 * - M1 actual area and map area given, ask for the scale
 * - M2 scale and map area given, ask for the actual area
 * - M3 scale and actual area given, ask for the map area
 * - no tag for ratio, speed, or mixture stems. The drill then shuffles the pool.
 *
 * J1 Change of subjects
 * - CS7 sum of two single-letter fractions equals an integer: a/x + b/y = 3
 * - CS4 two fractions whose denominators are a constant or one letter
 * - CS8 fraction = fraction, and a denominator is a sum or difference
 * - CS5 the formula is already solved for one letter, and the asked letter
 *   sits in a denominator: k = 5/(2m) + n, or h = 3 - 5/(k+4)
 * - CS6 capital·letter = (integer·letter + capital)·capital
 * - CS3 integer(letter ± letter) = a linear expression
 * - CS1 letter(letter ± integer) = a linear expression
 * - CS2 (integer ± letter) / letter = integer, or a plain linear equation
 *   such as 5 − 3m = 2n
 * - no tag when the stem is none of those shapes
 * A mapped miss then takes exactly two pool items of that tpl (a different
 * stem in the pair). With no CS tag, a WQG Choose bucket may still apply:
 * CF cross / proportion → CS4|CS8, BR brackets / expand → CS1|CS3,
 * FR formula / fractions → CS5|CS6|CS7, LN linear rearrange → CS2.
 * Easy before Medium before Hard inside the bucket. A stem that matches
 * none of those is left unmatched. Those two slots are skipped. They are
 * not filled from the rest of the pool, and no new CS tag is invented for
 * them. Teaching App will ask DSE Math Check + Weekly Question Generator
 * for unmatched stems.
 *
 * J2 Significant figure and J18 Sequences
 * - no tag. J2 practice items are RS1–RS8 (rounding statements and ranges)
 *   and J18 items are SQ1–SQ8. Bank stems are not mapped onto those tags, so
 *   a miss warms up the whole pool Easy, then Medium, then Hard, the same
 *   way an unmapped stage drill does.
 *
 * J11 Simultaneous equations
 * - SE7 a journey at two speeds
 * - SE6 the sum and the product of two positive numbers
 * - SE5 ticket prices, and one quantity is a multiple of the other
 * - SE4 one person has several times as many, then gives some away
 * - SE3 a ratio of two groups and a total
 * - SE2 one group is a percentage more or less than the other
 * - SE1 two linear equations, a chain of equal expressions, or the price of two items
 * - no tag when the stem is none of those
 * A mapped miss then takes exactly two pool items of that tpl (a different
 * stem in the pair). With no SE tag, a WQG Choose bucket may still apply:
 * Prices/%% → SE1|SE2, story (ratio, transfer, tickets) → SE3|SE4|SE5,
 * other equation or two-leg speed wording → SE6|SE7, Easy before Medium
 * before Hard inside the bucket. A stem that matches none of those is left
 * unmatched. Those two slots are skipped. They are not filled from the rest
 * of the pool, and no new SE tag is invented for them.
 *
 * J4 Percentage, J16 Statistics, J19 S3 Probability, C2 Quadratic equations (II),
 * C3 Functions and Graphs, C4 Polynomials, C11 Variations, and C17 Inequalities
 * - no tag. A miss warms up the whole pool Easy, then Medium, then Hard,
 *   the same way an unmapped stage drill does.
 *
 * When several misses match, the drill prefers the union of those tags.
 * If two matched tags are both allowed, the easier band is taken first.
 */

import { BAND_RANK, type Difficulty } from "./bank";

export type PoolItem = {
  id: string;
  tpl: string;
  stem: string;
  /** Generator band. Omitted on J7–J9, which stay unordered by difficulty. */
  difficulty?: Difficulty;
};

export function skillsForStem(stageId: string, stem: string): string[] {
  if (stageId === "J1") return skillsJ1(stem);
  if (stageId === "J7") return skillsJ7(stem);
  if (stageId === "J8") return skillsJ8(stem);
  if (stageId === "J9") return skillsJ9(stem);
  if (stageId === "J10") return skillsJ10(stem);
  if (stageId === "J11") return skillsJ11(stem);
  return [];
}

export function skillsForMisses(stageId: string, stems: readonly string[]): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();
  for (const stem of stems) {
    for (const skill of skillsForStem(stageId, stem)) {
      if (seen.has(skill)) continue;
      seen.add(skill);
      skills.push(skill);
    }
  }
  return skills;
}

export function plainMath(stem: string): string {
  return stem
    .replace(/\\equiv/g, "=")
    .replace(/≡/g, "=")
    .replace(/[−–—]/g, "-")
    .replace(/\\\(|\\\)/g, "")
    .replace(/\\(alpha|beta|gamma)/g, (_, name: string) => {
      if (name === "alpha") return "α";
      if (name === "beta") return "β";
      return "γ";
    })
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function compact(stem: string): string {
  return stem
    .replace(/\\\(|\\\)/g, "")
    .replace(/\s+/g, "")
    .replace(/[−–—]/g, "-");
}

function baseVariables(stem: string): string {
  let text = stem
    .replace(/\\(alpha|beta|gamma)/g, (_, name: string) => {
      if (name === "alpha") return "α";
      if (name === "beta") return "β";
      return "γ";
    })
    .replace(/\\\(|\\\)/g, "")
    .replace(/\s+/g, "");
  for (let i = 0; i < 8; i += 1) {
    const next = text.replace(/\^\{[^{}]*\}/g, "");
    if (next === text) break;
    text = next;
  }
  text = text.replace(/\\[a-zA-Z]+/g, "");
  return text.replace(/[^a-zA-Zα-ω]/g, "");
}

function skillsJ7(stem: string): string[] {
  const text = compact(stem);
  const negative = /\^\{-/.test(text);
  const fraction = /\\(?:d)?frac/.test(text);
  const reciprocal = /\\(?:d)?frac\{1\}/.test(text);
  const numeric = baseVariables(stem).length === 0;
  if (reciprocal && !negative) return ["I6"];
  if (negative && fraction) return numeric ? ["I3", "I4"] : ["I3", "I2"];
  if (negative) return ["I3"];
  if (fraction) return [numeric ? "I4" : "I2"];
  if (numeric) return ["I5"];
  if (/\(\d*[a-zα-ω]\)\^/.test(text) && (text.includes("·") || text.includes("\\cdot"))) {
    return ["I1"];
  }
  return [];
}

function skillsJ8(stem: string): string[] {
  const lower = stem.toLowerCase();
  const thenAt = lower.lastIndexOf("then");
  const tail = thenAt >= 0 ? stem.slice(thenAt) : stem;
  if (tail.includes(":")) return ["ID2"];
  const text = plainMath(stem);
  const square = /\([^()]*\)\^2/.test(text);
  const productThenExtra = /\([^()]+\)\([^()]+\)[+-]/.test(text);
  const product = /\([^()]+\)\([^()]+\)/.test(text);
  if (square && product) return [productThenExtra ? "ID4" : "ID3"];
  return ["ID1"];
}

const J9_VAR = "a-zα-ωℓ";

type J9Factor = { v: string; power: number };

type J9Term = { coeff: number; factors: J9Factor[] };

function j9Expression(stem: string): string {
  return plainMath(stem).replace(/[.=]+$/u, "");
}

function parseJ9Factor(token: string): J9Factor | null {
  const match = new RegExp(`^([${J9_VAR}])(?:\\^(\\d+))?$`, "u").exec(token);
  if (!match) return null;
  const power = match[2] ? Number(match[2]) : 1;
  if (!Number.isInteger(power) || power < 1) return null;
  return { v: match[1], power };
}

function parseJ9Term(raw: string, sign: number): J9Term | null {
  if (/^\d+$/u.test(raw)) {
    const coeff = sign * Number(raw);
    return coeff === 0 ? null : { coeff, factors: [] };
  }
  const match = new RegExp(
    `^(\\d+)?([${J9_VAR}](?:\\^\\d+)?)([${J9_VAR}](?:\\^\\d+)?)?$`,
    "u",
  ).exec(raw);
  if (!match) return null;
  const magnitude = match[1] ? Number(match[1]) : 1;
  if (!Number.isInteger(magnitude) || magnitude <= 0) return null;
  const factors = [match[2], match[3]]
    .filter((token): token is string => Boolean(token))
    .map(parseJ9Factor);
  if (factors.some((factor) => factor == null)) return null;
  return { coeff: sign * magnitude, factors: factors as J9Factor[] };
}

/** Sum of terms, or null when the stem is not a plain polynomial. */
function parseJ9Polynomial(text: string): J9Term[] | null {
  const body = text.replace(/·/g, "");
  if (!body || /[()=]/u.test(body)) return null;
  const parts = [...body.matchAll(/(^|[+-])([^+-]+)/gu)];
  if (parts.length === 0 || parts.map((part) => part[0]).join("") !== body) return null;
  const terms: J9Term[] = [];
  for (const part of parts) {
    const term = parseJ9Term(part[2], part[1] === "-" ? -1 : 1);
    if (!term) return null;
    terms.push(term);
  }
  return terms;
}

function j9Degree(term: J9Term): number {
  return term.factors.reduce((sum, factor) => sum + factor.power, 0);
}

function j9Square(term: J9Term): boolean {
  return term.factors.length === 1 && term.factors[0].power === 2;
}

function j9Linear(term: J9Term): boolean {
  return term.factors.length === 1 && term.factors[0].power === 1;
}

function j9Constant(term: J9Term): boolean {
  return term.factors.length === 0;
}

function j9Cross(term: J9Term): boolean {
  return term.factors.length === 2 && term.factors.every((factor) => factor.power === 1);
}

function perfectSquare(value: number): boolean {
  if (value < 1) return false;
  const root = Math.round(Math.sqrt(value));
  return root * root === value;
}

/**
 * Difference of squares plus or minus linear terms, factored by grouping.
 * Square coefficients are perfect squares (1·v^2, 4k^2, …). A constant may
 * complete one square, as in a^2 − b^2 + 2b − 1.
 */
function isGroupingDiffSq(terms: readonly J9Term[]): boolean {
  const squares = terms.filter(j9Square);
  const linears = terms.filter(j9Linear);
  const constants = terms.filter(j9Constant);
  if (squares.length + linears.length + constants.length !== terms.length) return false;
  if (squares.length !== 2 || linears.length < 1) return false;
  const [first, second] = squares;
  if (first.factors[0].v === second.factors[0].v) return false;
  if (Math.sign(first.coeff) === Math.sign(second.coeff)) return false;
  if (!perfectSquare(Math.abs(first.coeff)) || !perfectSquare(Math.abs(second.coeff))) return false;
  const variables = new Set([first.factors[0].v, second.factors[0].v]);
  return linears.every((term) => variables.has(term.factors[0].v));
}

/** Quadratic cross term (xy, mn) together with a square and a linear term. */
function isQuadPlusLinear(terms: readonly J9Term[]): boolean {
  if (terms.some((term) => j9Degree(term) > 2)) return false;
  const squares = terms.filter(j9Square);
  const linears = terms.filter(j9Linear);
  const crosses = terms.filter(j9Cross);
  const constants = terms.filter(j9Constant);
  if (squares.length + linears.length + crosses.length + constants.length !== terms.length) return false;
  return squares.length >= 1 && linears.length >= 1 && crosses.length >= 1;
}

/** Two squares, or one square and a perfect-square constant, and nothing else. */
function isPureDiffSquares(terms: readonly J9Term[]): boolean {
  if (terms.length !== 2) return false;
  const squares = terms.filter(j9Square);
  if (squares.length === 2) {
    const [first, second] = squares;
    if (first.factors[0].v === second.factors[0].v) return false;
    if (Math.sign(first.coeff) === Math.sign(second.coeff)) return false;
    return perfectSquare(Math.abs(first.coeff)) && perfectSquare(Math.abs(second.coeff));
  }
  const square = terms.find(j9Square);
  const constant = terms.find(j9Constant);
  if (!square || !constant) return false;
  if (Math.sign(square.coeff) === Math.sign(constant.coeff)) return false;
  return perfectSquare(Math.abs(square.coeff)) && perfectSquare(Math.abs(constant.coeff));
}

function skillsJ9(stem: string): string[] {
  const text = j9Expression(stem);
  if (/\([^()]+\)\([^()]+\)[+-]/u.test(text)) return ["F5"];
  if (/\)\^2-|-\([^()]+\)\^2|\d\^2/u.test(text)) return ["F3"];
  if (text.startsWith("(") && text.includes(")(")) return ["F2"];
  const terms = parseJ9Polynomial(text);
  if (!terms) return [];
  if (isGroupingDiffSq(terms)) return ["F1"];
  if (isQuadPlusLinear(terms)) return ["F4"];
  if (isPureDiffSquares(terms)) return ["F3"];
  return [];
}

function askedVariable(stem: string): string | null {
  const thenAt = stem.toLowerCase().lastIndexOf("then");
  if (thenAt < 0) return null;
  const tail = compact(stem.slice(thenAt + 4));
  const named = tail.match(/\\(alpha|beta|gamma)/);
  if (named) {
    if (named[1] === "alpha") return "α";
    if (named[1] === "beta") return "β";
    return "γ";
  }
  return tail.match(/[a-zα-ω]/)?.[0] ?? null;
}

function equationHead(text: string): string {
  return text.split(/,then|then/i)[0] ?? text;
}

/** Integer, or one letter with an optional integer coefficient. Signs split terms. */
function isLinearSide(side: string): boolean {
  const parts = side.match(/[+-]?[^+-]+/g);
  if (!parts || parts.join("") !== side) return false;
  return parts.every((part) => /^[+-]?(?:\d+[a-zα-ω]|[a-zα-ω]|\d+)$/.test(part));
}

/** 5 − 3m = 2n: no fractions, no brackets, each term a number or one letter. */
function isPlainLinear(text: string): boolean {
  const head = equationHead(text).replace(/^If/i, "");
  if (/\\|[()^{}]/.test(head)) return false;
  if (!/^[0-9a-zα-ω+=-]+$/.test(head)) return false;
  const sides = head.split("=");
  if (sides.length !== 2 || sides.some((side) => side.length === 0)) return false;
  return sides.every(isLinearSide) && /[a-zα-ω]/.test(head);
}

function denominatorHolds(text: string, letter: string): boolean {
  return [...text.matchAll(/\\frac\{[^{}]*\}\{([^{}]*)\}/g)].some((match) => match[1].includes(letter));
}

/**
 * A fraction mixed with a plain number, and the asked letter sits in a
 * denominator. (a+4b)/(2a) = 2 + b/a is CS5. A pure fraction = fraction
 * stays CS4 or CS8.
 */
function cs5MixedFraction(stem: string, text: string): boolean {
  const asked = askedVariable(stem);
  if (!asked || !denominatorHolds(text, asked)) return false;
  const head = equationHead(text);
  if (/\\frac\{[^{}]*\}\{[^{}]*\}=\\frac\{/.test(head)) return false;
  return /=\d+[+-]\\frac\{/.test(head) || /\\frac\{[^{}]*\}\{[^{}]*\}[+-]\d/.test(head);
}

function skillsJ1(stem: string): string[] {
  const text = compact(stem);
  if (/\\frac\{[^{}+-]+\}\{[a-zα-ω]\}\+\\frac\{[^{}+-]+\}\{[a-zα-ω]\}=\d/.test(text)) {
    return ["CS7"];
  }
  const proportion = text.match(/\\frac\{([^{}]*)\}\{([^{}]*)\}=\\frac\{([^{}]*)\}\{([^{}]*)\}/);
  if (proportion) {
    const dens = [proportion[2], proportion[4]];
    if (dens.every((den) => /^(?:\d+|[a-zα-ω])$/.test(den))) return ["CS4"];
    if (dens.some((den) => /[+-]/.test(den))) return ["CS8"];
  }
  if (/^If(?:[a-zα-ω]|\\(?:alpha|beta|gamma))=/.test(text)) {
    const asked = askedVariable(stem);
    if (asked && denominatorHolds(text, asked)) return ["CS5"];
  }
  if (/[A-Z][a-z]=\(\d+[a-z]\+[A-Z]\)[A-Z]/.test(text)) return ["CS6"];
  if (/\d+\([a-z][+-]\d+[a-z]\)/.test(text)) return ["CS3"];
  if (/\d+\([a-zα-ω][+-]\d+\)/.test(text)) return ["CS3"];
  if (/[a-z]\([a-z][+-]\d+\)/.test(text)) return ["CS1"];
  if (/[a-zα-ω]\([^()]*[+-][^()]*\)/.test(text)) return ["CS1"];
  if (/\([^()]*[+-][^()]*\)\([^()]*[+-][^()]*\)/.test(text)) return ["CS1"];
  if (/\\frac\{\d+\+?\d*[a-z]\}\{[a-z]\}=\d/.test(text)) return ["CS2"];
  if (cs5MixedFraction(stem, text)) return ["CS5"];
  if (isPlainLinear(text)) return ["CS2"];
  return [];
}

function skillsJ11(stem: string): string[] {
  const prose = stem.toLowerCase().replace(/\s+/g, " ");
  if (prose.includes("km/h") || prose.includes("travels from town")) return ["SE7"];
  if (prose.includes("sum of two") && prose.includes("product")) return ["SE6"];
  if (prose.includes("ticket")) return ["SE5"];
  if (prose.includes("times as many")) return ["SE4"];
  if (prose.includes("ratio") && prose.includes("total")) return ["SE3"];
  if (prose.includes("%") && (prose.includes("more than") || prose.includes("less than"))) {
    return ["SE2"];
  }
  if (prose.includes("price of") || prose.includes("cost of")) return ["SE1"];
  const head = compact(stem).split(/then/i)[0] ?? "";
  const equals = head.split("=").length - 1;
  if (equals >= 2) return ["SE1"];
  if (equals >= 1 && /(^|[^a-zα-ω])and([^a-zα-ω]|$)/.test(head)) return ["SE1"];
  return [];
}

/** Two generated items for each wrong J1, J9, or J11 bank question. */
export const DRILLS_PER_MISS = 2;

const J11_SKILLS = ["SE1", "SE2", "SE3", "SE4", "SE5", "SE6", "SE7"] as const;

export type MissTarget = {
  tpls: string[];
  /** Direct `skillsForStem` hit, or a coarser WQG Choose bucket. */
  via: "skill" | "bucket";
};

export type J11MissTarget = MissTarget;

const J9_SKILLS = ["F1", "F2", "F3", "F4", "F5"] as const;

/**
 * F tags for one J9 bank stem.
 * A `skillsForStem` hit is that tpl. With no F tag, a WQG Choose bucket may
 * still apply: QL → F1|F4, DS → F3, EX → F2|F5.
 * A stem that matches none of those returns null.
 * Teaching App will ask DSE Math Check + Weekly Question Generator for
 * unmatched stems. Do not invent a new F tag for them.
 */
export function j9MissTarget(stem: string): MissTarget | null {
  const skills = skillsForStem("J9", stem).filter((tpl) =>
    (J9_SKILLS as readonly string[]).includes(tpl),
  );
  if (skills.length > 0) return { tpls: skills, via: "skill" };
  const bucket = j9ChooseBucket(stem);
  if (!bucket) return null;
  return { tpls: bucket, via: "bucket" };
}

function j9ChooseBucket(stem: string): string[] | null {
  const text = j9Expression(stem);
  if (/\)\(/u.test(text)) return ["F2", "F5"];
  const terms = parseJ9Polynomial(text);
  if (terms && isLooseDiffSquares(terms)) return ["F3"];
  if (terms && isJ9FactorPoly(terms)) return ["F1", "F4"];
  if (/\bexpand\b/iu.test(stem) && text.includes("(")) return ["F2", "F5"];
  return null;
}

/** Square versus a constant, or two variable squares, when the strict F3 tag missed. */
function isLooseDiffSquares(terms: readonly J9Term[]): boolean {
  if (terms.length !== 2) return false;
  const squares = terms.filter(j9Square);
  if (squares.length === 2) {
    if (squares[0].factors[0].v === squares[1].factors[0].v) return false;
    return Math.sign(squares[0].coeff) !== Math.sign(squares[1].coeff);
  }
  const square = terms.find(j9Square);
  const constant = terms.find(j9Constant);
  if (!square || !constant) return false;
  return Math.sign(square.coeff) !== Math.sign(constant.coeff);
}

/**
 * A polynomial to factor that is not a clean F1 or F4.
 * QL covers a quadratic with a linear or cross term, and grouping of
 * products such as hℓ − kℓ + hm − km.
 */
function isJ9FactorPoly(terms: readonly J9Term[]): boolean {
  if (terms.length < 2 || terms.some((term) => j9Degree(term) > 2)) return false;
  if (Math.max(...terms.map(j9Degree)) < 2) return false;
  if (terms.filter(j9Cross).length >= 2) return true;
  return terms.some(j9Square) && (terms.some(j9Linear) || terms.some(j9Cross));
}

/**
 * SE tags for one J11 bank stem.
 * A `skillsForStem` hit is that tpl. With no SE tag, a WQG Choose bucket
 * may still apply: Prices/%% → SE1|SE2, story (ratio, transfer, tickets)
 * → SE3|SE4|SE5, other equation or two-leg speed wording → SE6|SE7.
 * A stem that matches none of those returns null.
 * Teaching App will ask DSE Math Check + Weekly Question Generator for
 * unmatched stems. Do not invent a new SE tag for them.
 */
export function j11MissTarget(stem: string): J11MissTarget | null {
  const skills = skillsForStem("J11", stem).filter((tpl) =>
    (J11_SKILLS as readonly string[]).includes(tpl),
  );
  if (skills.length > 0) return { tpls: skills, via: "skill" };
  const bucket = j11ChooseBucket(stem);
  if (!bucket) return null;
  return { tpls: bucket, via: "bucket" };
}

const J1_SKILLS = ["CS1", "CS2", "CS3", "CS4", "CS5", "CS6", "CS7", "CS8"] as const;

/**
 * CS tags for one J1 bank stem.
 * A `skillsForStem` hit is that tpl. With no CS tag, a WQG Choose bucket
 * may still apply: CF cross / proportion → CS4|CS8, BR brackets / expand
 * → CS1|CS3, FR formula / fractions → CS5|CS6|CS7, LN linear rearrange
 * → CS2. Easy before Medium before Hard inside the bucket.
 * A stem that matches none of those returns null.
 * Teaching App will ask DSE Math Check + Weekly Question Generator for
 * unmatched stems. Do not invent a new CS tag for them.
 */
export function j1MissTarget(stem: string): MissTarget | null {
  const skills = skillsForStem("J1", stem).filter((tpl) =>
    (J1_SKILLS as readonly string[]).includes(tpl),
  );
  if (skills.length > 0) return { tpls: skills, via: "skill" };
  const bucket = j1ChooseBucket(stem);
  if (!bucket) return null;
  return { tpls: bucket, via: "bucket" };
}

function j1ChooseBucket(stem: string): string[] | null {
  const text = compact(stem);
  const head = equationHead(text).replace(/^If/i, "");
  if (/\\frac\{[^{}]*\}\{[^{}]*\}=\\frac\{/.test(head)) return ["CS4", "CS8"];
  if (j1FormulaFraction(text, head)) return ["CS5", "CS6", "CS7"];
  if (!/\\frac/.test(head) && /\([^()]*[+-][^()]*\)/.test(head)) return ["CS1", "CS3"];
  if (j1LooseLinear(head)) return ["CS2"];
  return null;
}

/** Sum of fractions, a formula already solved, a capital formula, or a sum in a denominator. */
function j1FormulaFraction(text: string, head: string): boolean {
  if (/\\frac\{[^{}]*\}\{[^{}]*\}[+-]\\frac\{/.test(head)) return true;
  if (/^If(?:[a-zα-ω]|\\(?:alpha|beta|gamma))=/i.test(text) && /\\frac/.test(head)) return true;
  if (/[A-Z][a-zα-ω]=/.test(head)) return true;
  return /\\frac\{[^{}]*\}\{[^{}]*[+-][^{}]*\}/.test(head);
}

/**
 * Linear rearrange that missed the CS2 skill: one fraction over a letter or
 * integer equal to a linear side, or a plain degree-1 equation.
 */
function j1LooseLinear(head: string): boolean {
  const fraction = head.match(/^\\frac\{([^{}]+)\}\{([^{}]+)\}=(.+)$/);
  if (fraction) {
    const num = fraction[1];
    const den = fraction[2];
    const rhs = fraction[3];
    if (/\\frac|[()]/.test(num + den + rhs)) return false;
    if (!/^(?:\d+|[a-zα-ω])$/.test(den)) return false;
    return isLinearSide(num) && isLinearSide(rhs);
  }
  if (/\\frac|[()^{}]/.test(head)) return false;
  if (!/^[0-9a-zα-ω+=-]+$/.test(head)) return false;
  const sides = head.split("=");
  if (sides.length !== 2 || sides.some((side) => side.length === 0)) return false;
  return sides.every(isLinearSide) && /[a-zα-ω]/.test(head);
}

const J7_SKILLS = ["I1", "I2", "I3", "I4", "I5", "I6"] as const;

/**
 * I tags for one J7 bank stem.
 * A `skillsForStem` hit drills the primary tpl. A soft dual keeps the other
 * tag on the pedigree and drills the dominant trap: I3 when a negative index
 * also sits in a quotient (I2 or I4). With no I tag, a WQG Choose bucket may
 * still apply: PQN → I1|I2|I3, I4 same-base with n → I4, DBR → I5|I6.
 * Easy before Medium before Hard inside the bucket.
 * A stem that matches none of those returns null.
 * Teaching App will ask DSE Math Check + Weekly Question Generator for
 * unmatched stems. Do not invent a new I tag for them.
 */
export function j7MissTarget(stem: string): MissTarget | null {
  const skills = skillsForStem("J7", stem).filter((tpl) =>
    (J7_SKILLS as readonly string[]).includes(tpl),
  );
  if (skills.length > 0) return { tpls: [j7PrimaryTag(skills)], via: "skill" };
  const bucket = j7ChooseBucket(stem);
  if (!bucket) return null;
  return { tpls: bucket, via: "bucket" };
}

/** Negative index dominates a quotient it sits in. Otherwise the first tag. */
function j7PrimaryTag(skills: readonly string[]): string {
  if (skills.includes("I3")) return "I3";
  return skills[0];
}

/**
 * PQN is a product, a letter quotient, or a negative index the skill missed.
 * I4 is powers of one prime whose only letter is the exponent n.
 * DBR is different integer bases, or a reciprocal of a power times a power.
 */
function j7ChooseBucket(stem: string): string[] | null {
  const text = compact(stem);
  if (!/\^/.test(text)) return null;
  if (/\^-/.test(text)) return ["I1", "I2", "I3"];
  if (isJ7ReciprocalTimesPower(text)) return ["I5", "I6"];
  if (isJ7SameBaseN(text)) return ["I4"];
  if (isJ7DifferentBases(text)) return ["I5", "I6"];
  if (isJ7ProductOrQuotient(text)) return ["I1", "I2", "I3"];
  return null;
}

function j7HasJoin(text: string): boolean {
  return /\/|\\div|\\frac|·|\\cdot|\\times/.test(text);
}

function j7OnlyExponentN(text: string): boolean {
  const letters = baseVariables(text);
  return letters.length > 0 && /^n+$/u.test(letters);
}

/** Drop exponents so coefficients inside them are not read as bases. */
function j7WithoutExponents(text: string): string {
  let body = text;
  for (let i = 0; i < 8; i += 1) {
    const next = body.replace(/\\?\^\{[^{}]*\}/g, "");
    if (next === body) break;
    body = next;
  }
  return body.replace(/\\?\^[a-z0-9+-]+/gi, "");
}

function j7IntegerBases(text: string): number[] {
  return [...j7WithoutExponents(text).matchAll(/\d+/g)]
    .map((match) => Number(match[0]))
    .filter((value) => value > 1);
}

/** 8 and 4 are family 2. 9 and 3 are family 3. 6 and 12 are not one family. */
function j7PrimeFamily(value: number): number | null {
  if (value <= 1) return null;
  let rest = value;
  let family = 0;
  for (const prime of [2, 3, 5, 7]) {
    if (rest % prime !== 0) continue;
    while (rest % prime === 0) rest = Math.floor(rest / prime);
    if (family === 0) family = prime;
    else return null;
  }
  if (rest !== 1 || family === 0) return null;
  return family;
}

function isJ7SameBaseN(text: string): boolean {
  if (!j7OnlyExponentN(text) || !j7HasJoin(text)) return false;
  const families = j7IntegerBases(text).map(j7PrimeFamily);
  if (families.length < 2 || families.some((family) => family == null)) return false;
  return new Set(families).size === 1;
}

function isJ7DifferentBases(text: string): boolean {
  if (!j7OnlyExponentN(text) || !j7HasJoin(text)) return false;
  const bases = j7IntegerBases(text);
  if (bases.length < 2) return false;
  const families = bases.map(j7PrimeFamily);
  if (families.every((family) => family != null) && new Set(families).size === 1) return false;
  return true;
}

/** 1/ or 1\div in front of a power. A braced \\frac{1} is already the I6 skill. */
function isJ7ReciprocalTimesPower(text: string): boolean {
  return /(?:^|[^0-9])1(?:\/|\\div)/.test(text);
}

function isJ7ProductOrQuotient(text: string): boolean {
  if (baseVariables(text).length === 0) return false;
  if (/·|\\cdot|\\times|\/|\\div|\\frac/.test(text)) return true;
  return /\(\d*[a-zα-ω][^()]*\)\^\{?-?\d+\}?[a-zα-ω(]/u.test(text);
}

function j11ChooseBucket(stem: string): string[] | null {
  const prose = stem.toLowerCase().replace(/\s+/g, " ");
  if (/price|cost|\$|%|percent/.test(prose)) return ["SE1", "SE2"];
  if (/ratio|times as many|\bgives?\b|\bgave\b|transfer|ticket/.test(prose)) {
    return ["SE3", "SE4", "SE5"];
  }
  if (/km\/h|\bspeed\b|travels|sum of two|product|equation|=/.test(prose)) {
    return ["SE6", "SE7"];
  }
  return null;
}

export type PlannedMiss = {
  bankId: string;
  paperNumber: number;
  stem: string;
};

export type PlannedRepair = {
  bankId: string;
  paperNumber: number;
  ids: string[];
  tpls: string[];
};

export type MissPlan = {
  repairs: PlannedRepair[];
  unmatched: { bankId: string; paperNumber: number }[];
  focus: string[];
};

/**
 * One remedial pair per miss, in paper order.
 * Each pair is two items from that miss's tpl or Choose bucket, easier
 * bands first, and the two stems differ. Ids and stems already used in
 * this set are not used again. A miss with no target, or a target the pool
 * cannot fill, is unmatched: those two slots are skipped.
 * Teaching App will ask DSE Math Check + Weekly Question Generator for
 * unmatched stems. Do not invent a new tag, and do not draw the slots
 * from the rest of the pool.
 */
export function planMappedMisses<T extends PoolItem>(
  misses: readonly PlannedMiss[],
  pool: readonly T[],
  targetFor: (stem: string) => MissTarget | null,
  random: () => number = Math.random,
): MissPlan {
  const repairs: PlannedRepair[] = [];
  const unmatched: { bankId: string; paperNumber: number }[] = [];
  const focus: string[] = [];
  const avoid = new Set<string>();
  for (const miss of misses) {
    const target = targetFor(miss.stem);
    const picked = target ? pickMapped(pool, target.tpls, avoid, DRILLS_PER_MISS, random) : [];
    if (!target || picked.length < DRILLS_PER_MISS) {
      unmatched.push({ bankId: miss.bankId, paperNumber: miss.paperNumber });
      continue;
    }
    for (const item of picked) {
      avoid.add(item.id);
      avoid.add(item.stem);
    }
    for (const tpl of target.tpls) {
      if (!focus.includes(tpl)) focus.push(tpl);
    }
    repairs.push({
      bankId: miss.bankId,
      paperNumber: miss.paperNumber,
      ids: picked.map((item) => item.id),
      tpls: target.tpls,
    });
  }
  return { repairs, unmatched, focus };
}

/** J9 remedial pairs. See {@link planMappedMisses}. */
export function planJ9Misses<T extends PoolItem>(
  misses: readonly PlannedMiss[],
  pool: readonly T[],
  random: () => number = Math.random,
): MissPlan {
  return planMappedMisses(misses, pool, j9MissTarget, random);
}

/** J11 remedial pairs. See {@link planMappedMisses}. */
export function planJ11Misses<T extends PoolItem>(
  misses: readonly PlannedMiss[],
  pool: readonly T[],
  random: () => number = Math.random,
): MissPlan {
  return planMappedMisses(misses, pool, j11MissTarget, random);
}

/** J1 remedial pairs. See {@link planMappedMisses}. */
export function planJ1Misses<T extends PoolItem>(
  misses: readonly PlannedMiss[],
  pool: readonly T[],
  random: () => number = Math.random,
): MissPlan {
  return planMappedMisses(misses, pool, j1MissTarget, random);
}

/** J7 remedial pairs. See {@link planMappedMisses}. */
export function planJ7Misses<T extends PoolItem>(
  misses: readonly PlannedMiss[],
  pool: readonly T[],
  random: () => number = Math.random,
): MissPlan {
  return planMappedMisses(misses, pool, j7MissTarget, random);
}

/**
 * Draw up to `count` items whose tpl is in `preferred`.
 * Easier bands come first. Shuffle only inside a band.
 * `avoid` holds ids and stems already chosen for this remedial set.
 * A short result means those tpls cannot fill the draw. Callers that need
 * an exact pair treat that as unmatched and do not top up from other tpls.
 */
export function pickMapped<T extends PoolItem>(
  pool: readonly T[],
  preferred: readonly string[],
  avoid: ReadonlySet<string>,
  count: number,
  random: () => number = Math.random,
): T[] {
  const allowed = new Set(preferred);
  const fresh = pool.filter(
    (item) => allowed.has(item.tpl) && !avoid.has(item.id) && !avoid.has(item.stem),
  );
  const ordered = orderBucket(fresh, random);
  const chosen: T[] = [];
  const usedStems = new Set<string>();
  for (const item of ordered) {
    if (chosen.length >= count) break;
    if (usedStems.has(item.stem)) continue;
    usedStems.add(item.stem);
    chosen.push(item);
  }
  return chosen;
}

function skillsJ10(stem: string): string[] {
  const text = stem.toLowerCase().replace(/\s+/g, " ");
  if (!text.includes("map")) return [];
  if (text.includes("then the scale of the map")) return ["M1"];
  if (text.includes("then the actual area")) return ["M2"];
  if (text.includes("on the map is")) return ["M3"];
  return [];
}

function bandRank(item: PoolItem | null): number {
  if (!item) return 99;
  return BAND_RANK[item.difficulty ?? "unknown"];
}

function orderBucket<T extends PoolItem>(items: readonly T[], random: () => number): T[] {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const rank = bandRank(item);
    const bucket = groups.get(rank) ?? [];
    bucket.push(item);
    groups.set(rank, bucket);
  }
  return [...groups.keys()]
    .sort((left, right) => left - right)
    .flatMap((rank) => shuffle(groups.get(rank) ?? [], random));
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Draw up to `count` items.
 * `preferred` empty → every archetype is equal, then easier bands come first.
 * `avoid` holds ids and stems already shown in this drill session.
 * Avoidance is dropped only when the fresh pool cannot fill the drill.
 * Consecutive items share a tpl only when no other tpl is left.
 * A known difficulty breaks ties: Easy before Medium before unknown before Hard.
 */
export function pickFromPool<T extends PoolItem>(
  pool: readonly T[],
  preferred: readonly string[],
  avoid: ReadonlySet<string>,
  count: number,
  random: () => number = Math.random,
): T[] {
  const byTpl = new Map<string, T[]>();
  for (const item of pool) {
    const bucket = byTpl.get(item.tpl) ?? [];
    bucket.push(item);
    byTpl.set(item.tpl, bucket);
  }
  for (const [tpl, bucket] of byTpl) byTpl.set(tpl, orderBucket(bucket, random));
  const tpls = [...byTpl.keys()];
  const prefer = new Set(preferred.filter((tpl) => byTpl.has(tpl)));
  const usedStems = new Set<string>();

  function score(tpl: string, banTpl: string | null): number {
    const preferredHit = prefer.size === 0 || prefer.has(tpl);
    const banned = tpl === banTpl;
    if (preferredHit && !banned) return 0;
    if (!preferredHit && !banned) return 1;
    if (preferredHit && banned) return 2;
    return 3;
  }

  function eligibleIndex(bucket: T[], relaxed: boolean): number {
    return bucket.findIndex((item) => {
      if (usedStems.has(item.stem)) return false;
      if (relaxed) return true;
      return !avoid.has(item.id) && !avoid.has(item.stem);
    });
  }

  function peek(tpl: string, relaxed: boolean): T | null {
    const bucket = byTpl.get(tpl);
    if (!bucket) return null;
    const index = eligibleIndex(bucket, relaxed);
    return index < 0 ? null : bucket[index];
  }

  function pull(relaxed: boolean, banTpl: string | null): T | null {
    const order = shuffle(tpls, random).sort((a, b) => {
      const delta = score(a, banTpl) - score(b, banTpl);
      if (delta !== 0) return delta;
      return bandRank(peek(a, relaxed)) - bandRank(peek(b, relaxed));
    });
    for (const tpl of order) {
      const bucket = byTpl.get(tpl);
      if (!bucket) continue;
      const index = eligibleIndex(bucket, relaxed);
      if (index < 0) continue;
      const [item] = bucket.splice(index, 1);
      return item;
    }
    return null;
  }

  const chosen: T[] = [];
  let relaxed = false;
  while (chosen.length < count) {
    const banTpl = chosen.length > 0 ? chosen[chosen.length - 1].tpl : null;
    const next = pull(relaxed, banTpl);
    if (!next) {
      if (!relaxed) {
        relaxed = true;
        continue;
      }
      break;
    }
    usedStems.add(next.stem);
    chosen.push(next);
  }
  return chosen;
}
