'use client';

import type { ReactNode } from 'react';
import type { StudentLiveChromeMode } from '@/components/student/live/StudentLiveSessionChrome';
import { StudentLivePhaseStrip, type LiveStripStepId } from '@/components/student/live/StudentLivePhaseStrip';
import { StudentLiveSessionChrome } from '@/components/student/live/StudentLiveSessionChrome';

type Props = {
  lessonTitle: string;
  classLabel?: string;
  stripActive: LiveStripStepId;
  mode: StudentLiveChromeMode;
  phaseHint?: string;
  onLeave?: () => void;
  children: ReactNode;
};

/** Single persistent header + strip for student /student/live so phase swaps don’t remount chrome. */
export function StudentLiveUnifiedShell({
  lessonTitle,
  classLabel,
  stripActive,
  mode,
  phaseHint,
  onLeave,
  children,
}: Props) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[color:var(--anx-surface-bright)]">
      <StudentLiveSessionChrome
        lessonTitle={lessonTitle}
        classLabel={classLabel}
        onLeave={onLeave}
        mode={mode}
        phaseHint={phaseHint}
      >
        <StudentLivePhaseStrip active={stripActive} />
      </StudentLiveSessionChrome>
      {children}
    </div>
  );
}
