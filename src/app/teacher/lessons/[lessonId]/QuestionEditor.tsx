'use client';

import { useCallback, useState } from 'react';
import type { AnswerMode, LessonItem } from './LessonBuilder';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuestionContent {
  question: string;
  options?: string[];        // MCQ / ORDER / PICK
  answer?: string;           // MCQ (correct text) / SHORT_ANSWER (model answer)
  correctIndices?: number[]; // PICK (which options are correct)
  hint?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function blankContent(mode: AnswerMode): QuestionContent {
  switch (mode) {
    case 'MCQ':
      return { question: '', options: ['', '', '', ''], answer: '' };
    case 'ORDER':
      return { question: '', options: ['', '', '', ''] };
    case 'SHORT_ANSWER':
      return { question: '', answer: '' };
    case 'PICK':
      return { question: '', options: ['', '', '', ''], correctIndices: [] };
  }
}

function parseContent(raw: unknown): QuestionContent {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as QuestionContent;
  }
  return { question: '' };
}

// ─── Single question form ────────────────────────────────────────────────────

interface QuestionFormProps {
  item: LessonItem;
  onSave: (updates: { answerMode: AnswerMode; content: QuestionContent }) => Promise<void>;
  onDelete: () => Promise<void>;
  index: number;
  collapsible?: boolean;
}

