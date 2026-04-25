'use client';

import {
  CheckIcon,
  ExplainIcon,
  ModelIcon,
  PracticeIcon,
  SparkleIcon,
} from './icons';

export type TeachingMode = 'CHECK' | 'MODEL' | 'EXPLAIN' | 'PRACTICE';

interface Props {
  mode: TeachingMode;
  onModeChange: (mode: TeachingMode) => void;
  /** Trigger pushing a new check question to students. */
  onNewCheckQuestion?: () => void;
  /** Trigger inserting bridging examples / repairs into the canvas. */
  onExplainOption?: (option: 'easier' | 'wrong-vs-right' | 'misconception' | 'comparison') => void;
  /** Trigger pushing practice work to students. */
  onAssignPractice?: (
    kind: 'easier' | 'similar' | 'challenge' | 'misconception',
    audience: 'all' | 'lane' | 'individual',
  ) => void;
}

const MODES: Array<{ key: TeachingMode; label: string; Icon: () => JSX.Element }> = [
  { key: 'CHECK', label: 'Check', Icon: CheckIcon },
  { key: 'MODEL', label: 'Model', Icon: ModelIcon },
  { key: 'EXPLAIN', label: 'Explain', Icon: ExplainIcon },
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
        <h3 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>Model</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          Students follow your canvas. Annotate freely — they’ll see your strokes and notes.
        </p>
      </div>
      <div className="anx-callout-info text-sm">
        Their devices are set to <strong>watch</strong>. No interruptions.
      </div>
    </div>
  );
}

function ExplainMode({ onExplainOption }: { onExplainOption?: Props['onExplainOption'] }) {
  const options: Array<{ key: Parameters<NonNullable<Props['onExplainOption']>>[0]; label: string; helper: string }> = [
    { key: 'easier', label: 'Easier model', helper: 'Bridge with a simpler worked example.' },
    { key: 'wrong-vs-right', label: 'Wrong vs right', helper: 'Compare a common mistake with correct working.' },
    { key: 'misconception', label: 'Misconception repair', helper: 'Insert a targeted correction.' },
    { key: 'comparison', label: 'Comparison example', helper: 'Show two related cases side by side.' },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>Explain again</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          Pick a bridging move. It drops onto the canvas — you can keep annotating.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onExplainOption?.(opt.key)}
            className="text-left rounded-2xl border bg-[var(--anx-surface-container-lowest)] px-3.5 py-2.5 transition hover:bg-[var(--anx-surface-container-low)]"
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

function PracticeMode({ onAssignPractice }: { onAssignPractice?: Props['onAssignPractice'] }) {
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
              {(['all', 'lane', 'individual'] as const).map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => onAssignPractice?.(v.key, aud)}
                  className="rounded-full border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--anx-primary-soft)]"
                  style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
                >
                  {aud === 'all' ? 'All students' : aud === 'lane' ? 'A lane' : 'Individual'}
                </button>
              ))}
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
  onAssignPractice,
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
        {mode === 'EXPLAIN' && <ExplainMode onExplainOption={onExplainOption} />}
        {mode === 'PRACTICE' && <PracticeMode onAssignPractice={onAssignPractice} />}
      </div>
    </section>
  );
}
