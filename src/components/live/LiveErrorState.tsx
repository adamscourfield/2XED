'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  /** The error thrown by the segment, forwarded from the route error boundary. */
  error: Error & { digest?: string };
  /** Re-render the segment from scratch — the primary recovery action. */
  reset: () => void;
  /** Headline tuned to who's looking (teacher mid-lesson vs student mid-session). */
  title: string;
  /** One-line reassurance + what to do. */
  message: string;
  /** Label for the reset button. */
  retryLabel: string;
  /** Optional secondary escape hatch (e.g. back to the live list / dashboard). */
  fallbackHref?: string;
  fallbackLabel?: string;
}

/**
 * Shared recovery UI for live-surface error boundaries. A thrown render error
 * mid-lesson would otherwise blank the screen for a teacher in front of a class
 * or a student in a session; this gives an explicit reconnect path and logs the
 * error for observability.
 */
export function LiveErrorState({
  error,
  reset,
  title,
  message,
  retryLabel,
  fallbackHref,
  fallbackLabel,
}: Props) {
  useEffect(() => {
    // Surface to the console (and any wired error tracking) rather than failing silently.
    console.error('[live] segment error:', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-1 items-center justify-center px-4 py-10">
      <div className="anx-card w-full max-w-md space-y-5 p-8 text-center">
        <div className="text-5xl" aria-hidden>
          ⚠️
        </div>
        <div>
          <h2 className="m-0 text-2xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
            {message}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="anx-btn-primary py-3 sm:min-w-[10rem]"
          >
            {retryLabel}
          </button>
          {fallbackHref ? (
            <Link
              href={fallbackHref}
              className="anx-btn-secondary inline-flex items-center justify-center py-3 no-underline sm:min-w-[10rem]"
            >
              {fallbackLabel ?? 'Go back'}
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
