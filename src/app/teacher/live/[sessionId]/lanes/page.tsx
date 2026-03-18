'use client';

import { use } from 'react';
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
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading lanes…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-red-600">{error ?? 'Unable to load lane data'}</p>
      </main>
    );
  }

  return (
    <main className="anx-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Live Session — Lane View</h1>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            {data.totalParticipants} students
          </span>
        </div>

        <LessonHeadline
          reteachAlert={data.lane3.reteachAlert}
          reteachMessage={data.lane3.reteachMessage}
          lane3Count={data.lane3.count}
        />

        <LaneColumns
          lane1={data.lane1}
          lane2={data.lane2}
          lane3={data.lane3}
          onHandback={handback}
        />

        {data.unassigned > 0 && (
          <p className="text-sm text-gray-400">
            {data.unassigned} student(s) still completing diagnostics
          </p>
        )}
      </div>
    </main>
  );
}
