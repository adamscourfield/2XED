'use client';

import { useState } from 'react';
import { ChevronRightIcon, PeopleIcon, SparkleIcon } from './icons';

export interface ClassOverview {
  total: number;
  responded: number;
  correct: number;
  partiallyCorrect: number;
  incorrect: number;
}

export interface InterpretedSignal {
  tone: 'ok' | 'warn' | 'issue';
  text: string;
}

export interface MisconceptionSignal {
  misconceptionId: string;
  label: string;
  description: string;
  studentCount: number;
  studentNames: string[];
}

export interface StudentMessageSignal {
  studentUserId: string;
  studentName: string;
  kind: 'message' | 'help';
  message: string | null;
  lane: 'LANE_1' | 'LANE_2' | 'LANE_3' | null;
  createdAt: string;
}

export interface StudentResponseDetail {
  studentUserId: string;
  name: string;
  lane: 'LANE_1' | 'LANE_2' | 'LANE_3';
  attemptCount: number;
  correctCount: number;
  lastCorrect: boolean | null;
  hasOpenFlag: boolean;
}

interface Props {
  overview: ClassOverview;
  signals: InterpretedSignal[];
  misconceptionSignals?: MisconceptionSignal[] | null;
  /** @deprecated pass misconceptionSignals instead */
  topMisconception?: { text: string; studentCount: number } | null;
  suggestedMove?: { text: string; cta?: string; onAct?: () => void } | null;
  studentMessages?: StudentMessageSignal[] | null;
  studentResponses?: StudentResponseDetail[] | null;
  onViewDetailedResponses?: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--anx-text-muted)' }}>
      {children}
    </p>
  );
}

function toneIcon(tone: InterpretedSignal['tone']) {
  if (tone === 'ok') {
    return (
      <span className="anx-signal-dot anx-signal-dot-ok" aria-hidden>
        ✓
      </span>
    );
  }
  if (tone === 'warn') {
    return (
      <span className="anx-signal-dot anx-signal-dot-warn" aria-hidden>
        !
      </span>
    );
  }
  return (
    <span className="anx-signal-dot anx-signal-dot-issue" aria-hidden>
      !
    </span>
  );
}

