'use client';

import React, { useCallback, useRef, useState } from 'react';
import type { ProtractorConfig } from '@/features/learn/itemContent';

interface ProtractorInputProps {
  config: ProtractorConfig;
  value: string;
  onChange: (value: string) => void;
  demo?: boolean;
  onInteract?: () => void;
}

const RADIUS = 110;
const CX = RADIUS + 10;
const CY = RADIUS + 10;
const VIEW_W = RADIUS * 2 + 20;
const VIEW_H = RADIUS + 20;

function describeArc(r: number, cx: number, cy: number): string {
  const startX = cx - r;
  const endX = cx + r;
  return `M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`;
}

function polar(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(Math.PI - rad),
    y: CY - r * Math.sin(rad),
  };
}

function ProtractorFace() {
  const ticks: React.ReactNode[] = [];

  for (let deg = 0; deg <= 180; deg += 5) {
    const isMajor = deg % 10 === 0;
    const inner = polar(deg, RADIUS - (isMajor ? 14 : 8));
    const outer = polar(deg, RADIUS);
    ticks.push(
      <line
        key={`tick-${deg}`}
        x1={outer.x} y1={outer.y}
        x2={inner.x} y2={inner.y}
        stroke="var(--anx-text)"
        strokeWidth={isMajor ? 1.5 : 1}
      />
    );
    if (isMajor) {
      const label = polar(deg, RADIUS - 24);
      ticks.push(
        <text
          key={`label-${deg}`}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fill="var(--anx-text)"
        >
          {deg}
        </text>
      );
    }
  }

  return (
    <>
      <path
        d={describeArc(RADIUS, CX, CY)}
        fill="rgba(147,197,253,0.18)"
        stroke="var(--anx-primary)"
        strokeWidth="2"
      />
      <line x1={CX - RADIUS} y1={CY} x2={CX + RADIUS} y2={CY} stroke="var(--anx-primary)" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r="4" fill="var(--anx-primary)" />
      {ticks}
      <circle
        cx={CX + RADIUS}
        cy={CY}
        r="7"
        fill="var(--anx-primary)"
        style={{ cursor: 'grab' }}
        data-handle="rotate"
      />
    </>
  );
}

export function ProtractorInput({ config, value, onChange, demo = false, onInteract }: ProtractorInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [pos, setPos] = useState({ x: 160, y: 160 });
  const [rotation, setRotation] = useState(0);
  const hasInteracted = useRef(false);

  const dragState = useRef<
    | { mode: 'move'; startPointer: { x: number; y: number }; startPos: { x: number; y: number } }
    | { mode: 'rotate'; startAngle: number; startRotation: number }
    | null
  >(null);

  const getContainerPoint = useCallback((e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  function getAngleFromCenter(point: { x: number; y: number }): number {
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return (Math.atan2(-dy, dx) * 180) / Math.PI;
  }

  function notifyInteract() {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      onInteract?.();
    }
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const target = e.target as Element;
    const isRotateHandle = target.getAttribute('data-handle') === 'rotate';
    e.currentTarget.setPointerCapture(e.pointerId);

    if (isRotateHandle) {
      const pt = getContainerPoint(e);
      dragState.current = {
        mode: 'rotate',
        startAngle: getAngleFromCenter(pt),
        startRotation: rotation,
      };
    } else {
      const pt = getContainerPoint(e);
      dragState.current = {
        mode: 'move',
        startPointer: pt,
        startPos: { ...pos },
      };
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragState.current) return;
    notifyInteract();
    const pt = getContainerPoint(e);

    if (dragState.current.mode === 'move') {
      const dx = pt.x - dragState.current.startPointer.x;
      const dy = pt.y - dragState.current.startPointer.y;
      setPos({
        x: dragState.current.startPos.x + dx,
        y: dragState.current.startPos.y + dy,
      });
    } else {
      const currentAngle = getAngleFromCenter(pt);
      const delta = currentAngle - dragState.current.startAngle;
      setRotation(dragState.current.startRotation + delta);
    }
  }

  function onPointerUp() {
    dragState.current = null;
  }

  const displayW = 240;
  const displayH = Math.round((VIEW_H / VIEW_W) * displayW);

  return (
    <div className="space-y-4">
      {/* Instructions — only shown in practice mode */}
      {!demo && (
        <div className="anx-callout-info text-sm">
          <p className="font-medium mb-1">Using the on-screen protractor</p>
          <ol className="list-decimal pl-5 space-y-0.5" style={{ color: 'var(--anx-text-secondary)' }}>
            <li>Drag the <strong>body</strong> to place its centre on the angle vertex.</li>
            <li>Drag the <strong>blue dot</strong> (0° end) to rotate the baseline along one ray.</li>
            <li>Read the angle where the other ray crosses the scale, then type it below.</li>
          </ol>
        </div>
      )}

      {/* Angle image + protractor overlay */}
      <div
        ref={containerRef}
        className="relative rounded-xl border overflow-hidden select-none touch-none"
        style={{
          background: 'var(--anx-surface)',
          borderColor: 'var(--anx-border)',
          minHeight: '320px',
        }}
      >
        {config.angleImage ? (
          <img
            src={config.angleImage}
            alt="Angle to measure"
            className="absolute inset-0 w-full h-full object-contain p-4 pointer-events-none"
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: 'var(--anx-text-faint)', fontSize: '13px' }}
          >
            Angle diagram will appear here
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width={displayW}
          height={displayH}
          style={{
            position: 'absolute',
            left: pos.x - CX * (displayW / VIEW_W),
            top: pos.y - CY * (displayH / VIEW_H),
            transformOrigin: `${CX * (displayW / VIEW_W)}px ${CY * (displayH / VIEW_H)}px`,
            transform: `rotate(${-rotation}deg)`,
            cursor: 'move',
            touchAction: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <ProtractorFace />
        </svg>
      </div>

      {/* Answer input — hidden in demo mode */}
      {!demo && (
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
            What angle does the protractor show?
          </label>
          <div className="flex items-center gap-2">
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              inputMode="decimal"
              className="anx-input w-32"
              placeholder="e.g. 65"
              aria-label="Enter the angle measurement in degrees"
            />
            <span className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>degrees (°)</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--anx-text-faint)' }}>
            Accepted within ±{config.tolerance}°
          </p>
        </div>
      )}
    </div>
  );
}
