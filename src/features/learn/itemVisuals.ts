import { isMathsVisual } from '../../lib/maths/visuals/guards';
import type {
  ArithmeticLayoutVisual,
  BarModelVisual,
  ChartVisual,
  FractionBarVisual,
  MathsVisual,
  NumberLineVisual,
  SampleSpaceGridVisual,
  ShapeEdgeLabel,
  ShapeVisual,
  VisualPoint,
  VennTwoSetVisual,
} from '../../lib/maths/visuals/types';
import { inferDataVisualsForItem } from './inferDataVisuals';
import { inferS1ProbabilityVisuals } from './s1QuestionVisuals';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function cleanQuestionForVisualInference(question: string): string {
  return question
    .replace(/^\s*\[[^\]]+\]\s*/, '')
    .replace(/^\s*(?:slide\d+[a-z0-9-]*|n\d+(?:\.\d+)?|sc[:\-][a-z0-9]+|dq\d+|q\d+)\s*[:\-–]\s*/i, '')
    .trim();
}

export function parseStoredVisuals(options: unknown): MathsVisual[] {
  if (!isObject(options)) return [];

  const explicit =
    Array.isArray(options.visuals) ? options.visuals : options.visual ? [options.visual] : [];

  return explicit.filter(isMathsVisual);
}

function parseNumericTokens(question: string): number[] {
  return unique(
    [...question.matchAll(/[-+]?\d+(?:\.\d+)?/g)]
      .map((match) => Number(match[0].replace(/,/g, '')))
      .filter((value) => Number.isFinite(value))
  );
}

function parseOperationTokens(question: string): { left: number; operator: '+' | '-'; right: number } | null {
  const match = question.match(/(-?\d[\d,]*(?:\.\d+)?)\s*([+\-])\s*(-?\d[\d,]*(?:\.\d+)?)/);
  if (!match) return null;

  const left = Number(match[1].replace(/,/g, ''));
  const right = Number(match[3].replace(/,/g, ''));
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;

  return {
    left,
    operator: match[2] as '+' | '-',
    right,
  };
}

function parseCentimetreValues(question: string): string[] {
  return [...question.matchAll(/([-+]?\d+(?:\.\d+)?)\s*cm\b/gi)].map((match) => `${match[1]} cm`);
}

function inferArithmeticLayout(question: string, primarySkillCode?: string): ArithmeticLayoutVisual | null {
  const normalized = question.replace(/×/g, 'x').replace(/÷/g, '÷');
  const lower = question.toLowerCase();
  const isArithmeticSkill = ['N2.4', 'N2.5', 'N2.6', 'N2.7'].includes(primarySkillCode ?? '');
  const isArithmeticPrompt =
    /\b(calculate|work out|solve|column|formal method|add|subtract|multiply|divide|sum|difference|total)\b/i.test(
      question
    );

  if (!isArithmeticSkill && !isArithmeticPrompt) {
    return null;
  }

  const operationMatch = normalized.match(/(-?\d[\d,]*(?:\.\d+)?)\s*([+\-x÷])\s*(-?\d[\d,]*(?:\.\d+)?)/i);

  if (operationMatch) {
    const [, left, operator, right] = operationMatch;
    const layout =
      operator === '+'
        ? 'column-addition'
        : operator === '-'
          ? 'column-subtraction'
          : operator.toLowerCase() === 'x'
            ? 'column-multiplication'
            : 'short-division';
    return {
      type: 'arithmetic-layout',
      layout,
      operands: [left, right],
      operator: operator === 'x' ? 'x' : (operator as '+' | '-' | '÷'),
      align: left.includes('.') || right.includes('.') ? 'decimal' : 'right',
      showOperator: true,
      showAnswerLine: true,
      altText: `Worked layout for ${left} ${operator} ${right}.`,
      caption: 'Structured maths layout generated from the question.',
    };
  }

  if (
    primarySkillCode === 'N1.1' ||
    primarySkillCode === 'N1.6' ||
    lower.includes('place value') ||
    lower.includes('digit')
  ) {
    const numberMatch = question.match(/(-?\d[\d,]*(?:\.\d+)?)/);
    const rawNumber = numberMatch?.[1];
    if (!rawNumber) return null;
    const clean = rawNumber.replace(/,/g, '');
    const [whole, decimal = ''] = clean.split('.');
    const wholeHeaders = ['Millions', 'Hundred thousands', 'Ten thousands', 'Thousands', 'Hundreds', 'Tens', 'Ones'];
    const decimalHeaders = ['Tenths', 'Hundredths', 'Thousandths'];
    const digits = whole.padStart(wholeHeaders.length, '0').split('').slice(-wholeHeaders.length);
    const values = decimal
      ? [...digits, ...decimal.padEnd(decimalHeaders.length, '0').slice(0, decimalHeaders.length).split('')]
      : digits;
    const headers = decimal ? [...wholeHeaders, ...decimalHeaders] : wholeHeaders;
    return {
      type: 'arithmetic-layout',
      layout: 'place-value-table',
      altText: `Place value table for ${rawNumber}.`,
      caption: 'Place value model generated from the number in the question.',
      columnHeaders: headers,
      rows: [{ label: rawNumber, values }],
    };
  }

  return null;
}

function createRectangle(labels: string[]): ShapeVisual {
  return {
    type: 'shape',
    shape: 'rectangle',
    altText: 'Rectangle diagram with labelled sides.',
    caption: 'Structured rectangle diagram generated from the question.',
    vertices: [
      { x: 40, y: 40 },
      { x: 200, y: 40 },
      { x: 200, y: 130 },
      { x: 40, y: 130 },
    ],
    edges: [
      { from: 0, to: 1, label: labels[0] ?? 'length', offsetY: -10 },
      { from: 1, to: 2, label: labels[1] ?? 'width', anchor: 'start', offsetX: 14 },
      { from: 2, to: 3, label: labels[0] ?? 'length', offsetY: 18 },
      { from: 3, to: 0, label: labels[1] ?? 'width', anchor: 'end', offsetX: -14 },
    ],
  };
}

function createSquare(labels: string[]): ShapeVisual {
  const sideLabel = labels[0] ?? 'side';
  return {
    type: 'shape',
    shape: 'square',
    altText: 'Square with equal sides.',
    caption: 'Structured square diagram generated from the question.',
    vertices: [
      { x: 52, y: 40 },
      { x: 180, y: 40 },
      { x: 180, y: 168 },
      { x: 52, y: 168 },
    ],
    edges: [
      { from: 0, to: 1, label: sideLabel, offsetY: -10 },
      { from: 1, to: 2, label: sideLabel, anchor: 'start', offsetX: 14 },
      { from: 2, to: 3, label: sideLabel, offsetY: 18 },
      { from: 3, to: 0, label: sideLabel, anchor: 'end', offsetX: -14 },
    ],
    meta: { notToScale: true },
  };
}