export function StudentSignalsPanel({
  overview,
  signals,
  misconceptionSignals,
  topMisconception,
  suggestedMove,
  studentMessages,
  studentResponses,
  onViewDetailedResponses,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const noResponses = overview.total - overview.responded;
  const total = Math.max(1, overview.responded);
  const correctPct = (overview.correct / total) * 100;
  const partialPct = (overview.partiallyCorrect / total) * 100;
  const incorrectPct = (overview.incorrect / total) * 100;

  return (
    <section className="anx-signals-card">
      <div className="flex items-center justify-between">
        <SectionLabel>Student signals</SectionLabel>
        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--anx-success)' }}>
          <span className="anx-live-dot" />
          Live
        </span>
      </div>

      {signals.length > 0 ? (
        <div className="mt-3 rounded-2xl bg-[var(--anx-surface-container-low)] px-3 py-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>What we’re seeing</p>
          <div className="mt-2">
            {signals.map((s, i) => (
              <div key={i} className="anx-signal-row">
                {toneIcon(s.tone)}
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-[var(--anx-surface-container-low)] px-3 py-3">
          <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
            Waiting for student responses…
          </p>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>Class overview</p>
          <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
            {overview.responded} / {overview.total} responded
          </p>
        </div>
        <div className="anx-class-overview-bar mt-2">
          {overview.responded > 0 && (
            <>
              <span style={{ width: `${correctPct}%`, background: 'var(--anx-success)' }} />
              <span style={{ width: `${partialPct}%`, background: 'var(--anx-warning-text)' }} />
              <span style={{ width: `${incorrectPct}%`, background: 'var(--anx-danger-text)' }} />
            </>
          )}
        </div>
        <div className="anx-class-overview-grid">
          <div className="anx-class-overview-cell">
            <div className="anx-class-overview-cell-num" style={{ color: 'var(--anx-success)' }}>
              {overview.correct}
            </div>
            <div className="anx-class-overview-cell-label">Correct</div>
          </div>
          <div className="anx-class-overview-cell">
            <div className="anx-class-overview-cell-num" style={{ color: 'var(--anx-danger-text)' }}>
              {overview.incorrect}
            </div>
            <div className="anx-class-overview-cell-label">Incorrect</div>
          </div>
          <div className="anx-class-overview-cell">
            <div className="anx-class-overview-cell-num" style={{ color: 'var(--anx-warning-text)' }}>
              {overview.partiallyCorrect}
            </div>
            <div className="anx-class-overview-cell-label">Partial</div>
          </div>
          <div className="anx-class-overview-cell">
            <div className="anx-class-overview-cell-num" style={{ color: 'var(--anx-text-muted)' }}>
              {Math.max(0, noResponses)}
            </div>
            <div className="anx-class-overview-cell-label">No reply</div>
          </div>
        </div>
      </div>

      {/* Real-time misconception breakdown — populated from LiveAttempt.misconceptionId */}
      {misconceptionSignals && misconceptionSignals.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
            Misconceptions in play
          </p>
          {misconceptionSignals.map((mc) => (
            <div
              key={mc.misconceptionId}
              className="rounded-2xl px-3 py-3"
              style={{ background: mc.studentCount >= 3 ? 'var(--anx-warning-soft)' : 'var(--anx-surface-container-low)' }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="anx-signal-dot"
                  style={{
                    background: mc.studentCount >= 3 ? 'var(--anx-warning-text)' : 'var(--anx-outline-variant)',
                    color: mc.studentCount >= 3 ? '#fff' : 'var(--anx-text-muted)',
                  }}
                  aria-hidden
                >
                  {mc.studentCount}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-semibold leading-snug"
                    style={{ color: mc.studentCount >= 3 ? 'var(--anx-warning-text)' : 'var(--anx-text-secondary)' }}
                  >
                    {mc.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--anx-text-muted)' }}>
                    {mc.studentNames.join(', ')}{mc.studentNames.length < mc.studentCount ? ` +${mc.studentCount - mc.studentNames.length} more` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : topMisconception ? (
        // Fallback to legacy prop if no signal data yet
        <div className="mt-4 rounded-2xl bg-[var(--anx-warning-soft)] px-3 py-3">
          <div className="flex items-start gap-2">
            <span className="anx-signal-dot anx-signal-dot-warn" aria-hidden>!</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-warning-text)' }}>
                Top misconception · {topMisconception.studentCount} students
              </p>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--anx-text)' }}>
                {topMisconception.text}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {suggestedMove && (
        <div className="mt-4 rounded-2xl bg-[var(--anx-primary-soft)] px-3 py-3">
          <div className="flex items-start gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--anx-primary)', color: '#fff' }}
              aria-hidden
            >
              <SparkleIcon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-primary)' }}>
                Suggested next move
              </p>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--anx-text)' }}>
                {suggestedMove.text}
              </p>
              {suggestedMove.cta && (
                <button
                  type="button"
                  onClick={suggestedMove.onAct}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{ borderColor: 'var(--anx-primary)', color: 'var(--anx-primary)' }}
                >
                  <SparkleIcon size={14} />
                  {suggestedMove.cta}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {studentMessages && studentMessages.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
            Student messages
          </p>
          {studentMessages.map((entry) => (
            <div
              key={`${entry.kind}-${entry.studentUserId}-${entry.createdAt}`}
              className="rounded-2xl border px-3 py-3"
              style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-low)' }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--anx-text)' }}>
                {entry.studentName}
                {entry.lane ? <span style={{ color: 'var(--anx-text-muted)' }}> · {entry.lane.replace('_', ' ')}</span> : ''}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--anx-text-secondary)' }}>
                {entry.kind === 'help' ? '🙋 Needs help' : '💬 Message'}
              </p>
              {entry.message && (
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--anx-text)' }}>
                  {entry.message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setShowDetail((v) => !v);
          onViewDetailedResponses?.();
        }}
        className="mt-4 flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm transition hover:bg-[var(--anx-surface-container-low)]"
        style={{ color: 'var(--anx-text-secondary)' }}
      >
        <span className="inline-flex items-center gap-2">
          <PeopleIcon size={16} />
          {showDetail ? 'Hide' : 'View'} detailed responses
        </span>
        <ChevronRightIcon size={16} className={`transition-transform ${showDetail ? 'rotate-90' : ''}`} />
      </button>

      {showDetail && (
        <div className="mt-2 space-y-1">
          {!studentResponses || studentResponses.length === 0 ? (
            <p className="px-2 py-2 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              No responses yet.
            </p>
          ) : (
            studentResponses.map((s) => {
              const laneColor =
                s.lane === 'LANE_3' ? 'var(--anx-danger-text)' :
                s.lane === 'LANE_2' ? 'var(--anx-warning-text)' :
                'var(--anx-success)';
              const laneLabel = s.lane === 'LANE_3' ? 'Reteach' : s.lane === 'LANE_2' ? 'Support' : 'On track';
              return (
                <div
                  key={s.studentUserId}
                  className="flex items-center gap-2 rounded-xl px-2 py-2"
                  style={{ background: 'var(--anx-surface-container-low)' }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: laneColor }}
                    title={laneLabel}
                    aria-label={laneLabel}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: 'var(--anx-text)' }}>
                    {s.name}
                  </span>
                  {s.attemptCount > 0 ? (
                    <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--anx-text-muted)' }}>
                      {s.correctCount}/{s.attemptCount}
                      {s.lastCorrect === true && <span style={{ color: 'var(--anx-success)' }}> ✓</span>}
                      {s.lastCorrect === false && <span style={{ color: 'var(--anx-danger-text)' }}> ✗</span>}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs" style={{ color: 'var(--anx-text-muted)' }}>—</span>
                  )}
                  {s.hasOpenFlag && (
                    <span className="shrink-0 text-[10px]" style={{ color: 'var(--anx-danger-text)' }} title="Intervention flag">⚑</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
