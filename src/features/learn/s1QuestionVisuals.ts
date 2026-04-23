import type { MathsVisual, SampleSpaceGridVisual, VennTwoSetVisual } from '@/lib/maths/visuals/types';

const S1_RE = /^S1\.(\d+)$/;

function isS1Skill(code: string | undefined): code is string {
  return typeof code === 'string' && S1_RE.test(code);
}

function parseSetBody(inner: string): string[] {
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse A = {1,2,3} style (single-digit and multi-char tokens). */
function parseSetAfterLetter(stem: string, letter: 'A' | 'B' | 'ξ'): string[] | null {
  const re = new RegExp(
    `(?:^|[\\s,;])${letter}\\s*=\\s*\\{([^}]*)\\}`,
    'i'
  );
  const m = stem.match(re);
  if (!m) return null;
  return parseSetBody(m[1]);
}

function setIntersection(a: string[], b: string[]): string[] {
  const bs = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => bs.has(x.toLowerCase()));
}

function setMinus(a: string[], b: string[]): string[] {
  const bs = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => !bs.has(x.toLowerCase()));
}

function setUnion(a: string[], b: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of [...a, ...b]) {
    const k = x.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

function parseVennCounts(stem: string): {
  aOnly: number;
  intersection: number;
  bOnly: number;
  outside: number;
} | null {
  const pick = (patterns: RegExp[]): number | undefined => {
    for (const p of patterns) {
      const m = stem.match(p);
      if (m) return Number(m[1]);
    }
    return undefined;
  };

  const aOnly = pick([
    /\bA\s+only\s*=\s*(\d+)/i,
    /\bA\s*only\s*=\s*(\d+)/i,
  ]);
  const intersection = pick([
    /\bintersection\s*=\s*(\d+)/i,
    /\bA\s*∩\s*B\s*=\s*(\d+)/i,
    /\bA\s*∩\s*B\s*=\s*(\d+)/i,
  ]);
  const bOnly = pick([/\bB\s+only\s*=\s*(\d+)/i, /\bB\s*only\s*=\s*(\d+)/i]);
  const outside = pick([/\boutside\s*=\s*(\d+)/i]);

  if (
    aOnly != null &&
    intersection != null &&
    bOnly != null &&
    outside != null &&
    [aOnly, intersection, bOnly, outside].every((n) => Number.isFinite(n) && n >= 0)
  ) {
    return { aOnly, intersection, bOnly, outside };
  }
  return null;
}

function parseRegionElementList(stem: string, label: string): string[] | null {
  const re = new RegExp(`\\b${label}\\s*=\\s*\\{([^}]+)\\}`, 'i');
  const m = stem.match(re);
  if (!m) return null;
  return parseSetBody(m[1]);
}

function inferVennTwoSet(question: string, skillCode: string): VennTwoSetVisual | null {
  if (!/^S1\.(7|8|9|10|11|12)$/.test(skillCode)) return null;

  const stem = question.replace(/\s+/g, ' ').trim();
  const lower = stem.toLowerCase();
  if (!lower.includes('venn') && !/\bA\s*=/.test(stem) && !/A\s+only/i.test(stem)) {
    return null;
  }

  const setA = parseSetAfterLetter(stem, 'A');
  const setB = parseSetAfterLetter(stem, 'B');
  const xi = parseSetAfterLetter(stem, 'ξ');

  if (setA && setB && setA.length > 0 && setB.length > 0) {
    const intersection = setIntersection(setA, setB);
    const aOnly = setMinus(setA, setB);
    const bOnly = setMinus(setB, setA);
    const uni = setUnion(setA, setB);
    const outside = xi ? setMinus(xi, uni) : [];

    const cap = 14;
    const trim = (xs: string[]) => (xs.length > cap ? xs.slice(0, cap) : xs);

    return {
      type: 'venn-two-set',
      altText: `Venn diagram for sets A and B with ${aOnly.length} elements in A only, ${intersection.length} in the overlap, ${bOnly.length} in B only${
        outside.length ? `, and ${outside.length} outside both circles` : ''
      }.`,
      caption: 'Venn diagram: regions show how the elements of A and B overlap.',
      aOnly: trim(aOnly),
      intersection: trim(intersection),
      bOnly: trim(bOnly),
      outside: trim(outside),
    };
  }

  const onlyA = parseRegionElementList(stem, 'A only');
  const onlyB = parseRegionElementList(stem, 'B only');
  const capMatch = stem.match(/\bA\s*∩\s*B\s*=\s*\{([^}]+)\}/i);
  const interEl2 = capMatch ? parseSetBody(capMatch[1]) : null;

  if (onlyA || onlyB || interEl2) {
    const aO = onlyA ?? [];
    const bO = onlyB ?? [];
    const i = interEl2 ?? [];
    return {
      type: 'venn-two-set',
      altText: 'Venn diagram showing listed elements in each region.',
      caption: 'Venn diagram matching the regions described in the question.',
      aOnly: aO,
      intersection: i,
      bOnly: bO,
      outside: [],
    };
  }

  const counts = parseVennCounts(stem);
  if (counts) {
    return {
      type: 'venn-two-set',
      altText: `Venn diagram with A only ${counts.aOnly}, intersection ${counts.intersection}, B only ${counts.bOnly}, outside ${counts.outside}.`,
      caption: 'Venn diagram labelled with the counts in each region.',
      aOnly: [],
      intersection: [],
      bOnly: [],
      outside: [],
      counts,
    };
  }

  if (/\bvenn\b/i.test(stem)) {
    return {
      type: 'venn-two-set',
      altText: 'Two-set Venn diagram inside the universal set rectangle.',
      caption: 'Venn diagram with sets A and B (use the diagram to think about regions).',
      aOnly: [],
      intersection: [],
      bOnly: [],
      outside: [],
    };
  }

  return null;
}

