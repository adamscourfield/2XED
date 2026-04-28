'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderedMagnetInput } from '@/components/learn/OrderedMagnetInput';
import { NumberLineInput } from '@/components/learn/NumberLineInput';
import { ProtractorInput } from '@/components/learn/ProtractorInput';
import { ItemVisualPanel } from '@/components/learn/ItemVisualPanel';
import { AnimationRenderer } from '@/components/explanation/AnimationRenderer';
import { getItemContent, ItemInteractionType } from './itemContent';
import { sanitizeStudentCopy } from './studentCopy';
import { stripStudentQuestionLabel } from '@/features/items/itemMeta';
import { StudentQuestionCard } from '@/components/student/StudentQuestionCard';

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

interface ExplanationSchema {
  schemaVersion: string;
  skillCode: string;
  skillName: string;
  routeType: string;
  routeLabel: string;
  misconceptionSummary: string;
  generatedAt: string;
  steps: Array<{
    stepIndex: number;
    id: string;
    visuals: unknown[];
    narration: string;
    audioFile: string | null;
  }>;
  misconceptionStrip: {
    text: string;
    audioNarration: string;
  };
  loopable: boolean;
  pauseAtEndMs: number;
}

interface ExplanationRouteSummary {
  id: string;
  routeType: 'A' | 'B' | 'C';
  misconceptionSummary: string;
  workedExample: string;
  animationSchema: ExplanationSchema | null;
}

interface Props {
  subject: Subject;
  skill: Skill;
  items: Item[];
  retryItems: Item[];
  userId: string;
  gamification?: GamificationSummary;
  hadRecentRepeatFailure?: boolean;
  explanationRoute?: ExplanationRouteSummary | null;
}

type Phase = 'intro' | 'session' | 'explanation' | 'results';
type RecoveryState = 'recovered' | 'improving' | 'still_needs_support';

const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_DEBUG === 'true';

