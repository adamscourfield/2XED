'use client';

interface LessonHeadlineProps {
  reteachAlert: boolean;
  reteachMessage: string | null;
  lane3Count: number;
}

export function LessonHeadline({ reteachAlert, reteachMessage, lane3Count }: LessonHeadlineProps) {
  if (lane3Count === 0) {
    return (
      <div className="anx-callout-success relative px-6 py-4 text-center text-lg font-semibold shadow-md">
        <p className="text-lg font-semibold leading-snug">✅ All students on track</p>
      </div>
    );
  }

  if (reteachAlert) {
    return (
      <div className="anx-callout-danger px-6 py-5 text-xl font-bold shadow-md">
        <p className="text-xl font-bold leading-snug">{reteachMessage}</p>
      </div>
    );
  }

  return (
    <div className="anx-callout-warning relative px-6 py-4 text-center text-lg font-semibold shadow-md">
      <p className="text-lg font-semibold leading-snug">⚠️ {reteachMessage}</p>
    </div>
  );
}