export function QuestionForm({ item, onSave, onDelete, index, collapsible = false }: QuestionFormProps) {
  const initialMode: AnswerMode = (item.answerMode as AnswerMode | null) ?? 'MCQ';
  const initialContent = parseContent(item.content);

  const [mode, setMode] = useState<AnswerMode>(initialMode);
  const [content, setContent] = useState<QuestionContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(!collapsible);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({ answerMode: mode, content });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [mode, content, onSave]);

  const updateOption = (i: number, val: string) => {
    setContent((c) => {
      const options = [...(c.options ?? [])];
      options[i] = val;
      return { ...c, options };
    });
  };

  const addOption = () => {
    setContent((c) => ({ ...c, options: [...(c.options ?? []), ''] }));
  };

  const removeOption = (i: number) => {
    setContent((c) => {
      const options = (c.options ?? []).filter((_, idx) => idx !== i);
      const correctIndices = (c.correctIndices ?? [])
        .filter((ci) => ci !== i)
        .map((ci) => (ci > i ? ci - 1 : ci));
      return { ...c, options, correctIndices };
    });
  };

  const toggleCorrect = (i: number) => {
    setContent((c) => {
      const set = new Set(c.correctIndices ?? []);
      if (set.has(i)) set.delete(i); else set.add(i);
      return { ...c, correctIndices: Array.from(set).sort() };
    });
  };

  const handleModeChange = (newMode: AnswerMode) => {
    setMode(newMode);
    setContent((c) => ({ ...blankContent(newMode), question: c.question }));
  };

  const inputCls =
    'w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#5850ec] focus:ring-2 focus:ring-[#5850ec]/20 placeholder:text-[#9ca3af]';
  const modeBtnCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition border ${
      active
        ? 'border-[#5850ec] bg-[#5850ec] text-white'
        : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#5850ec]/40'
    }`;

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
        role={collapsible ? 'button' : undefined}
        style={collapsible ? { cursor: 'pointer' } : undefined}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#5850ec] text-[11px] font-bold text-white">
          {index + 1}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111827]">
          {content.question || <span className="text-[#9ca3af] font-normal">Question {index + 1}</span>}
        </p>
        <span className="shrink-0 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2 py-0.5 text-[11px] font-semibold text-[#6b7280]">
          {mode}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void onDelete(); }}
          className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#9ca3af] transition hover:bg-red-50 hover:text-red-500"
          aria-label="Delete question"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {collapsible && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`text-[#9ca3af] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {open && (
        <div className="border-t border-[#f3f4f6] px-4 pb-4 pt-4 space-y-4">
          {/* Answer mode */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Answer mode</p>
            <div className="flex flex-wrap gap-2">
              {(['MCQ', 'SHORT_ANSWER', 'PICK', 'ORDER'] as AnswerMode[]).map((m) => (
                <button key={m} type="button" className={modeBtnCls(mode === m)} onClick={() => handleModeChange(m)}>
                  {m === 'MCQ' && 'Multiple choice'}
                  {m === 'SHORT_ANSWER' && 'Short answer'}
                  {m === 'PICK' && 'Pick all correct'}
                  {m === 'ORDER' && 'Ordering'}
                </button>
              ))}
            </div>
          </div>

          {/* Question text */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Question
            </label>
            <textarea
              value={content.question}
              onChange={(e) => setContent((c) => ({ ...c, question: e.target.value }))}
              placeholder="Type your question here…"
              className={`${inputCls} resize-none`}
              rows={2}
            />
          </div>

          {/* MCQ options */}
          {mode === 'MCQ' && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Options <span className="normal-case font-normal text-[#9ca3af]">(click radio to mark correct)</span>
              </p>
              <div className="space-y-2">
                {(content.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setContent((c) => ({ ...c, answer: opt }))}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        content.answer === opt && opt !== ''
                          ? 'border-[#5850ec] bg-[#5850ec]'
                          : 'border-[#d1d5db] bg-white hover:border-[#5850ec]'
                      }`}
                      aria-label={`Mark option ${i + 1} as correct`}
                    >
                      {content.answer === opt && opt !== '' && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className={inputCls}
                    />
                    {(content.options ?? []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="shrink-0 text-[#9ca3af] hover:text-red-500"
                        aria-label="Remove option"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {(content.options ?? []).length < 6 && (
                <button type="button" onClick={addOption} className="mt-2 text-xs font-semibold text-[#5850ec] hover:underline">
                  + Add option
                </button>
              )}
            </div>
          )}

          {/* PICK options */}
          {mode === 'PICK' && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Options <span className="normal-case font-normal text-[#9ca3af]">(tick all correct answers)</span>
              </p>
              <div className="space-y-2">
                {(content.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrect(i)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition border-2 ${
                        (content.correctIndices ?? []).includes(i)
                          ? 'border-[#5850ec] bg-[#5850ec]'
                          : 'border-[#d1d5db] bg-white hover:border-[#5850ec]'
                      }`}
                      aria-label={`Toggle option ${i + 1} as correct`}
                    >
                      {(content.correctIndices ?? []).includes(i) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className={inputCls}
                    />
                    {(content.options ?? []).length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="shrink-0 text-[#9ca3af] hover:text-red-500" aria-label="Remove">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {(content.options ?? []).length < 6 && (
                <button type="button" onClick={addOption} className="mt-2 text-xs font-semibold text-[#5850ec] hover:underline">
                  + Add option
                </button>
              )}
            </div>
          )}

          {/* ORDER options */}
          {mode === 'ORDER' && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Items in correct order <span className="normal-case font-normal text-[#9ca3af]">(students will see them shuffled)</span>
              </p>
              <div className="space-y-2">
                {(content.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f6] text-[11px] font-bold text-[#6b7280]">{i + 1}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Step ${i + 1}`}
                      className={inputCls}
                    />
                    {(content.options ?? []).length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="shrink-0 text-[#9ca3af] hover:text-red-500" aria-label="Remove">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {(content.options ?? []).length < 8 && (
                <button type="button" onClick={addOption} className="mt-2 text-xs font-semibold text-[#5850ec] hover:underline">
                  + Add step
                </button>
              )}
            </div>
          )}

          {/* SHORT_ANSWER model answer */}
          {mode === 'SHORT_ANSWER' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Model answer <span className="normal-case font-normal text-[#9ca3af]">(used by AI to mark)</span>
              </label>
              <input
                type="text"
                value={content.answer ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, answer: e.target.value }))}
                placeholder="e.g. The answer is 42"
                className={inputCls}
              />
            </div>
          )}

          {/* Hint */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Hint <span className="normal-case font-normal text-[#9ca3af]">(optional)</span>
            </label>
            <input
              type="text"
              value={content.hint ?? ''}
              onChange={(e) => setContent((c) => ({ ...c, hint: e.target.value || undefined }))}
              placeholder="A hint shown when students get stuck"
              className={inputCls}
            />
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5850ec] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[#4338ca] disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save question'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Check block question editor (single question) ───────────────────────────

interface CheckBlockEditorProps {
  blockId: string;
  lessonId: string;
  item: LessonItem | null;
  onItemCreated: (item: LessonItem) => void;
  onItemUpdated: (item: LessonItem) => void;
  onItemDeleted: (itemId: string) => void;
}

export function CheckBlockEditor({
  blockId,
  lessonId,
  item,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
}: CheckBlockEditorProps) {
  const [creating, setCreating] = useState(false);

  const createItem = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'QUESTION',
          answerMode: 'MCQ',
          content: blankContent('MCQ'),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newItem = await res.json() as LessonItem;
      onItemCreated(newItem);
    } finally {
      setCreating(false);
    }
  }, [lessonId, blockId, onItemCreated]);

  const saveItem = useCallback(async (updates: { answerMode: AnswerMode; content: QuestionContent }) => {
    if (!item) return;
    const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated = await res.json() as LessonItem;
    onItemUpdated(updated);
  }, [lessonId, blockId, item, onItemUpdated]);

  const deleteItem = useCallback(async () => {
    if (!item) return;
    if (!confirm('Remove this question?')) return;
    const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items/${item.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    onItemDeleted(item.id);
  }, [lessonId, blockId, item, onItemDeleted]);

  if (!item) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] px-6 py-10 text-center">
        <p className="text-sm font-medium text-[#374151]">No question yet</p>
        <p className="mt-1 text-xs text-[#6b7280]">
          A Check block has one question that everyone answers at the same time.
        </p>
        <button
          type="button"
          onClick={createItem}
          disabled={creating}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#059669] disabled:opacity-50"
        >
          {creating ? 'Creating…' : '+ Add question'}
        </button>
      </div>
    );
  }

  return (
    <QuestionForm
      item={item}
      onSave={saveItem}
      onDelete={deleteItem}
      index={0}
    />
  );
}

