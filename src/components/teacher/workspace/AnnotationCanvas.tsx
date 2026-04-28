'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { LiveStroke, LiveStrokePoint } from '@/lib/live/whiteboard-strokes';

/* The teacher canvas uses a fixed logical coordinate space so that strokes
   sent over the wire to students always render at the same proportions. */
export const CANVAS_W = 1600;
export const CANVAS_H = 900;

export type CanvasTool = 'pen' | 'highlighter' | 'eraser' | 'text' | 'shape' | 'pointer';

export interface CanvasTextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface CanvasShapeItem {
  id: string;
  shape: 'rect' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface AnnotationCanvasState {
  strokes: LiveStroke[];
  texts: CanvasTextItem[];
  shapes: CanvasShapeItem[];
  bgImage?: { src: string; x: number; y: number; w: number; h: number } | null;
}

export interface AnnotationCanvasHandle {
  undo(): void;
  redo(): void;
  clear(): void;
  insertText(text: string): void;
  insertImage(file: File): Promise<void>;
}

interface Props {
  tool: CanvasTool;
  color: string;
  width: number;
  onStateChange?: (state: AnnotationCanvasState, version: number) => void;
  /** Fired when undo/redo availability changes (for toolbar controls). */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  /** Whether the board has strokes, text, shapes, or a background image. */
  onBoardContentChange?: (hasContent: boolean) => void;
  /** Optional placeholder content drawn behind strokes. */
  watermark?: string;
  /** When true, the canvas background and dotted grid are omitted so content behind the canvas shows through. */
  transparent?: boolean;
}

function rectFromPoints(a: { x: number; y: number }, b: { x: number; y: number }) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return { x, y, w, h };
}

