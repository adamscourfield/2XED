import type { BarModelVisual } from '@/lib/maths/visuals/types';

export function BarModelRenderer({ visual }: { visual: BarModelVisual }) {
  const total = visual.total;
  const segmentCount = visual.segments.length;

  return (
    <div className="space-y-2">
      {visual.caption ? <p className="text-sm text-slate-600">{visual.caption}</p> : null}
      <svg viewBox="0 0 320 64" className="w-full max-w-lg" role="img" aria-label={visual.altText}>
        <title>{visual.altText}</title>
        {visual.segments.map((seg, index) => {
          const width = 300 / Math.max(segmentCount, 1);
          const x = 10 + index * width;
          return (
            <g key={index}>
              <rect
                x={x + 1}
                y="10"
                width={width - 2}
                height="36"
                rx={3}
                className="fill-[var(--visual-fill,#e8f0fd)] stroke-[var(--visual-border,#94a3b8)]"
                strokeWidth={2}
              />
              <line
                x1={x + 1}
                y1="46"
                x2={x + width - 1}
                y2="46"
                className="stroke-[var(--visual-border,#94a3b8)]"
                strokeWidth={1}
              />
              <text
                x={x + width / 2}
                y="33"
                textAnchor="middle"
                className="fill-slate-800 text-[13px] font-medium"
                fontFamily="system-ui, sans-serif"
              >
                {seg.label ?? seg.value}
              </text>
            </g>
          );
        })}
        <text
          x="160"
          y="60"
          textAnchor="middle"
          className="fill-slate-600 text-xs"
          fontFamily="system-ui, sans-serif"
        >
          Total: {total}
        </text>
      </svg>
    </div>
  );
}
