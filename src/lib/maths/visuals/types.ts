export interface VisualPoint {
  x: number;
  y: number;
}

export interface VisualCaptioned {
  altText: string;
  caption?: string;
}

export interface ArithmeticAnnotationSpec {
  showCarries?: boolean;
}

export interface ArithmeticRowSpec {
  label?: string;
  values: string[];
}

export interface ArithmeticLayoutVisual extends VisualCaptioned {
  type: 'arithmetic-layout';
  layout:
    | 'column-addition'
    | 'column-subtraction'
    | 'column-multiplication'
    | 'short-division'
    | 'place-value-table';
  operands?: string[];
  operator?: '+' | '-' | 'x' | '÷';
  align?: 'right' | 'decimal';
  showOperator?: boolean;
  showAnswerLine?: boolean;
  showAnswer?: boolean;
  answer?: string;
  annotations?: ArithmeticAnnotationSpec;
  columnHeaders?: string[];
  rows?: ArithmeticRowSpec[];
}

export interface ShapeEdgeLabel {
  from: number;
  to: number;
  label: string;
  anchor?: 'start' | 'middle' | 'end';
  offsetX?: number;
  offsetY?: number;
}

export interface ShapeHelperLine {
  from: VisualPoint;
  to: VisualPoint;
  style?: 'solid' | 'dashed';
  label?: string;
}

export interface ShapeVisual extends VisualCaptioned {
  type: 'shape';
  shape:
    | 'triangle'
    | 'right-triangle'
    | 'rectangle'
    | 'square'
    | 'parallelogram'
    | 'isosceles-triangle'
    | 'isosceles-trapezium'
    | 'regular-polygon'
    | 'irregular-polygon'
    | 'compound-l-shape';
  vertices: VisualPoint[];
  edges?: ShapeEdgeLabel[];
  helperLines?: ShapeHelperLine[];
  meta?: {
    notToScale?: boolean;
    polygonSides?: number;
    rightAngleAt?: number[];
  };
}

export interface NumberLineMarker {
  value: number;
  label?: string;
  kind?: 'point' | 'target' | 'open';
}

export interface NumberLineJump {
  from: number;
  to: number;
  label?: string;
}

export interface NumberLineVisual extends VisualCaptioned {
  type: 'number-line';
  min: number;
  max: number;
  step?: number;
  markers: NumberLineMarker[];
  jumps?: NumberLineJump[];
}

export interface FractionBarSegment {
  size: number;
  shaded?: boolean;
  label?: string;
}

export interface FractionBarSpec {
  id: string;
  segments: FractionBarSegment[];
  label?: string;
}

export interface FractionBarVisual extends VisualCaptioned {
  type: 'fraction-bar';
  bars: FractionBarSpec[];
}

export interface AngleVisual extends VisualCaptioned {
  type: 'angle-diagram';
  vertex: VisualPoint;
  arms: [VisualPoint, VisualPoint];
  label?: string;
}

export interface CoordinateGridPoint {
  x: number;
  y: number;
  label?: string;
}

export interface CoordinateGridVisual extends VisualCaptioned {
  type: 'coordinate-grid';
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  points?: CoordinateGridPoint[];
}

export interface ChartBarSpec {
  label: string;
  value: number;
}

export interface ChartVisual extends VisualCaptioned {
  type: 'chart';
  chartType: 'bar';
  series: ChartBarSpec[];
}

/** Equal-parts bar model for multiplication / division (e.g. N3.1). */
export interface BarModelSegmentSpec {
  /** Numeric size of the segment (used for width proportion). */
  value: number;
  /** Label inside the part (defaults to string of value). */
  label?: string;
}

export interface BarModelVisual extends VisualCaptioned {
  type: 'bar-model';
  total: number;
  segments: BarModelSegmentSpec[];
}

/** Two-event sample space as a labelled grid (probability S1.4 / S1.5). */
export interface SampleSpaceGridVisual extends VisualCaptioned {
  type: 'sample-space-grid';
  rowLabels: string[];
  columnLabels: string[];
  /** rows.length === cells.length; each row has columnLabels.length strings */
  cells: string[][];
}

/** Two-set Venn inside a universal rectangle (probability S1.7–S1.12). */
export interface VennTwoSetVisual extends VisualCaptioned {
  type: 'venn-two-set';
  /** Elements listed in each region (empty → show region count only). */
  aOnly: string[];
  intersection: string[];
  bOnly: string[];
  outside: string[];
  /** Region sizes when element lists are empty or for quick totals */
  counts?: {
    aOnly: number;
    intersection: number;
    bOnly: number;
    outside: number;
  };
}

export type MathsVisual =
  | ArithmeticLayoutVisual
  | ShapeVisual
  | AngleVisual
  | NumberLineVisual
  | FractionBarVisual
  | CoordinateGridVisual
  | ChartVisual
  | BarModelVisual
  | SampleSpaceGridVisual
  | VennTwoSetVisual;
