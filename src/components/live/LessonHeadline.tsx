'use client';

interface LessonHeadlineProps {
  reteachAlert: boolean;
  reteachMessage: string | null;
  lane3Count: number;
}

export function LessonHeadline({ reteachAlert, reteachMessage, lane3Count }: LessonHeadlineProps) {
  if (lane3Count === 0) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-6 py-4">
        <p className="text-lg font-semibold text-green-800">
          ✅ All students on track
        </p>
      </div>
    );
  }

  if (reteachAlert) {
    return (
      <div className="rounded-lg bg-red-50 border-2 border-red-400 px-6 py-5 shadow-md">
        <p className="text-xl font-bold text-red-800">
          🚨 {reteachMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-300 px-6 py-4">
      <p className="text-lg font-semibold text-amber-800">
        ⚠️ {reteachMessage}
      </p>
    </div>
  );
}
