'use client';

import type { VennTwoSetVisual } from '@/lib/maths/visuals/types';

interface Props {
  visual: VennTwoSetVisual;
  maxWidth?: number;
}

function formatList(items: string[], countFallback: number): string {
  if (items.length > 0) {
    return items.join(', ');
  }
  if (countFallback > 0) {
    return `(${countFallback})`;
  }
  return '—';
}

/** Layout: universal box, two overlapping circles A (left) and B (right). */
export function VennTwoSetRenderer({ visual, maxWidth = 480 }: Props) {
  const { aOnly, intersection, bOnly, outside } = visual;
  const c = visual.counts;

  const nA = c?.aOnly ?? aOnly.length;
  const nI = c?.intersection ?? intersection.length;
  const nB = c?.bOnly ?? bOnly.length;
  const nO = c?.outside ?? outside.length;

  const textA = formatList(aOnly, nA);
  const textI = formatList(intersection, nI);
  const textB = formatList(bOnly, nB);
  const textO = formatList(outside, nO);

  const w = Math.min(maxWidth, 480);
  const h = Math.round(w * 0.62);

  return (
    <div className="relative mx-auto select-none" style={{ width: w, height: h }}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="overflow-visible"
        aria-hidden
      >
        <rect
          x={4}
          y={4}
          width={w - 8}
          height={h - 8}
          rx={6}
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth={2}
        />
        <text x={12} y={22} className="fill-slate-500 text-[11px] font-medium">
          ξ
        </text>
        <circle
          cx={w * 0.38}
          cy={h * 0.52}
          r={h * 0.28}
          fill="rgba(59, 130, 246, 0.12)"
          stroke="#2563eb"
          strokeWidth={2}
        />
        <circle
          cx={w * 0.62}
          cy={h * 0.52}
          r={h * 0.28}
          fill="rgba(16, 185, 129, 0.12)"
          stroke="#059669"
          strokeWidth={2}
        />
        <text x={w * 0.26} y={h * 0.48} className="fill-blue-800 text-[11px] font-semibold">
          A
        </text>
        <text x={w * 0.7} y={h * 0.48} className="fill-emerald-800 text-[11px] font-semibold">
          B
        </text>
      </svg>
      {/* Region labels — HTML for wrapping long element lists */}
      <div
        className="pointer-events-none absolute inset-0 text-[10px] leading-tight text-slate-800"
        style={{ padding: `${h * 0.08}px ${w * 0.04}px` }}
      >
        <div
          className="absolute text-left font-medium"
          style={{ left: w * 0.06, top: h * 0.38, width: w * 0.22, maxHeight: h * 0.42, overflow: 'hidden' }}
          title={textA}
        >
          {textA}
        </div>
        <div
          className="absolute text-center font-medium"
          style={{ left: w * 0.36, top: h * 0.44, width: w * 0.28, maxHeight: h * 0.36, overflow: 'hidden' }}
          title={textI}
        >
          {textI}
        </div>
        <div
          className="absolute text-right font-medium"
          style={{ right: w * 0.06, top: h * 0.38, width: w * 0.22, maxHeight: h * 0.42, overflow: 'hidden' }}
          title={textB}
        >
          {textB}
        </div>
        <div
          className="absolute text-center text-slate-600"
          style={{ left: w * 0.12, bottom: h * 0.04, width: w * 0.76, maxHeight: h * 0.18, overflow: 'hidden' }}
          title={textO}
        >
          {nO > 0 || outside.length > 0 ? <span>Outside: {textO}</span> : null}
        </div>
      </div>
    </div>
  );
}
