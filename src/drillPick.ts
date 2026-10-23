/**
 * Skill tags for a missed bank question, and the draw for a generated drill.
 *
 * Archetypes are the pool `tpl` values (J10 uses S1–S3 for the three map-scale subtypes).
 * A miss maps onto those tags only when the stem is a clear example of that pattern.
 * Anything else is left untagged so the drill shuffles the whole pool.
 *
 * J7 Indices
 * - I6 reciprocal of a power, times another power: (1/9^555)·3^444
 * - I3 negative index, and also I2 or I4 when that negative index sits in a quotient
 * - I4 quotient of integer bases with the same prime (8^n/4^n)
 * - I2 quotient with a letter base: (2x^4)^3 / 2x^5
 * - I5 integer bases, no fraction: 8^222·5^666, 4^{n+2}3^{2n+4}
 * - I1 (number × letter)^power times a power of that letter
 * - no tag when the stem is none of those (for example x^3(2x+x))
 *
 * J8 Identities
 * - ID2 the asked value is a ratio (a:b or a:b:c)
 * - ID4 a binomial square and a product that has an extra added term
 * - ID3 product of two linears equal to a binomial square plus a constant
 * - ID1 every other identity (compare coefficients for one constant)
 *
 * J9 Factorization / expansion
 * - F5 product of brackets, then add or subtract another term
 * - F3 a square minus a square, with a bracket or a whole number as one square
 * - F2 a product of brackets to expand
 * - F1 two variable squares and no cross term (mn, xy, …)
 * - F4 the other factorisations (cross term or grouping)
 *
 * J10 Ratio, rate, map scale
 * - S1 actual area and map area given, ask for the scale
 * - S2 scale and map area given, ask for the actual area
 * - S3 scale and actual area given, ask for the map area
 * - no tag for ratio, speed, or mixture stems. The drill then shuffles S1–S3.
 *
 * When several misses match, the drill prefers the union of those tags.
 * Anti-adjacent is the stronger rule: the next item is a different tpl whenever
 * another one is still available. One matched tag therefore fills 3 of 5 places
 * (1st, 3rd, 5th) and the other two places are different tags.
 */

export type PoolItem = {
  id: string;
  tpl: string;
  stem: string;
};

export function skillsForStem(stageId: string, stem: string): string[] {
  if (stageId === "J7") return skillsJ7(stem);
  if (stageId === "J8") return skillsJ8(stem);
  if (stageId === "J9") return skillsJ9(stem);
  if (stageId === "J10") return skillsJ10(stem);
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

function skillsJ9(stem: string): string[] {
  const text = plainMath(stem);
  if (/\([^()]+\)\([^()]+\)[+-]/.test(text)) return ["F5"];
  if (/\)\^2-|-\([^()]+\)\^2|\d\^2/.test(text)) return ["F3"];
  if (text.startsWith("(") && text.includes(")(")) return ["F2"];
  const squares = text.match(/[a-zα-ω]\^2/g) ?? [];
  const withoutSquares = text.replace(/[a-zα-ω]\^2/g, "");
  if (squares.length >= 2 && !/[a-zα-ω]{2}/.test(withoutSquares)) return ["F1"];
  return ["F4"];
}

function skillsJ10(stem: string): string[] {
  const text = stem.toLowerCase().replace(/\s+/g, " ");
  if (!text.includes("map")) return [];
  if (text.includes("then the scale of the map")) return ["S1"];
  if (text.includes("then the actual area")) return ["S2"];
  if (text.includes("on the map is")) return ["S3"];
  return [];
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
 * `preferred` empty → every archetype is equal.
 * `avoid` holds ids and stems already shown in this drill session.
 * Avoidance is dropped only when the fresh pool cannot fill the drill.
 * Consecutive items share a tpl only when no other tpl is left.
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
  for (const [tpl, bucket] of byTpl) byTpl.set(tpl, shuffle(bucket, random));
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

  function pull(relaxed: boolean, banTpl: string | null): T | null {
    const order = shuffle(tpls, random).sort((a, b) => score(a, banTpl) - score(b, banTpl));
    for (const tpl of order) {
      const bucket = byTpl.get(tpl);
      if (!bucket) continue;
      const index = bucket.findIndex((item) => {
        if (usedStems.has(item.stem)) return false;
        if (relaxed) return true;
        return !avoid.has(item.id) && !avoid.has(item.stem);
      });
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
