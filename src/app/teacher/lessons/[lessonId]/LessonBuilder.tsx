'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { CheckBlockEditor, PracticeBlockEditor } from './QuestionEditor';
import { ExplainBlockEditor, ModelBlockEditor } from './SlideEditor';
import { DoNowBlockEditor } from './DoNowEditor';
import { GoLiveModal } from './GoLiveModal';
import { AiLessonBuilder } from '@/components/teacher/AiLessonBuilder';
import type { AiLessonPlanResponse } from '@/app/api/teacher/ai/lesson-plan/route';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BlockType = 'DO_NOW' | 'EXPLAIN' | 'MODEL' | 'CHECK' | 'PRACTICE';
export type ItemType = 'SLIDE' | 'QUESTION' | 'IMAGE' | 'CANVAS_FRAME';
export type AnswerMode = 'MCQ' | 'ORDER' | 'SHORT_ANSWER' | 'PICK';

export interface LessonItem {
  id: string;
  sortOrder: number;
  itemType: ItemType;
  answerMode: AnswerMode | null;
  content: unknown;
  skillId: string | null;
  sourceItemId: string | null;
}

export interface LessonBlock {
  id: string;
  type: BlockType;
  sortOrder: number;
  title: string | null;
  items: LessonItem[];
}

export interface LessonBuilderData {
  id: string;
  title: string;
  topic: string;
  isPublished: boolean;
  curriculumUnitId: string | null;
  curriculumPromptDismissed: boolean;
  subject: { id: string; title: string; slug: string };
  curriculumUnit: { id: string; title: string } | null;
  blocks: LessonBlock[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOCK_META: Record<BlockType, { label: string; shortLabel: string; color: string; bg: string; description: string; estimatedMins: number }> = {
  DO_NOW:   { label: 'Do Now',         shortLabel: 'DN',  color: '#f59e0b', bg: '#fffbeb', description: 'Opening warm-up to activate prior knowledge',           estimatedMins: 5 },
  EXPLAIN:  { label: 'Teacher Slides', shortLabel: 'TS',  color: '#3b82f6', bg: '#eff6ff', description: 'Teacher-led explanation with slides or visuals',         estimatedMins: 8 },
  MODEL:    { label: 'Worked Example', shortLabel: 'WE',  color: '#8b5cf6', bg: '#f5f3ff', description: 'Step-by-step worked example students can follow',        estimatedMins: 8 },
  CHECK:    { label: 'Check',          shortLabel: 'CH',  color: '#10b981', bg: '#ecfdf5', description: 'Whole-class question — everyone answers at once',         estimatedMins: 3 },
  PRACTICE: { label: 'Practice',       shortLabel: 'PR',  color: '#ef4444', bg: '#fef2f2', description: 'Self-paced questions with AI-routed support',            estimatedMins: 10 },
};

const ADD_BLOCK_ORDER: BlockType[] = ['DO_NOW', 'EXPLAIN', 'MODEL', 'CHECK', 'PRACTICE'];

// ─── Duration helpers ─────────────────────────────────────────────────────────

/**
 * Estimate how long a block will take to deliver in minutes.
 * Slides/steps: ~3 min each. Questions: ~2 min each. Falls back to type default.
 */
function estimateBlockMins(block: LessonBlock): number {
  const base = BLOCK_META[block.type].estimatedMins;
  const count = block.items.length;
  if (count === 0) return base;
  if (block.type === 'EXPLAIN' || block.type === 'MODEL') return Math.max(base, count * 3);
  if (block.type === 'PRACTICE' || block.type === 'DO_NOW') return Math.max(base, count * 2);
  return base; // CHECK is fixed
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Item-title extractor (for auto-generating block titles) ──────────────────

function extractItemTitle(item: LessonItem): string | null {
  if (!item.content || typeof item.content !== 'object' || Array.isArray(item.content)) return null;
  const c = item.content as Record<string, unknown>;
  if (item.itemType === 'QUESTION' && typeof c.question === 'string' && c.question.trim()) {
    const q = c.question.trim();
    return q.length > 80 ? q.slice(0, 77) + '…' : q;
  }
  if (item.itemType === 'SLIDE' && typeof c.body === 'string' && c.body.trim()) {
    const b = c.body.trim();
    return b.length > 80 ? b.slice(0, 77) + '…' : b;
  }
  return null;
}

// ─── Confirm modal (UX-8: replaces window.confirm) ───────────────────────────

interface ConfirmModalProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-5 py-5">
          <p className="text-sm font-medium text-[#111827]">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#f3f4f6] px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6b7280] transition hover:bg-[#f3f4f6]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Block palette ────────────────────────────────────────────────────────────

function BlockChip({ type, onClick }: { type: BlockType; onClick: () => void }) {
  const m = BLOCK_META[type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-left text-sm transition hover:border-[#5850ec]/40 hover:bg-[#f5f3ff]"
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
        style={{ background: m.color }}
      >{m.shortLabel}</span>
      <span className="font-medium text-[#374151]">{m.label}</span>
    </button>
  );
}

// ─── Block row in sidebar ────────────────────────────────────────────────────

function BlockRow({
  block,
  index,
  total,
  selected,
  onSelect,
  onMove,
  onDelete,
}: {
  block: LessonBlock;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
}) {
  const m = BLOCK_META[block.type];
  return (
    <div
      className={`group relative flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition cursor-pointer ${
        selected
          ? 'border-[#5850ec]/40 bg-[#f5f3ff] shadow-sm'
          : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-current={selected ? 'true' : undefined}
    >
      {/* Color bar */}
      <span
        className="mt-0.5 w-1 shrink-0 self-stretch rounded-full"
        style={{ background: m.color }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: m.color }}>
            {m.label}
          </span>
          <span className="text-[11px] text-[#9ca3af]">#{index + 1}</span>
        </div>
        <p className="mt-0.5 text-xs text-[#374151] line-clamp-1">
          {block.title ?? m.description}
        </p>
        <p className="mt-0.5 text-[11px] text-[#9ca3af]">
          {block.items.length > 0
            ? `${block.items.length} item${block.items.length !== 1 ? 's' : ''} · ~${estimateBlockMins(block)} min`
            : `~${estimateBlockMins(block)} min`}
        </p>
      </div>

      {/* Controls */}
      <div className="flex shrink-0 flex-col items-end gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          disabled={index === 0}
          onClick={(e) => { e.stopPropagation(); onMove('up'); }}
          className="flex h-5 w-5 items-center justify-center rounded text-[#6b7280] transition hover:bg-[#f3f4f6] disabled:opacity-30"
          aria-label="Move block up"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={(e) => { e.stopPropagation(); onMove('down'); }}
          className="flex h-5 w-5 items-center justify-center rounded text-[#6b7280] transition hover:bg-[#f3f4f6] disabled:opacity-30"
          aria-label="Move block down"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-5 w-5 items-center justify-center rounded text-[#9ca3af] transition hover:bg-red-50 hover:text-red-500"
          aria-label="Delete block"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Block editor (centre panel) ────────────────────────────────────────────

function BlockEditor({
  block,
  lessonId,
  lessonSubjectId,
  lessonTopic,
  lessonSubjectTitle,
  curriculumUnit,
  curriculumPromptDismissed,
  onTitleChange,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
  onDismissCurriculumPrompt,
}: {
  block: LessonBlock;
  lessonId: string;
  lessonSubjectId: string;
  lessonTopic: string;
  lessonSubjectTitle: string;
  curriculumUnit: { id: string; title: string } | null;
  curriculumPromptDismissed: boolean;
  onTitleChange: (title: string) => void;
  onItemCreated: (item: LessonItem) => void;
  onItemUpdated: (item: LessonItem) => void;
  onItemDeleted: (itemId: string) => void;
  onDismissCurriculumPrompt: () => void;
}) {
  const m = BLOCK_META[block.type];

  return (
    <div className="space-y-6">
      {/* Block header */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow"
          style={{ background: m.color }}
          aria-hidden
        >{m.shortLabel}</span>
        <div>
          <p className="font-bold text-[#111827]">{m.label}</p>
          <p className="text-xs text-[#6b7280]">{m.description}</p>
        </div>
      </div>

      {/* Block title */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
          Block title <span className="text-[#9ca3af] normal-case font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={block.title ?? ''}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={`e.g. ${m.description}`}
          className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#5850ec] focus:ring-2 focus:ring-[#5850ec]/20 placeholder:text-[#9ca3af]"
          maxLength={200}
        />
      </div>

      {/* Block content — editors per block type */}
      {block.type === 'CHECK' ? (
        <CheckBlockEditor
          blockId={block.id}
          lessonId={lessonId}
          subjectId={lessonSubjectId}
          item={block.items[0] ?? null}
          onItemCreated={onItemCreated}
          onItemUpdated={onItemUpdated}
          onItemDeleted={onItemDeleted}
        />
      ) : block.type === 'PRACTICE' ? (
        <PracticeBlockEditor
          blockId={block.id}
          lessonId={lessonId}
          subjectId={lessonSubjectId}
          items={block.items}
          onItemCreated={onItemCreated}
          onItemUpdated={onItemUpdated}
          onItemDeleted={onItemDeleted}
        />
      ) : block.type === 'EXPLAIN' ? (
        <ExplainBlockEditor
          blockId={block.id}
          lessonId={lessonId}
          items={block.items}
          onItemCreated={onItemCreated}
          onItemUpdated={onItemUpdated}
          onItemDeleted={onItemDeleted}
        />
      ) : block.type === 'MODEL' ? (
        <ModelBlockEditor
          blockId={block.id}
          lessonId={lessonId}
          items={block.items}
          onItemCreated={onItemCreated}
          onItemUpdated={onItemUpdated}
          onItemDeleted={onItemDeleted}
        />
      ) : (
        /* DO_NOW — AI-assisted warm-up questions */
        <DoNowBlockEditor
          blockId={block.id}
          lessonId={lessonId}
          items={block.items}
          lessonTopic={lessonTopic}
          lessonSubjectTitle={lessonSubjectTitle}
          curriculumUnit={curriculumUnit}
          curriculumPromptDismissed={curriculumPromptDismissed}
          onItemCreated={onItemCreated}
          onItemUpdated={onItemUpdated}
          onItemDeleted={onItemDeleted}
          onDismissCurriculumPrompt={onDismissCurriculumPrompt}
        />
      )}
    </div>
  );
}

// ─── Student preview panel ───────────────────────────────────────────────────

function StudentPreviewContent({ block, lessonTitle }: { block: LessonBlock | null; lessonTitle: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-400" aria-hidden />
        <span className="text-xs font-semibold text-[#6b7280]">Student view</span>
      </div>

      {/* "Phone" frame */}
      <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl border-2 border-[#e5e7eb] bg-[#f9fafb] shadow-lg">
        {/* Top bar */}
        <div className="border-b border-[#e5e7eb] bg-white px-3 py-2">
          <p className="truncate text-[11px] font-bold text-[#111827]">{lessonTitle}</p>
        </div>

        {/* Content area */}
        <div className="min-h-[400px] p-4">
          {!block ? (
            <div className="flex h-full items-center justify-center py-16 text-center">
              <p className="text-xs text-[#9ca3af]">Select a block to preview it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Block type badge */}
              <span
                className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                style={{ background: BLOCK_META[block.type].color }}
              >
                {BLOCK_META[block.type].label}
              </span>

              {block.title && (
                <p className="text-sm font-semibold text-[#111827]">{block.title}</p>
              )}

              {block.items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#e5e7eb] py-8 text-center">
                  <p className="text-[11px] text-[#9ca3af]">No content yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {block.items.slice(0, 3).map((item, i) => (
                    <div key={item.id} className="rounded-lg border border-[#e5e7eb] bg-white p-2.5">
                      <p className="text-[11px] font-semibold text-[#9ca3af]">Item {i + 1} · {item.itemType}</p>
                    </div>
                  ))}
                  {block.items.length > 3 && (
                    <p className="text-center text-[11px] text-[#9ca3af]">+{block.items.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// UX-10: Preview modal for screens < xl
function PreviewModal({ block, lessonTitle, onClose }: { block: LessonBlock | null; lessonTitle: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm xl:hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Student preview"
    >
      <div className="w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#111827]">Student preview</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b7280] transition hover:bg-[#f3f4f6]"
            aria-label="Close preview"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <StudentPreviewContent block={block} lessonTitle={lessonTitle} />
      </div>
    </div>
  );
}

// ─── Main builder ────────────────────────────────────────────────────────────

export function LessonBuilder({ lesson: initialLesson }: { lesson: LessonBuilderData }) {
  const [lesson, setLesson] = useState<LessonBuilderData>(initialLesson);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    initialLesson.blocks[0]?.id ?? null
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showGoLive, setShowGoLive] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);  // UX-10

  // Show AI builder by default when the lesson has no blocks yet.
  const [showAiBuilder, setShowAiBuilder] = useState(initialLesson.blocks.length === 0);

  // UX-8: confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const debouncedTitle = useDebounce(lesson.title, 600);
  const debouncedTopic = useDebounce(lesson.topic, 600);
  const isFirstRender = useRef(true);

  // Auto-save lesson metadata
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSaving(true);
    setSaveError(null);
    fetch(`/api/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: debouncedTitle, topic: debouncedTopic }),
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); })
      .catch((e) => setSaveError(e.message))
      .finally(() => setSaving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedTopic]);

