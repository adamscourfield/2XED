'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderedMagnetInput } from '@/components/learn/OrderedMagnetInput';
import { NumberLineInput } from '@/components/learn/NumberLineInput';
import { ProtractorInput } from '@/components/learn/ProtractorInput';
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

interface GamificationSummary {
  xp: number;
  tokens: number;
  streakDays: number;
  activeDaysThisWeek: number;
}

interface Props {
  subject: Subject;
  skill: Skill;
  items: Item[];
  userId: string;
  gamification?: GamificationSummary;
}

type Phase = 'intro' | 'session' | 'results';

const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_DEBUG === 'true';

export function LearnSession({ subject, skill, items, userId, gamification }: Props) {
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

    if (type === 'NUMBER_LINE') {
      if (!currentItemContent?.numberLine) {
        return <div className="anx-callout-warning">Number line configuration missing.</div>;
      }
      return (
        <NumberLineInput
          config={currentItemContent.numberLine}
          value={selectedAnswer}
          onChange={setSelectedAnswer}
        />
      );
    }

    if (type === 'PROTRACTOR') {
      if (!currentItemContent?.protractor) {
        return <div className="anx-callout-warning">Protractor configuration missing.</div>;
      }
      return (
        <ProtractorInput
          config={currentItemContent.protractor}
          value={selectedAnswer}
          onChange={setSelectedAnswer}
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
      <main className="anx-shell anx-scene flex items-center justify-center">
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
      <main className="anx-shell anx-scene flex items-center justify-center">
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
                    : currentItemContent.type === 'NUMBER_LINE'
                      ? currentItemContent.numberLine?.task === 'place'
                        ? 'Tap the number line to place your marker.'
                        : 'Estimate the value shown by the arrow.'
                      : currentItemContent.type === 'PROTRACTOR'
                        ? 'Position the protractor, then type your reading below.'
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

    const headlineText = {
      success: 'Congratulations!',
      warning: 'Good effort!',
      info: 'Keep going!',
    }[outcomeTone];

    const subtitleText = {
      success: `Great job! You have done really well on ${skill.name}.`,
      warning: `Nice try on ${skill.name}. A little more practice and you will have it.`,
      info: `You are building up ${skill.name}. The next set will help.`,
    }[outcomeTone];

    const scoreColor = {
      success: 'var(--anx-success)',
      warning: 'var(--anx-warning)',
      info: 'var(--anx-primary)',
    }[outcomeTone];

    const ringEmoji = {
      success: '🏆',
      warning: '💪',
      info: '📚',
    }[outcomeTone];

    const xpEarned = gamification?.xp ?? 0;

    return (
      <main className="anx-shell anx-scene flex items-center justify-center">
        <div className="anx-panel w-full max-w-md p-8 space-y-6 text-center anx-slide-up">
          {/* Celebration ring */}
          <div className="anx-reward-ring">
            <div className="anx-reward-stars">
              <span className="anx-reward-star">⭐</span>
              <span className="anx-reward-star">✨</span>
              <span className="anx-reward-star">🌟</span>
              <span className="anx-reward-star">⭐</span>
              <span className="anx-reward-star">✨</span>
              <span className="anx-reward-star">🌟</span>
            </div>
            <span className="text-5xl">{ringEmoji}</span>
          </div>

          {/* Score */}
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--anx-text-muted)' }}>Your Score</p>
            <p className="text-4xl font-bold" style={{ color: scoreColor }}>
              {correctCount}/{results.length}
            </p>
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>{headlineText}</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>{subtitleText}</p>
          </div>

          {/* XP badge */}
          {xpEarned > 0 && (
            <div className="flex justify-center">
              <span className="anx-xp-badge">🥇 {xpEarned} XP</span>
            </div>
          )}

          {/* Question results */}
          <div className="flex justify-center gap-2">
            {results.map((r, i) => (
              <span
                key={r.itemId}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: r.correct ? 'var(--anx-success)' : 'var(--anx-danger)' }}
                title={`Question ${i + 1}: ${r.correct ? 'Correct' : 'Incorrect'}`}
              >
                {r.correct ? '✓' : '✗'}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="anx-btn-primary w-full py-3"
            >
              Back to Home
            </button>
            <button
              onClick={() => router.push(`/learn/${subject.slug}`)}
              className="anx-btn-secondary w-full py-3"
            >
              Practice again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