function gridVisual(
  rowLabels: string[],
  columnLabels: string[],
  cells: string[][],
  caption: string
): SampleSpaceGridVisual {
  return {
    type: 'sample-space-grid',
    altText: `Sample space grid with ${rowLabels.length} rows and ${columnLabels.length} columns.`,
    caption,
    rowLabels,
    columnLabels,
    cells,
  };
}

function twoDiceGrid(): SampleSpaceGridVisual {
  const rows = ['1', '2', '3', '4', '5', '6'];
  const cols = ['1', '2', '3', '4', '5', '6'];
  const cells = rows.map((r) =>
    cols.map((c) => {
      const a = Number(r);
      const b = Number(c);
      return `${a + b}`;
    })
  );
  return gridVisual(rows, cols, cells, 'Sample space for two fair dice: each cell shows the sum of the two scores.');
}

function coinDieGrid(): SampleSpaceGridVisual {
  const rows = ['H', 'T'];
  const cols = ['1', '2', '3', '4', '5', '6'];
  const cells = rows.map((coin) => cols.map((d) => `(${coin},${d})`));
  return gridVisual(rows, cols, cells, 'Sample space for a coin and a six-sided die.');
}

function twoCoinGrid(): SampleSpaceGridVisual {
  const rows = ['H', 'T'];
  const cols = ['H', 'T'];
  const cells = [
    ['HH', 'HT'],
    ['TH', 'TT'],
  ];
  return gridVisual(rows, cols, cells, 'Sample space for two coins (first coin on rows, second on columns).');
}

function spinnerCoinGrid(spinnerLabels: string[]): SampleSpaceGridVisual {
  const rows = spinnerLabels;
  const cols = ['H', 'T'];
  const cells = rows.map((s) => cols.map((c) => `(${s},${c})`));
  return gridVisual(rows, cols, cells, 'Sample space for a spinner and a coin.');
}

