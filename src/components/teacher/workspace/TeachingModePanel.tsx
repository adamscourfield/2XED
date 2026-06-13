'use client';

import { useState } from 'react';
import {
  CheckIcon,
  ExplainIcon,
  ModelIcon,
  PracticeIcon,
  SparkleIcon,
} from './icons';
import { LANES, LANE_IDS } from '@/lib/live/lanes';

export type TeachingMode = 'CHECK' | 'MODEL' | 'EXPLAIN' | 'PRACTICE';

interface ActiveExplanationInfo {
  routeType: 'A' | 'B' | 'C';
  stepIndex: number;
  totalSteps: number;
}

interface Props {
  mode: TeachingMode;
  onModeChange: (mode: TeachingMode) => void;
  /** Trigger pushing a new check question to students. */
  onNewCheckQuestion?: () => void;
  /** Trigger inserting bridging examples / repairs into the canvas. */
  onExplainOption?: (option: 'easier' | 'wrong-vs-right' | 'misconception' | 'comparison') => void;
  /** While true, explanation option buttons are disabled. */
  explainRoutesLoading?: boolean;
  /** Shown above explanation options (empty curriculum, load failure, or broadcast error). */
  explainRoutesHint?: string | null;
  /** Active explanation route info — shown as step controls in EXPLAIN mode. */
  activeExplanation?: ActiveExplanationInfo | null;
  /** Called when teacher advances/retreats the explanation step. */
  onStepChange?: (step: number) => void;
  /** Trigger pushing practice work to students. */
  onAssignPractice?: (
    kind: 'easier' | 'similar' | 'challenge' | 'misconception',
    audience: 'all' | 'lane' | 'individual',
    practiceTargetLane?: 'LANE_1' | 'LANE_2' | 'LANE_3',
  ) => void;
}

// M1: labels synced with builder's block type names (Teacher Slides / Worked Example)
const MODES: Array<{ key: TeachingMode; label: string; Icon: () => JSX.Element }> = [
  { key: 'CHECK', label: 'Check', Icon: CheckIcon },
  { key: 'MODEL', label: 'Worked Example', Icon: ModelIcon },
  { key: 'EXPLAIN', label: 'Teacher Slides', Icon: ExplainIcon },
  { key: 'PRACTICE', label: 'Practice', Icon: PracticeIcon },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--anx-text-muted)' }}>
      {children}
    </p>
  );
}

function CheckMode({ onNewCheckQuestion }: { onNewCheckQuestion?: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>Check understanding</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          Students respond on their devices.
        </p>
      </div>
      <button
        type="button"
        onClick={onNewCheckQuestion}
        className="anx-btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
      >
        <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
        New check question
      </button>
    </div>
  );
}

function ModelMode() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>Worked Example</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          Students follow your canvas. Annotate freely — they&apos;ll see your strokes and notes.
        </p>
      </div>
      <div className="anx-callout-info text-sm">
        Their devices are set to <strong>watch</strong>. No interruptions.
      </div>
    </div>
  );
}

function ExplainMode({
  onExplainOption,
  activeExplanation,
  onStepChange,
  explainRoutesLoading,
  explainRoutesHint,
}: {
  onExplainOption?: Props['onExplainOption'];
  activeExplanation?: ActiveExplanationInfo | null;
  onStepChange?: (step: number) => void;
  explainRoutesLoading?: boolean;
  explainRoutesHint?: string | null;
}) {
  const options: Array<{ key: Parameters<NonNullable<Props['onExplainOption']>>[0]; label: string; helper: string }> = [
    { key: 'easier', label: 'Easier model', helper: 'Bridge with a simpler worked example.' },
    { key: 'wrong-vs-right', label: 'Wrong vs right', helper: 'Compare a common mistake with correct working.' },
    { key: 'misconception', label: 'Misconception repair', helper: 'Insert a targeted correction.' },
    { key: 'comparison', label: 'Comparison example', helper: 'Show two related cases side by side.' },
  ];

  const routeLabel: Record<string, string> = { A: 'Standard', B: 'Easier', C: 'Misconception repair' };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>Teacher Slides</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          {activeExplanation
            ? 'Students are viewing this slide. Advance the steps below.'
            : 'Pick a bridging move. Slides display on student devices.'}
        </p>
      </div>

      {explainRoutesLoading && (
        <p className="text-xs font-medium" style={{ color: 'var(--anx-text-muted)' }}>
          Loading explanation models for this skill…
        </p>
      )}

      {explainRoutesHint && !explainRoutesLoading && (
        <div className="anx-callout-warning text-xs leading-snug">{explainRoutesHint}</div>
      )}

      {activeExplanation && (
        <div
          className="rounded-2xl border px-3.5 py-3 flex flex-col gap-2"
          style={{ borderColor: 'var(--anx-primary)', background: 'var(--anx-primary-soft)' }}
        >
          <p className="text-xs font-semibold" style={{ color: 'var(--anx-primary)' }}>
            Route {activeExplanation.routeType} — {routeLabel[activeExplanation.routeType]}
          </p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onStepChange?.(activeExplanation.stepIndex - 1)}
              disabled={activeExplanation.stepIndex === 0}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--anx-surface-container-low)] disabled:opacity-30"
              style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text)' }}
            >
              ← Prev
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
              Step {activeExplanation.stepIndex + 1} / {activeExplanation.totalSteps}
            </span>
            <button
              type="button"
              onClick={() => onStepChange?.(activeExplanation.stepIndex + 1)}
              disabled={activeExplanation.stepIndex === activeExplanation.totalSteps - 1}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--anx-surface-container-low)] disabled:opacity-30"
              style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text)' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={explainRoutesLoading}
            onClick={() => onExplainOption?.(opt.key)}
            className="text-left rounded-2xl border bg-[var(--anx-surface-container-lowest)] px-3.5 py-2.5 transition hover:bg-[var(--anx-surface-container-low)] disabled:pointer-events-none disabled:opacity-40"
            style={{ borderColor: 'var(--anx-outline-variant)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>{opt.label}</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--anx-text-muted)' }}>{opt.helper}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// H1: lane picker so the teacher can target any lane, not just LANE_2
