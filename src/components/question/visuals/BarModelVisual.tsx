'use client';

interface BarSegment {
  value: number;
  denominator?: number;
  label?: string;
  highlight?: boolean;
  isQuestion?: boolean;
  color?: 'primary' | 'secondary' | 'question';
}

interface BarModelDescriptor {
  type: 'bar_model';
  total: number;
  segments: BarSegment[];
  orientation?: 'horizontal' | 'vertical';
  showTotal?: boolean;
  question?: string;
}

interface Props {
  d: BarModelDescriptor;
  maxWidth: number;
}

export function BarModelVisual({ d, maxWidth }: Props) {
  const width = Math.min(maxWidth, 520);
  const barHeight = 48;
  const padding = 24;
  const barWidth = width - 2 * padding;
  const height = d.question ? 130 : 100;

  const segmentColors: Record<string, string> = {
    primary: 'var(--visual-fill, #e8f0fd)',
    secondary: 'var(--visual-border, #e8e3db)',
    question: 'var(--visual-question, #fff3ed)',
  };

  let xOffset = padding;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      className="block"
    >
      <title>Bar model representing {d.total}</title>

      {d.segments.map((seg, i) => {
        const segWidth = (seg.value / d.total) * barWidth;
        const x = xOffset;
        xOffset += segWidth;

        const fill = seg.isQuestion
          ? segmentColors.question
          : seg.highlight
            ? segmentColors.primary
            : segmentColors.secondary;

        const strokeDash = seg.isQuestion ? '4 2' : 'none';
        const strokeColor = seg.isQuestion
          ? 'var(--visual-accent, #d4541a)'
          : 'var(--visual-border, #e8e3db)';

        return (
          <g key={i}>
            <rect
              x={x}
              y={padding}
              width={segWidth}
              height={barHeight}
              fill={fill}
              stroke={strokeColor}
              strokeWidth={2}
              strokeDasharray={strokeDash}
              rx={2}
            />
            <text
              x={x + segWidth / 2}
              y={padding + barHeight / 2 + 5}
              textAnchor="middle"
              fontSize={seg.isQuestion ? 16 : 13}
              fontWeight={seg.isQuestion ? 'bold' : 'normal'}
              fill={seg.isQuestion ? 'var(--visual-accent, #d4541a)' : 'var(--visual-ink, #1a1814)'}
              fontFamily="system-ui, monospace"
            >
              {seg.isQuestion ? '?' : seg.label ?? seg.value}
            </text>
          </g>
        );
      })}

      {/* Total label */}
      {d.showTotal && (
        <text
          x={width - padding}
          y={padding + barHeight + 20}
          textAnchor="end"
          fontSize={13}
          fill="var(--visual-ink, #1a1814)"
          fontFamily="system-ui, monospace"
        >
          Total: {d.total}
        </text>
      )}

      {/* Question text */}
      {d.question && (
        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          fontSize={13}
          fill="var(--visual-dim, #9e9790)"
          fontFamily="system-ui"
        >
          {d.question}
        </text>
      )}
    </svg>
  );
}
