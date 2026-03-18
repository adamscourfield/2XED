'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseAnswerType, parseItemOptions, stripStudentQuestionLabel } from '@/features/items/itemMeta';

type BaselineItem = {
  id: string;
  question: string;
  type?: string;
  options: unknown;
  answer?: string;
  skillId: string;
  skillCode: string;
};

export function BaselineRunClient({ subjectSlug }: { subjectSlug: string }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [item, setItem] = useState<BaselineItem | null>(null);
  const [itemsSeen, setItemsSeen] = useState(0);
  const [maxItems, setMaxItems] = useState(24);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answerType = useMemo(
    () => parseAnswerType(item?.type, item?.question, item?.options, item?.answer),
    [item?.type, item?.question, item?.options, item?.answer]
  );
  const parsedOptions = useMemo(() => parseItemOptions(item?.options ?? {}), [item?.options]);
  const questionText = useMemo(() => stripStudentQuestionLabel(item?.question), [item?.question]);

  const loadNext = useCallback(async (currentSessionId: string) => {
    const nextRes = await fetch('/api/baseline/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId }),
    });
    if (!nextRes.ok) throw new Error('Could not load the next question.');
    const next = (await nextRes.json()) as {
      done: boolean;
      reason?: string;
      item?: BaselineItem;
      itemsSeen: number;
      maxItems?: number;
    };

    setItemsSeen(next.itemsSeen ?? 0);
    if (next.maxItems) setMaxItems(next.maxItems);

    if (next.done || !next.item) {
      await fetch('/api/baseline/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, subjectSlug }),
      });
      router.push(`/learn/${subjectSlug}`);
      return;
    }

    setItem(next.item);
    setSelectedAnswer('');
  }, [router, subjectSlug]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        const startRes = await fetch('/api/baseline/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectSlug }),
        });
        if (!startRes.ok) throw new Error('Could not start baseline.');
        const start = (await startRes.json()) as { sessionId: string; maxItems?: number };

        if (cancelled) return;
        setSessionId(start.sessionId);
        if (start.maxItems) setMaxItems(start.maxItems);
        await loadNext(start.sessionId);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not start baseline.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadNext, subjectSlug]);

  async function submit() {
    if (!sessionId || !item || !selectedAnswer.trim() || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/baseline/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          itemId: item.id,
          skillId: item.skillId,
          answer: selectedAnswer,
        }),
      });
      if (!res.ok) throw new Error('Could not save your answer. Tap Next again.');
      await loadNext(sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your answer. Tap Next again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>Getting your baseline ready…</div>;
  if (error) return <div className="p-8 text-sm" style={{ color: 'var(--anx-danger)' }}>{error}</div>;
  if (!item) return <div className="p-8 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>Loading your next question…</div>;

  return (
    <main className="anx-shell flex items-center justify-center">
      <div className="anx-panel w-full max-w-2xl space-y-6 p-7 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[color:var(--anx-text-secondary)]">Let&apos;s start with a few quick questions</p>
            <p className="text-xs text-[color:var(--anx-text-muted)]">One question at a time. Just try each one.</p>
          </div>
          <span className="text-sm text-[color:var(--anx-text-muted)]">{Math.min(itemsSeen + 1, maxItems)} / {maxItems}</span>
        </div>

        <div className="anx-progress-track">
          <div className="anx-progress-bar" style={{ width: `${(Math.min(itemsSeen + 1, maxItems) / maxItems) * 100}%` }} />
        </div>

        <div className="anx-callout-info px-5 py-4 sm:px-6">
          <p className="font-semibold text-[color:var(--anx-text)]">What to do</p>
          <p className="mt-1">
            {answerType === 'MCQ'
              ? 'Pick one answer.'
              : answerType === 'TRUE_FALSE'
                ? 'Pick true or false.'
                : answerType === 'SHORT_NUMERIC'
                  ? 'Type a number.'
                  : 'Type your answer.'}
          </p>
        </div>

        <div className="anx-surface-muted px-5 py-6 sm:px-6 sm:py-7">
          <h2 className="text-2xl font-bold leading-tight text-[color:var(--anx-text)] sm:text-3xl">{questionText}</h2>
        </div>

        <div className="space-y-3">
          {answerType === 'MCQ' ? (
            parsedOptions.choices.length === 0 ? (
              <div className="anx-callout-warning">
                This question has no options yet.
              </div>
            ) : (
              parsedOptions.choices.map((option, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAnswer(option)}
                  className={`anx-option py-4 text-base font-semibold ${selectedAnswer === option ? 'anx-option-selected' : ''}`}
                >
                  {option}
                </button>
              ))
            )
          ) : answerType === 'TRUE_FALSE' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedAnswer('true')}
                  className={`anx-option py-3 text-base font-semibold ${selectedAnswer === 'true' ? 'anx-option-selected' : ''}`}
                >
                  True
                </button>
                <button
                  onClick={() => setSelectedAnswer('false')}
                  className={`anx-option py-3 text-base font-semibold ${selectedAnswer === 'false' ? 'anx-option-selected' : ''}`}
                >
                  False
                </button>
              </div>
              <p className="text-xs text-[color:var(--anx-text-secondary)]">Tap true or false.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={selectedAnswer}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder={answerType === 'SHORT_NUMERIC' ? 'Enter a number' : 'Type your answer'}
                className="anx-input"
              />
              {answerType === 'SHORT_TEXT' && <p className="text-xs text-[color:var(--anx-text-secondary)]">Use clear words. You can use commas or “and”.</p>}
            </div>
          )}
        </div>

        <button
          onClick={submit}
          disabled={!selectedAnswer.trim() || submitting || (answerType === 'MCQ' && parsedOptions.choices.length === 0)}
          className="anx-btn-primary w-full"
        >
          {submitting ? 'Saving…' : 'Check and go on'}
        </button>
      </div>
    </main>
  );
}
