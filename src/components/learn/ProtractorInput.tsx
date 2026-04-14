'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface ProtractorConfig {
  angleImage: string;
  targetAngle: number;
  tolerance: number;
}

interface Props {
  config: ProtractorConfig;
  value: string;
  onChange: (value: string) => void;
  demo?: boolean;
  onInteract?: () => void;
}

const R = 90;
const M = 12;
const SVG_W = 2 * R + 2 * M; // 204
const SVG_H = R + 2 * M;     // 114
const CX = R + M;             // 102
const CY = R + M;             // 102

function arcPt(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)];
}

export function ProtractorInput({ config, value, onChange, demo = false, onInteract }: Props) {
  const [pos, setPos] = useState({ x: 160, y: 190 });
  const [rot, setRot] = useState(0);

  const posRef = useRef({ x: 160, y: 190 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragKind = useRef<'none' | 'centre' | 'handle'>('none');
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const hasInteracted = useRef(false);

  const notifyInteract = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      onInteract?.();
    }
  }, [onInteract]);

  const onMouseDownBody = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragKind.current = 'centre';
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        dragOffset.current = {
          dx: e.clientX - rect.left - posRef.current.x,
          dy: e.clientY - rect.top - posRef.current.y,
        };
      }
    },
    []
  );

  const onMouseDownHandle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragKind.current = 'handle';
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragKind.current === 'none' || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      notifyInteract();
      if (dragKind.current === 'centre') {
        const next = {
          x: e.clientX - rect.left - dragOffset.current.dx,
          y: e.clientY - rect.top - dragOffset.current.dy,
        };
        setPos(next);
        posRef.current = next;
      } else {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        setRot(
          Math.atan2(my - posRef.current.y, mx - posRef.current.x) * (180 / Math.PI)
        );
      }
    }
    function onUp() {
      dragKind.current = 'none';
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [notifyInteract]);

  // Build tick marks 0–180 every 10°
  const ticks = Array.from({ length: 19 }, (_, i) => {
    const a = i * 10;
    const major = a % 30 === 0;
    const [ox, oy] = arcPt(a, R);
    const [ix, iy] = arcPt(a, major ? R - 14 : R - 7);
    const [lx, ly] = arcPt(a, R - 27);
    return (
      <g key={a}>
        <line
          x1={ox} y1={oy} x2={ix} y2={iy}
          stroke="#4b5563"
          strokeWidth={major ? 1.5 : 0.8}
        />
        {major && (
          <text
            x={lx} y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="#374151"
          >
            {a}
          </text>
        )}
      </g>
    );
  });

  const arcPath = `M ${CX + R} ${CY} A ${R} ${R} 0 0 0 ${CX - R} ${CY}`;
  const [hx, hy] = arcPt(0, R); // handle at 0°

  return (
    <div className="space-y-3">
      {/* Image + protractor overlay */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
        style={{ height: 320 }}
      >
        {config.angleImage && (
          <img
            src={config.angleImage}
            alt="Angle diagram"
            className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        )}

        {/* SVG protractor — position anchored by its centre point */}
        <svg
          width={SVG_W}
          height={SVG_H}
          style={{
            position: 'absolute',
            left: pos.x - CX,
            top: pos.y - CY,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
          onMouseDown={onMouseDownBody}
        >
          <g transform={`rotate(${rot}, ${CX}, ${CY})`}>
            {/* Filled semicircle */}
            <path
              d={arcPath}
              fill="rgba(147,197,253,0.30)"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
            {/* Baseline */}
            <line
              x1={CX - R} y1={CY}
              x2={CX + R} y2={CY}
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
            {/* Tick marks and labels */}
            {ticks}
            {/* Centre pivot dot */}
            <circle cx={CX} cy={CY} r={4} fill="#3b82f6" stroke="white" strokeWidth="1.5" />
            {/* Blue handle at 0° — drag this to rotate the baseline */}
            <circle
              cx={hx}
              cy={hy}
              r={8}
              fill="#2563eb"
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onMouseDown={onMouseDownHandle}
            />
          </g>
        </svg>
      </div>

      {/* Answer input — hidden in demo mode */}
      {!demo && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Drag the protractor to place its centre on the angle vertex. Use the blue handle to rotate the 0° edge along one ray. Then type the angle where the other ray crosses the scale.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Angle in degrees"
            className="anx-input"
          />
        </div>
      )}
    </div>
  );
}
