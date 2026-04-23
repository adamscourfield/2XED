'use client';

import { use } from 'react';
import Link from 'next/link';
import { AppChrome } from '@/components/AppChrome';
import { LearningPageShell } from '@/components/LearningPageShell';
import { useLiveLanes } from '@/hooks/useLiveLanes';
import { LessonHeadline } from '@/components/live/LessonHeadline';
import { LaneColumns } from '@/components/live/LaneColumns';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default function TeacherLanesPage({ params }: Props) {
  const { sessionId } = use(params);
  const { data, error, loading, handback } = useLiveLanes(sessionId);

  if (loading) {
    return (
      <AppChrome variant="teacher">
        <main className="anx-shell flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="anx-flow-loading-card max-w-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--anx-surface-container-high)] border-t-[var(--anx-primary)]" />
            <p className="m-0 text-sm font-medium" style={{ color: 'var(--anx-text)' }}>Loading lane view…</p>
            <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
              Fetching where each student is in the lesson.
            </p>
          </div>
        </main>
      </AppChrome>
    );
  }

  if (error || !data) {
    return (
      <AppChrome variant="teacher">
        <main className="anx-shell flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="anx-callout-danger max-w-md text-center text-sm">
            {error ?? 'Unable to load lane data.'}
          </div>
          <Link href={`/teacher/live/${sessionId}`} className="anx-btn-secondary mt-6 px-5 py-2.5 text-sm no-underline">
            Back to conductor
          </Link>
        </main>
      </AppChrome>
    );
  }

  return (
    <LearningPageShell
      appChrome="teacher"
      title="Lane view"
      subtitle={`${data.totalParticipants} student${data.totalParticipants !== 1 ? 's' : ''} in this live session.`}
      maxWidthClassName="max-w-6xl"
      actions={(
        <Link href={`/teacher/live/${sessionId}`} className="anx-btn-secondary px-4 py-2.5 text-sm no-underline">
          ← Conductor
        </Link>
      )}
    >
      <div className="anx-card p-5 sm:p-6">
        <LessonHeadline
          reteachAlert={data.lane3.reteachAlert}
          reteachMessage={data.lane3.reteachMessage}
          lane3Count={data.lane3.count}
        />
      </div>

      <LaneColumns
        lane1={data.lane1}
        lane2={data.lane2}
        lane3={data.lane3}
        onHandback={handback}
      />

      {data.unassigned > 0 ? (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
          {data.unassigned} student{data.unassigned !== 1 ? 's are' : ' is'} still completing diagnostics or have not been placed in a lane yet.
        </p>
      ) : null}
    </LearningPageShell>
  );
}