function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('rgba')) return hex;
  if (hex.startsWith('#') && hex.length === 7) {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
  }
  return hex;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: AnnotationCanvasState,
  w: number,
  h: number,
  watermark?: string,
  transparent?: boolean,
) {
  ctx.clearRect(0, 0, w, h);

  if (!transparent) {
    // soft dotted backdrop for a calm classroom feel
    ctx.save();
    ctx.fillStyle = '#fbfbfd';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e6e6ef';
    const step = 32;
    for (let y = step; y < h; y += step) {
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    if (watermark) {
      ctx.save();
      ctx.fillStyle = 'rgba(74, 64, 224, 0.06)';
      ctx.font = '600 36px var(--font-manrope), Manrope, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(watermark, w / 2, h / 2);
      ctx.restore();
    }
  }

  // shapes (under strokes)
  for (const s of state.shapes) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    if (s.shape === 'rect') {
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    } else {
      ctx.beginPath();
      ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), Math.abs(s.h / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // strokes
  for (const stroke of state.strokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const [first, ...rest] = stroke.points;
    ctx.moveTo(first.x, first.y);
    for (const pt of rest) ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  // texts
  for (const t of state.texts) {
    ctx.save();
    ctx.fillStyle = t.color;
    ctx.font = '600 28px var(--font-manrope), Manrope, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

function emptyState(): AnnotationCanvasState {
  return { strokes: [], texts: [], shapes: [], bgImage: null };
}

export function annotationStateHasContent(s: AnnotationCanvasState): boolean {
  if (s.strokes.length > 0 || s.texts.length > 0 || s.shapes.length > 0) return true;
  if (s.bgImage?.src) return true;
  return false;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, Props>(function AnnotationCanvas(
  { tool, color, width, onStateChange, onHistoryChange, onBoardContentChange, watermark, transparent },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [ringPos, setRingPos] = useState<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<AnnotationCanvasState>(emptyState);
  const versionRef = useRef(0);
  const historyRef = useRef<AnnotationCanvasState[]>([emptyState()]);
  const futureRef = useRef<AnnotationCanvasState[]>([]);
  const onHistoryChangeRef = useRef(onHistoryChange);
  onHistoryChangeRef.current = onHistoryChange;

  const onBoardContentChangeRef = useRef(onBoardContentChange);
  onBoardContentChangeRef.current = onBoardContentChange;

  const emitHistory = useCallback(() => {
    onHistoryChangeRef.current?.(
      historyRef.current.length > 1,
      futureRef.current.length > 0,
    );
  }, []);
  const isDrawing = useRef(false);
  const currentStroke = useRef<LiveStroke | null>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const previewShape = useRef<CanvasShapeItem | null>(null);

  const redraw = useCallback(
    (s: AnnotationCanvasState) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawScene(ctx, s, CANVAS_W, CANVAS_H, watermark, transparent);
      // overlay live shape preview (not yet committed)
      if (previewShape.current) {
        const p = previewShape.current;
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        if (p.shape === 'rect') {
          ctx.strokeRect(p.x, p.y, p.w, p.h);
        } else {
          ctx.beginPath();
          ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, Math.abs(p.w / 2), Math.abs(p.h / 2), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    },
    [watermark, transparent],
  );

  useEffect(() => {
    redraw(state);
  }, [state, redraw]);

  useEffect(() => {
    emitHistory();
  }, [state, emitHistory]);

  useEffect(() => {
    onBoardContentChangeRef.current?.(annotationStateHasContent(state));
  }, [state]);

  const commit = useCallback(
    (next: AnnotationCanvasState) => {
      historyRef.current.push(next);
      if (historyRef.current.length > 100) historyRef.current.shift();
      futureRef.current = [];
      versionRef.current += 1;
      setState(next);
      onStateChange?.(next, versionRef.current);
    },
    [onStateChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      undo() {
        if (historyRef.current.length <= 1) return;
        const current = historyRef.current.pop()!;
        futureRef.current.push(current);
        const prev = historyRef.current[historyRef.current.length - 1];
        versionRef.current += 1;
        setState(prev);
        onStateChange?.(prev, versionRef.current);
      },
      redo() {
        const next = futureRef.current.pop();
        if (!next) return;
        historyRef.current.push(next);
        versionRef.current += 1;
        setState(next);
        onStateChange?.(next, versionRef.current);
      },
      clear() {
        const empty = emptyState();
        commit(empty);
      },
      insertText(text: string) {
        if (!text.trim()) return;
        const next: AnnotationCanvasState = {
          ...state,
          texts: [
            ...state.texts,
            {
              id: `t-${Date.now()}`,
              x: 80,
              y: 80 + state.texts.length * 48,
              text,
              color,
            },
          ],
        };
        commit(next);
      },
      async insertImage(file: File) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const next: AnnotationCanvasState = {
          ...state,
          bgImage: { src: dataUrl, x: 0, y: 0, w: CANVAS_W, h: CANVAS_H },
        };
        commit(next);
      },
    }),
    [state, color, commit, onStateChange],
  );

  function getCanvasPoint(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool === 'pointer') return;
    e.preventDefault();
    const pt = getCanvasPoint(e);

    if (tool === 'pen' || tool === 'highlighter') {
      isDrawing.current = true;
      const strokeColor = tool === 'highlighter' ? withAlpha(color, 0.35) : color;
      const strokeWidth = tool === 'highlighter' ? Math.max(width * 4, 16) : width;
      currentStroke.current = {
        points: [{ x: pt.x, y: pt.y, pressure: e.pressure || 0.5, timestamp: Date.now() }],
        color: strokeColor,
        width: strokeWidth,
      };
      return;
    }

    if (tool === 'eraser') {
      // erase any stroke that comes near this point
      const erased = state.strokes.filter((s) =>
        !s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 24),
      );
      if (erased.length !== state.strokes.length) {
        commit({ ...state, strokes: erased });
      }
      return;
    }

    if (tool === 'shape') {
      dragOrigin.current = pt;
      previewShape.current = {
        id: `s-${Date.now()}`,
        shape: 'rect',
        x: pt.x,
        y: pt.y,
        w: 0,
        h: 0,
        color,
      };
      isDrawing.current = true;
      return;
    }

    if (tool === 'text') {
      const value = window.prompt('Type text to drop on the canvas');
      if (value && value.trim()) {
        const next: AnnotationCanvasState = {
          ...state,
          texts: [
            ...state.texts,
            { id: `t-${Date.now()}`, x: pt.x, y: pt.y, text: value, color },
          ],
        };
        commit(next);
      }
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pt = getCanvasPoint(e);

    if (tool === 'pen' || tool === 'highlighter') {
      const cur = currentStroke.current;
      if (!cur) return;
      cur.points.push({ x: pt.x, y: pt.y, pressure: e.pressure || 0.5, timestamp: Date.now() });
      // incremental draw for responsiveness
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || cur.points.length < 2) return;
      const prev = cur.points[cur.points.length - 2];
      const next = cur.points[cur.points.length - 1];
      ctx.beginPath();
      ctx.strokeStyle = cur.color;
      ctx.lineWidth = cur.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
      return;
    }

    if (tool === 'shape' && dragOrigin.current && previewShape.current) {
      const r = rectFromPoints(dragOrigin.current, pt);
      previewShape.current = { ...previewShape.current, ...r };
      redraw(state);
    }
  }

  function endStroke() {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentStroke.current && currentStroke.current.points.length >= 2) {
      const next: AnnotationCanvasState = {
        ...state,
        strokes: [...state.strokes, currentStroke.current],
      };
      currentStroke.current = null;
      commit(next);
      return;
    }
    currentStroke.current = null;

    if (previewShape.current && (previewShape.current.w > 4 || previewShape.current.h > 4)) {
      const next: AnnotationCanvasState = {
        ...state,
        shapes: [...state.shapes, previewShape.current],
      };
      previewShape.current = null;
      dragOrigin.current = null;
      commit(next);
      return;
    }
    previewShape.current = null;
    dragOrigin.current = null;
  }

  const ringRadiusPx = useMemo(() => {
    switch (tool) {
      case 'highlighter':
        return Math.min(28, 14 + width * 3);
      case 'pen':
        return Math.min(22, 10 + width * 2.5);
      case 'eraser':
        return 22;
      case 'shape':
        return 14;
      case 'text':
        return 12;
      default:
        return 14;
    }
  }, [tool, width]);

  function handleHostPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    setRingPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleHostPointerLeave() {
    setRingPos(null);
  }

  const showToolRing =
    ringPos !== null && tool !== 'pointer' && tool !== 'text';

  const cursor = useMemo(() => {
    switch (tool) {
      case 'pointer':
        return 'default';
      case 'eraser':
        return 'cell';
      case 'text':
        return 'text';
      default:
        return 'crosshair';
    }
  }, [tool]);

  return (
    <div
      ref={hostRef}
      className="anx-canvas-host relative h-full w-full"
      onPointerMove={handleHostPointerMove}
      onPointerLeave={handleHostPointerLeave}
    >
      {showToolRing ? (
        <span
          className="anx-canvas-tool-ring pointer-events-none absolute z-[15]"
          aria-hidden
          style={{
            left: ringPos!.x,
            top: ringPos!.y,
            width: ringRadiusPx * 2,
            height: ringRadiusPx * 2,
            marginLeft: -ringRadiusPx,
            marginTop: -ringRadiusPx,
            borderColor:
              tool === 'highlighter'
                ? withAlpha(color, 0.55)
                : tool === 'eraser'
                  ? 'rgba(239, 68, 68, 0.45)'
                  : color,
          }}
        />
      ) : null}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="anx-canvas-surface relative z-[10]"
        style={{ cursor, background: transparent ? 'transparent' : undefined }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
    </div>
  );
});