function createParallelogram(labels: string[]): ShapeVisual {
  return {
    type: 'shape',
    shape: 'parallelogram',
    altText: 'Parallelogram with labelled sides.',
    caption: 'Structured parallelogram diagram generated from the question.',
    vertices: [
      { x: 70, y: 40 },
      { x: 210, y: 40 },
      { x: 180, y: 130 },
      { x: 40, y: 130 },
    ],
    edges: [
      { from: 0, to: 1, label: labels[0] ?? 'side a', offsetY: -10 },
      { from: 1, to: 2, label: labels[1] ?? 'side b', anchor: 'start', offsetX: 16 },
      { from: 2, to: 3, label: labels[0] ?? 'side a', offsetY: 18 },
      { from: 3, to: 0, label: labels[1] ?? 'side b', anchor: 'end', offsetX: -16 },
    ],
  };
}

function createIsoscelesTriangle(labels: string[]): ShapeVisual {
  return {
    type: 'shape',
    shape: 'isosceles-triangle',
    altText: 'Isosceles triangle with equal sides and a base.',
    caption: 'Structured triangle diagram generated from the question.',
    vertices: [
      { x: 120, y: 30 },
      { x: 35, y: 150 },
      { x: 205, y: 150 },
    ],
    edges: [
      { from: 0, to: 1, label: labels[0] ?? 'equal side', offsetX: -14 },
      { from: 0, to: 2, label: labels[0] ?? 'equal side', offsetX: 14 },
      { from: 1, to: 2, label: labels[1] ?? 'base', offsetY: 18 },
    ],
    meta: { notToScale: true },
  };
}

function createIsoscelesTrapezium(labels: string[]): ShapeVisual {
  return {
    type: 'shape',
    shape: 'isosceles-trapezium',
    altText: 'Isosceles trapezium with equal non-parallel sides.',
    caption: 'Structured trapezium diagram generated from the question.',
    vertices: [
      { x: 80, y: 40 },
      { x: 160, y: 40 },
      { x: 210, y: 135 },
      { x: 30, y: 135 },
    ],
    edges: [
      { from: 0, to: 1, label: labels[0] ?? 'top', offsetY: -10 },
      { from: 1, to: 2, label: labels[2] ?? 'equal side', anchor: 'start', offsetX: 12 },
      { from: 2, to: 3, label: labels[1] ?? 'base', offsetY: 18 },
      { from: 3, to: 0, label: labels[2] ?? 'equal side', anchor: 'end', offsetX: -12 },
    ],
    meta: { notToScale: true },
  };
}

function regularPolygonPoints(sides: number): VisualPoint[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides;
    return {
      x: 120 + Math.cos(angle) * 72,
      y: 95 + Math.sin(angle) * 72,
    };
  });
}

function edgeLabelsForPolygon(labels: string[], points: VisualPoint[]): ShapeEdgeLabel[] {
  return points.map((_, index) => ({
    from: index,
    to: (index + 1) % points.length,
    label: labels[0] ?? 'side',
  }));
}

function irregularPolygonPoints(sides: number): VisualPoint[] {
  const templates: Record<number, VisualPoint[]> = {
    3: [
      { x: 126, y: 28 },
      { x: 38, y: 162 },
      { x: 214, y: 138 },
    ],
    4: [
      { x: 44, y: 56 },
      { x: 176, y: 34 },
      { x: 214, y: 132 },
      { x: 68, y: 164 },
    ],
    5: [
      { x: 42, y: 64 },
      { x: 132, y: 30 },
      { x: 214, y: 68 },
      { x: 184, y: 150 },
      { x: 64, y: 164 },
    ],
    6: [
      { x: 45, y: 52 },
      { x: 128, y: 30 },
      { x: 218, y: 64 },
      { x: 188, y: 148 },
      { x: 82, y: 164 },
      { x: 30, y: 102 },
    ],
    7: [
      { x: 54, y: 42 },
      { x: 132, y: 24 },
      { x: 212, y: 56 },
      { x: 226, y: 122 },
      { x: 172, y: 170 },
      { x: 88, y: 164 },
      { x: 34, y: 108 },
    ],
    8: [
      { x: 58, y: 34 },
      { x: 136, y: 24 },
      { x: 206, y: 54 },
      { x: 224, y: 114 },
      { x: 196, y: 170 },
      { x: 126, y: 182 },
      { x: 60, y: 158 },
      { x: 28, y: 94 },
    ],
  };

  return templates[Math.max(3, Math.min(8, sides))] ?? templates[5];
}

function createRegularPolygon(question: string, labels: string[]): ShapeVisual {
  const lower = question.toLowerCase();
  const sides = lower.includes('triangle')
    ? 3
    : lower.includes('square')
      ? 4
      : lower.includes('pentagon')
        ? 5
        : lower.includes('hexagon')
          ? 6
          : lower.includes('heptagon')
            ? 7
            : lower.includes('octagon')
              ? 8
              : 5;
  const points = regularPolygonPoints(sides);
  return {
    type: 'shape',
    shape: 'regular-polygon',
    altText: `Regular ${sides}-sided polygon.`,
    caption: 'Structured regular polygon diagram generated from the question.',
    vertices: points,
    edges: edgeLabelsForPolygon(labels, points),
    meta: { notToScale: true, polygonSides: sides },
  };
}

function createGenericTriangle(labels: string[]): ShapeVisual {
  return {
    type: 'shape',
    shape: 'triangle',
    altText: 'Triangle with labelled sides.',
    caption: 'Structured triangle diagram generated from the question.',
    vertices: [
      { x: 120, y: 34 },
      { x: 44, y: 152 },
      { x: 206, y: 140 },
    ],
    edges: [
      { from: 0, to: 1, label: labels[0] ?? 'side a', offsetX: -14 },
      { from: 1, to: 2, label: labels[1] ?? 'side b', offsetY: 18 },
      { from: 2, to: 0, label: labels[2] ?? labels[0] ?? 'side c', offsetX: 12 },
    ],
    meta: { notToScale: true },
  };
}

function createIrregularPolygon(labels: string[]): ShapeVisual {
  const sideCount = Math.max(3, Math.min(8, labels.length || 5));
  const vertices = irregularPolygonPoints(sideCount);
  return {
    type: 'shape',
    shape: 'irregular-polygon',
    altText: 'Irregular polygon with labelled outside edges.',
    caption: 'Structured polygon diagram generated from the question.',
    vertices,
    edges: vertices.map((_, index) => ({
      from: index,
      to: (index + 1) % vertices.length,
      label: labels[index] ?? String.fromCharCode(97 + index),
    })),
    meta: { notToScale: true, polygonSides: vertices.length },
  };
}

function createCompoundLShape(labels: string[]): ShapeVisual {
  return {
    type: 'shape',
    shape: 'compound-l-shape',
    altText: 'Compound rectilinear L-shaped outline with outside edges labelled.',
    caption: 'Structured compound-shape diagram generated from the question.',
    vertices: [
      { x: 40, y: 36 },
      { x: 188, y: 36 },
      { x: 188, y: 90 },
      { x: 136, y: 90 },
      { x: 136, y: 146 },
      { x: 40, y: 146 },
    ],
    edges: [
      { from: 0, to: 1, label: labels[0] ?? 'a', offsetY: -10 },
      { from: 1, to: 2, label: labels[1] ?? 'b', anchor: 'start', offsetX: 12 },
      { from: 2, to: 3, label: labels[2] ?? 'c', offsetY: -8 },
      { from: 3, to: 4, label: labels[3] ?? 'd', anchor: 'start', offsetX: 12 },
      { from: 4, to: 5, label: labels[4] ?? 'e', offsetY: 18 },
      { from: 5, to: 0, label: labels[5] ?? 'f', anchor: 'end', offsetX: -12 },
    ],
    meta: { notToScale: true },
  };
}

