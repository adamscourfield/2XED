'use client';

import { useEffect } from 'react';
import { captureException } from '@/lib/observability/logger';

/**
 * Top-level error boundary — catches errors thrown in the root layout itself,
 * which route-level error.tsx files can't. Must render its own <html>/<body>
 * because it replaces the whole document when the root layout fails.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { boundary: 'global', digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 48 }} aria-hidden>⚠️</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 12 }}>Something went wrong</h1>
            <p style={{ color: '#555', lineHeight: 1.5, marginTop: 8 }}>
              The app hit an unexpected error. Reloading usually fixes it — your data is safe.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 20,
                padding: '0.75rem 1.5rem',
                borderRadius: 9999,
                border: 'none',
                background: '#4f46e5',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
