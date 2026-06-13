'use client';

import { LiveErrorState } from '@/components/live/LiveErrorState';

export default function StudentLiveError({
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
      title="Lost the lesson for a moment"
      message="Don't worry — your answers are saved. Tap reconnect to rejoin your teacher's lesson."
      retryLabel="Reconnect"
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}
