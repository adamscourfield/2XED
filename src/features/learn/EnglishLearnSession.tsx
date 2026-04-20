'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExplanationBlockRenderer } from '@/components/english/ExplanationBlockRenderer';
import { QuestionBlock } from '@/components/english/QuestionBlock';
import type { ExplanationBlock, ExplanationBlockType, QuestionBlock as QuestionBlockType, MarkResult } from '@/features/content/types';

// ── Props ──────────────────────────────────────────────────────────────────────

interface EnglishSkill {
  id: string;
  code: string;
  name: string;
  intro: string | null;
  description: string | null;
}

interface EnglishSubject {
  id: string;
  title: string;
  slug: string;
}

interface EnglishBlock {
  id: string;
  blockType: string;
  sortOrder: number;
  content: unknown;
  sourceRef: string | null;
}

export interface EnglishLearnSessionProps {
  subject: EnglishSubject;
  skill: EnglishSkill;
  blocks: EnglishBlock[];
  userId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toExplanationBlock(block: EnglishBlock, skillCode: string): ExplanationBlock {
  return {
    id: block.id,
    type: block.blockType as ExplanationBlockType,
    content:
      typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content),
    skillCode,
    sortOrder: block.sortOrder,
  };
}

function parseQuestionBlock(block: EnglishBlock): QuestionBlockType | null {
  try {
    const raw =
      typeof block.content === 'string'
        ? JSON.parse(block.content)
        : block.content;
    return raw as QuestionBlockType;
  } catch {
    return null;
  }
}

type Phase = 'intro' | 'explanation' | 'questions' | 'results';

// ── EnglishLearnSession ────────────────────────────────────────────────────────

export function EnglishLearnSession({ subject, skill, blocks, userId }: EnglishLearnSessionProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Array<{ index: number; result: MarkResult }[]>>([]);

  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const explanationBlocks = sorted.filter((b) => b.blockType !== 'CHECKPOINT');
  const checkpointBlocks = sorted.filter((b) => b.blockType === 'CHECKPOINT');

  const allCheckpointsDone =
    checkpointBlocks.length === 0 || completedBlocks.size >= checkpointBlocks.length;

  function handleCheckpointComplete(blockId: string, results: Array<{ index: number; result: MarkResult }>) {
    setCompletedBlocks((prev) => new Set([...prev, blockId]));
    setScores((prev) => [...prev, results]);
  }

  const totalCorrect = scores.flat().filter((r) => r.result.correct).length;
  const totalQuestions = scores.flat().length;

  // ── Intro ────────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <main className="anx-shell anx-scene flex items-center justify-center">
        <div className="anx-panel w-full max-w-lg p-8 space-y-6">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--anx-primary)' }}>
              {subject.title}
            </p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>
              {skill.name}
            </h1>
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--anx-text-muted)' }}>
              {skill.code}
            </p>
          </div>

          {(skill.intro || skill.description) && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
              {skill.intro ?? skill.description}
            </p>
          )}

          <div className="anx-callout-info">
            <p className="font-medium">What happens next</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              <li>Read through the explanation ({explanationBlocks.length} section{explanationBlocks.length === 1 ? '' : 's'}).</li>
              {checkpointBlocks.length > 0 && (
                <li>Answer {checkpointBlocks.length} checkpoint question{checkpointBlocks.length === 1 ? '' : 's'}.</li>
              )}
              <li>See your results and head back to your dashboard.</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('explanation')}
              className="anx-btn-primary flex-1 py-3"
            >
              Start reading
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

  // ── Explanation ───────────────────────────────────────────────────────────────

  if (phase === 'explanation') {
    return (
      <main className="anx-shell">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--anx-primary)' }}>
                {subject.title}
              </p>
              <h1 className="text-xl font-bold" style={{ color: 'var(--anx-text)' }}>
                {skill.name}
              </h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              Explanation
            </p>
          </div>

          <ExplanationBlockRenderer
            blocks={explanationBlocks.map((b) => toExplanationBlock(b, skill.code))}
            interactive
          />

          <div className="pt-4 flex gap-3">
            <button
              onClick={() =>
                checkpointBlocks.length > 0 ? setPhase('questions') : setPhase('results')
              }
              className="anx-btn-primary flex-1 py-3"
            >
              {checkpointBlocks.length > 0 ? "I've read this — answer questions" : "Done — see results"}
            </button>
            <button
              onClick={() => setPhase('intro')}
              className="anx-btn-secondary px-4 py-3"
            >
              Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Questions ─────────────────────────────────────────────────────────────────

  if (phase === 'questions') {
    return (
      <main className="anx-shell">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--anx-primary)' }}>
                {subject.title}
              </p>
              <h1 className="text-xl font-bold" style={{ color: 'var(--anx-text)' }}>
                {skill.name}
              </h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              {completedBlocks.size} / {checkpointBlocks.length} done
            </p>
          </div>

          <div className="anx-progress-track">
            <div
              className="anx-progress-bar"
              style={{
                width: `${checkpointBlocks.length ? (completedBlocks.size / checkpointBlocks.length) * 100 : 0}%`,
              }}
            />
          </div>

          <div className="space-y-6">
            {checkpointBlocks.map((block) => {
              const qb = parseQuestionBlock(block);
              if (!qb) {
                return (
                  <div key={block.id} className="anx-callout-warning text-sm">
                    Could not parse checkpoint block ({block.id}).
                  </div>
                );
              }
              return (
                <QuestionBlock
                  key={block.id}
                  block={qb}
                  mode="DRAFT"
                  onComplete={(results) => handleCheckpointComplete(block.id, results)}
                />
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setPhase('results')}
              disabled={!allCheckpointsDone}
              className="anx-btn-primary w-full py-3 disabled:opacity-50"
            >
              {allCheckpointsDone ? 'See results' : `Complete all questions to continue`}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────────

  const pct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  return (
    <main className="anx-shell anx-scene flex items-center justify-center">
      <div className="anx-panel w-full max-w-md p-8 space-y-6 text-center">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--anx-primary)' }}>
            {subject.title}
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>
            {skill.name}
          </h1>
        </div>

        <div className="rounded-full w-24 h-24 flex items-center justify-center mx-auto text-4xl"
          style={{ background: 'var(--anx-primary-soft)' }}>
          {pct === null ? '✓' : pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚'}
        </div>

        {pct !== null && (
          <div>
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>Checkpoint score</p>
            <p className="text-4xl font-bold" style={{ color: 'var(--anx-primary)' }}>
              {totalCorrect}/{totalQuestions}
            </p>
          </div>
        )}

        <p className="text-sm leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
          {pct === null
            ? `You have completed the ${skill.name} explanation.`
            : pct >= 80
              ? `Great work on ${skill.name}!`
              : pct >= 50
                ? `Good effort on ${skill.name}. A little more practice and you will have it.`
                : `Keep building on ${skill.name} — the next session will help.`}
        </p>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="anx-btn-primary w-full py-3"
          >
            Back to Home
          </button>
          <button
            onClick={() => setPhase('intro')}
            className="anx-btn-secondary w-full py-3"
          >
            Read again
          </button>
        </div>
      </div>
    </main>
  );
}