function inferSpinnerLabelsFromStem(stem: string): string[] | null {
  const m = stem.match(/outcomes?\s+([\d,\s]+)\s+is\s+spun/i);
  if (m) {
    const parts = m[1].split(/[, ]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2 && parts.length <= 6) return parts;
  }
  const m2 = stem.match(/spinner with outcomes?\s+([\d,\s]+)/i);
  if (m2) {
    const parts = m2[1].split(/[, ]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2 && parts.length <= 6) return parts;
  }
  return null;
}

function twoSpinnerGrid(a: number, b: number): SampleSpaceGridVisual | null {
  if (a * b > 36 || a < 2 || b < 2) return null;
  const rowLabels = Array.from({ length: a }, (_, i) => String(i + 1));
  const columnLabels = Array.from({ length: b }, (_, i) => String(i + 1));
  const cells = rowLabels.map((r) =>
    columnLabels.map((c) => `(${r},${c})`)
  );
  return gridVisual(
    rowLabels,
    columnLabels,
    cells,
    `Sample space for two spinners (${a}×${b} equally likely outcomes).`
  );
}

function inferSampleSpaceGrid(question: string, skillCode: string): SampleSpaceGridVisual | null {
  if (skillCode !== 'S1.4' && skillCode !== 'S1.5') return null;

  const stem = question.toLowerCase();

  if (/(two fair dice|two dice|both dice)/i.test(question)) {
    return twoDiceGrid();
  }

  if (/(coin (is )?flipped|flip a coin).*(die|dice)/i.test(question) || /(die|dice).*(coin)/i.test(question)) {
    return coinDieGrid();
  }

  if (/two coins/i.test(question)) {
    return twoCoinGrid();
  }

  if (/spinner.*coin|coin.*spinner/i.test(question)) {
    const labels = inferSpinnerLabelsFromStem(question);
    if (labels) return spinnerCoinGrid(labels);
    const m = question.match(/(\d)\s*,\s*(\d)\s*,\s*(\d)\b/);
    if (m && /spinner with outcomes/i.test(question)) {
      return spinnerCoinGrid([m[1], m[2], m[3]]);
    }
    const m4 = question.match(/1\s*,\s*2\s*,\s*3\s*,\s*4/i);
    if (m4) return spinnerCoinGrid(['1', '2', '3', '4']);
  }

  const spinTwice = question.match(/(\d+)[-\s]section spinner.*spun twice/i);
  if (spinTwice) {
    const n = Number(spinTwice[1]);
    if (n >= 2 && n <= 6) return twoSpinnerGrid(n, n);
  }

  const colourTwice = question.match(/(\d+)[-\s]colou?r spinner.*spun twice/i);
  if (colourTwice) {
    const n = Number(colourTwice[1]);
    if (n >= 2 && n <= 6) return twoSpinnerGrid(n, n);
  }

  const spinPair = question.match(
    /(\d+)[-\s]section spinner.*(\d+)[-\s]section spinner/i
  );
  if (spinPair) {
    const n1 = Number(spinPair[1]);
    const n2 = Number(spinPair[2]);
    if (n1 * n2 <= 36) return twoSpinnerGrid(n1, n2);
  }

  if (skillCode === 'S1.4' && /sample space|grid|coin-die/i.test(stem)) {
    if (/coin.*die|die.*coin/i.test(stem)) return coinDieGrid();
  }

  return null;
}

/** Structured diagrams for probability / Venn skills S1.4–S1.12. */
export function inferS1ProbabilityVisuals(question: string, primarySkillCode?: string): MathsVisual[] {
  if (!isS1Skill(primarySkillCode)) return [];

  const visuals: MathsVisual[] = [];
  const grid = inferSampleSpaceGrid(question, primarySkillCode);
  if (grid) visuals.push(grid);

  const venn = inferVennTwoSet(question, primarySkillCode);
  if (venn) visuals.push(venn);

  return visuals;
}