/** A1.12 stems describe growing patterns (counts per term), not geometric "find the square" tasks. */
function isA1PatternSequenceSkill(primarySkillCode?: string): boolean {
  return primarySkillCode === 'A1.12';
}

/**
 * Rectangle with algebraic or unit side labels, e.g. "side lengths 3x and 4x" or "5m and 2m".
 * Plain numeric cm stems still use parseCentimetreValues via createRectangle(labels).
 */
function parseRectangleAlgebraSideLabels(question: string): [string, string] | null {
  const m = question.match(
    /\brectangle has (?:side lengths?|sides)\s+([^.\n]+?)\s+and\s+([^.\n]+?)(?:\.|\s+what\b|\s+find\b)/i,
  );
  if (!m) return null;
  const a = m[1].replace(/\s+/g, ' ').trim();
  const b = m[2].replace(/\s+/g, ' ').trim();
  if (!a || !b) return null;
  if (!/[a-z]/i.test(a + b) && !/\d\s*(?:m|cm)\b/i.test(a + b)) return null;
  return [a, b];
}

/** "A rectangle has area … and one side …" — label known side and "? " for missing (shown on diagram). */
function parseRectangleAreaMissingSide(question: string): [string, string] | null {
  const m = question.match(
    /\brectangle has area\s+([^\s]+)\s+and one side(?:\s+length)?\s+([^\s.]+)/i,
  );
  if (!m) return null;
  return [m[1].trim(), m[2].trim()];
}

/** "A shape has sides x, x, x and 6" style irregular perimeter prompts. */
function parseIrregularSideLabels(question: string): string[] | null {
  const m = question.match(/\bshape has sides\s+(.+?)\.\s*(?:What|Find)/i);
  if (!m) return null;
  const inner = m[1].trim();
  const parts = inner.split(/\s*,\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3 || parts.length > 8) return null;
  return parts;
}

function inferAlgebraRectangleSides(question: string, primarySkillCode?: string): ShapeVisual | null {
  if (primarySkillCode !== 'A1.3' && primarySkillCode !== 'A1.4') return null;
  const pair = parseRectangleAlgebraSideLabels(question);
  if (!pair) return null;
  return createRectangle(pair);
}

function inferAlgebraRectangleAreaMissing(question: string, primarySkillCode?: string): ShapeVisual | null {
  if (primarySkillCode !== 'A1.5') return null;
  const parsed = parseRectangleAreaMissingSide(question);
  if (!parsed) return null;
  const [areaExpr, knownSide] = parsed;
  return {
    ...createRectangle([knownSide, '?']),
    altText: `Rectangle with area ${areaExpr} and one side ${knownSide}.`,
    caption: 'Rectangle diagram: known side labelled; missing side is unknown.',
  };
}

function inferIrregularPerimeterDiagram(question: string, primarySkillCode?: string): ShapeVisual | null {
  if (primarySkillCode !== 'A1.3') return null;
  const sides = parseIrregularSideLabels(question);
  if (!sides) return null;
  return createIrregularPolygon(sides);
}

