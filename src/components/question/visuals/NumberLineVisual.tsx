'use client';

interface NumberLineDescriptor {
  type: 'number_line';
  min: number;
  max: number;
  step?: number;
  marked?: number[];
  highlight?: number;
  arrow?: { from: number; to: number; label?: string };
  showQuestion?: { position: number; label?: string };
  width?: number;
}

interface Props {
  d: NumberLineDescriptor;
  maxWidth: number;
}

export function NumberLineVisual({ d, maxWidth }: Props) {
  const width = d.width ?? Math.min(maxWidth, 520);
  const height = 100;
  const padding = 24;
  const lineY = 55;
  const step = d.step ?? 1;

  const range = d.max - d.min;
  const toX = (val: number) => padding + ((val - d.min) / range) * (width - 2 * padding);

  const ticks: number[] = [];
  for (let v = d.min; v <= d.max; v += step) {
    ticks.push(v);
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      className="block"
    >
      <title>Number line from {d.min} to {d.max}</title>

      {/* Main line */}
      <line
        x1={padding}
        y1={lineY}
        x2={width - padding}
        y2={lineY}
        stroke="var(--visual-ink, #1a1814)"
        strokeWidth={2}
      />

      {/* Ticks and labels */}
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={toX(v)}
            y1={lineY - 6}
            x2={toX(v)}
            y2={lineY + 6}
            stroke="var(--visual-dim, #9e9790)"
            strokeWidth={1}
          />
          <text
            x={toX(v)}
            y={lineY + 20}
            textAnchor="middle"
            fontSize={13}
            fill="var(--visual-ink, #1a1814)"
            fontFamily="system-ui, monospace"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Marked points */}
      {d.marked?.map((v) => (
        <circle
          key={`mark-${v}`}
          cx={toX(v)}
          cy={lineY}
          r={5}
          fill="var(--visual-blue, #1a56d4)"
        />
      ))}

      {/* Highlight point */}
      {d.highlight !== undefined && (
        <circle
          cx={toX(d.highlight)}
          cy={lineY}
          r={6}
          fill="var(--visual-accent, #d4541a)"
        />
      )}

      {/* Arrow */}
      {d.arrow && (
        <g>
          <line
            x1={toX(d.arrow.from)}
            y1={lineY - 16}
            x2={toX(d.arrow.to)}
            y2={lineY - 16}
            stroke="var(--visual-green, #1a9454)"
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--visual-green, #1a9454)" />
            </marker>
          </defs>
          {d.arrow.label && (
            <text
              x={(toX(d.arrow.from) + toX(d.arrow.to)) / 2}
              y={lineY - 22}
              textAnchor="middle"
              fontSize={12}
              fill="var(--visual-green, #1a9454)"
              fontFamily="system-ui, monospace"
            >
              {d.arrow.label}
            </text>
          )}
        </g>
      )}

      {/* Question mark */}
      {d.showQuestion && (
        <g>
          <circle
            cx={toX(d.showQuestion.position)}
            cy={lineY}
            r={10}
            fill="var(--visual-question, #fff3ed)"
            stroke="var(--visual-accent, #d4541a)"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
          <text
            x={toX(d.showQuestion.position)}
            y={lineY + 5}
            textAnchor="middle"
            fontSize={16}
            fontWeight="bold"
            fill="var(--visual-accent, #d4541a)"
            fontFamily="system-ui"
          >
            ?
          </text>
        </g>
      )}
    </svg>
  );
}
