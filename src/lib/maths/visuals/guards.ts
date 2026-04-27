import type {
  AngleVisual,
  ArithmeticLayoutVisual,
  BarModelVisual,
  ChartVisual,
  CoordinateGridVisual,
  DataTableVisual,
  FractionBarVisual,
  FrequencyTreeNode,
  FrequencyTreeVisual,
  MathsVisual,
  NumberLineVisual,
  PartWholeBarModelVisual,
  SampleSpaceGridVisual,
  ShapeVisual,
  TimetableVisual,
  VennTwoSetVisual,
} from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateArithmetic(visual: ArithmeticLayoutVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (visual.layout === 'place-value-table') {
    if (!Array.isArray(visual.columnHeaders) || visual.columnHeaders.length === 0) {
      issues.push('place-value-table requires column headers');
    }
    if (!Array.isArray(visual.rows) || visual.rows.length === 0) {
      issues.push('place-value-table requires rows');
    }
  } else if (!Array.isArray(visual.operands) || visual.operands.length < 1) {
    issues.push('arithmetic layout requires operands');
  }
  return issues;
}

function validateShape(visual: ShapeVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!Array.isArray(visual.vertices) || visual.vertices.length < 3) {
    issues.push('shape visual requires at least three vertices');
  }
  return issues;
}

function validateNumberLine(visual: NumberLineVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!(visual.min < visual.max)) issues.push('number line min must be less than max');
  if (!Array.isArray(visual.markers)) issues.push('number line requires markers');
  return issues;
}

function validateFractionBar(visual: FractionBarVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!Array.isArray(visual.bars) || visual.bars.length === 0) {
    issues.push('fraction bar requires at least one bar');
  }
  if (visual.bars.some((bar) => !Array.isArray(bar.segments) || bar.segments.some((segment) => segment.size <= 0))) {
    issues.push('fraction bar segment sizes must be positive');
  }
  return issues;
}

function validateCoordinateGrid(visual: CoordinateGridVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!(visual.xMin < visual.xMax) || !(visual.yMin < visual.yMax)) {
    issues.push('coordinate grid ranges must increase');
  }
  return issues;
}

function validateChart(visual: ChartVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!Array.isArray(visual.series) || visual.series.length === 0) {
    issues.push('chart requires at least one series value');
  }
  return issues;
}

function validateBarModel(visual: BarModelVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!(Number.isInteger(visual.total) && visual.total > 0)) {
    issues.push('bar model requires a positive integer total');
  }
  if (!Array.isArray(visual.segments) || visual.segments.length === 0) {
    issues.push('bar model requires at least one segment');
  }
  if (
    visual.segments.some(
      (seg) => !(typeof seg.value === 'number' && Number.isFinite(seg.value) && seg.value > 0)
    )
  ) {
    issues.push('bar model segments must have positive numeric values');
  }
  const sum = visual.segments.reduce((acc, seg) => acc + seg.value, 0);
  if (Math.abs(sum - visual.total) > 1e-6) {
    issues.push('bar model segment values must sum to the total');
  }
  return issues;
}

function validateTimetable(visual: TimetableVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!Array.isArray(visual.columnHeaders) || visual.columnHeaders.length < 2) {
    issues.push('timetable needs column headers');
  }
  if (!Array.isArray(visual.rows) || visual.rows.length === 0) {
    issues.push('timetable needs rows');
  }
  const n = visual.columnHeaders.length;
  if (visual.rows.some((row: { cells: unknown }) => !Array.isArray(row.cells) || row.cells.length !== n)) {
    issues.push('timetable row cell counts must match headers');
  }
  return issues;
}

function validatePartWholeBarModel(visual: PartWholeBarModelVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (typeof visual.total !== 'number' || !Number.isFinite(visual.total)) {
    issues.push('part-whole bar model requires a numeric total');
  }
  if (!Array.isArray(visual.parts) || visual.parts.length === 0) {
    issues.push('part-whole bar model requires at least one part');
  }
  return issues;
}

function validateDataTable(visual: DataTableVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!Array.isArray(visual.columnHeaders) || visual.columnHeaders.length === 0) {
    issues.push('data table requires column headers');
  }
  if (!Array.isArray(visual.rows) || visual.rows.length === 0) {
    issues.push('data table requires rows');
  }
  return issues;
}

function validateSampleSpaceGrid(visual: SampleSpaceGridVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!Array.isArray(visual.rowLabels) || visual.rowLabels.length === 0) {
    issues.push('sample space grid requires row labels');
  }
  if (!Array.isArray(visual.columnLabels) || visual.columnLabels.length === 0) {
    issues.push('sample space grid requires column labels');
  }
  if (!Array.isArray(visual.cells) || visual.cells.length !== visual.rowLabels.length) {
    issues.push('sample space grid cell rows must match row labels');
  }
  return issues;
}

function validateVennTwoSet(visual: VennTwoSetVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!Array.isArray(visual.aOnly)) issues.push('venn diagram requires aOnly array');
  if (!Array.isArray(visual.intersection)) issues.push('venn diagram requires intersection array');
  if (!Array.isArray(visual.bOnly)) issues.push('venn diagram requires bOnly array');
  return issues;
}

// AngleVisual validator is inline in the switch — no complex fields to check.
// Keeping the reference here so TypeScript tracks the import.
function _checkAngleVisualImported(_: AngleVisual): void { /* used to suppress unused-import */ }

function validateFrequencyTreeNode(node: FrequencyTreeNode, depth: number): string[] {
  const issues: string[] = [];
  if (depth > 6) return ['frequency tree too deep'];
  if (!hasText(node.label)) issues.push('frequency tree node needs a label');
  if (!(node.value === null || (typeof node.value === 'number' && Number.isFinite(node.value)))) {
    issues.push('frequency tree node value must be a number or null');
  }
  if (node.children) {
    for (const child of node.children) {
      issues.push(...validateFrequencyTreeNode(child, depth + 1));
    }
  }
  return issues;
}

function validateFrequencyTree(visual: FrequencyTreeVisual): string[] {
  const issues: string[] = [];
  if (!hasText(visual.altText)) issues.push('missing alt text');
  if (!visual.root) issues.push('frequency tree needs a root');
  else issues.push(...validateFrequencyTreeNode(visual.root, 0));
  return issues;
}

export function validateMathsVisual(visual: MathsVisual): string[] {
  switch (visual.type) {
    case 'arithmetic-layout':
      return validateArithmetic(visual);
    case 'shape':
      return validateShape(visual);
    case 'number-line':
      return validateNumberLine(visual);
    case 'fraction-bar':
      return validateFractionBar(visual);
    case 'coordinate-grid':
      return validateCoordinateGrid(visual);
    case 'chart':
      return validateChart(visual);
    case 'part-whole-bar-model':
      return validatePartWholeBarModel(visual);
    case 'data-table':
      return validateDataTable(visual);
    case 'timetable':
      return validateTimetable(visual);
    case 'frequency-tree':
      return validateFrequencyTree(visual);
    case 'angle-diagram':
      return hasText(visual.altText) ? [] : ['missing alt text'];
    case 'sample-space-grid':
      return validateSampleSpaceGrid(visual);
    case 'venn-two-set':
      return validateVennTwoSet(visual);
    default:
      return ['unknown visual type'];
  }
}

export function isMathsVisual(value: unknown): value is MathsVisual {
  if (!isObject(value) || !hasText(value.type) || !hasText(value.altText)) return false;
  return validateMathsVisual(value as unknown as MathsVisual).length === 0;
}
