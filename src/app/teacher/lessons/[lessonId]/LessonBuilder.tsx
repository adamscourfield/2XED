'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckBlockEditor, PracticeBlockEditor } from './QuestionEditor';
import { ExplainBlockEditor, ModelBlockEditor } from './SlideEditor';
import { DoNowBlockEditor } from './DoNowEditor';
import { GoLiveModal } from './GoLiveModal';

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

const BLOCK_META: Record<BlockType, { label: string; shortLabel: string; color: string; bg: string; description: string }> = {
  DO_NOW:   { label: 'Do Now',  shortLabel: 'DO',  color: '#f59e0b', bg: '#fffbeb', description: 'Opening warm-up to activate prior knowledge' },
  EXPLAIN:  { label: 'Explain', shortLabel: 'EX',  color: '#3b82f6', bg: '#eff6ff', description: 'Teacher-led explanation with slides or visuals' },
  MODEL:    { label: 'Model',   shortLabel: 'MO',  color: '#8b5cf6', bg: '#f5f3ff', description: 'Worked example students can follow' },
  CHECK:    { label: 'Check',   shortLabel: 'CH',  color: '#10b981', bg: '#ecfdf5', description: 'Whole-class question — everyone answers at once' },
  PRACTICE: { label: 'Practice', shortLabel: 'PR', color: '#ef4444', bg: '#fef2f2', description: 'Self-paced questions with AI-routed support' },
};

const ADD_BLOCK_ORDER: BlockType[] = ['DO_NOW', 'EXPLAIN', 'MODEL', 'CHECK', 'PRACTICE'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
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
        {block.items.length > 0 && (
          <p className="mt-0.5 text-[11px] text-[#9ca3af]">
            {block.items.length} item{block.items.length !== 1 ? 's' : ''}
          </p>
        )}
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
          item={block.items[0] ?? null}
          onItemCreated={onItemCreated}
          onItemUpdated={onItemUpdated}
          onItemDeleted={onItemDeleted}
        />
      ) : block.type === 'PRACTICE' ? (
        <PracticeBlockEditor
          blockId={block.id}
          lessonId={lessonId}
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

function StudentPreview({ block, lessonTitle }: { block: LessonBlock | null; lessonTitle: string }) {
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

  // Delete block
  const deleteBlock = useCallback(async (blockId: string) => {
    if (!confirm('Delete this block and all its content?')) return;
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/blocks/${blockId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLesson((prev) => {
        const blocks = prev.blocks.filter((b) => b.id !== blockId);
        return { ...prev, blocks };
      });
      setSelectedBlockId((prev) => {
        if (prev !== blockId) return prev;
        const remaining = lesson.blocks.filter((b) => b.id !== blockId);
        return remaining[0]?.id ?? null;
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to delete block');
    }
  }, [lesson.id, lesson.blocks]);

  // Move block
  const moveBlock = useCallback(async (blockId: string, dir: 'up' | 'down') => {
    const blocks = [...lesson.blocks];
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    [blocks[idx], blocks[targetIdx]] = [blocks[targetIdx], blocks[idx]];
    const reordered = blocks.map((b, i) => ({ ...b, sortOrder: i }));
    setLesson((prev) => ({ ...prev, blocks: reordered }));

    try {
      await fetch(`/api/lessons/${lesson.id}/blocks/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockIds: reordered.map((b) => b.id) }),
      });
    } catch {
      // Revert on failure
      setLesson((prev) => ({ ...prev, blocks: lesson.blocks }));
    }
  }, [lesson]);

  // Item mutations — scoped to a specific block
  const addItemToBlock = useCallback((blockId: string, item: LessonItem) => {
    setLesson((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, items: [...b.items, item] } : b
      ),
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

  // Dismiss curriculum prompt (Do Now banner)
  const dismissCurriculumPrompt = useCallback(async () => {
    setLesson((prev) => ({ ...prev, curriculumPromptDismissed: true }));
    await fetch(`/api/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculumPromptDismissed: true }),
    }).catch(() => setLesson((prev) => ({ ...prev, curriculumPromptDismissed: false })));
  }, [lesson.id]);

  // Update block title
  const updateBlockTitle = useCallback(async (blockId: string, title: string) => {
    setLesson((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => b.id === blockId ? { ...b, title: title || null } : b),
    }));
    try {
      await fetch(`/api/lessons/${lesson.id}/blocks/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || null }),
      });
    } catch { /* non-fatal */ }
  }, [lesson.id]);

  const selectedBlock = lesson.blocks.find((b) => b.id === selectedBlockId) ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f9fafb]">
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
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Blocks <span className="text-[#9ca3af]">({lesson.blocks.length})</span>
            </span>
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
                  onMove={(dir) => moveBlock(block.id, dir)}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Centre: block editor ── */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
          {!selectedBlock ? (
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
              </div>
            </div>
          ) : (
            <BlockEditor
              block={selectedBlock}
              lessonId={lesson.id}
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

        {/* ── Right: student preview ── */}
        <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-[#e5e7eb] bg-white p-4 xl:block">
          <StudentPreview block={selectedBlock} lessonTitle={lesson.title} />
        </aside>
      </div>

      {/* Go Live modal */}
      {showGoLive && (
        <GoLiveModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          subjectId={lesson.subject.id}
          onClose={() => setShowGoLive(false)}
        />
      )}
    </div>
  );
}
