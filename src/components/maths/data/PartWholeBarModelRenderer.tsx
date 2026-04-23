import type { PartWholeBarModelVisual } from '@/lib/maths/visuals/types';

export function PartWholeBarModelRenderer({ visual }: { visual: PartWholeBarModelVisual }) {
  const width = 420;
  const padding = 20;
  const barY = 32;
  const barH = 48;
  const innerW = width - 2 * padding;

  const knownSum = visual.parts.reduce((s, p) => s + (p.value ?? 0), 0);
  const unknownCount = visual.parts.filter((p) => p.value == null).length;

  const widths = visual.parts.map((p) => {
    if (p.value != null) return (p.value / visual.total) * innerW;
    const implied = unknownCount > 0 ? Math.max(0, visual.total - knownSum) / unknownCount : 0;
    return (implied / visual.total) * innerW;
  });

  const xs: number[] = [];
  let acc = padding;
  for (let i = 0; i < widths.length; i++) {
    xs.push(acc);
    acc += widths[i];
  }

  const height = 118;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md">
      <text x={padding} y={18} className="fill-slate-600" style={{ fontSize: 12 }}>
        Whole = {visual.total}
      </text>
      {visual.parts.map((p, i) => {
        const w = Math.max(widths[i] ?? 0, 10);
        const segX = xs[i] ?? padding;
        return (
          <g key={i}>
            <rect
              x={segX}
              y={barY}
              width={w}
              height={barH}
              rx={4}
              fill={p.value == null ? '#fff7ed' : '#e8f0fd'}
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray={p.value == null ? '5 4' : '0'}
            />
            <text
              x={segX + w / 2}
              y={barY + barH / 2 + 5}
              textAnchor="middle"
              fill="#0f172a"
              style={{ fontSize: p.value == null ? 16 : 14, fontWeight: p.value == null ? 600 : 500 }}
            >
              {p.value == null ? '?' : p.value}
            </text>
            {p.label && (
              <text
                x={segX + w / 2}
                y={barY + barH + 18}
                textAnchor="middle"
                fill="#64748b"
                style={{ fontSize: 11 }}
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
