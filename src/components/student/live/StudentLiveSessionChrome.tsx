'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

export type StudentLiveChromeMode = 'live' | 'practice' | 'explanation' | 'ended';

type Props = {
  lessonTitle: string;
  classLabel?: string;
  onLeave?: () => void;
  mode: StudentLiveChromeMode;
  phaseHint?: string;
  childrenBelowTitle?: ReactNode;
  children?: ReactNode;
};

export function StudentLiveSessionChrome({
  lessonTitle,
  classLabel,
  onLeave,
  mode,
  phaseHint,
  childrenBelowTitle,
  children,
}: Props) {
  const belowChrome = children ?? childrenBelowTitle;
  return (
    <header
      className="student-live-chrome flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6"
      style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)' }}
    >
      <Image src="/Ember_logo_icon.png" alt="Ember" width={512} height={512} className="h-7 w-7 shrink-0" priority />
      <div className="student-live-chrome-pill-slot relative min-h-[28px] min-w-[4.5rem] shrink-0">
        <div
          key={mode === 'practice' ? 'practice' : mode === 'ended' ? 'ended' : 'live'}
          className="student-live-chrome-pill-wrap student-live-chrome-pill-morph flex items-center"
        >
          {mode === 'practice' ? (
            <span className="anx-practice-pill">Practice</span>
          ) : mode === 'ended' ? (
            <span className="anx-live-pill" style={{ background: 'var(--anx-success-soft)', color: 'var(--anx-success)' }}>
              Ended
            </span>
          ) : (
            <span className="anx-live-pill">
              <span className="anx-live-pill-dot" />
              Live
            </span>
          )}
          {mode === 'explanation' ? (
            <span
              className="ml-2 hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline"
              style={{ background: 'var(--anx-primary-soft)', color: 'var(--anx-primary)' }}
            >
              Explanation
            </span>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-none" style={{ color: 'var(--anx-text)' }}>
          {lessonTitle}
        </p>
        {classLabel && (
          <p className="mt-1 text-xs leading-none" style={{ color: 'var(--anx-text-muted)' }}>
            {classLabel}
          </p>
        )}
        {phaseHint ? (
          <p className="student-live-phase-hint mt-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
            {phaseHint}
          </p>
        ) : null}
        {belowChrome ? <div className="mt-2 min-w-0">{belowChrome}</div> : null}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {onLeave && (
          <button
            type="button"
            onClick={() => {
              if (mode === 'explanation' && !window.confirm('Leave mid-explanation? Your progress will be lost.')) return;
              onLeave();
            }}
            className="anx-btn-secondary px-3 py-1.5 text-xs transition-transform active:scale-[0.98]"
          >
            Leave
          </button>
        )}
      </div>
    </header>
  );
}
