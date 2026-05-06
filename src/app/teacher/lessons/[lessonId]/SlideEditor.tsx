'use client';

import { useCallback, useRef, useState } from 'react';
import type { LessonItem } from './LessonBuilder';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SlideAnnotation {
  id: string;
  text: string;
  x: number; // 0–100, % of canvas width
  y: number; // 0–100, % of canvas height
  color: string;
}

export interface SlideContent {
  body: string;
  speakerNote?: string;
  bgColor?: string;
  annotations: SlideAnnotation[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ANNOTATION_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const BG_COLORS = ['#ffffff', '#f9fafb', '#fef9c3', '#dbeafe', '#f0fdf4', '#fdf4ff'];

function blankSlide(): SlideContent {
  return { body: '', annotations: [] };
}

function parseSlide(raw: unknown): SlideContent {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    return {
      body: typeof r.body === 'string' ? r.body : '',
      speakerNote: typeof r.speakerNote === 'string' ? r.speakerNote : undefined,
      bgColor: typeof r.bgColor === 'string' ? r.bgColor : undefined,
      annotations: Array.isArray(r.annotations) ? (r.annotations as SlideAnnotation[]) : [],
    };
  }
  return blankSlide();
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Canvas with click-to-place annotation labels ────────────────────────────

interface PendingAnnot {
  x: number;
  y: number;
  color: string;
}

function SlideCanvas({
  content,
  onChange,
}: {
  content: SlideContent;
  onChange: (c: SlideContent) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingAnnot | null>(null);
  const [pendingText, setPendingText] = useState('');
  const [selectedColor, setSelectedColor] = useState(ANNOTATION_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-click]')) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPending({ x, y, color: selectedColor });
    setPendingText('');
    // Focus the input on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitAnnot = () => {
    if (!pending || !pendingText.trim()) {
      setPending(null);
      return;
    }
    const newAnnot: SlideAnnotation = {
      id: uid(),
      text: pendingText.trim(),
      x: pending.x,
      y: pending.y,
      color: pending.color,
    };
    onChange({ ...content, annotations: [...content.annotations, newAnnot] });
    setPending(null);
    setPendingText('');
  };

  const removeAnnot = (id: string) => {
    onChange({ ...content, annotations: content.annotations.filter((a) => a.id !== id) });
  };

  return (
    <div className="space-y-2">
      {/* Toolbar: annotation color + background */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#6b7280]">Label colour:</span>
          {ANNOTATION_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              className={`h-5 w-5 rounded-full border-2 transition ${
                selectedColor === c ? 'border-[#374151] scale-110' : 'border-transparent hover:scale-110'
              }`}
              style={{ background: c }}
              aria-label={`Label colour ${c}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#6b7280]">Background:</span>
          {BG_COLORS.map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => onChange({ ...content, bgColor: bg })}
              className={`h-5 w-5 rounded border-2 transition ${
                (content.bgColor ?? '#ffffff') === bg ? 'border-[#5850ec]' : 'border-[#e5e7eb]'
              }`}
              style={{ background: bg }}
              aria-label={`Background ${bg}`}
            />
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative w-full cursor-crosshair overflow-hidden rounded-xl border-2 border-dashed border-[#5850ec]/20 select-none"
        style={{ aspectRatio: '4/3', background: content.bgColor ?? '#ffffff' }}
        role="img"
        aria-label="Stage canvas — click to add annotation labels"
      >
        {/* Body text (top-left, pointer-events-none so click reaches canvas) */}
        {content.body && (
          <div
            className="pointer-events-none absolute inset-0 p-5"
            data-no-click
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">
              {content.body}
            </p>
          </div>
        )}

        {/* Empty state hint */}
        {content.annotations.length === 0 && !pending && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3">
            <span className="rounded-lg bg-black/5 px-2 py-1 text-[11px] text-[#9ca3af]">
              Click to add labels
            </span>
          </div>
        )}

        {/* Existing annotations */}
        {content.annotations.map((annot) => (
          <div
            key={annot.id}
            data-no-click
            className="absolute"
            style={{
              left: `${annot.x}%`,
              top: `${annot.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <div
              className="group flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md"
              style={{ background: annot.color }}
            >
              <span>{annot.text}</span>
              <button
                type="button"
                onClick={() => removeAnnot(annot.id)}
                className="ml-0.5 opacity-0 transition group-hover:opacity-100"
                aria-label="Remove label"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Pending annotation input */}
        {pending && (
          <div
            data-no-click
            className="absolute"
            style={{
              left: `${pending.x}%`,
              top: `${pending.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
            }}
          >
            <div
              className="flex items-center gap-1 rounded-full px-2.5 py-1 shadow-lg"
              style={{ background: pending.color }}
            >
              <input
                ref={inputRef}
                type="text"
                value={pendingText}
                onChange={(e) => setPendingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAnnot();
                  if (e.key === 'Escape') setPending(null);
                }}
                placeholder="Label…"
                className="w-24 bg-transparent text-[11px] font-bold text-white outline-none placeholder:text-white/60"
                aria-label="Annotation text"
              />
              <button
                type="button"
                onClick={commitAnnot}
                className="text-white/80 transition hover:text-white"
                aria-label="Confirm"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="text-white/60 transition hover:text-white"
                aria-label="Cancel"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#9ca3af]">
        Click anywhere on the canvas to place a label. During the live session you can draw over
        this with Apple Pencil.
      </p>
    </div>
  );
}

// ─── Single stage / step editor ──────────────────────────────────────────────

interface StageEditorProps {
  item: LessonItem;
  stageIndex: number;
  blockVariant: 'explain' | 'model';
  onSave: (content: SlideContent) => Promise<void>;
  onDelete: () => Promise<void>;
}

function StageEditor({ item, stageIndex, blockVariant, onSave, onDelete }: StageEditorProps) {
  const [content, setContent] = useState<SlideContent>(() => parseSlide(item.content));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const label = blockVariant === 'model' ? `Step ${stageIndex + 1}` : `Stage ${stageIndex + 1}`;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Body text */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
          {label} — content
        </label>
        <textarea
          value={content.body}
          onChange={(e) => setContent((c) => ({ ...c, body: e.target.value }))}
          placeholder={
            blockVariant === 'model'
              ? 'Describe this step of the worked example…'
              : 'Write your explanation for this stage…'
          }
          className="w-full resize-none rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#5850ec] focus:ring-2 focus:ring-[#5850ec]/20 placeholder:text-[#9ca3af]"
          rows={3}
        />
      </div>

      {/* Canvas */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
          Canvas <span className="normal-case font-normal text-[#9ca3af]">(labels & callouts)</span>
        </p>
        <SlideCanvas content={content} onChange={setContent} />
      </div>

      {/* Speaker notes (collapsed) */}
      <div>
        <button
          type="button"
          onClick={() => setShowNotes((n) => !n)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280] transition hover:text-[#374151]"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform ${showNotes ? 'rotate-90' : ''}`}
            aria-hidden
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Speaker notes
        </button>
        {showNotes && (
          <textarea
            value={content.speakerNote ?? ''}
            onChange={(e) =>
              setContent((c) => ({ ...c, speakerNote: e.target.value || undefined }))
            }
            placeholder="Notes visible only to you during the live session…"
            className="mt-2 w-full resize-none rounded-xl border border-[#e5e7eb] bg-[#fffbeb] px-4 py-3 text-sm text-[#374151] shadow-sm outline-none transition focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 placeholder:text-[#9ca3af]"
            rows={3}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-[#f3f4f6] pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#5850ec] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[#4338ca] disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : `Save ${blockVariant === 'model' ? 'step' : 'stage'}`}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-[#9ca3af] transition hover:text-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Stage list sidebar ───────────────────────────────────────────────────────

function StageList({
  items,
  selectedId,
  onSelect,
  onAdd,
  adding,
  blockVariant,
}: {
  items: LessonItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  adding: boolean;
  blockVariant: 'explain' | 'model';
}) {
  const noun = blockVariant === 'model' ? 'step' : 'stage';
  const Noun = blockVariant === 'model' ? 'Step' : 'Stage';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
          {Noun}s ({items.length})
        </p>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#5850ec] text-white transition hover:bg-[#4338ca] disabled:opacity-50"
          aria-label={`Add ${noun}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {items.length === 0 && !adding ? (
        <p className="text-[11px] text-[#9ca3af]">No {noun}s yet</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => {
            const c = parseSlide(item.content);
            const isSelected = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                  isSelected
                    ? 'border-[#5850ec]/40 bg-[#f5f3ff]'
                    : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                }`}
              >
                <p className="text-[11px] font-semibold text-[#6b7280]">
                  {Noun} {i + 1}
                </p>
                {c.body ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-[#374151]">{c.body}</p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-[#9ca3af]">Empty</p>
                )}
                {c.annotations.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-[#9ca3af]">
                    {c.annotations.length} label{c.annotations.length !== 1 ? 's' : ''}
                  </p>
                )}
              </button>
            );
          })}
          {adding && (
            <div className="rounded-lg border border-dashed border-[#e5e7eb] px-2.5 py-2 text-center">
              <p className="text-[11px] text-[#9ca3af]">Adding…</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared slide block editor ────────────────────────────────────────────────

interface SlideBlockEditorProps {
  blockId: string;
  lessonId: string;
  items: LessonItem[];
  blockVariant: 'explain' | 'model';
  onItemCreated: (item: LessonItem) => void;
  onItemUpdated: (item: LessonItem) => void;
  onItemDeleted: (itemId: string) => void;
}

function SlideBlockEditor({
  blockId,
  lessonId,
  items,
  blockVariant,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
}: SlideBlockEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [adding, setAdding] = useState(false);

  const noun = blockVariant === 'model' ? 'step' : 'stage';

  const addStage = useCallback(async () => {
    setAdding(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'SLIDE',
          content: blankSlide(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newItem = (await res.json()) as LessonItem;
      onItemCreated(newItem);
      setSelectedId(newItem.id);
    } finally {
      setAdding(false);
    }
  }, [lessonId, blockId, onItemCreated]);

  const saveStage = useCallback(
    async (itemId: string, content: SlideContent) => {
      const res = await fetch(
        `/api/lessons/${lessonId}/blocks/${blockId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as LessonItem;
      onItemUpdated(updated);
    },
    [lessonId, blockId, onItemUpdated]
  );

  const deleteStage = useCallback(
    async (itemId: string) => {
      if (!confirm(`Delete this ${noun}?`)) return;
      const res = await fetch(
        `/api/lessons/${lessonId}/blocks/${blockId}/items/${itemId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onItemDeleted(itemId);
      setSelectedId((prev) => {
        if (prev !== itemId) return prev;
        const remaining = items.filter((i) => i.id !== itemId);
        return remaining[0]?.id ?? null;
      });
    },
    [lessonId, blockId, noun, items, onItemDeleted]
  );

  // Empty state
  if (items.length === 0 && !adding) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] px-6 py-10 text-center">
        <p className="text-sm font-medium text-[#374151]">
          {blockVariant === 'model' ? 'No steps yet' : 'No stages yet'}
        </p>
        <p className="mt-1 max-w-xs mx-auto text-xs text-[#6b7280]">
          {blockVariant === 'model'
            ? 'Build your worked example step by step. Each step reveals the next layer of the solution.'
            : 'Build your explanation stage by stage. Students see each stage revealed in sequence.'}
        </p>
        <button
          type="button"
          onClick={addStage}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#5850ec] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca]"
        >
          + Add first {noun}
        </button>
      </div>
    );
  }

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const selectedIndex = selectedItem ? items.indexOf(selectedItem) : -1;

  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 lg:grid-cols-[180px_1fr]">
      {/* Stage list */}
      <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3">
        <StageList
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={addStage}
          adding={adding}
          blockVariant={blockVariant}
        />
      </div>

      {/* Stage editor */}
      <div>
        {selectedItem ? (
          <StageEditor
            key={selectedItem.id}
            item={selectedItem}
            stageIndex={selectedIndex}
            blockVariant={blockVariant}
            onSave={(content) => saveStage(selectedItem.id, content)}
            onDelete={() => deleteStage(selectedItem.id)}
          />
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] py-16 text-center">
            <p className="text-xs text-[#9ca3af]">Select a {noun} to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function ExplainBlockEditor(
  props: Omit<SlideBlockEditorProps, 'blockVariant'>
) {
  return <SlideBlockEditor {...props} blockVariant="explain" />;
}

export function ModelBlockEditor(
  props: Omit<SlideBlockEditorProps, 'blockVariant'>
) {
  return <SlideBlockEditor {...props} blockVariant="model" />;
}
