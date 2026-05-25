'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerMode, LessonItem } from './LessonBuilder';
import { QuestionBankPicker } from './QuestionBankPicker';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuestionContent {
  question: string;
  options?: string[];         // MCQ / ORDER / PICK
  correctIndex?: number;      // BUG-1: MCQ correct answer stored as index (not text)
  answer?: string;            // SHORT_ANSWER model answer only
  correctIndices?: number[];  // PICK (which options are correct)
  hint?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function blankContent(mode: AnswerMode): QuestionContent {
  switch (mode) {
    case 'MCQ':
      return { question: '', options: ['', '', '', ''], correctIndex: undefined };
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
    const c = raw as QuestionContent;
    // R5 / BUG-1 migration: if legacy answer (text) present but no correctIndex, try to
    // derive correctIndex from the options array for a seamless transition.
    // Uses case-insensitive, trimmed comparison so minor formatting differences don't break it.
    if (
      c.correctIndex === undefined &&
      typeof c.answer === 'string' &&
      c.answer !== '' &&
      Array.isArray(c.options)
    ) {
      const needle = c.answer.trim().toLowerCase();
      const idx = c.options.findIndex(
        (opt) => typeof opt === 'string' && opt.trim().toLowerCase() === needle
      );
      if (idx !== -1) return { ...c, correctIndex: idx };
    }
    return c;
  }
  return { question: '' };
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<'question' | 'options' | 'answer' | 'correctIndex', string>>;
}

function validate(mode: AnswerMode, content: QuestionContent): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  if (!content.question.trim()) {
    errors.question = 'Question text is required.';
  }

  if (mode === 'MCQ') {
    const opts = (content.options ?? []).filter((o) => o.trim() !== '');
    if (opts.length < 2) {
      errors.options = 'Add at least 2 non-empty options.';
    }
    if (content.correctIndex === undefined || content.correctIndex === null) {
      errors.correctIndex = 'Mark one option as correct.';
    }
  }

  if (mode === 'PICK') {
    const opts = (content.options ?? []).filter((o) => o.trim() !== '');
    if (opts.length < 2) errors.options = 'Add at least 2 non-empty options.';
    if ((content.correctIndices ?? []).length === 0) {
      errors.correctIndex = 'Tick at least one correct option.';
    }
  }

  if (mode === 'ORDER') {
    const opts = (content.options ?? []).filter((o) => o.trim() !== '');
    if (opts.length < 2) errors.options = 'Add at least 2 steps.';
  }

  if (mode === 'SHORT_ANSWER' && !content.answer?.trim()) {
    errors.answer = 'Model answer is required.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Confirm modal (replaces window.confirm) ─────────────────────────────────

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single question form ────────────────────────────────────────────────────

interface QuestionFormProps {
  item: LessonItem;
  onSave: (updates: { answerMode: AnswerMode; content: QuestionContent }) => Promise<void>;
  onDelete: () => Promise<void>;
  onDuplicate?: () => Promise<void>;
  index: number;
  collapsible?: boolean;
}

export function QuestionForm({
  item,
  onSave,
  onDelete,
  onDuplicate,
  index,
  collapsible = false,
}: QuestionFormProps) {
  const initialMode: AnswerMode = (item.answerMode as AnswerMode | null) ?? 'MCQ';
  const initialContent = parseContent(item.content);

  const [mode, setMode] = useState<AnswerMode>(initialMode);
  const [content, setContent] = useState<QuestionContent>(initialContent);

  // BUG-2: Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [open, setOpen] = useState(!collapsible);
  const [showConfirm, setShowConfirm] = useState(false);

  // UX-3: Validation errors (shown after first save attempt)
  const [validationErrors, setValidationErrors] = useState<ValidationResult['errors']>({});
  const [showErrors, setShowErrors] = useState(false);

  // Refs to avoid stale closures in auto-save timer
  const isDirtyRef = useRef(false);
  const isFirstRender = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef(mode);
  const contentRef = useRef(content);
  modeRef.current = mode;
  contentRef.current = content;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const performSave = useCallback(async () => {
    setAutoSaveStatus('saving');
    try {
      await onSaveRef.current({ answerMode: modeRef.current, content: contentRef.current });
      isDirtyRef.current = false;
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch {
      setAutoSaveStatus('error');
    }
  }, []);

  // BUG-2: Trigger auto-save on content/mode change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    isDirtyRef.current = true;
    setAutoSaveStatus('idle');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => void performSave(), 600);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [content, mode, performSave]);

  // BUG-2: beforeunload warning when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // UX-3: Validate whenever content/mode changes (after first error shown)
  useEffect(() => {
    if (showErrors) {
      setValidationErrors(validate(mode, content).errors);
    }
  }, [content, mode, showErrors]);

  const handleManualSave = useCallback(async () => {
    const result = validate(mode, content);
    if (!result.valid) {
      setShowErrors(true);
      setValidationErrors(result.errors);
      return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await performSave();
  }, [mode, content, performSave]);

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
      // Adjust correctIndex if needed
      let correctIndex = c.correctIndex;
      if (correctIndex !== undefined) {
        if (correctIndex === i) correctIndex = undefined;
        else if (correctIndex > i) correctIndex = correctIndex - 1;
      }
      const correctIndices = (c.correctIndices ?? [])
        .filter((ci) => ci !== i)
        .map((ci) => (ci > i ? ci - 1 : ci));
      return { ...c, options, correctIndex, correctIndices };
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
    setShowErrors(false);
    setValidationErrors({});
  };

  const inputCls =
    'w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#5850ec] focus:ring-2 focus:ring-[#5850ec]/20 placeholder:text-[#9ca3af]';
  const inputErrCls =
    'w-full rounded-lg border border-red-400 bg-white px-3 py-2.5 text-sm text-[#111827] shadow-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200 placeholder:text-[#9ca3af]';
  const modeBtnCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition border ${
      active
        ? 'border-[#5850ec] bg-[#5850ec] text-white'
        : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#5850ec]/40'
    }`;

  const autoSaveLabel =
    autoSaveStatus === 'saving' ? '↻ Saving…' :
    autoSaveStatus === 'saved'  ? '✓ Saved' :
    autoSaveStatus === 'error'  ? '⚠ Save failed' : null;

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          message="Remove this question? This can't be undone."
          onConfirm={() => { setShowConfirm(false); void onDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

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

          {/* Auto-save status */}
          {autoSaveLabel && (
            <span className={`shrink-0 text-[11px] font-semibold ${
              autoSaveStatus === 'error' ? 'text-red-500' :
              autoSaveStatus === 'saved' ? 'text-green-600' : 'text-[#9ca3af]'
            }`}>
              {autoSaveLabel}
            </span>
          )}

          <span className="shrink-0 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2 py-0.5 text-[11px] font-semibold text-[#6b7280]">
            {mode}
          </span>

          {/* R2 / R5: warn when MCQ has no correct answer set — visible in collapsed state */}
          {mode === 'MCQ' && content.correctIndex === undefined && (
            <span
              title="No correct answer marked — open to fix"
              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[#fde68a] bg-[#fffbeb] px-2 py-0.5 text-[11px] font-semibold text-[#92400e]"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              No answer set
            </span>
          )}

          {/* Duplicate */}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void onDuplicate(); }}
              className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#5850ec]"
              aria-label="Duplicate question"
              title="Duplicate question"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
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
                className={`${showErrors && validationErrors.question ? inputErrCls : inputCls} resize-none`}
                rows={2}
              />
              {showErrors && validationErrors.question && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.question}</p>
              )}
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
                      {/* BUG-1: compare by index, not text */}
                      <button
                        type="button"
                        onClick={() => setContent((c) => ({ ...c, correctIndex: i }))}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          content.correctIndex === i
                            ? 'border-[#5850ec] bg-[#5850ec]'
                            : 'border-[#d1d5db] bg-white hover:border-[#5850ec]'
                        }`}
                        aria-label={`Mark option ${i + 1} as correct`}
                      >
                        {content.correctIndex === i && (
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
                {showErrors && (validationErrors.options || validationErrors.correctIndex) && (
                  <div className="mt-1 space-y-0.5">
                    {validationErrors.options && <p className="text-xs text-red-500">{validationErrors.options}</p>}
                    {validationErrors.correctIndex && <p className="text-xs text-red-500">{validationErrors.correctIndex}</p>}
                  </div>
                )}
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
                {showErrors && (validationErrors.options || validationErrors.correctIndex) && (
                  <div className="mt-1 space-y-0.5">
                    {validationErrors.options && <p className="text-xs text-red-500">{validationErrors.options}</p>}
                    {validationErrors.correctIndex && <p className="text-xs text-red-500">{validationErrors.correctIndex}</p>}
                  </div>
                )}
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
                {showErrors && validationErrors.options && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.options}</p>
                )}
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
                  className={showErrors && validationErrors.answer ? inputErrCls : inputCls}
                />
                {showErrors && validationErrors.answer && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.answer}</p>
                )}
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

            {/* Footer: auto-save status + manual save button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => void handleManualSave()}
                disabled={autoSaveStatus === 'saving'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#5850ec] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[#4338ca] disabled:opacity-50"
              >
                {autoSaveStatus === 'saving' ? 'Saving…' : 'Save question'}
              </button>
              {autoSaveStatus === 'error' && (
                <p className="text-xs text-red-500">Auto-save failed — click Save to retry.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Check block question editor (single question) ───────────────────────────

interface CheckAiQuestion {
  stem: string;
  type: 'MCQ';
  options: string[];
  answer: string;
}

interface CheckBlockEditorProps {
  blockId: string;
  lessonId: string;
  subjectId: string;
  item: LessonItem | null;
  lessonTopic?: string;
  lessonSubjectTitle?: string;
  blockTitle?: string | null;
  onItemCreated: (item: LessonItem) => void;
  onItemUpdated: (item: LessonItem) => void;
  onItemDeleted: (itemId: string) => void;
}

export function CheckBlockEditor({
  blockId,
  lessonId,
  subjectId,
  item,
  lessonTopic = '',
  lessonSubjectTitle = '',
  blockTitle,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
}: CheckBlockEditorProps) {
  const [creating, setCreating] = useState(false);
  // High #8: bank picker
  const [showPicker, setShowPicker] = useState(false);

  // AI suggestion state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<CheckAiQuestion[] | null>(null);
  const [aiAccepting, setAiAccepting] = useState<Set<number>>(new Set());

  const generateCheckQuestion = useCallback(async () => {
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/check-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: lessonTopic,
          subjectTitle: lessonSubjectTitle,
          blockTitle: blockTitle ?? undefined,
          count: 3,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { questions: CheckAiQuestion[] };
      setAiSuggestions(data.questions);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setAiGenerating(false);
    }
  }, [lessonId, blockId, lessonTopic, lessonSubjectTitle, blockTitle]);

  const acceptAiSuggestion = useCallback(async (i: number, q: CheckAiQuestion) => {
    setAiAccepting((prev) => new Set(prev).add(i));
    try {
      const correctIndex = q.options.indexOf(q.answer);
      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'QUESTION',
          answerMode: 'MCQ',
          content: {
            question: q.stem,
            options: q.options,
            correctIndex: correctIndex >= 0 ? correctIndex : 0,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newItem = (await res.json()) as LessonItem;
      onItemCreated(newItem);
      setAiSuggestions(null);
    } finally {
      setAiAccepting((prev) => { const s = new Set(prev); s.delete(i); return s; });
    }
  }, [lessonId, blockId, onItemCreated]);

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
    const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items/${item.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    onItemDeleted(item.id);
  }, [lessonId, blockId, item, onItemDeleted]);

  if (!item) {
    return (
      <>
        {showPicker && (
          <QuestionBankPicker
            subjectId={subjectId}
            lessonId={lessonId}
            blockId={blockId}
            onItemAdded={(newItem) => { onItemCreated(newItem); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}

        {/* AI check question suggestions */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#374151]">Generate with AI</p>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                Get 3 check question options from Claude — pick the best one.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void generateCheckQuestion()}
              disabled={aiGenerating}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#10b981] px-3 py-2 text-xs font-semibold text-white shadow transition hover:bg-[#059669] disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" fill="currentColor" />
              </svg>
              {aiGenerating ? 'Generating…' : 'Suggest questions'}
            </button>
          </div>
          {aiError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{aiError}</p>
          )}
          {aiSuggestions && aiSuggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                Suggestions — click Use to select one
              </p>
              {aiSuggestions.map((q, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-[#a7f3d0] bg-white px-3.5 py-3 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#374151]">{q.stem}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {q.options.map((opt, oi) => (
                        <span
                          key={oi}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            opt === q.answer
                              ? 'bg-green-100 text-green-700'
                              : 'bg-[#f3f4f6] text-[#6b7280]'
                          }`}
                        >
                          {opt === q.answer && '✓ '}{opt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void acceptAiSuggestion(i, q)}
                    disabled={aiAccepting.has(i)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#10b981] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#059669] disabled:opacity-50"
                  >
                    {aiAccepting.has(i) ? '…' : 'Use'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] px-6 py-6 text-center">
          <p className="text-sm font-medium text-[#374151]">No question yet</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            A Check block has one question that everyone answers at the same time.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={createItem}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#374151] shadow transition hover:bg-[#f3f4f6] disabled:opacity-50"
            >
              {creating ? 'Creating…' : '+ Write manually'}
            </button>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#5850ec] bg-white px-4 py-2 text-sm font-semibold text-[#5850ec] shadow transition hover:bg-[#f5f3ff]"
            >
              Browse bank
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showPicker && (
        <QuestionBankPicker
          subjectId={subjectId}
          lessonId={lessonId}
          blockId={blockId}
          onItemAdded={(newItem) => { onItemCreated(newItem); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
      <QuestionForm
        item={item}
        onSave={saveItem}
        onDelete={deleteItem}
        index={0}
      />
    </>
  );
}

// ─── Practice block question editor (multiple questions) ─────────────────────

interface PracticeBlockEditorProps {
  blockId: string;
  lessonId: string;
  subjectId: string;
  items: LessonItem[];
  onItemCreated: (item: LessonItem) => void;
  onItemUpdated: (item: LessonItem) => void;
  onItemDeleted: (itemId: string) => void;
}

// ─── Inline toast ─────────────────────────────────────────────────────────────

function InlineToast({ message, ok }: { message: string; ok: boolean }) {
  return (
    <div
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition ${
        ok ? 'bg-[#10b981]' : 'bg-red-500'
      }`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

export function PracticeBlockEditor({
  blockId,
  lessonId,
  subjectId,
  items,
  onItemCreated,
  onItemUpdated,
  onItemDeleted,
}: PracticeBlockEditorProps) {
  const [adding, setAdding] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  // Toast for duplicate / reorder feedback (#21)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  // Local ordering override — ids only, content still driven by parent items (#23)
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  // Merge local ordering with parent item data
  const displayItems = useMemo(() => {
    if (!orderedIds) return items;
    const map = new Map(items.map((item) => [item.id, item]));
    const ordered = orderedIds.flatMap((id) => { const it = map.get(id); return it ? [it] : []; });
    const seen = new Set(orderedIds);
    const newItems = items.filter((item) => !seen.has(item.id));
    return [...ordered, ...newItems];
  }, [items, orderedIds]);

  const showToast = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 2500);
  }, []);

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

  // FEAT-5: Duplicate a question — with toast feedback (#21)
  const duplicateQuestion = useCallback(async (item: LessonItem) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: item.itemType,
          answerMode: item.answerMode,
          content: item.content,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newItem = await res.json() as LessonItem;
      onItemCreated(newItem);
      showToast(true, 'Question duplicated');
    } catch {
      showToast(false, 'Failed to duplicate — try again');
    }
  }, [lessonId, blockId, onItemCreated, showToast]);

  // Move item up/down with optimistic reorder + API call (#23)
  const moveItem = useCallback(async (itemId: string, dir: 'up' | 'down') => {
    const current = orderedIds ?? items.map((i) => i.id);
    const idx = current.indexOf(itemId);
    if (idx < 0) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;

    const reordered = [...current];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    setOrderedIds(reordered);

    try {
      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: reordered }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setOrderedIds(current); // revert
      showToast(false, 'Reorder failed — try again');
    }
  }, [orderedIds, items, lessonId, blockId, showToast]);

  return (
    <>
      {toast && <InlineToast ok={toast.ok} message={toast.msg} />}

      {/* Question bank picker */}
      {showPicker && (
        <QuestionBankPicker
          subjectId={subjectId}
          lessonId={lessonId}
          blockId={blockId}
          onItemAdded={(newItem) => { onItemCreated(newItem); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="space-y-3">
        {displayItems.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] px-6 py-10 text-center">
            <p className="text-sm font-medium text-[#374151]">No questions yet</p>
            <p className="mt-1 text-xs text-[#6b7280]">
              Students work through these at their own pace. AI will route students who struggle to the right explanation.
            </p>
          </div>
        ) : (
          displayItems.map((item, i) => (
            <div key={item.id} className="flex items-start gap-1.5">
              {/* Reorder controls (#23) */}
              <div className="flex shrink-0 flex-col gap-0.5 pt-3">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => void moveItem(item.id, 'up')}
                  className="flex h-6 w-6 items-center justify-center rounded text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151] disabled:opacity-25"
                  aria-label="Move question up"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={i === displayItems.length - 1}
                  onClick={() => void moveItem(item.id, 'down')}
                  className="flex h-6 w-6 items-center justify-center rounded text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151] disabled:opacity-25"
                  aria-label="Move question down"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <QuestionForm
                  item={item}
                  index={i}
                  collapsible
                  onDuplicate={() => duplicateQuestion(item)}
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
                    const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items/${item.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    onItemDeleted(item.id);
                  }}
                />
              </div>
            </div>
          ))
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addQuestion}
            disabled={adding}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#5850ec]/30 py-3 text-sm font-semibold text-[#5850ec] transition hover:border-[#5850ec]/60 hover:bg-[#f5f3ff] disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
            {adding ? 'Adding…' : 'Add question'}
          </button>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#5850ec]/30 bg-white px-4 py-3 text-sm font-semibold text-[#5850ec] transition hover:border-[#5850ec]/60 hover:bg-[#f5f3ff]"
          >
            Browse bank
          </button>
        </div>
      </div>
    </>
  );
}
