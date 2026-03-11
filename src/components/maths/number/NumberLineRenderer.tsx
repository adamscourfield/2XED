import { mapRange } from '@/lib/maths/visuals/layout';
import type { NumberLineVisual } from '@/lib/maths/visuals/types';

export function NumberLineRenderer({ visual }: { visual: NumberLineVisual }) {
  const width = 320;
  const height = 126;
  const padding = 28;
  const range = visual.max - visual.min;
  const step = visual.step && visual.step > 0 ? visual.step : Math.max(1, Math.round(range / 8));
  const ticks = Array.from(
    { length: Math.floor((visual.max - visual.min) / step) + 1 },
    (_, index) => visual.min + index * step
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-lg">
      <line x1={padding} y1="72" x2={width - padding} y2="72" stroke="#0f172a" strokeWidth="3" />
      {ticks.map((tick) => {
        const x = mapRange(tick, visual.min, visual.max, padding, width - padding);
        return (
          <g key={tick}>
            <line x1={x} y1="62" x2={x} y2="82" stroke="#0f172a" strokeWidth="2" />
            <text x={x} y="106" textAnchor="middle" className="fill-slate-700 text-[11px]">
              {tick}
            </text>
          </g>
        );
      })}
      {visual.jumps?.map((jump, index) => {
        const startX = mapRange(jump.from, visual.min, visual.max, padding, width - padding);
        const endX = mapRange(jump.to, visual.min, visual.max, padding, width - padding);
        const midX = (startX + endX) / 2;
        const span = Math.abs(endX - startX);
        const arcHeight = Math.max(26, Math.min(48, span * 0.35));
        const path = `M ${startX} 62 Q ${midX} ${62 - arcHeight} ${endX} 62`;
        const arrowDirection = endX >= startX ? 1 : -1;
        const arrowBaseX = endX - arrowDirection * 8;
        const label = jump.label ?? `${jump.to - jump.from > 0 ? '+' : ''}${jump.to - jump.from}`;

        return (
          <g key={`${jump.from}-${jump.to}-${index}`}>
            <path d={path} fill="none" stroke="#0f766e" strokeWidth="3" />
            <path
              d={`M ${arrowBaseX} ${58} L ${endX} 62 L ${arrowBaseX} ${66}`}
              fill="none"
              stroke="#0f766e"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text x={midX} y={62 - arcHeight - 8} textAnchor="middle" className="fill-teal-700 text-xs font-semibold">
              {label}
            </text>
          </g>
        );
      })}
      {visual.markers.map((marker, index) => {
        const x = mapRange(marker.value, visual.min, visual.max, padding, width - padding);
        return (
          <g key={`${marker.value}-${index}`}>
            <circle cx={x} cy="54" r="5" fill={marker.kind === 'open' ? '#ffffff' : '#0f766e'} stroke="#0f766e" strokeWidth="2" />
            <text x={x} y="42" textAnchor="middle" className="fill-slate-700 text-xs font-medium">
              {marker.label ?? marker.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
