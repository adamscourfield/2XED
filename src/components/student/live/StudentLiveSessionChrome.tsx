'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

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
  // C5: replace window.confirm (blocked by MDM on iOS) with an inline dialog.
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  function handleLeaveClick() {
    if (mode === 'explanation' || mode === 'practice') {
      setConfirmLeaveOpen(true);
    } else {
      onLeave?.();
    }
  }

  return (
    <>
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
              onClick={handleLeaveClick}
              className="anx-btn-secondary px-3 py-1.5 text-xs transition-transform active:scale-[0.98]"
            >
              Leave
            </button>
          )}
        </div>
      </header>

      {/* C5: Inline leave-confirmation dialog — no window.confirm needed. */}
      {confirmLeaveOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="anx-card w-full max-w-sm space-y-4 p-6 shadow-xl">
            <h2 id="leave-confirm-title" className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>
              Leave{mode === 'explanation' ? ' the explanation' : ' practice'}?
            </h2>
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              {mode === 'explanation'
                ? 'You are in the middle of the explanation. Leaving now means you may miss part of it.'
                : 'Your in-progress answer will not be saved if you leave now.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmLeaveOpen(false)}
                className="anx-btn-secondary px-4 py-2 text-sm"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLeaveOpen(false);
                  onLeave?.();
                }}
                className="anx-btn-primary px-4 py-2 text-sm"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
