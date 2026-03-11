import { isMathsVisual } from '../../lib/maths/visuals/guards';
import type {
  ArithmeticLayoutVisual,
  FractionBarVisual,
  MathsVisual,
  NumberLineVisual,
  ShapeEdgeLabel,
  ShapeVisual,
  VisualPoint,
} from '../../lib/maths/visuals/types';

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

function inferShapeVisual(question: string, primarySkillCode?: string): ShapeVisual | null {
  const lower = question.toLowerCase();
  const labels = parseCentimetreValues(question);

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

function inferNumberLine(question: string, primarySkillCode?: string): NumberLineVisual | null {
  const lower = question.toLowerCase();
  if (
    primarySkillCode !== 'N1.9' &&
    primarySkillCode !== 'N1.10' &&
    primarySkillCode !== 'N1.11' &&
    primarySkillCode !== 'N1.12' &&
    primarySkillCode !== 'N1.13' &&
    !lower.includes('number line')
  ) {
    return null;
  }

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

  return {
    type: 'number-line',
    min: Math.floor(min - padding),
    max: Math.ceil(max + padding),
    step: max - min > 10 ? Math.max(1, Math.round((max - min) / 8)) : 1,
    markers: tokens.map((value) => ({ value })),
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

function inferGeneratedVisuals(question: string, primarySkillCode?: string): MathsVisual[] {
  const lower = question.toLowerCase();
  const numberLine = inferNumberLine(question, primarySkillCode);
  const arithmetic = inferArithmeticLayout(question, primarySkillCode);
  const shape = inferShapeVisual(question, primarySkillCode);
  const fractionBar = inferFractionBar(question);

  const visuals: Array<ArithmeticLayoutVisual | ShapeVisual | NumberLineVisual | FractionBarVisual | null> = lower.includes('number line')
    ? [numberLine, arithmetic, shape, fractionBar]
    : [shape, arithmetic, numberLine, fractionBar];

  return visuals.filter(
    (
      visual
    ): visual is ArithmeticLayoutVisual | ShapeVisual | NumberLineVisual | FractionBarVisual => visual !== null
  );
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

  return inferGeneratedVisuals(cleanQuestionForVisualInference(item.question), primarySkillCode);
}
