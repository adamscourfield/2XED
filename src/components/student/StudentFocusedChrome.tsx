'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppChrome } from '@/components/AppChrome';

type Props = {
  children: ReactNode;
  /** Short context label (e.g. subject title or flow name) */
  contextLabel: string;
  backHref?: string;
  backLabel?: string;
};

/**
 * Student immersive flows (practice, diagnostic, baseline) with the same nav
 * and surface treatment as the dashboard, plus a calm way back.
 */
export function StudentFocusedChrome({
  children,
  contextLabel,
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
}: Props) {
  return (
    <AppChrome variant="student">
      <div className="flex min-h-0 flex-1 flex-col bg-[color:var(--anx-surface-bright)]">
        <div className="student-flow-topbar border-b border-[var(--anx-outline-variant)] bg-[color:var(--anx-surface-raised)]/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
            <p className="student-dash-eyebrow m-0">{contextLabel}</p>
            <Link
              href={backHref}
              className="text-sm font-semibold text-[color:var(--anx-primary)] transition hover:text-[color:var(--anx-primary-container)]"
            >
              ← {backLabel}
            </Link>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </AppChrome>
  );
}
