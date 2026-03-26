'use client';

import { useState, useCallback } from 'react';
import type {
  QuestionBlock as QuestionBlockType,
  SubQuestion,
  MarkResult,
} from '@/features/content/types';
import { CanvasInput, type CanvasInputData } from '@/components/question/CanvasInput';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubQuestionState {
  answer: string;
  canvasData: CanvasInputData | null;
  result: MarkResult | null;
  isMarking: boolean;
  error: string | null;
}

export interface QuestionBlockProps {
  block: QuestionBlockType;
  /** Passed through to /api/mark for persistence in FINAL mode */
  attemptId?: string;
  mode?: 'DRAFT' | 'FINAL';
  onComplete?: (results: Array<{ index: number; result: MarkResult }>) => void;
}

// ── API call ───────────────────────────────────────────────────────────────────

async function callMark(payload: {
  questionId: string;
  attemptId?: string;
  answer: string | null;
  canvasData?: { snapshotBase64: string; snapshotCropped?: string; strokes?: unknown[] } | null;
  mode: 'DRAFT' | 'FINAL';
}): Promise<MarkResult> {
  const res = await fetch('/api/mark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Marking failed');
  }
  return res.json() as Promise<MarkResult>;
}

// ── Local marking for closed questions ────────────────────────────────────────

function localMark(sub: SubQuestion, answer: string): MarkResult {
  const correct =
    sub.acceptedAnswers?.some((a) => a.trim().toLowerCase() === answer.trim().toLowerCase()) ??
    false;
  return {
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Correct.' : 'Incorrect — check your answer.',
    wtm: correct ? 'You selected the right answer.' : '',
    ebi: correct ? '' : `The correct answer is: ${sub.acceptedAnswers?.[0] ?? ''}`,
    flagged: false,
    latencyMs: 0,
  };
}

// ── Feedback strip ─────────────────────────────────────────────────────────────

function FeedbackStrip({ result }: { result: MarkResult }) {
  const isCorrect = result.correct;
  return (
    <div
      className={`mt-3 rounded-lg border p-4 text-sm space-y-2 ${
        isCorrect
          ? 'border-green-200 bg-green-50 text-green-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      <p className="font-semibold">{isCorrect ? 'Well done' : 'Not quite'}</p>
      {result.feedback && <p>{result.feedback}</p>}
      {result.wtm && (
        <p>
          <span className="font-medium">What went well: </span>
          {result.wtm}
        </p>
      )}
      {result.ebi && (
        <p>
          <span className="font-medium">Even better if: </span>
          {result.ebi}
        </p>
      )}
      {result.flagged && (
        <p className="text-xs text-amber-700 border-t border-amber-200 pt-2 mt-2">
          Flagged for teacher review
        </p>
      )}
    </div>
  );
}

// ── Individual sub-question ────────────────────────────────────────────────────

function SubQuestionView({
  sub,
  state,
  submitRule,
  questionId,
  attemptId,
  mode,
  onStateChange,
  onMark,
}: {
  sub: SubQuestion;
  state: SubQuestionState;
  submitRule: QuestionBlockType['submitRule'];
  questionId: string;
  attemptId?: string;
  mode: 'DRAFT' | 'FINAL';
  onStateChange: (patch: Partial<SubQuestionState>) => void;
  onMark: () => void;
}) {
  const canSubmit =
    submitRule === 'per_question' &&
    !state.result &&
    !state.isMarking &&
    (state.answer.trim() !== '' || state.canvasData !== null);

  return (
    <div className="space-y-3">
      {/* Stem */}
      <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--anx-text)' }}>
        {sub.stem}
      </p>

      {/* Input */}
      {sub.inputType === 'MCQ' && sub.options && (
        <div className="space-y-2">
          {sub.options.map((opt) => (
            <label
              key={opt}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                state.answer === opt
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${state.result ? 'pointer-events-none' : ''}`}
            >
              <input
                type="radio"
                name={`sub-${sub.index}-${questionId}`}
                value={opt}
                checked={state.answer === opt}
                onChange={() => onStateChange({ answer: opt })}
                disabled={!!state.result}
                className="accent-indigo-600"
              />
              <span style={{ color: 'var(--anx-text)' }}>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {sub.inputType === 'SHORT_TEXT' && (
        <textarea
          value={state.answer}
          onChange={(e) => onStateChange({ answer: e.target.value })}
          disabled={!!state.result}
          rows={4}
          placeholder="Write your answer here…"
          className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 resize-none"
          style={{ color: 'var(--anx-text)' }}
        />
      )}

      {sub.inputType === 'NUMERIC' && (
        <input
          type="number"
          value={state.answer}
          onChange={(e) => onStateChange({ answer: e.target.value })}
          disabled={!!state.result}
          placeholder="Enter a number…"
          className="w-40 rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
          style={{ color: 'var(--anx-text)' }}
        />
      )}

      {(sub.inputType === 'CANVAS' || sub.inputType === 'MIXED') && (
        <CanvasInput
          questionId={questionId}
          mode={sub.inputType === 'MIXED' ? 'draw+type' : 'draw'}
          onChange={(data) => onStateChange({ canvasData: data })}
          disabled={!!state.result}
        />
      )}

      {/* Per-question submit */}
      {submitRule === 'per_question' && !state.result && (
        <button
          type="button"
          onClick={onMark}
          disabled={!canSubmit || state.isMarking}
          className="anx-btn-primary mt-1 disabled:opacity-50"
        >
          {state.isMarking ? 'Marking…' : 'Submit'}
        </button>
      )}

      {/* Error */}
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {/* Feedback */}
      {state.result && <FeedbackStrip result={state.result} />}
    </div>
  );
}

