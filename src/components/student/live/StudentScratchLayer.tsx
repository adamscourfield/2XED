'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ScratchPoint {
  x: number; // normalised 0–1
  y: number; // normalised 0–1
}

interface ScratchStroke {
  color: string;
  size: number;
  points: ScratchPoint[];
}

type Tool = 'pen' | 'eraser';

const PEN_COLORS = ['#2563eb', '#dc2626', '#16a34a'] as const;
const ERASE_RADIUS = 0.02;

function storageKey(scopeId: string): string {
  return `ember-scratch-${scopeId}`;
}

function loadStrokes(scopeId: string): ScratchStroke[] {
  try {
    const raw = sessionStorage.getItem(storageKey(scopeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStrokes(scopeId: string, strokes: ScratchStroke[]) {
  try {
    sessionStorage.setItem(storageKey(scopeId), JSON.stringify(strokes));
  } catch {
    // Storage full or unavailable — notes stay in memory for this mount.
  }
}

interface Props {
  /** Stable id for the content being annotated (e.g. explanation route id) — notes persist across step changes for the same id. */
  scopeId: string;
  /** Whether drawing input is active. When false, existing notes stay visible but pointer events pass through. */
  active: boolean;
}

/**
 * Personal stylus/touch drawing layer for students. Renders on top of
 * explanation/model content so students can mark up what the teacher is
 * showing. Notes are private to the device (sessionStorage) and never sent
 * to the server.
 */
export function StudentScratchLayer({ scopeId, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<ScratchStroke[]>([]);
  const drawingRef = useRef<ScratchStroke | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<string>(PEN_COLORS[0]);
  const [, forceRender] = useState(0);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const all = drawingRef.current ? [...strokesRef.current, drawingRef.current] : strokesRef.current;
    for (const stroke of all) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * rect.width, stroke.points[0].y * rect.height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * rect.width, stroke.points[i].y * rect.height);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    strokesRef.current = loadStrokes(scopeId);
    repaint();
  }, [scopeId, repaint]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => repaint());
    observer.observe(container);
    return () => observer.disconnect();
  }, [repaint]);

  const toPoint = useCallback((e: React.PointerEvent): ScratchPoint | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const eraseNear = useCallback(
    (point: ScratchPoint) => {
      const before = strokesRef.current.length;
      strokesRef.current = strokesRef.current.filter(
        (stroke) =>
          !stroke.points.some(
            (p) => Math.hypot(p.x - point.x, p.y - point.y) < ERASE_RADIUS,
          ),
      );
      if (strokesRef.current.length !== before) {
        saveStrokes(scopeId, strokesRef.current);
        repaint();
      }
    },
    [scopeId, repaint],
  );

  function handlePointerDown(e: React.PointerEvent) {
    if (!active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toPoint(e);
    if (!point) return;
    if (tool === 'eraser') {
      eraseNear(point);
      return;
    }
    drawingRef.current = { color, size: 2.5, points: [point] };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!active) return;
    const point = toPoint(e);
    if (!point) return;
    if (tool === 'eraser') {
      if (e.buttons > 0) eraseNear(point);
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current.points.push(point);
    repaint();
  }

  function handlePointerUp() {
    if (drawingRef.current) {
      if (drawingRef.current.points.length >= 2) {
        strokesRef.current = [...strokesRef.current, drawingRef.current];
        saveStrokes(scopeId, strokesRef.current);
      }
      drawingRef.current = null;
      repaint();
    }
  }

  function handleClear() {
    strokesRef.current = [];
    drawingRef.current = null;
    saveStrokes(scopeId, []);
    repaint();
    forceRender((n) => n + 1);
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full rounded-2xl ${active ? 'cursor-crosshair touch-none' : 'pointer-events-none'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Your drawing notes"
      />
      {/* Invisible measuring container shares the canvas box */}
      <div ref={containerRef} className="pointer-events-none absolute inset-0" aria-hidden />
      {active ? (
        <div
          className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-2.5 py-1.5 shadow-sm"
          style={{ background: 'var(--anx-surface-container-lowest)', borderColor: 'var(--anx-outline-variant)' }}
        >
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setTool('pen'); setColor(c); }}
              aria-label={`Pen colour ${c}`}
              aria-pressed={tool === 'pen' && color === c}
              className="h-6 w-6 rounded-full border-2 transition"
              style={{
                background: c,
                borderColor: tool === 'pen' && color === c ? 'var(--anx-text)' : 'transparent',
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => setTool('eraser')}
            aria-pressed={tool === 'eraser'}
            className="rounded-full px-2 py-0.5 text-xs font-semibold transition"
            style={{
              background: tool === 'eraser' ? 'var(--anx-primary-soft)' : 'transparent',
              color: tool === 'eraser' ? 'var(--anx-primary)' : 'var(--anx-text-muted)',
            }}
          >
            Eraser
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full px-2 py-0.5 text-xs font-semibold transition"
            style={{ color: 'var(--anx-text-muted)' }}
          >
            Clear
          </button>
        </div>
      ) : null}
    </>
  );
}
