'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderedMagnetInput } from '@/components/learn/OrderedMagnetInput';
import { NumberLineInput } from '@/components/learn/NumberLineInput';
import { ItemVisualPanel } from '@/components/learn/ItemVisualPanel';
import { getItemContent, ItemInteractionType } from '@/features/learn/itemContent';
import { stripStudentQuestionLabel } from '@/features/items/itemMeta';
import { StudentQuestionCard } from '@/components/student/StudentQuestionCard';

interface Props {
  subject: { id: string; title: string; slug: string };
  skill: { id: string; code: string; name: string; strand: string };
  item: { id: string; question: string; options: unknown; answer: string; type: string };
  sessionId: string;
  itemsSeen: number;
  maxItems: number;
  subjectSlug: string;
}

export function DiagnosticRunClient({ subject, skill, item, sessionId, itemsSeen, maxItems, subjectSlug }: Props) {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const router = useRouter();
  const itemContent = getItemContent(item);
  const questionText = useMemo(() => stripStudentQuestionLabel(item.question) || item.question, [item.question]);

  useEffect(() => {
    setSelectedAnswer('');
    setSubmitError(null);
  }, [item.id]);

  function renderAnswerInput(type: ItemInteractionType) {
    if (type === 'SHORT_TEXT' || type === 'SHORT_NUMERIC') {
      return (
        <input
          value={selectedAnswer}
          onChange={(e) => setSelectedAnswer(e.target.value)}
          inputMode={type === 'SHORT_NUMERIC' ? 'decimal' : 'text'}
          className="anx-input"
          placeholder={type === 'SHORT_NUMERIC' ? 'Enter a number' : 'Type your answer'}
        />
      );
    }

    if (type === 'ORDER') {
      return (
        <OrderedMagnetInput
          choices={itemContent.choices}
          value={selectedAnswer}
          onChange={setSelectedAnswer}
          emptyPrompt="Move the magnets here in the right order."
          helperText="Drag to move them, or tap one to add it."
        />
      );
    }

    if (type === 'NUMBER_LINE') {
      if (!itemContent.numberLine) {
        return <div className="anx-callout-warning">Number line configuration missing.</div>;
      }
      return (
        <NumberLineInput
          config={itemContent.numberLine}
          value={selectedAnswer}
          onChange={setSelectedAnswer}
        />
      );
    }

    return (
      <div className="space-y-3">
        {itemContent.choices.map((option, i) => (
          <button
            key={i}
            onClick={() => setSelectedAnswer(option)}
            className={`anx-option ${selectedAnswer === option ? 'anx-option-selected' : ''}`}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  async function submitAnswer() {
    if (!selectedAnswer || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/diagnostic/${subjectSlug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          itemId: item.id,
          skillId: skill.id,
          subjectId: subject.id,
          skillCode: skill.code,
          strand: skill.strand,
          answer: selectedAnswer,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Could not save this answer.');
      }

      const data = (await res.json()) as { done?: boolean };
      if (data.done) {
        setComplete(true);
        return;
      }

      router.refresh();
      router.push(`/diagnostic/${subjectSlug}/run`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save this answer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (complete) {
    return (
      <main className="anx-shell anx-scene flex items-center justify-center py-10">
        <div className="anx-panel w-full max-w-md p-8 text-center">
          <p className="text-sm font-semibold text-[color:var(--anx-primary)]">{subject.title}</p>
          <h1 className="mt-2 text-2xl font-bold text-[color:var(--anx-text)]">We found your starting point</h1>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--anx-text-secondary)]">
            Your next practice will start with the skills that need the most attention.
          </p>
          <button
            type="button"
            onClick={() => {
              router.refresh();
              router.push(`/learn/${subjectSlug}`);
            }}
            className="anx-btn-primary mt-6 w-full py-3"
          >
            Start practice
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="anx-shell anx-scene flex items-center justify-center py-8 sm:py-10">
      <StudentQuestionCard
        questionKey={item.id}
        header={(
          <>
            <div>
              <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>One question at a time</p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--anx-text-faint)' }}>Just try each one. This helps us find the right place to start.</p>
            </div>
            <span className="shrink-0 text-sm tabular-nums" style={{ color: 'var(--anx-text-faint)' }}>
              {itemsSeen + 1} / {maxItems}
            </span>
          </>
        )}
        progress={(
          <div className="anx-progress-track">
            <div
              className="anx-progress-bar"
              style={{ width: `${((itemsSeen + 1) / maxItems) * 100}%` }}
            />
          </div>
        )}
        visual={<ItemVisualPanel item={item} primarySkillCode={skill.code} />}
        questionLabel="Question"
        question={<p className="m-0 whitespace-pre-wrap">{questionText}</p>}
        instruction={(
          <p className="m-0">
            {itemContent.type === 'SHORT_NUMERIC'
              ? 'Type a number.'
              : itemContent.type === 'SHORT_TEXT'
                ? 'Type your answer.'
                : itemContent.type === 'ORDER'
                  ? 'Put them in the right order.'
                  : itemContent.type === 'NUMBER_LINE'
                    ? itemContent.numberLine?.task === 'place'
                      ? 'Tap the number line to place your marker.'
                      : 'Estimate the value shown by the arrow.'
                    : 'Pick one answer.'}
          </p>
        )}
        answerArea={(
          <div className="space-y-3">
            {renderAnswerInput(itemContent.type)}
            {submitError ? (
              <div className="anx-callout-warning" role="alert">
                {submitError}
              </div>
            ) : null}
          </div>
        )}
        actions={(
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!selectedAnswer || submitting}
            className="anx-btn-primary w-full py-3.5"
          >
            {submitting ? 'Saving…' : 'Check and go on'}
          </button>
        )}
      />
    </main>
  );
}