// ── QuestionBlock ──────────────────────────────────────────────────────────────

export function QuestionBlock({
  block,
  attemptId,
  mode = 'DRAFT',
  onComplete,
}: QuestionBlockProps) {
  const [states, setStates] = useState<SubQuestionState[]>(() =>
    block.questions.map(() => ({
      answer: '',
      canvasData: null,
      result: null,
      isMarking: false,
      error: null,
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const patchState = useCallback(
    (i: number, patch: Partial<SubQuestionState>) => {
      setStates((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    },
    []
  );

  const markSingle = useCallback(
    async (i: number) => {
      const sub = block.questions[i];
      const state = states[i];

      patchState(i, { isMarking: true, error: null });

      try {
        let result: MarkResult;

        if (sub.inputType === 'MCQ' || sub.inputType === 'NUMERIC') {
          result = localMark(sub, state.answer);
        } else {
          result = await callMark({
            questionId: `${block.id}_q${sub.index}`,
            attemptId,
            answer: state.answer || null,
            canvasData: state.canvasData
              ? {
                  snapshotBase64: state.canvasData.snapshotBase64,
                  snapshotCropped: state.canvasData.snapshotCropped,
                  strokes: state.canvasData.strokes,
                }
              : null,
            mode,
          });
        }

        patchState(i, { result, isMarking: false });

        // Auto-advance sequential mode
        if (block.presentationHint === 'sequential' && i < block.questions.length - 1) {
          setTimeout(() => setCurrentIndex(i + 1), 600);
        }

        // Fire onComplete if all done
        const updatedStates = states.map((s, idx) => (idx === i ? { ...s, result } : s));
        const allDone = updatedStates.every((s) => s.result !== null);
        if (allDone && onComplete) {
          onComplete(
            updatedStates
              .map((s, idx) => ({ index: idx, result: s.result! }))
          );
        }
      } catch (err) {
        patchState(i, {
          isMarking: false,
          error: (err as Error).message ?? 'Marking failed',
        });
      }
    },
    [block, states, attemptId, mode, onComplete, patchState]
  );

  const markAll = useCallback(async () => {
    setIsMarkingAll(true);
    try {
      await Promise.all(
        block.questions.map(async (sub, i) => {
          if (states[i].result) return;
          await markSingle(i);
        })
      );
    } finally {
      setIsMarkingAll(false);
    }
  }, [block.questions, states, markSingle]);

  const allAnswered = states.every(
    (s) => s.answer.trim() !== '' || s.canvasData !== null
  );

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderQuestion(i: number) {
    const sub = block.questions[i];
    return (
      <SubQuestionView
        key={sub.index}
        sub={sub}
        state={states[i]}
        submitRule={block.submitRule}
        questionId={block.id}
        attemptId={attemptId}
        mode={mode}
        onStateChange={(patch) => patchState(i, patch)}
        onMark={() => markSingle(i)}
      />
    );
  }

  // ── Layouts ─────────────────────────────────────────────────────────────────

  return (
    <div className="anx-card p-5 space-y-5">
      {/* Instruction */}
      {block.instructionText && (
        <p className="text-sm italic" style={{ color: 'var(--anx-text-muted)' }}>
          {block.instructionText}
        </p>
      )}

      {/* Sequential */}
      {block.presentationHint === 'sequential' && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
            Question {currentIndex + 1} of {block.questions.length}
          </p>
          {renderQuestion(currentIndex)}
          {/* Show all answered after completing */}
          {states[currentIndex]?.result &&
            currentIndex === block.questions.length - 1 &&
            block.submitRule === 'per_question' && (
              <p className="mt-4 text-sm text-green-700 font-medium">All questions complete.</p>
            )}
        </div>
      )}

      {/* All visible */}
      {block.presentationHint === 'all_visible' && (
        <div className="space-y-6">
          {block.questions.map((_, i) => (
            <div key={i}>
              {block.questions.length > 1 && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                  {i + 1}.
                </p>
              )}
              {renderQuestion(i)}
            </div>
          ))}

          {/* All-together submit */}
          {block.submitRule === 'all_together' && !states.every((s) => s.result) && (
            <button
              type="button"
              onClick={markAll}
              disabled={!allAnswered || isMarkingAll}
              className="anx-btn-primary disabled:opacity-50"
            >
              {isMarkingAll ? 'Marking…' : 'Submit all'}
            </button>
          )}
        </div>
      )}

      {/* Accordion */}
      {block.presentationHint === 'accordion' && (
        <div className="space-y-2">
          {block.questions.map((sub, i) => {
            const isOpen = openIndex === i;
            const isDone = !!states[i].result;
            return (
              <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-gray-50 transition-colors"
                  style={{ color: 'var(--anx-text)' }}
                >
                  <span>
                    {i + 1}. {sub.stem.length > 60 ? sub.stem.slice(0, 60) + '…' : sub.stem}
                  </span>
                  <span className="flex items-center gap-2">
                    {isDone && (
                      <span
                        className={`text-xs font-semibold ${
                          states[i].result!.correct ? 'text-green-600' : 'text-amber-600'
                        }`}
                      >
                        {states[i].result!.correct ? 'Correct' : 'Review'}
                      </span>
                    )}
                    <span style={{ color: 'var(--anx-text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-4">{renderQuestion(i)}</div>
                )}
              </div>
            );
          })}

          {block.submitRule === 'all_together' && !states.every((s) => s.result) && (
            <button
              type="button"
              onClick={markAll}
              disabled={!allAnswered || isMarkingAll}
              className="anx-btn-primary mt-2 disabled:opacity-50"
            >
              {isMarkingAll ? 'Marking…' : 'Submit all'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
