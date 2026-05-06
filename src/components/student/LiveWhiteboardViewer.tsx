'use client';

import { useEffect, useRef } from 'react';
import type { LiveStroke } from '@/lib/live/whiteboard-strokes';

interface Props {
  logicalWidth: number;
  logicalHeight: number;
  strokes: LiveStroke[];
  className?: string;
  /** When true, skips the background fill so the canvas is transparent (for overlaying on content). */
  transparent?: boolean;
}

function paint(ctx: CanvasRenderingContext2D, strokes: LiveStroke[], w: number, h: number, transparent?: boolean) {
  if (!transparent) {
    // Calm classroom-friendly background — matches the teacher's annotation canvas.
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
  }
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

export function LiveWhiteboardViewer({ logicalWidth, logicalHeight, strokes, className, transparent }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef({ cw: 0, ch: 0, dpr: 1 });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const applyLayout = () => {
      const { clientWidth, clientHeight } = wrap;
      if (clientWidth < 2 || clientHeight < 2) return;
      const ar = logicalWidth / logicalHeight;
      let cw = clientWidth;
      let ch = cw / ar;
      if (ch > clientHeight) {
        ch = clientHeight;
        cw = ch * ar;
      }
      const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
      layoutRef.current = { cw, ch, dpr };
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    };

    const ro = new ResizeObserver(applyLayout);
    ro.observe(wrap);
    applyLayout();
    return () => ro.disconnect();
  }, [logicalWidth, logicalHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { cw, ch, dpr } = layoutRef.current;
    if (cw < 2 || ch < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[LiveWhiteboardViewer] Could not acquire 2D rendering context');
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.scale(cw / logicalWidth, ch / logicalHeight);
    paint(ctx, strokes, logicalWidth, logicalHeight, transparent);
    ctx.restore();
  }, [logicalWidth, logicalHeight, strokes]);

  return (
    <div ref={wrapRef} className={`flex min-h-0 w-full flex-1 flex-col items-center justify-center ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className="touch-none rounded-lg shadow-lg"
        style={{ maxWidth: '100%', maxHeight: '100%', background: transparent ? 'transparent' : undefined }}
      >
        Whiteboard unavailable
      </canvas>
    </div>
  );
}
