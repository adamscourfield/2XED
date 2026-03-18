'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderedMagnetInput } from '@/components/learn/OrderedMagnetInput';
import { ItemVisualPanel } from '@/components/learn/ItemVisualPanel';
import { getItemContent, ItemInteractionType } from '@/features/learn/itemContent';

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
  const router = useRouter();
  const itemContent = getItemContent(item);

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

    await fetch(`/api/diagnostic/${subjectSlug}/submit`, {
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

    router.refresh();
    router.push(`/diagnostic/${subjectSlug}/run`);
  }

  return (
    <main className="anx-shell flex items-center justify-center">
      <div className="anx-panel w-full max-w-lg p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>One question at a time</p>
            <p className="text-xs" style={{ color: 'var(--anx-text-faint)' }}>Just try each one. This helps us find the right place to start.</p>
          </div>
          <span className="text-sm" style={{ color: 'var(--anx-text-faint)' }}>
            {itemsSeen + 1} / {maxItems} max
          </span>
        </div>
        <div className="anx-progress-track">
          <div
            className="anx-progress-bar"
            style={{ width: `${((itemsSeen + 1) / maxItems) * 100}%` }}
          />
        </div>
        <ItemVisualPanel item={item} primarySkillCode={skill.code} />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>{item.question}</h2>
        <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          {itemContent.type === 'SHORT_NUMERIC'
            ? 'Type a number.'
            : itemContent.type === 'SHORT_TEXT'
              ? 'Type your answer.'
              : itemContent.type === 'ORDER'
                ? 'Put them in the right order.'
                : 'Pick one answer.'}
        </p>
        {renderAnswerInput(itemContent.type)}
        <button
          onClick={submitAnswer}
          disabled={!selectedAnswer || submitting}
          className="anx-btn-primary w-full py-3"
        >
          {submitting ? 'Saving…' : 'Check and go on'}
        </button>
      </div>
    </main>
  );
}