// ─── Practice block question editor (multiple questions) ─────────────────────

interface PracticeBlockEditorProps {
  blockId: string;
  lessonId: string;
  items: LessonItem[];
  onItemCreated: (item: LessonItem) => void;
  onItemUpdated: (item: LessonItem) => void;
  onItemDeleted: (itemId: string) => void;
}

export function PracticeBlockEditor({
  blockId,
  lessonId,
  items,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
}: PracticeBlockEditorProps) {
  const [adding, setAdding] = useState(false);

  const addQuestion = useCallback(async () => {
    setAdding(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'QUESTION',
          answerMode: 'MCQ',
          content: blankContent('MCQ'),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newItem = await res.json() as LessonItem;
      onItemCreated(newItem);
    } finally {
      setAdding(false);
    }
  }, [lessonId, blockId, onItemCreated]);

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] px-6 py-10 text-center">
          <p className="text-sm font-medium text-[#374151]">No questions yet</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Students work through these at their own pace. AI will route students who struggle to the right explanation.
          </p>
        </div>
      ) : (
        items.map((item, i) => (
          <QuestionForm
            key={item.id}
            item={item}
            index={i}
            collapsible
            onSave={async (updates) => {
              const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const updated = await res.json() as LessonItem;
              onItemUpdated(updated);
            }}
            onDelete={async () => {
              if (!confirm('Remove this question?')) return;
              const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items/${item.id}`, { method: 'DELETE' });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              onItemDeleted(item.id);
            }}
          />
        ))
      )}

      <button
        type="button"
        onClick={addQuestion}
        disabled={adding}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#5850ec]/30 py-3 text-sm font-semibold text-[#5850ec] transition hover:border-[#5850ec]/60 hover:bg-[#f5f3ff] disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
        {adding ? 'Adding…' : 'Add question'}
      </button>
    </div>
  );
}
