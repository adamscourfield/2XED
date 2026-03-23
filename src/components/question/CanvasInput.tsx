'use client';

import { useRef, useState, useCallback, useEffect, type PointerEvent as ReactPointerEvent } from 'react';

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
}

export interface CanvasInputData {
  strokes: Stroke[];
  text: string;
  snapshotBase64: string;
  snapshotCropped?: string;
}

export interface CanvasInputProps {
  questionId: string;
  mode: 'draw' | 'draw+type' | 'type-first';
  initialStrokes?: Stroke[];
  initialText?: string;
  onChange: (data: CanvasInputData) => void;
  disabled?: boolean;
  penColor?: string;
  penWidth?: number;
}

interface UndoStack {
  strokes: Stroke[];
  text: string;
}

function computeBoundingBox(strokes: Stroke[]): { x: number; y: number; width: number; height: number } | null {
  if (strokes.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const stroke of strokes) {
    for (const pt of stroke.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  const PAD = 16;
  return {
    x: minX - PAD,
    y: minY - PAD,
    width: maxX - minX + PAD * 2,
    height: maxY - minY + PAD * 2,
  };
}

function renderStrokesToCanvas(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  bbox?: { x: number; y: number; width: number; height: number } | null
): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (bbox) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, bbox.width, bbox.height);
    ctx.clip();
    ctx.translate(-bbox.x, -bbox.y);
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bbox ? bbox.x : 0, bbox ? bbox.y : 0, bbox ? bbox.width : canvas.width, bbox ? bbox.height : canvas.height);

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

  if (bbox) ctx.restore();
}

export function CanvasInput({
  questionId,
  mode,
  initialStrokes = [],
  initialText = '',
  onChange,
  disabled = false,
  penColor = '#1a1a1a',
  penWidth = 2,
}: CanvasInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const undoStack = useRef<UndoStack[]>([]);

  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [text, setText] = useState(initialText);
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>(() =>
    mode === 'type-first' ? 'type' : 'draw'
  );

  // Initialise offscreen canvas
  useEffect(() => {
    offscreenRef.current = document.createElement('canvas');
  }, []);

  const pushUndo = useCallback(() => {
    undoStack.current.push({ strokes: [...strokes], text });
  }, [strokes, text]);

  const emit = useCallback(
    (newStrokes: Stroke[], newText: string) => {
      const canvas = canvasRef.current;
      const offscreen = offscreenRef.current;
      if (!canvas || !offscreen) return;

      const bbox = computeBoundingBox(newStrokes);
      const w = bbox?.width ?? canvas.width;
      const h = bbox?.height ?? canvas.height;

      offscreen.width = w;
      offscreen.height = h;
      renderStrokesToCanvas(offscreen, newStrokes, bbox);

      const snapshotBase64 = offscreen.toDataURL('image/png', 1.0);

      onChange({
        strokes: newStrokes,
        text: newText,
        snapshotBase64,
        snapshotCropped: bbox ? snapshotBase64 : undefined,
      });
    },
    [onChange]
  );

  // Pointer down — start stroke
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled || activeTab !== 'draw') return;
      e.preventDefault();

      pushUndo();
      isDrawing.current = true;

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const stroke: Stroke = {
        points: [
          {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
            pressure: e.pressure || 0.5,
            timestamp: Date.now(),
          },
        ],
        color: penColor,
        width: penWidth,
      };

      currentStroke.current = stroke;
    },
    [disabled, activeTab, penColor, penWidth, pushUndo]
  );

  // Pointer move — extend stroke
  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || !currentStroke.current || activeTab !== 'draw') return;
      e.preventDefault();

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const pt = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        pressure: e.pressure || 0.5,
        timestamp: Date.now(),
      };

      const newStrokes = [...strokes, { ...currentStroke.current, points: [...currentStroke.current.points, pt] }];
      setStrokes(newStrokes);
      currentStroke.current.points.push(pt);

      // Draw incrementally on canvas
      const ctx = canvas.getContext('2d')!;
      const s = currentStroke.current;
      if (s.points.length >= 2) {
        const last = s.points[s.points.length - 2];
        const curr = s.points[s.points.length - 1];
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    },
    [activeTab, strokes]
  );

  // Pointer up — end stroke
  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentStroke.current && currentStroke.current.points.length > 1) {
      const newStrokes = [...strokes, currentStroke.current];
      setStrokes(newStrokes);
      emit(newStrokes, text);
    }
    currentStroke.current = null;
  }, [strokes, text, emit]);

  // Undo
  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setStrokes(prev.strokes);
    setText(prev.text);
    emit(prev.strokes, prev.text);

    // Redraw canvas
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderStrokesToCanvas(canvas, prev.strokes, null);
  }, [emit]);

  // Clear
  const clear = useCallback(() => {
    pushUndo();
    const empty: Stroke[] = [];
    setStrokes(empty);
    setText('');
    emit(empty, '');

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [pushUndo, emit]);

  // Text change
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      pushUndo();
      const newText = e.target.value;
      setText(newText);
      emit(strokes, newText);
    },
    [pushUndo, strokes, emit]
  );

  const showDrawTab = mode === 'draw' || mode === 'draw+type';
  const showTypeTab = mode === 'draw+type' || mode === 'type-first';

  return (
    <div className="flex flex-col gap-2 rounded border border-gray-200 bg-white p-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {showDrawTab && (
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              activeTab === 'draw' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={disabled}
          >
            ✏️ Draw
          </button>
        )}
        {showTypeTab && (
          <button
            type="button"
            onClick={() => setActiveTab('type')}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              activeTab === 'type' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={disabled}
          >
            ⌨️ Type
          </button>
        )}

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={undo}
            className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            disabled={disabled || undoStack.current.length === 0}
          >
            ↩ Undo
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
            disabled={disabled}
          >
            ✕ Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      {showDrawTab && activeTab === 'draw' && (
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="touch-none rounded border border-gray-300"
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      )}

      {/* Text area */}
      {showTypeTab && activeTab === 'type' && (
        <textarea
          value={text}
          onChange={handleTextChange}
          disabled={disabled}
          placeholder="Type your answer here…"
          className="min-h-24 rounded border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
      )}

      {/* Hidden snapshot source for AI — always renders latest state */}
      <canvas ref={offscreenRef} className="hidden" />
    </div>
  );
}