const LANE_OPTIONS: Array<{ value: 'LANE_1' | 'LANE_2' | 'LANE_3'; label: string }> = LANE_IDS.map(
  (id) => ({ value: id, label: LANES[id].teacherLabel }),
);

function PracticeMode({ onAssignPractice }: { onAssignPractice?: Props['onAssignPractice'] }) {
  const [targetLane, setTargetLane] = useState<'LANE_1' | 'LANE_2' | 'LANE_3'>('LANE_2');

  const variants: Array<{ key: Parameters<NonNullable<Props['onAssignPractice']>>[0]; label: string }> = [
    { key: 'easier', label: 'Easier question' },
    { key: 'similar', label: 'Similar question' },
    { key: 'challenge', label: 'Challenge question' },
    { key: 'misconception', label: 'Misconception repair' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>Practice</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          Send work for independent practice. Choose what and who.
        </p>
      </div>

      {/* H1: Lane picker — selects which single lane receives "A lane" practice dispatches */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--anx-text-muted)' }}>
          Target lane
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {LANE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTargetLane(opt.value)}
              aria-pressed={targetLane === opt.value}
              className="rounded-full border px-2.5 py-1 text-xs font-medium transition"
              style={{
                borderColor: targetLane === opt.value ? 'var(--anx-primary)' : 'var(--anx-outline-variant)',
                color: targetLane === opt.value ? 'var(--anx-primary)' : 'var(--anx-text-secondary)',
                background: targetLane === opt.value ? 'var(--anx-primary-soft)' : 'transparent',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {variants.map((v) => (
          <div
            key={v.key}
            className="rounded-2xl border bg-[var(--anx-surface-container-lowest)] px-3.5 py-2.5"
            style={{ borderColor: 'var(--anx-outline-variant)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>{v.label}</p>
              <span className="anx-badge anx-badge-neutral text-[10px]">Live</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onAssignPractice?.(v.key, 'all')}
                className="rounded-full border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--anx-primary-soft)]"
                style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
              >
                All students
              </button>
              <button
                type="button"
                onClick={() => onAssignPractice?.(v.key, 'lane', targetLane)}
                className="rounded-full border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--anx-primary-soft)]"
                style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
              >
                {LANE_OPTIONS.find((l) => l.value === targetLane)?.label} lane
              </button>
              <button
                type="button"
                onClick={() => onAssignPractice?.(v.key, 'individual')}
                className="rounded-full border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--anx-primary-soft)]"
                style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
              >
                Individual
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeachingModePanel({
  mode,
  onModeChange,
  onNewCheckQuestion,
  onExplainOption,
  activeExplanation,
  onStepChange,
  onAssignPractice,
  explainRoutesLoading,
  explainRoutesHint,
}: Props) {
  return (
    <section className="anx-signals-card">
      <div className="flex items-center justify-between">
        <SectionLabel>Teaching mode</SectionLabel>
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
          <SparkleIcon size={14} />
          Adaptive
        </span>
      </div>

      <div className="anx-mode-grid mt-3">
        {MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className="anx-mode-tile"
            aria-pressed={mode === key}
            onClick={() => onModeChange(key)}
          >
            <span className="anx-mode-tile-icon">
              <Icon />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {mode === 'CHECK' && <CheckMode onNewCheckQuestion={onNewCheckQuestion} />}
        {mode === 'MODEL' && <ModelMode />}
        {mode === 'EXPLAIN' && (
          <ExplainMode
            onExplainOption={onExplainOption}
            activeExplanation={activeExplanation}
            onStepChange={onStepChange}
            explainRoutesLoading={explainRoutesLoading}
            explainRoutesHint={explainRoutesHint}
          />
        )}
        {mode === 'PRACTICE' && <PracticeMode onAssignPractice={onAssignPractice} />}
      </div>
    </section>
  );
}
