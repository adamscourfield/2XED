'use client';

interface RectangleDescriptor {
  type: 'rectangle';
  width: number;
  height: number;
  showDimensions?: boolean;
  showArea?: boolean;
  labelWidth?: string;
  labelHeight?: string;
  shaded?: boolean;
  question?: 'area' | 'perimeter' | 'missing_dimension' | null;
  missingDimension?: 'width' | 'height';
  gridLines?: boolean;
}

interface TriangleDescriptor {
  type: 'triangle';
  variant: 'right' | 'isoceles' | 'scalene' | 'equilateral';
  sideA?: number | '?';
  sideB?: number | '?';
  sideC?: number | '?';
  showRightAngle?: boolean;
  question?: 'area' | 'perimeter' | 'missing_side' | 'missing_angle';
}

type GeometryDescriptor = RectangleDescriptor | TriangleDescriptor | { type: 'composite'; shapes: any[]; layout: string; question?: string };

interface Props {
  d: GeometryDescriptor;
  maxWidth: number;
}

export function GeometryVisual({ d, maxWidth }: Props) {
  if (d.type === 'rectangle') return <RectangleSVG d={d} maxWidth={maxWidth} />;
  if (d.type === 'triangle') return <TriangleSVG d={d} maxWidth={maxWidth} />;
  if (d.type === 'composite') return <CompositeSVG d={d} maxWidth={maxWidth} />;
  return null;
}

function RectangleSVG({ d, maxWidth }: { d: RectangleDescriptor; maxWidth: number }) {
  const padding = 40;
  const scale = Math.min((maxWidth - 2 * padding) / d.width, 200 / d.height, 40);
  const rectW = d.width * scale;
  const rectH = d.height * scale;
  const svgW = rectW + 2 * padding;
  const svgH = rectH + 2 * padding;

  const widthLabel = d.labelWidth ?? `${d.width}`;
  const heightLabel = d.labelHeight ?? `${d.height}`;
  const isMissingWidth = d.missingDimension === 'width';
  const isMissingHeight = d.missingDimension === 'height';

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} role="img" className="block">
      <title>Rectangle with width {d.width} and height {d.height}</title>
      <rect
        x={padding}
        y={padding}
        width={rectW}
        height={rectH}
        fill={d.shaded ? 'var(--visual-fill, #e8f0fd)' : 'none'}
        stroke="var(--visual-ink, #1a1814)"
        strokeWidth={2}
      />
      {d.showDimensions && (
        <>
          {/* Width label (bottom) */}
          <text
            x={padding + rectW / 2}
            y={padding + rectH + 20}
            textAnchor="middle"
            fontSize={isMissingWidth ? 16 : 13}
            fontWeight={isMissingWidth ? 'bold' : 'normal'}
            fill={isMissingWidth ? 'var(--visual-accent, #d4541a)' : 'var(--visual-ink, #1a1814)'}
            fontFamily="Inter, system-ui, monospace"
          >
            {isMissingWidth ? '?' : widthLabel}
          </text>
          {/* Height label (right) */}
          <text
            x={padding + rectW + 16}
            y={padding + rectH / 2 + 5}
            textAnchor="start"
            fontSize={isMissingHeight ? 16 : 13}
            fontWeight={isMissingHeight ? 'bold' : 'normal'}
            fill={isMissingHeight ? 'var(--visual-accent, #d4541a)' : 'var(--visual-ink, #1a1814)'}
            fontFamily="Inter, system-ui, monospace"
          >
            {isMissingHeight ? '?' : heightLabel}
          </text>
        </>
      )}
      {d.showArea && (
        <text
          x={padding + rectW / 2}
          y={padding + rectH / 2 + 5}
          textAnchor="middle"
          fontSize={14}
          fill="var(--visual-dim, #9e9790)"
          fontFamily="Inter, system-ui, monospace"
        >
          {d.width * d.height}cm²
        </text>
      )}
    </svg>
  );
}

function TriangleSVG({ d, maxWidth }: { d: TriangleDescriptor; maxWidth: number }) {
  const padding = 40;
  const size = Math.min(maxWidth - 2 * padding, 200);

  let points = '';
  if (d.variant === 'right') {
    points = `${padding},${padding + size} ${padding + size},${padding + size} ${padding},${padding}`;
  } else if (d.variant === 'equilateral') {
    const h = (size * Math.sqrt(3)) / 2;
    points = `${padding},${padding + h} ${padding + size},${padding + h} ${padding + size / 2},${padding}`;
  } else {
    points = `${padding},${padding + size} ${padding + size},${padding + size} ${padding + size * 0.6},${padding}`;
  }

  return (
    <svg width={size + 2 * padding} height={size + 2 * padding} viewBox={`0 0 ${size + 2 * padding} ${size + 2 * padding}`} role="img" className="block">
      <title>{d.variant} triangle</title>
      <polygon
        points={points}
        fill="none"
        stroke="var(--visual-ink, #1a1814)"
        strokeWidth={2}
      />
      {d.showRightAngle && d.variant === 'right' && (
        <rect
          x={padding}
          y={padding + size - 12}
          width={12}
          height={12}
          fill="none"
          stroke="var(--visual-dim, #9e9790)"
          strokeWidth={1}
        />
      )}
      {/* Side labels */}
      {d.sideA !== undefined && (
        <text x={padding - 16} y={padding + size / 2} fontSize={13} fill="var(--visual-ink, #1a1814)" fontFamily="Inter, system-ui, monospace" textAnchor="end">
          {d.sideA === '?' ? '?' : d.sideA}
        </text>
      )}
      {d.sideB !== undefined && (
        <text x={padding + size / 2} y={padding + size + 20} fontSize={13} fill="var(--visual-ink, #1a1814)" fontFamily="Inter, system-ui, monospace" textAnchor="middle">
          {d.sideB === '?' ? '?' : d.sideB}
        </text>
      )}
    </svg>
  );
}

function CompositeSVG({ d, maxWidth }: { d: any; maxWidth: number }) {
  return (
    <svg width={maxWidth} height={200} viewBox={`0 0 ${maxWidth} 200`} role="img" className="block">
      <title>Composite shape</title>
      <text x={maxWidth / 2} y={100} textAnchor="middle" fontSize={14} fill="var(--visual-dim, #9e9790)">
        Composite shape — {d.shapes?.length ?? 0} shapes
      </text>
    </svg>
  );
}