export function LearnSession({ subject, skill, items, retryItems, userId, gamification, hadRecentRepeatFailure = false, explanationRoute }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [results, setResults] = useState<{ itemId: string; correct: boolean }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasSeenExplanation, setHasSeenExplanation] = useState(false);
  const [hasRetriedAfterExplanation, setHasRetriedAfterExplanation] = useState(false);
  const [explanationTrigger, setExplanationTrigger] = useState<'zero_score' | 'repeat_failure' | null>(null);
  const [retryResults, setRetryResults] = useState<{ itemId: string; correct: boolean }[]>([]);
  const router = useRouter();
  const explanationLoggedRef = useRef(false);
  const retryStartLoggedRef = useRef(false);
  const retryCompletedLoggedRef = useRef(false);

  const currentItems = hasRetriedAfterExplanation && retryItems.length > 0 ? retryItems : items;
  const currentItem = currentItems[currentIndex];
  const currentItemContent = currentItem ? getItemContent(currentItem) : null;
  const options = currentItemContent?.choices ?? [];
  const sessionQuestionText = useMemo(
    () => (currentItem ? stripStudentQuestionLabel(currentItem.question) || currentItem.question : ''),
    [currentItem]
  );

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

    const targetResults = hasRetriedAfterExplanation ? retryResults : results;

    const res = await fetch('/api/learn/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: currentItem.id,
        skillId: skill.id,
        subjectId: subject.id,
        answer: selectedAnswer,
        isLast: currentIndex === currentItems.length - 1,
        totalItems: currentItems.length,
        previousResults: targetResults,
      }),
    });

    const data = await res.json();
    const newResults = [...targetResults, { itemId: currentItem.id, correct: data.correct }];

    if (hasRetriedAfterExplanation) setRetryResults(newResults);
    else setResults(newResults);

    if (currentIndex < currentItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer('');
    } else {
      const correctCount = newResults.filter((r) => r.correct).length;
      const allWrong = correctCount === 0;
      const lowScore = correctCount <= 1;

      if (!hasSeenExplanation && explanationRoute && (allWrong || (hadRecentRepeatFailure && lowScore))) {
        setExplanationTrigger(allWrong ? 'zero_score' : 'repeat_failure');
        setPhase('explanation');
      } else {
        setPhase('results');
      }
    }
    setSubmitting(false);
  }

  function startRetryAfterExplanation() {
    setHasSeenExplanation(true);
    setHasRetriedAfterExplanation(true);
    setCurrentIndex(0);
    setSelectedAnswer('');
    setRetryResults([]);
    setSubmitting(false);
    retryCompletedLoggedRef.current = false;
    setPhase('session');
  }

  function restartPractice() {
    setCurrentIndex(0);
    setSelectedAnswer('');
    setResults([]);
    setRetryResults([]);
    setSubmitting(false);
    setHasSeenExplanation(false);
    setHasRetriedAfterExplanation(false);
    setExplanationTrigger(null);
    explanationLoggedRef.current = false;
    retryStartLoggedRef.current = false;
    retryCompletedLoggedRef.current = false;
    setPhase('session');
  }

  const recoveryState: RecoveryState = useMemo(() => {
    const correctCount = retryResults.filter((r) => r.correct).length;
    const total = retryResults.length || 1;
    const accuracy = correctCount / total;
    if (accuracy >= 0.8) return 'recovered';
    if (accuracy >= 0.5) return 'improving';
    return 'still_needs_support';
  }, [retryResults]);

  useEffect(() => {
    if (phase !== 'explanation' || !explanationRoute || !explanationTrigger || explanationLoggedRef.current) return;
    explanationLoggedRef.current = true;
    void fetch('/api/learn/explanation-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'shown',
        subjectId: subject.id,
        skillId: skill.id,
        skillCode: skill.code,
        routeType: explanationRoute.routeType,
        trigger: explanationTrigger,
        priorSessionScore: `${results.filter((r) => r.correct).length}/${results.length || items.length}`,
      }),
    });
  }, [phase, explanationRoute, explanationTrigger, subject.id, skill.id, skill.code, results, items.length]);

  useEffect(() => {
    if (!hasRetriedAfterExplanation || retryStartLoggedRef.current || !explanationRoute) return;
    retryStartLoggedRef.current = true;
    void fetch('/api/learn/explanation-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'retry_started',
        subjectId: subject.id,
        skillId: skill.id,
        skillCode: skill.code,
        routeType: explanationRoute.routeType,
        retryItemCount: (() => {
          const rlen = retryItems?.length ?? 0;
          return rlen > 0 ? rlen : items.length;
        })(),
      }),
    });
  }, [hasRetriedAfterExplanation, explanationRoute, subject.id, skill.id, skill.code, retryItems, items.length]);

  useEffect(() => {
    if (!hasRetriedAfterExplanation || phase !== 'results' || retryResults.length === 0 || !explanationRoute || retryCompletedLoggedRef.current) return;
    retryCompletedLoggedRef.current = true;
    void fetch('/api/learn/explanation-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'retry_completed',
        subjectId: subject.id,
        skillId: skill.id,
        skillCode: skill.code,
        routeType: explanationRoute.routeType,
        retryCorrectCount: retryResults.filter((r) => r.correct).length,
        retryTotalItems: retryResults.length,
        recoveryState,
      }),
    });
  }, [hasRetriedAfterExplanation, phase, retryResults, explanationRoute, subject.id, skill.id, skill.code, recoveryState]);

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
      <main className="anx-shell anx-scene flex items-center justify-center py-8 sm:py-10">
        <StudentQuestionCard
          questionKey={currentItem.id}
          header={(
            <>
              <div>
                <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>One question at a time</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--anx-text-faint)' }}>
                  {hasRetriedAfterExplanation ? 'Fresh set after explanation.' : 'If one feels hard, the next one is a fresh start.'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                  {skill.name}
                  {SHOW_DEBUG && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--anx-text-faint)' }}>[{skill.code}]</span>
                  )}
                </p>
                <span className="text-sm tabular-nums" style={{ color: 'var(--anx-text-faint)' }}>
                  {currentIndex + 1} / {currentItems.length}
                </span>
              </div>
            </>
          )}
          progress={(
            <div className="anx-progress-track">
              <div
                className="anx-progress-bar"
                style={{ width: `${((currentIndex + 1) / currentItems.length) * 100}%` }}
              />
            </div>
          )}
          visual={<ItemVisualPanel item={currentItem} primarySkillCode={skill.code} />}
          questionLabel="Question"
          question={<p className="m-0 whitespace-pre-wrap">{sessionQuestionText}</p>}
          instruction={currentItemContent ? (
            <p className="m-0">
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
          ) : null}
          answerArea={currentItemContent ? renderAnswerInput(currentItemContent.type) : null}
          actions={(
            <button
              type="button"
              onClick={submitAnswer}
              disabled={!selectedAnswer || submitting}
              className="anx-btn-primary w-full py-3.5"
            >
              {submitting ? 'Checking…' : currentIndex < currentItems.length - 1 ? 'Check and go on' : 'Finish for now'}
            </button>
          )}
        />
      </main>
    );
  }

  if (phase === 'explanation') {
    return (
      <main className="anx-shell anx-scene flex items-center justify-center">
        <div className="anx-panel w-full max-w-4xl p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--anx-primary)' }}>{subject.title}</p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>Let’s look at this together</h1>
            <p style={{ color: 'var(--anx-text-secondary)' }}>
              Let’s reset this carefully. Here is a short explanation for <strong>{skill.name}</strong>, then you’ll get a fresh try.
            </p>
          </div>

          {explanationTrigger === 'repeat_failure' && (
            <div className="anx-callout-info">
              <p className="font-medium">Why you are seeing this</p>
              <p className="mt-1">This skill has felt shaky more than once, so we are stepping in earlier instead of waiting for another full miss.</p>
            </div>
          )}

          {explanationRoute?.animationSchema ? (
            <AnimationRenderer schema={explanationRoute.animationSchema as Parameters<typeof AnimationRenderer>[0]['schema']} />
          ) : (
            <div className="space-y-4 rounded-2xl border p-6" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface)' }}>
              {sanitizeStudentCopy(explanationRoute?.misconceptionSummary) && (
                <div className="anx-callout-warning">
                  <p className="font-medium">Watch out for this</p>
                  <p className="mt-1">{sanitizeStudentCopy(explanationRoute?.misconceptionSummary)}</p>
                </div>
              )}
              {sanitizeStudentCopy(explanationRoute?.workedExample) && (
                <div className="anx-callout-info">
                  <p className="font-medium">Worked example</p>
                  <p className="mt-1 whitespace-pre-wrap">{sanitizeStudentCopy(explanationRoute?.workedExample)}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={startRetryAfterExplanation}
              className="anx-btn-primary flex-1 py-3"
            >
              Try a fresh set now
            </button>
            <button
              onClick={() => setPhase('results')}
              className="anx-btn-secondary px-4 py-3"
            >
              Skip to summary
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'results') {
    const displayResults = hasRetriedAfterExplanation ? retryResults : results;
    const correctCount = displayResults.filter((r) => r.correct).length;
    const masteryPct = Math.round((correctCount / Math.max(1, displayResults.length)) * 100);

    let outcomeTone: 'success' | 'warning' | 'info';
    if (masteryPct >= 80) outcomeTone = 'success';
    else if (masteryPct >= 50) outcomeTone = 'warning';
    else outcomeTone = 'info';

    const headlineText = hasRetriedAfterExplanation
      ? {
          recovered: 'Nice recovery!',
          improving: 'That is better.',
          still_needs_support: 'We are not there yet.',
        }[recoveryState]
      : {
          success: 'Congratulations!',
          warning: 'Good effort!',
          info: 'Keep going!',
        }[outcomeTone];

    const subtitleText = hasRetriedAfterExplanation
      ? {
          recovered: `You bounced back well on ${skill.name}. The explanation seems to have helped.`,
          improving: `You improved on ${skill.name}. That is progress, even if it is not secure yet.`,
          still_needs_support: `You have had another go at ${skill.name}. We should keep support around this skill.`,
        }[recoveryState]
      : {
          success: `Great job! You have done really well on ${skill.name}.`,
          warning: `Nice try on ${skill.name}. A little more practice and you will have it.`,
          info: `You are building up ${skill.name}. The next set will help.`,
        }[outcomeTone];

    const scoreColor = {
      success: 'var(--anx-success)',
      warning: 'var(--anx-warning)',
      info: 'var(--anx-primary)',
    }[outcomeTone];

    const ringEmoji = hasRetriedAfterExplanation
      ? {
          recovered: '🌟',
          improving: '💪',
          still_needs_support: '📘',
        }[recoveryState]
      : {
          success: '🏆',
          warning: '💪',
          info: '📚',
        }[outcomeTone];

    const xpEarned = gamification?.xp ?? 0;

    return (
      <main className="anx-shell anx-scene flex items-center justify-center">
        <div className="anx-panel w-full max-w-md p-8 space-y-6 text-center anx-slide-up">
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

          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--anx-text-muted)' }}>Your Score</p>
            <p className="text-4xl font-bold" style={{ color: scoreColor }}>
              {correctCount}/{displayResults.length}
            </p>
          </div>

          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>{headlineText}</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>{subtitleText}</p>
          </div>

          {xpEarned > 0 && (
            <div className="flex justify-center">
              <span className="anx-xp-badge">🥇 {xpEarned} XP</span>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {displayResults.map((r, i) => (
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

          <div className="space-y-3 pt-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="anx-btn-primary w-full py-3"
            >
              Back to dashboard
            </button>
            <button
              onClick={restartPractice}
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