  // Add block
  const addBlock = useCallback(async (type: BlockType) => {
    setShowAddPanel(false);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const block = await res.json() as LessonBlock;
      setLesson((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
      setSelectedBlockId(block.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to add block');
    }
  }, [lesson.id]);

  // Delete block — UX-8: uses ConfirmModal instead of window.confirm
  const deleteBlock = useCallback((blockId: string) => {
    setConfirmModal({
      message: 'Delete this block and all its content? This can\'t be undone.',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/lessons/${lesson.id}/blocks/${blockId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          // Critical #1: two flat sequential state updates — never call setState inside another updater
          setLesson((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== blockId) }));
          setSelectedBlockId((prev) => {
            if (prev !== blockId) return prev;
            const remaining = lesson.blocks.filter((b) => b.id !== blockId);
            return remaining[0]?.id ?? null;
          });
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : 'Failed to delete block');
        }
      },
    });
  // lesson.blocks in deps so the callback captures the current list when computing next selection
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, lesson.blocks]);

  // BUG-3: Move block — functional updater avoids stale closure race condition
  const moveBlock = useCallback(async (blockId: string, dir: 'up' | 'down') => {
    let reordered: LessonBlock[] = [];
    let original: LessonBlock[] = [];

    setLesson((prev) => {
      const blocks = [...prev.blocks];
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= blocks.length) return prev;
      original = prev.blocks;
      [blocks[idx], blocks[targetIdx]] = [blocks[targetIdx], blocks[idx]];
      reordered = blocks.map((b, i) => ({ ...b, sortOrder: i }));
      return { ...prev, blocks: reordered };
    });

    if (reordered.length === 0) return;

    try {
      await fetch(`/api/lessons/${lesson.id}/blocks/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockIds: reordered.map((b) => b.id) }),
      });
    } catch {
      // Revert to snapshot taken before optimistic update
      if (original.length > 0) {
        setLesson((prev) => ({ ...prev, blocks: original }));
      }
    }
  }, [lesson.id]);

  // Item mutations — scoped to a specific block
  const addItemToBlock = useCallback((blockId: string, item: LessonItem) => {
    setLesson((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        const newItems = [...b.items, item];
        // Auto-generate block title from first item if still blank (#27)
        if (!b.title && newItems.length === 1) {
          const autoTitle = extractItemTitle(item);
          if (autoTitle) {
            void fetch(`/api/lessons/${prev.id}/blocks/${blockId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: autoTitle }),
            });
            return { ...b, items: newItems, title: autoTitle };
          }
        }
        return { ...b, items: newItems };
      }),
    }));
  }, []);

  const replaceItemInBlock = useCallback((blockId: string, updated: LessonItem) => {
    setLesson((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId
          ? { ...b, items: b.items.map((i) => (i.id === updated.id ? updated : i)) }
          : b
      ),
    }));
  }, []);

  const removeItemFromBlock = useCallback((blockId: string, itemId: string) => {
    setLesson((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, items: b.items.filter((i) => i.id !== itemId) } : b
      ),
    }));
  }, []);

  // Dismiss curriculum prompt
  const dismissCurriculumPrompt = useCallback(async () => {
    setLesson((prev) => ({ ...prev, curriculumPromptDismissed: true }));
    await fetch(`/api/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculumPromptDismissed: true }),
    }).catch(() => setLesson((prev) => ({ ...prev, curriculumPromptDismissed: false })));
  }, [lesson.id]);

  // UX-12: Block title with debounced API call — Medium #16: cleanup on unmount
  const blockTitleTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const timers = blockTitleTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);
  const updateBlockTitle = useCallback((blockId: string, title: string) => {
    // Optimistic update immediately
    setLesson((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => b.id === blockId ? { ...b, title: title || null } : b),
    }));
    // Debounce the API call (600ms)
    if (blockTitleTimers.current[blockId]) clearTimeout(blockTitleTimers.current[blockId]);
    blockTitleTimers.current[blockId] = setTimeout(() => {
      void fetch(`/api/lessons/${lesson.id}/blocks/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || null }),
      }).catch(() => { /* non-fatal */ });
    }, 600);
  }, [lesson.id]);

  const handlePlanGenerated = useCallback(async (plan: AiLessonPlanResponse) => {
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/apply-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { title, blocks } = (await res.json()) as { title: string; blocks: LessonBlock[] };
      setLesson((prev) => ({ ...prev, title: title || prev.title, blocks }));
      setSelectedBlockId(blocks[0]?.id ?? null);
      setShowAiBuilder(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to apply plan');
    }
  }, [lesson.id]);

  const selectedBlock = lesson.blocks.find((b) => b.id === selectedBlockId) ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f9fafb]">
      {/* UX-8: Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* UX-10: Preview modal for small screens */}
      {showPreviewModal && (
        <PreviewModal
          block={selectedBlock}
          lessonTitle={lesson.title}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3 shadow-sm">
        <Link
          href="/teacher/lessons"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#6b7280] transition hover:bg-[#f3f4f6]"
          aria-label="Back to lessons"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={lesson.title}
            onChange={(e) => setLesson((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full bg-transparent text-base font-bold text-[#111827] outline-none placeholder:text-[#9ca3af]"
            placeholder="Lesson title"
            aria-label="Lesson title"
          />
          <input
            type="text"
            value={lesson.topic}
            onChange={(e) => setLesson((prev) => ({ ...prev, topic: e.target.value }))}
            className="w-full bg-transparent text-xs text-[#6b7280] outline-none placeholder:text-[#9ca3af]"
            placeholder="Topic / objective"
            aria-label="Topic"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Subject badge */}
          <span className="hidden rounded-full border border-[#e5e7eb] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#6b7280] sm:inline-flex">
            {lesson.subject.title}
          </span>

          {/* AI builder toggle */}
          <button
            type="button"
            onClick={() => { setShowAiBuilder((v) => !v); setSelectedBlockId(null); }}
            className={`hidden items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition sm:inline-flex ${
              showAiBuilder
                ? 'border-[#5850ec]/40 bg-[#f5f3ff] text-[#5850ec]'
                : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#5850ec]/30 hover:text-[#5850ec]'
            }`}
            aria-pressed={showAiBuilder}
          >
            ✨ AI
          </button>

          {/* Save status */}
          <span className="text-xs text-[#9ca3af]">
            {saving ? 'Saving…' : saveError ? <span className="text-red-500">{saveError}</span> : 'Saved'}
          </span>

          {/* Publish toggle */}
          <button
            type="button"
            onClick={async () => {
              const next = !lesson.isPublished;
              setLesson((prev) => ({ ...prev, isPublished: next }));
              await fetch(`/api/lessons/${lesson.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: next }),
              }).catch(() => setLesson((prev) => ({ ...prev, isPublished: !next })));
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              lesson.isPublished
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
            }`}
          >
            {lesson.isPublished ? 'Published' : 'Draft'}
          </button>

          {/* Go Live */}
          <button
            type="button"
            onClick={() => setShowGoLive(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#059669]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M13 10V3L4 14h7v7l9-11h-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Go Live
          </button>
        </div>
      </header>

      {/* Three-panel body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Left: block list ── */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#e5e7eb] bg-white lg:w-[260px]">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-3 py-2.5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Blocks <span className="text-[#9ca3af]">({lesson.blocks.length})</span>
              </span>
              {lesson.blocks.length > 0 && (
                <p className="text-[10px] text-[#9ca3af]">
                  ~{formatMins(lesson.blocks.reduce((sum, b) => sum + estimateBlockMins(b), 0))} total
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAddPanel((p) => !p)}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#5850ec] text-white transition hover:bg-[#4338ca]"
              aria-label="Add block"
              aria-expanded={showAddPanel}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Add block palette */}
          {showAddPanel && (
            <div className="border-b border-[#e5e7eb] bg-[#f9fafb] p-2.5 space-y-1.5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">Add a block</p>
              {ADD_BLOCK_ORDER.map((type) => (
                <BlockChip key={type} type={type} onClick={() => addBlock(type)} />
              ))}
            </div>
          )}

          {/* Block list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {lesson.blocks.length === 0 ? (
              <div className="pt-8 text-center">
                <p className="text-xs text-[#9ca3af]">No blocks yet.</p>
                <button
                  type="button"
                  onClick={() => setShowAddPanel(true)}
                  className="mt-2 text-xs font-semibold text-[#5850ec] hover:underline"
                >
                  Add your first block →
                </button>
              </div>
            ) : (
              lesson.blocks.map((block, index) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  index={index}
                  total={lesson.blocks.length}
                  selected={selectedBlockId === block.id}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onMove={(dir) => void moveBlock(block.id, dir)}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Centre: block editor ── */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
          {!selectedBlock ? (
            showAiBuilder ? (
              /* AI lesson builder — shown when no block selected and AI mode is active */
              <div className="mx-auto max-w-md">
                <AiLessonBuilder
                  subjectId={lesson.subject.id}
                  subjectTitle={lesson.subject.title}
                  onPlanGenerated={handlePlanGenerated}
                  onClose={() => setShowAiBuilder(false)}
                />
              </div>
            ) : (
              /* Generic empty state */
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f3ff] text-[#5850ec]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[#374151]">
                    {lesson.blocks.length === 0 ? 'Add your first block' : 'Select a block to edit'}
                  </p>
                  <p className="mt-1 text-sm text-[#9ca3af]">
                    {lesson.blocks.length === 0
                      ? 'Use the + button in the sidebar to add a block.'
                      : 'Click a block in the left panel.'}
                  </p>
                  {lesson.blocks.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAiBuilder(true)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#5850ec] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca]"
                    >
                      ✨ Build with AI
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            <BlockEditor
              block={selectedBlock}
              lessonId={lesson.id}
              lessonSubjectId={lesson.subject.id}
              lessonTopic={lesson.topic}
              lessonSubjectTitle={lesson.subject.title}
              curriculumUnit={lesson.curriculumUnit}
              curriculumPromptDismissed={lesson.curriculumPromptDismissed}
              onTitleChange={(t) => updateBlockTitle(selectedBlock.id, t)}
              onItemCreated={(item) => addItemToBlock(selectedBlock.id, item)}
              onItemUpdated={(item) => replaceItemInBlock(selectedBlock.id, item)}
              onItemDeleted={(itemId) => removeItemFromBlock(selectedBlock.id, itemId)}
              onDismissCurriculumPrompt={dismissCurriculumPrompt}
            />
          )}
        </main>

        {/* ── Right: student preview (xl+ only) ── */}
        <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-[#e5e7eb] bg-white p-4 xl:block">
          <StudentPreviewContent block={selectedBlock} lessonTitle={lesson.title} />
        </aside>
      </div>

      {/* UX-10: Floating preview button on screens < xl */}
      <button
        type="button"
        onClick={() => setShowPreviewModal(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#5850ec] px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-[#4338ca] xl:hidden"
        aria-label="Open student preview"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M1 12C1 12 5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
        </svg>
        Preview
      </button>

      {/* Go Live modal */}
      {showGoLive && (
        <GoLiveModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          subjectId={lesson.subject.id}
          blocks={lesson.blocks}
          onClose={() => setShowGoLive(false)}
        />
      )}
    </div>
  );
}
