'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderedMagnetInput } from '@/components/learn/OrderedMagnetInput';
import { ItemVisualPanel } from '@/components/learn/ItemVisualPanel';
import { getItemContent, ItemInteractionType } from './itemContent';
import { sanitizeStudentCopy } from './studentCopy';

interface Item {
  id: string;
  question: string;
  options: unknown;
  answer: string;
  type: string;
}

interface Skill {
  id: string;
  code: string;
  name: string;
  strand: string;
  intro: string | null;
  description: string | null;
}

interface Subject {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  subject: Subject;
  skill: Skill;
  items: Item[];
  userId: string;
}

type Phase = 'intro' | 'session' | 'results';

const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_DEBUG === 'true';

export function LearnSession({ subject, skill, items, userId }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [results, setResults] = useState<{ itemId: string; correct: boolean }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const currentItem = items[currentIndex];
  const currentItemContent = currentItem ? getItemContent(currentItem) : null;
  const options = currentItemContent?.choices ?? [];

  function renderAnswerInput(type: ItemInteractionType) {
    if (type === 'SHORT_TEXT' || type === 'SHORT_NUMERIC') {
      return (
        <div className="space-y-2">
          <input
            value={selectedAnswer}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            inputMode={type === 'SHORT_NUMERIC' ? 'decimal' : 'text'}
            className="anx-input"
            placeholder={type === 'SHORT_NUMERIC' ? 'Enter a number' : 'Type your answer'}
          />
          {type === 'SHORT_TEXT' && (
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>Use clear words. You can use commas or “and”.</p>
          )}
        </div>
      );
    }

    if (type === 'ORDER') {
      return (
        <OrderedMagnetInput
          choices={options}
          value={selectedAnswer}
          onChange={setSelectedAnswer}
          emptyPrompt="Move the magnets here in the right order."
          helperText="Drag to move them, or tap one to add it."
        />
      );
    }

    return (
      <div className="space-y-3">
        {options.length === 0 ? (
          <div className="anx-callout-warning">
            This question has no options yet.
          </div>
        ) : (
          options.map((option, i) => (
            <button
              key={i}
              onClick={() => setSelectedAnswer(option)}
              className={`anx-option ${selectedAnswer === option ? 'anx-option-selected' : ''}`}
            >
              {option}
            </button>
          ))
        )}
      </div>
    );
  }

  async function submitAnswer() {
    if (!selectedAnswer || !currentItem) return;
    setSubmitting(true);

    const res = await fetch('/api/learn/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: currentItem.id,
        skillId: skill.id,
        subjectId: subject.id,
        answer: selectedAnswer,
        isLast: currentIndex === items.length - 1,
        totalItems: items.length,
        previousResults: results,
      }),
    });

    const data = await res.json();
    const newResults = [...results, { itemId: currentItem.id, correct: data.correct }];
    setResults(newResults);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer('');
    } else {
      setPhase('results');
    }
    setSubmitting(false);
  }

  if (phase === 'intro') {
    return (
      <main className="anx-shell flex items-center justify-center">
        <div className="anx-panel w-full max-w-lg p-8 space-y-6">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--anx-primary)' }}>{subject.title}</p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>{skill.name}</h1>
            {SHOW_DEBUG && (
              <p className="text-xs mt-1" style={{ color: 'var(--anx-text-faint)' }}>
                {skill.code} · {skill.strand}
              </p>
            )}
          </div>
          {sanitizeStudentCopy(skill.intro) && (
            <div className="prose prose-sm" style={{ color: 'var(--anx-text-secondary)' }}>
              <p>{sanitizeStudentCopy(skill.intro)}</p>
            </div>
          )}
          {sanitizeStudentCopy(skill.description) && !sanitizeStudentCopy(skill.intro) && (
            <p style={{ color: 'var(--anx-text-secondary)' }}>{sanitizeStudentCopy(skill.description)}</p>
          )}
          <div className="anx-callout-info">
            <p className="font-medium">What happens next</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>You will do {items.length} short question{items.length === 1 ? '' : 's'}.</li>
              <li>We will see if this skill feels steady yet.</li>
              <li>Then your dashboard will show what to do next.</li>
            </ol>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPhase('session')}
              className="anx-btn-primary flex-1 py-3"
            >
              Start now ({items.length} question{items.length === 1 ? '' : 's'})
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="anx-btn-secondary px-4 py-3"
            >
              Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'session' && currentItem) {
    return (
      <main className="anx-shell flex items-center justify-center">
        <div className="anx-panel w-full max-w-lg p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>One question at a time</p>
              <p className="text-xs" style={{ color: 'var(--anx-text-faint)' }}>If one feels hard, the next one is a fresh start.</p>
            </div>
            <div className="text-right">
              <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                {skill.name}
                {SHOW_DEBUG && (
                  <span className="ml-2 text-xs" style={{ color: 'var(--anx-text-faint)' }}>[{skill.code}]</span>
                )}
              </p>
              <span className="text-sm" style={{ color: 'var(--anx-text-faint)' }}>
                {currentIndex + 1} / {items.length}
              </span>
            </div>
          </div>
          <div className="anx-progress-track">
            <div
              className="anx-progress-bar"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>
          <ItemVisualPanel item={currentItem} primarySkillCode={skill.code} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>{currentItem.question}</h2>
          {currentItemContent && (
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              {currentItemContent.type === 'SHORT_NUMERIC'
                ? 'Type a number.'
                : currentItemContent.type === 'SHORT_TEXT'
                  ? 'Type your answer.'
                  : currentItemContent.type === 'ORDER'
                    ? 'Put them in the right order.'
                    : 'Pick one answer.'}
            </p>
          )}
          {currentItemContent && renderAnswerInput(currentItemContent.type)}
          <button
            onClick={submitAnswer}
            disabled={!selectedAnswer || submitting}
            className="anx-btn-primary w-full py-3"
          >
            {submitting ? 'Checking…' : currentIndex < items.length - 1 ? 'Check and go on' : 'Finish for now'}
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'results') {
    const correctCount = results.filter((r) => r.correct).length;
    const masteryPct = Math.round((correctCount / results.length) * 100);

    let outcomeTone: 'success' | 'warning' | 'info';
    if (masteryPct >= 80) outcomeTone = 'success';
    else if (masteryPct >= 50) outcomeTone = 'warning';
    else outcomeTone = 'info';

    const calloutClass = {
      success: 'anx-callout-success',
      warning: 'anx-callout-warning',
      info: 'anx-callout-info',
    }[outcomeTone];

    const scoreColor = {
      success: 'var(--anx-success)',
      warning: 'var(--anx-warning)',
      info: 'var(--anx-primary)',
    }[outcomeTone];

    return (
      <main className="anx-shell flex items-center justify-center">
        <div className="anx-panel w-full max-w-lg p-8 space-y-6">
          <div className={calloutClass}>
            <p className="font-semibold">
              Session complete
            </p>
            <h1 className="mt-1 text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>Nice work. You finished this set.</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>
              We have enough to choose your next step. You do not need to get every question right at once.
            </p>
          </div>

          <div className="text-center py-1">
            <span className="text-5xl font-bold" style={{ color: scoreColor }}>
              {masteryPct}%
            </span>
            <p className="mt-2" style={{ color: 'var(--anx-text-muted)' }}>
              {correctCount} out of {results.length} correct
            </p>
          </div>

          <div className="anx-surface-muted p-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>What happens next</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>
              <li>This set is saved.</li>
              <li>Your dashboard will show what to do next.</li>
              <li>If this still feels hard, that is okay. The next set will stay short.</li>
            </ol>
          </div>

          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={r.itemId} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: r.correct ? 'var(--anx-success)' : 'var(--anx-danger)' }}>
                  {r.correct ? '✓' : '✗'}
                </span>
                <span style={{ color: 'var(--anx-text-secondary)' }}>Question {i + 1}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/learn/${subject.slug}`)}
              className="anx-btn-secondary flex-1 py-3"
            >
              Practice again
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="anx-btn-primary flex-1 py-3"
            >
              Dashboard and next skill
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