/** Bar heights for the first few terms of an A1.12 linear pattern (from the stem). */
function inferA1PatternSequenceChart(question: string, primarySkillCode?: string): ChartVisual | null {
  if (!isA1PatternSequenceSkill(primarySkillCode)) return null;

  const termMap = new Map<number, number>();
  const inTermRe = /(\d+)(?:\s+[a-z]+)?\s+in term (\d+)/gi;
  let im: RegExpExecArray | null;
  while ((im = inTermRe.exec(question)) !== null) {
    termMap.set(Number(im[2]), Number(im[1]));
  }
  if (termMap.has(1) && termMap.has(2) && termMap.has(3)) {
    const series = [1, 2, 3].map((t) => ({
      label: `T${t}`,
      value: termMap.get(t)!,
    }));
    return {
      type: 'chart',
      chartType: 'bar',
      series,
      altText: `Bar chart of pattern totals for terms 1 to 3 (${series.map((s) => s.value).join(', ')}).`,
      caption: 'Diagram totals for the first three terms.',
    };
  }

  const addEach =
    question.match(/\badd(?:s|ing)?\s+(\d+)\b[^.\n]*?(?:each time|each term)\b/i) ||
    question.match(/\bincreases?\s+by\s+(\d+)\s+(?:each time|each term)?\b/i) ||
    question.match(/\bgo(?:es)?\s+up\s+by\s+(\d+)\b/i) ||
    question.match(/\bgrows?\s+by\s+(\d+)\s+each time\b/i);
  const startMatch =
    question.match(/\b(?:If\s+)?term\s+1\s+has\s+(\d+)\b/i) ||
    question.match(/\bterm\s+1\s+is\s+(\d+)\b/i) ||
    question.match(/\bstarts?\s+(?:at|with)\s+(\d+)\b/i);
  const targetTermMatch =
    question.match(/\bin term (\d+)\s*\?/i) ||
    question.match(/\bhow many[^?]*\bterm (\d+)\b/i) ||
    question.match(/\bterm (\d+)\s*\?/i);
  if (addEach && startMatch && targetTermMatch) {
    const a = Number(startMatch[1]);
    const d = Number(addEach[1]);
    const target = Number(targetTermMatch[1]);
    if (!Number.isFinite(a) || !Number.isFinite(d) || !Number.isFinite(target) || target < 1) return null;
    const count = Math.min(target, 6);
    const series = Array.from({ length: count }, (_, i) => ({
      label: `T${i + 1}`,
      value: a + i * d,
    }));
    return {
      type: 'chart',
      chartType: 'bar',
      series,
      altText: `Bar chart: term 1 starts at ${a}, adding ${d} each time, up to term ${count}.`,
      caption: 'Linear pattern totals by term.',
    };
  }

  const growBy = question.match(/\bgrows?\s+by\s+(\d+)\s+each time\b/i);
  const term1Is = question.match(/\bterm\s+1\s+is\s+(\d+)\b/i);
  const growTarget =
    question.match(/\bin term (\d+)\s*\?/i) ||
    question.match(/\bhow many[^?]*\bterm (\d+)\b/i) ||
    question.match(/\bterm (\d+)\s*\?/i);
  if (growBy && term1Is && growTarget) {
    const a = Number(term1Is[1]);
    const d = Number(growBy[1]);
    const target = Number(growTarget[1]);
    if (!Number.isFinite(a) || !Number.isFinite(d) || !Number.isFinite(target) || target < 1) return null;
    const count = Math.min(target, 6);
    const series = Array.from({ length: count }, (_, i) => ({
      label: `T${i + 1}`,
      value: a + i * d,
    }));
    return {
      type: 'chart',
      chartType: 'bar',
      series,
      altText: `Bar chart: term 1 is ${a}, growing by ${d} each time, up to term ${count}.`,
      caption: 'Linear pattern totals by term.',
    };
  }

  const listMatch =
    question.match(/\b(?:diagram sequence|pattern)\s+(?:is|has)\s+([\d,\s]+)\.\s*What is term (\d+)/i) ||
    question.match(/\bsequence has totals\s+([\d,\s]+)\.\s*What is term (\d+)/i);
  if (listMatch) {
    const nums = listMatch[1]
      .split(',')
      .map((s) => Number(s.trim().replace(/,/g, '')))
      .filter((n) => Number.isFinite(n));
    const targetTerm = Number(listMatch[2]);
    if (nums.length < 2 || !Number.isFinite(targetTerm) || targetTerm < 1) return null;
    const d = nums[1] - nums[0];
    if (d === 0) return null;
    const shown = Math.min(Math.max(nums.length, Math.min(targetTerm, 6)), 6);
    const series = Array.from({ length: shown }, (_, i) => ({
      label: `T${i + 1}`,
      value: i < nums.length ? nums[i] : nums[nums.length - 1] + (i - (nums.length - 1)) * d,
    }));
    return {
      type: 'chart',
      chartType: 'bar',
      series,
      altText: `Bar chart of listed pattern totals for terms 1 to ${shown}.`,
      caption: 'Diagram totals by term number.',
    };
  }

  const objectsConsec = question.match(/\b([\d,\s]+)\s+objects in consecutive terms\b/i);
  if (objectsConsec) {
    const nums = objectsConsec[1]
      .split(',')
      .map((s) => Number(s.trim().replace(/,/g, '')))
      .filter((n) => Number.isFinite(n));
    const termAsk = question.match(/\bterm\s+(\d+)\b/i);
    const targetTerm = termAsk ? Number(termAsk[1]) : nums.length + 1;
    if (nums.length < 2 || !Number.isFinite(targetTerm)) return null;
    const d = nums[1] - nums[0];
    if (d === 0) return null;
    const shown = Math.min(Math.max(nums.length, Math.min(targetTerm, 6)), 6);
    const series = Array.from({ length: shown }, (_, i) => ({
      label: `T${i + 1}`,
      value: i < nums.length ? nums[i] : nums[nums.length - 1] + (i - (nums.length - 1)) * d,
    }));
    return {
      type: 'chart',
      chartType: 'bar',
      series,
      altText: `Bar chart of consecutive-term object counts (${nums.join(', ')}).`,
      caption: 'Pattern totals by term.',
    };
  }

  const showsTotals = question.match(/\bshows totals\s+([\d,\s]+)\.\s*What is term (\d+)/i);
  if (showsTotals) {
    const nums = showsTotals[1]
      .split(',')
      .map((s) => Number(s.trim().replace(/,/g, '')))
      .filter((n) => Number.isFinite(n));
    const targetTerm = Number(showsTotals[2]);
    if (nums.length < 2 || !Number.isFinite(targetTerm)) return null;
    const d = nums[1] - nums[0];
    if (d === 0) return null;
    const shown = Math.min(Math.max(nums.length, Math.min(targetTerm, 6)), 6);
    const series = Array.from({ length: shown }, (_, i) => ({
      label: `T${i + 1}`,
      value: i < nums.length ? nums[i] : nums[nums.length - 1] + (i - (nums.length - 1)) * d,
    }));
    return {
      type: 'chart',
      chartType: 'bar',
      series,
      altText: `Bar chart of listed totals (${nums.join(', ')}).`,
      caption: 'Diagram totals by term.',
    };
  }

  const diagramTotals = question.match(/\bdiagram totals\s+([\d,\s]+)\.\s*What is term (\d+)/i);
  if (diagramTotals) {
    const nums = diagramTotals[1]
      .split(',')
      .map((s) => Number(s.trim().replace(/,/g, '')))
      .filter((n) => Number.isFinite(n));
    const targetTerm = Number(diagramTotals[2]);
    if (nums.length >= 2 && Number.isFinite(targetTerm)) {
      const d = nums[1] - nums[0];
      if (d !== 0) {
        const shown = Math.min(Math.max(nums.length, Math.min(targetTerm, 6)), 6);
        const series = Array.from({ length: shown }, (_, i) => ({
          label: `T${i + 1}`,
          value: i < nums.length ? nums[i] : nums[nums.length - 1] + (i - (nums.length - 1)) * d,
        }));
        return {
          type: 'chart',
          chartType: 'bar',
          series,
          altText: `Bar chart of diagram totals (${nums.join(', ')}).`,
          caption: 'Diagram totals by term.',
        };
      }
    }
  }

  const patternHasList = question.match(
    /\bpattern has\s+([\d,\s]+)\.\s*What is term (\d+)/i,
  );
  if (patternHasList) {
    const nums = patternHasList[1]
      .split(',')
      .map((s) => Number(s.trim().replace(/,/g, '')))
      .filter((n) => Number.isFinite(n));
    const targetTerm = Number(patternHasList[2]);
    if (nums.length >= 2 && Number.isFinite(targetTerm)) {
      const d = nums[1] - nums[0];
      if (d !== 0) {
        const shown = Math.min(Math.max(nums.length, Math.min(targetTerm, 6)), 6);
        const series = Array.from({ length: shown }, (_, i) => ({
          label: `T${i + 1}`,
          value: i < nums.length ? nums[i] : nums[nums.length - 1] + (i - (nums.length - 1)) * d,
        }));
        return {
          type: 'chart',
          chartType: 'bar',
          series,
          altText: `Bar chart of pattern totals (${nums.join(', ')}).`,
          caption: 'Pattern totals by term.',
        };
      }
    }
  }

  const totalsMatch = question.match(
    /\b(?:totals?|sequence|diagram)\s+(?:is|has|of diagram totals is|of)\s+([\d,\s]+)\.\s*What is term (\d+)/i,
  );
  if (totalsMatch) {
    const nums = totalsMatch[1]
      .split(',')
      .map((s) => Number(s.trim().replace(/,/g, '')))
      .filter((n) => Number.isFinite(n));
    const targetTerm = Number(totalsMatch[2]);
    if (nums.length < 2 || !Number.isFinite(targetTerm)) return null;
    const d = nums[1] - nums[0];
    if (d === 0) return null;
    const shown = Math.min(Math.max(nums.length, Math.min(targetTerm, 6)), 6);
    const series = Array.from({ length: shown }, (_, i) => ({
      label: `T${i + 1}`,
      value: i < nums.length ? nums[i] : nums[nums.length - 1] + (i - (nums.length - 1)) * d,
    }));
    return {
      type: 'chart',
      chartType: 'bar',
      series,
      altText: `Bar chart of pattern totals (${nums.join(', ')}) extended to term ${shown}.`,
      caption: 'Diagram totals by term.',
    };
  }

  return null;
}

