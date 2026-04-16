'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { LiveStroke, LiveStrokePoint } from '@/lib/live/whiteboard-strokes';

const CANVAS_W = 1200;
const CANVAS_H = 675;

function renderStrokes(ctx: CanvasRenderingContext2D, strokes: LiveStroke[], w: number, h: number) {
  ctx.fillStyle = '#0f1419';
  ctx.fillRect(0, 0, w, h);
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const [first, ...rest] = stroke.points;
    ctx.moveTo(first.x, first.y);
    for (const pt of rest) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }
}

interface Props {
  sessionId: string;
  open: boolean;
  onClose: () => void;
  onPushed: () => void;
}

export function TeacherLiveWhiteboard({ sessionId, open, onClose, onPushed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const versionRef = useRef(0);
  const [strokes, setStrokes] = useState<LiveStroke[]>([]);
  const [penColor, setPenColor] = useState('#f5f5f5');
  const [penWidth, setPenWidth] = useState(3);
  const [pushing, setPushing] = useState(false);
  const isDrawing = useRef(false);
  const currentStroke = useRef<LiveStroke | null>(null);

  const redraw = useCallback((list: LiveStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderStrokes(ctx, list, CANVAS_W, CANVAS_H);
  }, []);

  const pushWhiteboard = useCallback(
    async (payload: {
      action: 'show' | 'clear' | 'hide';
      strokes: LiveStroke[];
      version: number;
    }) => {
      setPushing(true);
      try {
        const res = await fetch(`/api/live-sessions/${sessionId}/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lanes: ['LANE_1', 'LANE_2', 'LANE_3'],
            contentType: 'WHITEBOARD',
            whiteboard: {
              action: payload.action,
              width: CANVAS_W,
              height: CANVAS_H,
              version: payload.version,
              strokes: payload.strokes,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Whiteboard broadcast failed', err);
        } else {
          onPushed();
        }
      } finally {
        setPushing(false);
      }
    },
    [sessionId, onPushed]
  );

  useEffect(() => {
    if (!open) return;
    setStrokes([]);
    const v = Date.now();
    versionRef.current = v;
    requestAnimationFrame(() => redraw([]));
    void pushWhiteboard({ action: 'show', strokes: [], version: v });
  }, [open, pushWhiteboard, redraw]);

  useEffect(() => {
    if (!open) return;
    redraw(strokes);
  }, [strokes, redraw, open]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      isDrawing.current = true;
      const pt: LiveStrokePoint = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        pressure: e.pressure || 0.5,
        timestamp: Date.now(),
      };
      currentStroke.current = {
        points: [pt],
        color: penColor,
        width: penWidth,
      };
    },
    [penColor, penWidth]
  );

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !currentStroke.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const pt: LiveStrokePoint = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure || 0.5,
      timestamp: Date.now(),
    };
    currentStroke.current.points.push(pt);
    const ctx = canvas.getContext('2d');
    if (!ctx || currentStroke.current.points.length < 2) return;
    const s = currentStroke.current;
    const prev = s.points[s.points.length - 2];
    const curr = s.points[s.points.length - 1];
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const cur = currentStroke.current;
    currentStroke.current = null;
    if (!cur || cur.points.length < 2) return;
    versionRef.current += 1;
    const v = versionRef.current;
    setStrokes((prev) => {
      const next = [...prev, cur];
      void pushWhiteboard({ action: 'show', strokes: next, version: v });
      return next;
    });
  }, [pushWhiteboard]);

  const handleClear = useCallback(() => {
    versionRef.current += 1;
    const v = versionRef.current;
    setStrokes([]);
    redraw([]);
    void pushWhiteboard({ action: 'clear', strokes: [], version: v });
  }, [pushWhiteboard, redraw]);

  const handleClose = useCallback(() => {
    versionRef.current += 1;
    const v = versionRef.current;
    void pushWhiteboard({ action: 'hide', strokes: [], version: v });
    onClose();
  }, [pushWhiteboard, onClose]);

  const handleResyncBlank = useCallback(() => {
    versionRef.current += 1;
    const v = versionRef.current;
    setStrokes([]);
    redraw([]);
    void pushWhiteboard({ action: 'show', strokes: [], version: v });
  }, [pushWhiteboard, redraw]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wb-title"
    >
      <div
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-xl border shadow-xl"
        style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface)' }}
      >
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--anx-border)' }}>
          <h2 id="wb-title" className="text-base font-semibold" style={{ color: 'var(--anx-text)' }}>
            Live whiteboard
          </h2>
          <p className="max-w-md text-xs" style={{ color: 'var(--anx-text-muted)' }}>
            A blank board is shown to students. Each stroke syncs on the next poll (about every three seconds).
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              Ink
            </span>
            {(['#f5f5f5', '#7dd3fc', '#fca5a5', '#fde047'] as const).map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: penColor === c ? 'var(--anx-primary)' : 'var(--anx-border)',
                }}
                onClick={() => setPenColor(c)}
              />
            ))}
            <select
              value={penWidth}
              onChange={(e) => setPenWidth(Number(e.target.value))}
              className="anx-input h-8 py-0 text-xs"
              aria-label="Stroke width"
            >
              <option value={2}>Thin</option>
              <option value={3}>Medium</option>
              <option value={5}>Bold</option>
            </select>
            <button type="button" className="anx-btn-secondary px-3 py-1.5 text-xs" onClick={handleResyncBlank} disabled={pushing}>
              Re-sync blank
            </button>
            <button type="button" className="anx-btn-secondary px-3 py-1.5 text-xs" onClick={handleClear} disabled={pushing}>
              Clear board
            </button>
            <button type="button" className="anx-btn-ghost px-3 py-1.5 text-xs" onClick={handleClose} disabled={pushing}>
              End for students
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="max-h-[min(60vh,540px)] w-full max-w-full touch-none rounded-lg"
            style={{ cursor: 'crosshair', aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
          />
        </div>
      </div>
    </div>
  );
}
