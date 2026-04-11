'use client';

import React, { useRef } from 'react';
import { mapRange } from '@/lib/maths/visuals/layout';
import type { NumberLineConfig } from '@/features/learn/itemContent';

interface NumberLineInputProps {
  config: NumberLineConfig;
  value: string;
  onChange: (value: string) => void;
}

const VIEW_W = 480;
const VIEW_H = 108;
const PAD = 40;
const LINE_Y = 58;
const MINOR_H = 7;
const MAJOR_H = 12;

function snapToPrecision(value: number, min: number, max: number): number {
  const range = max - min;
  const decimals = range < 2 ? 2 : range < 20 ? 1 : 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toX(value: number, min: number, max: number): number {
  return mapRange(value, min, max, PAD, VIEW_W - PAD);
}

export function NumberLineInput({ config, value, onChange }: NumberLineInputProps) {
  const { min, max, step, task, markerValue, tolerance } = config;
  const svgRef = useRef<SVGSVGElement>(null);

  const range = max - min;
  const effectiveStep = step > 0 ? step : Math.max(1, Math.round(range / 8));
  const ticks: number[] = [];
  for (let v = min; v <= max + effectiveStep * 0.001; v += effectiveStep) {
    ticks.push(Math.round(v * 1e9) / 1e9);
  }

  const labelledSet: Set<number> = config.labelledValues
    ? new Set(config.labelledValues)
    : new Set(
        ticks.filter((_, i) => {
          const stride = Math.max(1, Math.ceil(ticks.length / 6));
          return i % stride === 0 || i === ticks.length - 1;
        })
      );

  function getValueFromClientX(clientX: number): number {
    const svg = svgRef.current;
    if (!svg) return min;
    const rect = svg.getBoundingClientRect();
    const lineStartPx = (PAD / VIEW_W) * rect.width;
    const lineEndPx = ((VIEW_W - PAD) / VIEW_W) * rect.width;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left - lineStartPx) / (lineEndPx - lineStartPx)));
    const raw = min + ratio * range;
    return Math.max(min, Math.min(max, snapToPrecision(raw, min, max)));
  }

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (task !== 'place') return;
    onChange(String(getValueFromClientX(e.clientX)));
  }

  function handleTouch(e: React.TouchEvent<SVGSVGElement>) {
    if (task !== 'place') return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (touch) onChange(String(getValueFromClientX(touch.clientX)));
  }

  const placedValue = task === 'place' && value !== '' ? Number(value) : null;
  const readMarker = task === 'read' && markerValue != null ? markerValue : null;

  return (
    <div className="space-y-3">
      {/* Number line SVG */}
      <div
        className="rounded-xl border p-3"
        style={{ background: 'var(--anx-surface)', borderColor: 'var(--anx-border)' }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full touch-none select-none"
          style={{ cursor: task === 'place' ? 'crosshair' : 'default' }}
          onClick={handleClick}
          onTouchEnd={handleTouch}
          aria-label={task === 'place' ? 'Interactive number line — tap to place your marker' : 'Number line with arrow'}
        >
          {/* Invisible wide hit area for the line */}
          {task === 'place' && (
            <rect
              x={PAD - 8}
              y={LINE_Y - 28}
              width={VIEW_W - PAD * 2 + 16}
              height={56}
              fill="transparent"
            />
          )}

          {/* Main axis */}
          <line x1={PAD} y1={LINE_Y} x2={VIEW_W - PAD} y2={LINE_Y} stroke="var(--anx-text)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Arrow heads at both ends */}
          <polygon points={`${PAD - 1},${LINE_Y} ${PAD + 9},${LINE_Y - 4} ${PAD + 9},${LINE_Y + 4}`} fill="var(--anx-text)" />
          <polygon points={`${VIEW_W - PAD + 1},${LINE_Y} ${VIEW_W - PAD - 9},${LINE_Y - 4} ${VIEW_W - PAD - 9},${LINE_Y + 4}`} fill="var(--anx-text)" />

          {/* Ticks and labels */}
          {ticks.map((tick) => {
            const x = toX(tick, min, max);
            const isMajor = labelledSet.has(tick);
            const h = isMajor ? MAJOR_H : MINOR_H;
            return (
              <g key={tick}>
                <line
                  x1={x} y1={LINE_Y - h}
                  x2={x} y2={LINE_Y + h}
                  stroke="var(--anx-text)"
                  strokeWidth={isMajor ? 2 : 1.5}
                />
                {isMajor && (
                  <text
                    x={x}
                    y={LINE_Y + MAJOR_H + 16}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--anx-text-muted)"
                  >
                    {tick}
                  </text>
                )}
              </g>
            );
          })}

          {/* Placed marker (place task) — downward-pointing triangle above line */}
          {placedValue !== null && (() => {
            const x = toX(placedValue, min, max);
            return (
              <g>
                <line x1={x} y1={LINE_Y - MAJOR_H} x2={x} y2={LINE_Y} stroke="#0f766e" strokeWidth="2.5" />
                <polygon
                  points={`${x},${LINE_Y - MAJOR_H} ${x - 7},${LINE_Y - MAJOR_H - 14} ${x + 7},${LINE_Y - MAJOR_H - 14}`}
                  fill="#0f766e"
                />
                <text
                  x={x}
                  y={LINE_Y - MAJOR_H - 18}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#0f766e"
                >
                  {placedValue}
                </text>
              </g>
            );
          })()}

          {/* Read-task marker — upward-pointing triangle below line (value hidden) */}
          {readMarker !== null && (() => {
            const x = toX(readMarker, min, max);
            return (
              <g>
                <line x1={x} y1={LINE_Y} x2={x} y2={LINE_Y + MAJOR_H} stroke="#1d4ed8" strokeWidth="2.5" />
                <polygon
                  points={`${x},${LINE_Y + MAJOR_H} ${x - 7},${LINE_Y + MAJOR_H + 14} ${x + 7},${LINE_Y + MAJOR_H + 14}`}
                  fill="#1d4ed8"
                />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Interaction layer below the SVG */}
      {task === 'place' && (
        <p className="text-sm text-center" style={{ color: 'var(--anx-text-muted)' }}>
          {placedValue !== null
            ? `Marker placed at ${placedValue}. Tap to move it.`
            : 'Tap the number line to place your marker.'}
        </p>
      )}

      {task === 'read' && (
        <div className="space-y-2">
          <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            Type your estimate for the value shown by the arrow.
          </p>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            className="anx-input"
            placeholder="Enter your estimate"
            aria-label={`Estimate the value shown by the arrow (accepted range ±${tolerance})`}
          />
        </div>
      )}
    </div>
  );
}