function inferShapeVisual(question: string, primarySkillCode?: string): ShapeVisual | null {
  const lower = question.toLowerCase();
  const labels = parseCentimetreValues(question);

  if (isA1PatternSequenceSkill(primarySkillCode)) {
    return null;
  }

  if (primarySkillCode === 'N2.13' || lower.includes('compound shape')) {
    return createCompoundLShape(labels);
  }
  if (lower.includes('irregular polygon') || lower.includes('irregular shape')) {
    return createIrregularPolygon(labels);
  }
  if (/\b(square|regular\s+(?:4-sided|four-sided)\s+shape)\b/i.test(question)) return createSquare(labels);
  if (lower.includes('rectangle')) return createRectangle(labels);
  if (lower.includes('parallelogram')) return createParallelogram(labels);
  if (lower.includes('isosceles triangle')) return createIsoscelesTriangle(labels);
  if (lower.includes('isosceles trapezium')) return createIsoscelesTrapezium(labels);
  if (/\btriangle\b/i.test(question)) {
    return createGenericTriangle(labels);
  }
  if (lower.includes('regular') || /\b(square|pentagon|hexagon|heptagon|octagon)\b/i.test(question)) {
    return createRegularPolygon(question, labels);
  }
  return null;
}

/** Smallest positive difference between sorted distinct values (for tick spacing). */
function minPositiveGap(values: number[]): number | null {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  let best: number | null = null;
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i] - sorted[i - 1];
    if (d > 0 && (best === null || d < best)) best = d;
  }
  return best;
}

function niceStepForRange(range: number, isDecimal: boolean): number {
  if (!Number.isFinite(range) || range <= 0) return isDecimal ? 0.1 : 1;
  if (isDecimal && range <= 2) {
    const candidates = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1];
    for (const c of candidates) {
      if (range / c <= 12) return c;
    }
    return 0.5;
  }
  const raw = range / 8;
  const pow10 = 10 ** Math.floor(Math.log10(raw));
  const frac = raw / pow10;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * pow10;
}

function isN1ExtendedLineSkill(code?: string): boolean {
  return code === 'N1.21' || code === 'N1.22' || code === 'N1.23' || code === 'N1.24';
}

