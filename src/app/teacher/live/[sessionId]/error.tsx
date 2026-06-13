'use client';

import { LiveErrorState } from '@/components/live/LiveErrorState';

export default function TeacherLiveSessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LiveErrorState
      error={error}
      reset={reset}
      title="The live session hit a snag"
      message="Your session and student responses are safe. Reload to reconnect to the room — students stay joined."
      retryLabel="Reload session"
      fallbackHref="/teacher/live"
      fallbackLabel="Back to live sessions"
    />
  );
}
