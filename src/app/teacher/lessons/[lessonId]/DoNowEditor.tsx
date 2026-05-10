'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { LessonItem } from './LessonBuilder';
import { QuestionForm } from './QuestionEditor';
import type { QuestionContent, } from './QuestionEditor';
import type { AnswerMode } from './LessonBuilder';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AiSuggestion {
  stem: string;
  type: 'MCQ' | 'SHORT_ANSWER';
  options?: string[];
  answer?: string;
}

export interface DoNowBlockEditorProps {
  blockId: string;
  lessonId: string;
  items: LessonItem[];
  lessonTopic: string;
  lessonSubjectTitle: string;
  curriculumUnit: { id: string; title: string } | null;
  curriculumPromptDismissed: boolean;
  onItemCreated: (item: LessonItem) => void;
  onItemUpdated: (item: LessonItem) => void;
  onItemDeleted: (itemId: string) => void;
  onDismissCurriculumPrompt: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_QUESTIONS = 3;

// Critical #2: derive correctIndex from options array instead of storing answer text for MCQ
function suggestionToContent(s: AiSuggestion): QuestionContent {
  if (s.type === 'MCQ') {
    const options = s.options ?? [];
    const correctIndex = s.answer !== undefined ? options.indexOf(s.answer) : undefined;
    return {
      question: s.stem,
      options,
      correctIndex: correctIndex !== undefined && correctIndex !== -1 ? correctIndex : undefined,
    };
  }
  return {
    question: s.stem,
    answer: s.answer ?? '',
  };
}

function suggestionToMode(s: AiSuggestion): AnswerMode {
  return s.type === 'MCQ' ? 'MCQ' : 'SHORT_ANSWER';
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Curriculum banner ────────────────────────────────────────────────────────

function CurriculumBanner({
  curriculumUnit,
  dismissed,
  onDismiss,
}: {
  curriculumUnit: { id: string; title: string } | null;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  if (curriculumUnit) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[#a7f3d0] bg-[#f0fdf4] px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#059669]" aria-hidden>
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <p className="text-sm text-[#065f46]">
          Curriculum context: <strong>{curriculumUnit.title}</strong>
          <span className="ml-1.5 text-[#047857] font-normal">— AI suggestions are targeted at this unit's prerequisites</span>
        </p>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-[#f59e0b]" aria-hidden>
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#92400e]">Link to curriculum for targeted suggestions</p>
        <p className="mt-0.5 text-xs text-[#a16207]">
          When mapped to a curriculum unit, the AI targets Do Now questions at exactly what students studied before.
        </p>
        <Link
          href="/teacher/curriculum"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#f59e0b] hover:underline"
        >
          Map to curriculum →
        </Link>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-[#9ca3af] transition hover:text-[#6b7280]"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── AI suggestion card ───────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  index,
  onAccept,
  accepting,
}: {
  suggestion: AiSuggestion;
  index: number;
  onAccept: () => void;
  accepting: boolean;
}) {
  // Low #18: precompute correct index instead of comparing text strings
  const correctIndex = suggestion.type === 'MCQ' && suggestion.answer !== undefined
    ? (suggestion.options ?? []).indexOf(suggestion.answer)
    : -1;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#fde68a] bg-white px-3.5 py-3 shadow-sm">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm text-[#374151]">{suggestion.stem}</p>

        {suggestion.type === 'MCQ' && suggestion.options && (
          <div className="flex flex-wrap gap-1">
            {suggestion.options.map((opt, i) => (
              <span
                key={i}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  i === correctIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-[#f3f4f6] text-[#6b7280]'
                }`}
              >
                {i === correctIndex && '✓ '}{opt}
              </span>
            ))}
          </div>
        )}

        {suggestion.type === 'SHORT_ANSWER' && suggestion.answer && (
          <p className="text-[11px] text-[#6b7280]">
            <span className="font-semibold">Model answer:</span> {suggestion.answer}
          </p>
        )}

        <span className="inline-flex rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2 py-0.5 text-[11px] font-semibold text-[#6b7280]">
          {suggestion.type === 'MCQ' ? 'Multiple choice' : 'Short answer'}
        </span>
      </div>

      <button
        type="button"
        onClick={onAccept}
        disabled={accepting}
        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#f59e0b] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#d97706] disabled:opacity-50"
      >
        {accepting ? '…' : '+ Add'}
      </button>
    </div>
  );
}

// ─── Manual add button ────────────────────────────────────────────────────────

function AddManualButton({
  blockId,
  lessonId,
  onItemCreated,
}: {
  blockId: string;
  lessonId: string;
  onItemCreated: (item: LessonItem) => void;
}) {
  const [adding, setAdding] = useState(false);

  const add = async () => {
    setAdding(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Critical #2: create with correctIndex (undefined), not legacy answer text
        body: JSON.stringify({
          itemType: 'QUESTION',
          answerMode: 'MCQ',
          content: { question: '', options: ['', '', '', ''], correctIndex: undefined },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newItem = (await res.json()) as LessonItem;
      onItemCreated(newItem);
    } finally {
      setAdding(false);
    }
  };

  return (
    <button
      type="button"
      onClick={add}
      disabled={adding}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e5e7eb] py-2.5 text-xs font-semibold text-[#6b7280] transition hover:border-[#d1d5db] hover:text-[#374151] disabled:opacity-50"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      </svg>
      {adding ? 'Adding…' : 'Add question manually'}
    </button>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export function DoNowBlockEditor({
  blockId,
  lessonId,
  items,
  lessonTopic,
  lessonSubjectTitle,
  curriculumUnit,
  curriculumPromptDismissed,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
  onDismissCurriculumPrompt,
}: DoNowBlockEditorProps) {
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [accepting, setAccepting] = useState<Set<number>>(new Set());
  // High #5: ConfirmModal state replaces window.confirm
  const [confirmDelete, setConfirmDelete] = useState<{ itemId: string } | null>(null);

  const canAdd = items.length < MAX_QUESTIONS;

  // Medium #11: wrap generateSuggestions in useCallback with correct deps
  const generateSuggestions = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(
        `/api/lessons/${lessonId}/blocks/${blockId}/do-now-ai`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: lessonTopic,
            subjectTitle: lessonSubjectTitle,
            curriculumUnitTitle: curriculumUnit?.title ?? null,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { questions: AiSuggestion[] };
      setSuggestions(data.questions.slice(0, MAX_QUESTIONS));
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [lessonId, blockId, lessonTopic, lessonSubjectTitle, curriculumUnit?.title]);

  const acceptSuggestion = useCallback(
    async (i: number, suggestion: AiSuggestion) => {
      setAccepting((prev) => new Set(prev).add(i));
      try {
        const res = await fetch(
          `/api/lessons/${lessonId}/blocks/${blockId}/items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemType: 'QUESTION',
              answerMode: suggestionToMode(suggestion),
              content: suggestionToContent(suggestion),
            }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const newItem = (await res.json()) as LessonItem;
        onItemCreated(newItem);
        setSuggestions((prev) => prev?.filter((_, idx) => idx !== i) ?? null);
      } finally {
        setAccepting((prev) => {
          const s = new Set(prev);
          s.delete(i);
          return s;
        });
      }
    },
    [lessonId, blockId, onItemCreated]
  );

  return (
    <div className="space-y-5">
      {/* High #5: ConfirmModal replaces window.confirm */}
      {confirmDelete && (
        <ConfirmModal
          message="Remove this question? This can't be undone."
          onConfirm={async () => {
            const { itemId } = confirmDelete;
            setConfirmDelete(null);
            const res = await fetch(
              `/api/lessons/${lessonId}/blocks/${blockId}/items/${itemId}`,
              { method: 'DELETE' }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onItemDeleted(itemId);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Curriculum context banner */}
      <CurriculumBanner
        curriculumUnit={curriculumUnit}
        dismissed={curriculumPromptDismissed}
        onDismiss={onDismissCurriculumPrompt}
      />

      {/* AI generation */}
      <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#374151]">Generate with AI</p>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Suggest Do Now questions based on prerequisites for "{lessonTopic || 'this lesson'}"
            </p>
          </div>
          <button
            type="button"
            onClick={() => void generateSuggestions()}
            disabled={generating || !canAdd}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#f59e0b] px-3 py-2 text-xs font-semibold text-white shadow transition hover:bg-[#d97706] disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" fill="currentColor" />
            </svg>
            {generating ? 'Generating…' : 'Generate suggestions'}
          </button>
        </div>

        {!canAdd && !generating && (
          <p className="mt-2 text-[11px] text-[#9ca3af]">
            Maximum {MAX_QUESTIONS} questions reached.
          </p>
        )}

        {generateError && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {generateError}
          </p>
        )}

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
              Suggestions — click + Add to include
            </p>
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={i}
                suggestion={s}
                index={i}
                onAccept={() => void acceptSuggestion(i, s)}
                accepting={accepting.has(i)}
              />
            ))}
          </div>
        )}

        {suggestions && suggestions.length === 0 && (
          <p className="mt-3 text-xs text-[#9ca3af]">All suggestions added ✓</p>
        )}
      </div>

      {/* Existing questions */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Questions ({items.length}/{MAX_QUESTIONS})
          </p>
          {items.length > 0 && (
            <p className="text-[11px] text-[#9ca3af]">
              Shown to students when the Do Now block opens
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] px-6 py-8 text-center">
            <p className="text-sm text-[#9ca3af]">
              No questions yet — use AI suggestions above or add manually
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <QuestionForm
                key={item.id}
                item={item}
                index={i}
                collapsible
                onSave={async (updates: { answerMode: AnswerMode; content: QuestionContent }) => {
                  const res = await fetch(
                    `/api/lessons/${lessonId}/blocks/${blockId}/items/${item.id}`,
                    {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updates),
                    }
                  );
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  onItemUpdated((await res.json()) as LessonItem);
                }}
                onDelete={async () => {
                  // High #5: use ConfirmModal, not window.confirm
                  setConfirmDelete({ itemId: item.id });
                }}
              />
            ))}
          </div>
        )}

        {canAdd && (
          <AddManualButton
            blockId={blockId}
            lessonId={lessonId}
            onItemCreated={onItemCreated}
          />
        )}
      </div>
    </div>
  );
}