function inferMidpointSegment(question: string, primarySkillCode?: string): NumberLineVisual | null {
  if (
    primarySkillCode !== 'N1.5' &&
    primarySkillCode !== 'N1.9' &&
    primarySkillCode !== 'N1.11' &&
    !isN1ExtendedLineSkill(primarySkillCode)
  ) {
    return null;
  }

  const midMatch = question.match(
    /\b(?:find|calculate)\s+the\s+midpoint\s+of\s+(-?\d+(?:\.\d+)?)\s+and\s+(-?\d+(?:\.\d+)?)\b/i
  );
  if (!midMatch) return null;

  const a = Number(midMatch[1]);
  const b = Number(midMatch[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const mid = (a + b) / 2;
  const span = hi - lo || 1;
  const pad = span * 0.12;
  const isDecimal =
    primarySkillCode === 'N1.11' || isN1ExtendedLineSkill(primarySkillCode) || !Number.isInteger(a) || !Number.isInteger(b);
  const step = niceStepForRange(hi - lo + 2 * pad, isDecimal);

  return {
    type: 'number-line',
    min: lo - pad,
    max: hi + pad,
    step,
    markers: [
      { value: a, label: String(a), kind: 'point' },
      { value: b, label: String(b), kind: 'point' },
      { value: mid, label: 'mid', kind: 'target' },
    ],
    altText: `Number line from ${a} to ${b} showing the midpoint.`,
    caption: 'Midpoint shown between the two values on a number line.',
  };
}

function inferMissingTickNumberLine(question: string, primarySkillCode?: string): NumberLineVisual | null {
  if (primarySkillCode !== 'N1.9' && primarySkillCode !== 'N1.11' && !isN1ExtendedLineSkill(primarySkillCode)) return null;
  if (!/\bmissing value on the number line\b/i.test(question)) return null;

  const parts = question.split(/\bmissing value on the number line\b/i);
  const tail = parts[1] ?? '';
  const seq = [...tail.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (seq.length < 2) return null;

  const gap = minPositiveGap(seq);
  const isDecimal = seq.some((n) => !Number.isInteger(n));
  const step = gap && gap > 0 ? gap : niceStepForRange(Math.max(...seq) - Math.min(...seq), isDecimal);

  const lo = Math.min(...seq);
  const hi = Math.max(...seq);
  const pad = Math.max(step, (hi - lo) * 0.08, 0.5);

  return {
    type: 'number-line',
    min: lo - pad,
    max: hi + pad,
    step,
    markers: seq.map((value) => ({ value, label: String(value), kind: 'point' })),
    altText: 'Number line tick marks from the question sequence.',
    caption: 'Tick marks for the sequence; one value is missing in the question.',
  };
}

function inferNegativePQNumberLine(question: string, primarySkillCode?: string): NumberLineVisual | null {
  if (primarySkillCode !== 'N1.13') return null;
  const diffMatch = question.match(/\bdifference between P and Q is (\d+(?:\.\d+)?)\b/i);
  const qMatch = question.match(/\bQ\s+is\s+at\s+(-?\d+(?:\.\d+)?)\b/i);
  if (!diffMatch || !qMatch) return null;

  const interval = Number(diffMatch[1]);
  const qVal = Number(qMatch[1]);
  if (!Number.isFinite(interval) || !Number.isFinite(qVal)) return null;

  const leftOfQ = /\bP\s+is\s+to\s+the\s+left\b/i.test(question);
  const pVal = leftOfQ ? qVal - interval : qVal + interval;

  const lo = Math.min(pVal, qVal);
  const hi = Math.max(pVal, qVal);
  const pad = Math.max(1, interval * 0.25);
  const step = niceStepForRange(hi - lo + 2 * pad, !Number.isInteger(qVal));

  return {
    type: 'number-line',
    min: lo - pad,
    max: hi + pad,
    step,
    markers: [
      { value: pVal, label: 'P', kind: 'point' },
      { value: qVal, label: 'Q', kind: 'point' },
    ],
    altText: `Number line with P at ${pVal} and Q at ${qVal}.`,
    caption: 'Points P and Q from the interval description on a number line.',
  };
}

function numberLineSkillAllowed(question: string, primarySkillCode?: string): boolean {
  const lower = question.toLowerCase();
  if (lower.includes('number line') || primarySkillCode === 'N2.1') return true;
  if (
    primarySkillCode === 'N1.5' ||
    primarySkillCode === 'N1.9' ||
    primarySkillCode === 'N1.11' ||
    primarySkillCode === 'N1.13' ||
    isN1ExtendedLineSkill(primarySkillCode)
  ) {
    return true;
  }
  if (primarySkillCode === 'N1.14' || primarySkillCode === 'N1.15') {
    return lower.includes('number line');
  }
  return false;
}

function inferNumberLine(question: string, primarySkillCode?: string): NumberLineVisual | null {
  const lower = question.toLowerCase();
  if (!numberLineSkillAllowed(question, primarySkillCode)) return null;

  const jumpMatch = question.match(/starts?\s+at\s+(-?\d+(?:\.\d+)?)\s+and\s+jumps?\s+(?:on|by)\s+(-?\d+(?:\.\d+)?)/i);
  if (jumpMatch) {
    const start = Number(jumpMatch[1]);
    const delta = Number(jumpMatch[2]);
    const end = start + delta;
    const min = Math.min(start, end) - 1;
    const max = Math.max(start, end) + 1;
    return {
      type: 'number-line',
      min,
      max,
      step: 1,
      markers: [
        { value: start, label: String(start), kind: 'point' },
        { value: end, label: String(end), kind: 'target' },
      ],
      jumps: [{ from: start, to: end, label: `${delta >= 0 ? '+' : ''}${delta}` }],
      altText: `Number line jump from ${start} to ${end}.`,
      caption: 'Structured number line jump generated from the question.',
    };
  }

  const midpointSeg = inferMidpointSegment(question, primarySkillCode);
  if (midpointSeg) return midpointSeg;

  const missingTicks = inferMissingTickNumberLine(question, primarySkillCode);
  if (missingTicks) return missingTicks;

  const pq = inferNegativePQNumberLine(question, primarySkillCode);
  if (pq) return pq;

  if (lower.includes('number line') || primarySkillCode === 'N2.1') {
    const operation = parseOperationTokens(question);
    if (operation && operation.operator === '+') {
      const start = operation.left;
      const end = operation.left + operation.right;
      return {
        type: 'number-line',
        min: Math.min(start, end) - 1,
        max: Math.max(start, end) + 1,
        step: 1,
        markers: [
          { value: start, label: String(start), kind: 'point' },
          { value: end, label: String(end), kind: 'target' },
        ],
        jumps: [{ from: start, to: end, label: `+${operation.right}` }],
        altText: `Number line jump from ${start} to ${end}.`,
        caption: 'Structured number line jump generated from the question.',
      };
    }
  }

  const tokens = parseNumericTokens(question);
  if (tokens.length === 0) return null;

  const min = Math.min(...tokens);
  const max = Math.max(...tokens);
  const padding = max === min ? 1 : Math.max(1, Math.ceil((max - min) * 0.15));
  const isDecimal = tokens.some((n) => !Number.isInteger(n));
  const range = max - min + 2 * padding;
  const step = niceStepForRange(range, isDecimal);

  return {
    type: 'number-line',
    min: min - padding,
    max: max + padding,
    step,
    markers: unique(tokens).map((value) => ({ value })),
    altText: 'Number line model generated from the numbers in the question.',
    caption: 'Structured number line generated from the values mentioned in the question.',
  };
}

function inferFractionBar(question: string): FractionBarVisual | null {
  const lower = question.toLowerCase();
  if (!lower.includes('fraction') && !lower.includes('ratio')) return null;

  const tokens = parseNumericTokens(question);
  if (tokens.length < 2) return null;
  const denominator = Math.abs(tokens[1]);
  const numerator = Math.abs(tokens[0]);
  if (!Number.isInteger(denominator) || denominator <= 0) return null;

  return {
    type: 'fraction-bar',
    altText: 'Fraction bar model.',
    caption: 'Structured fraction bar generated from the numbers in the question.',
    bars: [
      {
        id: 'main',
        segments: Array.from({ length: denominator }, (_, index) => ({
          size: 1,
          shaded: index < numerator,
        })),
      },
    ],
  };
}

/** Parse strings like "3/4" or " 2/5 " into a numeric value. */
function parseSimpleFractionValue(text: string): number | null {
  const m = text.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const num = Number(m[1]);
  const den = Number(m[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

function extractMcqChoiceStrings(rawOptions: unknown): string[] {
  if (Array.isArray(rawOptions)) {
    return rawOptions.filter((v): v is string => typeof v === 'string');
  }
  if (isObject(rawOptions) && Array.isArray(rawOptions.choices)) {
    return rawOptions.choices.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

function buildEqualPartsBarModel(total: number, partCount: number, partValue: number): BarModelVisual | null {
  if (
    !Number.isInteger(total) ||
    total <= 0 ||
    !Number.isInteger(partCount) ||
    partCount <= 0 ||
    partCount > 36 ||
    !Number.isInteger(partValue) ||
    partValue <= 0 ||
    partCount * partValue !== total
  ) {
    return null;
  }

  const segments = Array.from({ length: partCount }, () => ({
    value: partValue,
    label: String(partValue),
  }));

  return {
    type: 'bar-model',
    total,
    segments,
    altText: `Bar model with total ${total} split into ${partCount} equal parts of ${partValue}.`,
    caption: 'Equal-parts bar model for the question.',
  };
}

/** N3.1 (and stems that name a bar model): equal-groups / equal-parts diagrams. */
function inferBarModel(question: string, primarySkillCode?: string): BarModelVisual | null {
  const lower = question.toLowerCase();
  if (primarySkillCode !== 'N3.1' && !/\bbar model\b/.test(lower)) return null;

  let m = question.match(/total of (\d+) split into (\d+) equal parts of (\d+)/i);
  if (m) {
    return buildEqualPartsBarModel(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  m = question.match(/(\d+) split into (\d+) equal groups of (\d+)/i);
  if (m) {
    return buildEqualPartsBarModel(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  m = question.match(/(\d+) groups of (\d+) making (\d+)/i);
  if (m) {
    const groups = Number(m[1]);
    const each = Number(m[2]);
    const total = Number(m[3]);
    return buildEqualPartsBarModel(total, groups, each);
  }

  m = question.match(/(\d+) made from (\d+) equal parts of (\d+)/i);
  if (m) {
    return buildEqualPartsBarModel(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  m = question.match(/(?:if a )?bar model (?:shows )?(\d+) as (\d+) equal parts of (\d+)/i);
  if (m) {
    return buildEqualPartsBarModel(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  m = question.match(/total of (\d+) is shared into (\d+) equal groups/i);
  if (m) {
    const total = Number(m[1]);
    const groups = Number(m[2]);
    if (total % groups === 0) {
      return buildEqualPartsBarModel(total, groups, total / groups);
    }
  }

  m = question.match(/total of (\d+) is shared into groups of (\d+)/i);
  if (m) {
    const total = Number(m[1]);
    const groupSize = Number(m[2]);
    if (total % groupSize === 0) {
      const groups = total / groupSize;
      return buildEqualPartsBarModel(total, groups, groupSize);
    }
  }

  m = question.match(/bar model for (\d+) groups of (\d+) making (\d+)/i);
  if (m) {
    return buildEqualPartsBarModel(Number(m[3]), Number(m[1]), Number(m[2]));
  }

  m = question.match(/bar model for (\d+) shared into (\d+) equal groups/i);
  if (m) {
    const total = Number(m[1]);
    const groups = Number(m[2]);
    if (total % groups === 0) {
      return buildEqualPartsBarModel(total, groups, total / groups);
    }
  }

  if (primarySkillCode === 'N3.1' && /\bnumber family\b/i.test(question) && /\bmissing\b/i.test(question)) {
    const fact = question.match(/(\d+)\s*[×x]\s*(\d+)\s*=\s*(\d+)/i);
    if (fact) {
      const a = Number(fact[1]);
      const b = Number(fact[2]);
      const c = Number(fact[3]);
      if (a * b === c) {
        return buildEqualPartsBarModel(c, a, b);
      }
    }
  }

  if (primarySkillCode === 'N3.1') {
    const triple = question.match(/number family (?:for|is correct for) (\d+),\s*(\d+) and (\d+)/i);
    if (triple) {
      const x = Number(triple[1]);
      const y = Number(triple[2]);
      const z = Number(triple[3]);
      const ordered = [x, y, z].sort((a, b) => a - b);
      const [s, m, l] = ordered;
      if (s! * m! === l!) {
        return buildEqualPartsBarModel(l!, s!, m!);
      }
    }

    const ifMult = question.match(/^If\s+(\d+)\s*[×x]\s*(\d+)\s*=\s*(\d+)/i);
    if (ifMult) {
      const a = Number(ifMult[1]);
      const b = Number(ifMult[2]);
      const c = Number(ifMult[3]);
      if (a * b === c) {
        return buildEqualPartsBarModel(c, a, b);
      }
    }

    const writeFamily = question.match(/Write the number family for (\d+),\s*(\d+) and (\d+)/i);
    if (writeFamily) {
      const x = Number(writeFamily[1]);
      const y = Number(writeFamily[2]);
      const z = Number(writeFamily[3]);
      const ordered = [x, y, z].sort((a, b) => a - b);
      const [s, m, l] = ordered;
      if (s! * m! === l!) {
        return buildEqualPartsBarModel(l!, s!, m!);
      }
    }

    const commTf = question.match(/(\d+)\s*[×x]\s*(\d+)\s*=\s*(\d+)\s*[×x]\s*(\d+)/i);
    if (commTf && /true or false/i.test(question)) {
      const a = Number(commTf[1]);
      const b = Number(commTf[2]);
      const c = Number(commTf[3]);
      const d = Number(commTf[4]);
      if (a * b === c * d && c === b && d === a) {
        return buildEqualPartsBarModel(a * b, a, b);
      }
    }

    const divNonComm = question.match(/(\d+)\s*÷\s*(\d+)\s*=\s*(\d+)\s+but/i);
    if (divNonComm) {
      const total = Number(divNonComm[1]);
      const groups = Number(divNonComm[2]);
      if (total % groups === 0) {
        return buildEqualPartsBarModel(total, groups, total / groups);
      }
    }

    const bothDiv = question.match(/(\d+)\s*÷\s*(\d+)\s*=\s*(\d+)\s+and\s+(\d+)\s*÷\s*(\d+)\s*=\s*(\d+)/i);
    if (bothDiv && /\bnumber family\b/i.test(question)) {
      const total = Number(bothDiv[1]);
      const g1 = Number(bothDiv[2]);
      if (total % g1 === 0) {
        return buildEqualPartsBarModel(total, g1, total / g1);
      }
    }

    if (/when dividing one number by another, the order does not matter/i.test(question)) {
      return buildEqualPartsBarModel(12, 4, 3);
    }

    if (/\bdivision is not commutative\b/i.test(question)) {
      return buildEqualPartsBarModel(12, 4, 3);
    }

    if (/(\d+)\s*÷\s*(\d+)\s*=\s*(\d+)\s*÷\s*(\d+)/i.test(question)) {
      const bad = question.match(/(\d+)\s*÷\s*(\d+)\s*=\s*(\d+)\s*÷\s*(\d+)/i)!;
      const total = Number(bad[1]);
      const groups = Number(bad[2]);
      if (total % groups === 0) {
        return buildEqualPartsBarModel(total, groups, total / groups);
      }
    }

    if (/which statement is correct/i.test(question) && /\bcommutative\b/i.test(question)) {
      return buildEqualPartsBarModel(20, 4, 5);
    }

    if (/^which statement is correct\?$/i.test(question.trim())) {
      return buildEqualPartsBarModel(20, 4, 5);
    }
  }

  return null;
}

/**
 * N4.1 (fractions as parts of a whole, 0–1 number lines): infer visuals from stems
 * so question-bank items render without hand-authored `options.visuals`.
 */
function inferN41PartWholeBar(question: string): FractionBarVisual | null {
  const q = question;

  const totalMatch =
    q.match(/\b(?:divided into|split into)\s+(\d+)\s+equal\s+(?:parts?|sections?|slices|triangles)\b/i) ??
    q.match(/\bcut into\s+(\d+)\s+equal\s+slices?\b/i) ??
    q.match(/\bhas\s+(\d+)\s+equal\s+parts?\b/i) ??
    q.match(
      /\b(?:strip|rectangle|bar|circle|square|shape)\s+(?:is\s+)?(?:divided|split)\s+into\s+(\d+)\s+equal\s+(?:parts?|sections?|slices|triangles)\b/i
    );

  if (!totalMatch) return null;
  const total = Number(totalMatch[1]);
  if (!Number.isInteger(total) || total < 2 || total > 36) return null;

  let partsShaded: number | null = null;

  const eatMatch = q.match(/\beats\s+(\d+)\s+slices?\b/i);
  if (eatMatch) partsShaded = Number(eatMatch[1]);

  if (partsShaded == null) {
    const shadedMatch = q.match(/\b(\d+)\s+(?:parts?|sections?|slices|triangles)\s+are\s+shaded\b/i);
    if (shadedMatch) partsShaded = Number(shadedMatch[1]);
  }

  if (partsShaded == null) {
    const andShaded = q.match(/\band\s+(\d+)\s+are\s+shaded\b/i);
    if (andShaded) partsShaded = Number(andShaded[1]);
  }

  if (partsShaded == null) {
    const colourMatch = q.match(/\b(\d+)\s+sections?\s+are\s+colou?red\b/i);
    if (colourMatch) partsShaded = Number(colourMatch[1]);
  }

  if (partsShaded == null || !Number.isInteger(partsShaded) || partsShaded < 0 || partsShaded > total) {
    return null;
  }

  return {
    type: 'fraction-bar',
    altText: `One whole split into ${total} equal parts; ${partsShaded} of them match the question (shaded or chosen).`,
    caption: 'Part–whole model: each block is one equal part of the same whole.',
    bars: [
      {
        id: 'whole',
        segments: Array.from({ length: total }, (_, index) => ({
          size: 1,
          shaded: index < partsShaded,
        })),
      },
    ],
  };
}

function inferN41UnitNumberLine(question: string): NumberLineVisual | null {
  const lower = question.toLowerCase();
  if (!lower.includes('number line') && !lower.includes('between 0 and 1')) return null;
  if (!/from\s+0\s+to\s+1|between\s+0\s+and\s+1/.test(lower)) return null;

  const splitMatch =
    question.match(/\b(?:split|divided)\s+into\s+(\d+)\s+equal\s+(?:parts?|sections?)\b/i) ??
    question.match(/\bdivided\s+into\s+(\d+)\s+equal\s+parts?\b/i);

  const n = splitMatch ? Number(splitMatch[1]) : null;
  if (n != null && (!Number.isInteger(n) || n < 2 || n > 36)) return null;

  if (
    /\bhalfway\b/.test(lower) ||
    (/\bmiddle\b/.test(lower) && lower.includes('number line')) ||
    /\bmarks?\s+at\s+1\s*\/\s*2\b/i.test(question)
  ) {
    const step = n != null && n >= 2 ? 1 / n : 0.5;
    return {
      type: 'number-line',
      min: 0,
      max: 1,
      step,
      markers: [{ value: 0.5, label: '1/2', kind: 'target' }],
      altText: 'Number line from 0 to 1 with the halfway point marked.',
      caption: '0 to 1 number line; the marker shows the position described in the question.',
    };
  }

  if (n != null) {
    let markIndex: number | null = null;

    if (/\bfirst\s+mark\s+after\s+0\b/i.test(question)) markIndex = 1;
    else if (/\bsecond\s+mark\s+after\s+0\b/i.test(question)) markIndex = 2;
    else {
      const ord = question.match(/\b(\d+)(?:st|nd|rd|th)\s+mark\s+after\s+0\b/i);
      if (ord) markIndex = Number(ord[1]);
    }

    if (markIndex != null && markIndex >= 1 && markIndex <= n - 1) {
      const value = markIndex / n;
      const g = gcd(markIndex, n);
      const label = `${markIndex / g}/${n / g}`;
      return {
        type: 'number-line',
        min: 0,
        max: 1,
        step: 1 / n,
        markers: [{ value, label, kind: 'target' }],
        altText: `Number line from 0 to 1 in ${n} equal steps; mark at ${label}.`,
        caption: '0 to 1 number line split into equal parts; the arrow shows the mark described.',
      };
    }
  }

  if (/\b2\s*\/\s*6\b.*\b1\s*\/\s*3\b|\b1\s*\/\s*3\b.*\b2\s*\/\s*6\b/.test(question) && /same\s+point/.test(lower)) {
    return {
      type: 'number-line',
      min: 0,
      max: 1,
      step: 1 / 6,
      markers: [
        { value: 1 / 3, label: '1/3', kind: 'point' },
        { value: 2 / 6, label: '2/6', kind: 'point' },
      ],
      altText: 'Number line from 0 to 1 showing that 1/3 and 2/6 fall on the same position.',
      caption: 'Equivalent fractions occupy the same point between 0 and 1.',
    };
  }

  return null;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function inferN41BetweenBenchmarks(question: string): NumberLineVisual | null {
  const lower = question.toLowerCase();
  if (!lower.includes('between') || !lower.includes('number line')) return null;

  const m = question.match(/\bbetween\s+(\d+)\s*\/\s*(\d+)\s+and\s+(\d+)\s*\/\s*(\d+)/i);
  if (!m) return null;

  const a = Number(m[1]) / Number(m[2]);
  const b = Number(m[3]) / Number(m[4]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const mid = (lo + hi) / 2;

  return {
    type: 'number-line',
    min: 0,
    max: 1,
    step: 0.25,
    markers: [
      { value: lo, label: `${m[1]}/${m[2]}`, kind: 'point' },
      { value: hi, label: `${m[3]}/${m[4]}`, kind: 'point' },
      { value: mid, label: '1/2', kind: 'target' },
    ],
    altText: `Number line from 0 to 1 with ${m[1]}/${m[2]} and ${m[3]}/${m[4]} marked; a value between them is highlighted.`,
    caption: 'Benchmark positions; one fraction between them is shown.',
  };
}

function inferN41ClosestOnUnitInterval(question: string, rawOptions: unknown): NumberLineVisual | null {
  const lower = question.toLowerCase();
  if (!/closest\s+to\s+(0|1)\b/.test(lower)) return null;
  if (!/number line/.test(lower) && !/between\s+0\s+and\s+1/.test(lower)) return null;

  const choices = extractMcqChoiceStrings(rawOptions);
  const parsed = choices
    .map((label) => ({ label, value: parseSimpleFractionValue(label) }))
    .filter((e): e is { label: string; value: number } => e.value != null && e.value >= 0 && e.value <= 1);

  if (parsed.length < 2) return null;

  const towardOne = /closest\s+to\s+1\b/.test(lower);
  const target = towardOne ? 1 : 0;

  let best = parsed[0]!;
  let bestD = Math.abs(parsed[0]!.value - target);
  for (const p of parsed.slice(1)) {
    const d = Math.abs(p.value - target);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }

  return {
    type: 'number-line',
    min: 0,
    max: 1,
    step: 0.1,
    markers: parsed.map((p) => ({
      value: p.value,
      label: p.label,
      kind: p.label === best.label ? 'target' : 'point',
    })),
    altText: `Number line from 0 to 1 with the answer choices plotted; closest to ${target} is highlighted.`,
    caption: 'Each marker is one of the fractions in the question; the filled marker is closest to the target end.',
  };
}

function inferN41Visuals(question: string, rawOptions: unknown): MathsVisual[] {
  const bar = inferN41PartWholeBar(question);
  if (bar) return [bar];

  const unitLine =
    inferN41UnitNumberLine(question) ??
    inferN41BetweenBenchmarks(question) ??
    inferN41ClosestOnUnitInterval(question, rawOptions);

  if (unitLine) return [unitLine];

  return [];
}

function inferGeneratedVisuals(question: string, primarySkillCode?: string, rawOptions?: unknown): MathsVisual[] {
  if (primarySkillCode === 'N4.1') {
    const n41 = inferN41Visuals(question, rawOptions ?? {});
    if (n41.length > 0) return n41;
    // Avoid generic `inferFractionBar`: stems like "Which fraction is greater than 1/2?" yield a bogus 1/2 bar.
    return [];
  }

  const lower = question.toLowerCase();
  const dataVisuals = inferDataVisualsForItem(question, primarySkillCode);
  const a1PatternChart = inferA1PatternSequenceChart(question, primarySkillCode);
  const a1IrregularPerimeter = inferIrregularPerimeterDiagram(question, primarySkillCode);
  const a1RectangleAreaMissing = inferAlgebraRectangleAreaMissing(question, primarySkillCode);
  const a1RectangleSides = inferAlgebraRectangleSides(question, primarySkillCode);
  const barModel = inferBarModel(question, primarySkillCode);
  const numberLine = inferNumberLine(question, primarySkillCode);
  const arithmetic = inferArithmeticLayout(question, primarySkillCode);
  const shape = inferShapeVisual(question, primarySkillCode);
  const fractionBar = inferFractionBar(question);
  const s1Probability = inferS1ProbabilityVisuals(question, primarySkillCode);

  const ordered: Array<
    | BarModelVisual
    | ChartVisual
    | ArithmeticLayoutVisual
    | ShapeVisual
    | NumberLineVisual
    | FractionBarVisual
    | null
  > = lower.includes('number line')
    ? [
        numberLine,
        a1PatternChart,
        a1IrregularPerimeter,
        a1RectangleAreaMissing,
        a1RectangleSides,
        barModel,
        arithmetic,
        shape,
        fractionBar,
      ]
    : [
        a1PatternChart,
        a1IrregularPerimeter,
        a1RectangleAreaMissing,
        a1RectangleSides,
        barModel,
        shape,
        arithmetic,
        numberLine,
        fractionBar,
      ];

  const base = ordered.filter(
    (
      visual
    ): visual is
      | BarModelVisual
      | ChartVisual
      | ArithmeticLayoutVisual
      | ShapeVisual
      | NumberLineVisual
      | FractionBarVisual => visual !== null
  );

  return [...dataVisuals, ...s1Probability, ...base];
}

export function resolveItemVisuals(
  item: {
    question: string;
    options?: unknown;
  },
  primarySkillCode?: string
): MathsVisual[] {
  const explicit = parseStoredVisuals(item.options);
  if (explicit.length > 0) return explicit;

  return inferGeneratedVisuals(
    cleanQuestionForVisualInference(item.question),
    primarySkillCode,
    item.options
  );
}
