'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { studentLaneLabel } from '@/lib/live/lanes';

interface SkillBreakdownEntry {
  skillId: string;
  skillCode: string | null;
  skillName: string | null;
  total: number;
  correct: number;
  partial: number;
}

interface FocusArea {
  kind: 'misconception' | 'skill';
  label: string;
  description: string;
}

interface MySummary {
  sessionId: string;
  skill: { id: string; code: string; name: string } | null;
  subject: { title: string };
  finalLane: string;
  attemptCount: number;
  correctCount: number;
  partialCount: number;
  skillBreakdown: SkillBreakdownEntry[];
  focusAreas: FocusArea[];
  strengths: string[];
}

// Title comes from the canonical lane studentLabel; the encouragement line and
// tone are review-specific. Keyed by lane id.
const LANE_REVIEW_COPY: Record<string, { line: string; tone: 'success' | 'warning' | 'info' }> = {
  LANE_1: {
    line: 'You worked through this on your own — great focus today.',
    tone: 'success',
  },
  LANE_2: {
    line: 'You got there with a little support — one more practice run will lock it in.',
    tone: 'warning',
  },
  LANE_3: {
    line: 'This topic needs another look — your teacher knows and will pick it up with you.',
    tone: 'info',
  },
};

function laneToneStyles(tone: 'success' | 'warning' | 'info'): { bg: string; fg: string } {
  if (tone === 'success') return { bg: 'color-mix(in srgb, var(--anx-success) 12%, transparent)', fg: 'var(--anx-success)' };
  if (tone === 'warning') return { bg: 'color-mix(in srgb, var(--anx-warning, #b45309) 12%, transparent)', fg: 'var(--anx-warning, #b45309)' };
  return { bg: 'var(--anx-surface-container-low)', fg: 'var(--anx-text-secondary)' };
}

/**
 * Personal end-of-lesson review shown to a student when a live session ends.
 * Fetches the student's own summary; falls back to a simple "all done" card
 * if the summary is unavailable or the student answered nothing.
 */
export function StudentSessionReview({ sessionId }: { sessionId: string }) {
  const [summary, setSummary] = useState<MySummary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/live-sessions/${sessionId}/my-summary`);
        if (!res.ok) throw new Error('summary unavailable');
        const data: MySummary = await res.json();
        if (cancelled) return;
        if (data.attemptCount === 0) {
          setState('fallback');
        } else {
          setSummary(data);
          setState('ready');
        }
      } catch {
        if (!cancelled) setState('fallback');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state === 'loading') {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="anx-card w-full max-w-md space-y-4 p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--anx-surface-container-high)] border-t-[var(--anx-primary)]" />
          <p className="m-0 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            Putting together your lesson review…
          </p>
        </div>
      </main>
    );
  }

  if (state === 'fallback' || !summary) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="anx-card w-full max-w-md space-y-5 p-8 text-center">
          <div className="text-5xl" aria-hidden>
            🎉
          </div>
          <div>
            <p className="student-dash-eyebrow">Live lesson</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>
              All done
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
              The lesson has ended. Head home when your teacher dismisses you.
            </p>
          </div>
          <Link
            href="/dashboard"
            data-live-primary-focus=""
            className="anx-btn-primary inline-flex w-full justify-center py-3.5 no-underline sm:w-auto sm:min-w-[12rem]"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const laneCopy = LANE_REVIEW_COPY[summary.finalLane] ?? LANE_REVIEW_COPY.LANE_2;
  const laneStyle = laneToneStyles(laneCopy.tone);
  const accuracy = summary.attemptCount > 0 ? Math.round((summary.correctCount / summary.attemptCount) * 100) : 0;

  return (
    <main className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:py-10">
      <div className="w-full max-w-lg space-y-4">
        <div className="anx-card space-y-5 p-6 text-center sm:p-8">
          <div className="text-5xl" aria-hidden>
            🎉
          </div>
          <div>
            <p className="student-dash-eyebrow">Lesson review</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>
              {summary.skill?.name ?? summary.subject.title}
            </h2>
            <div
              className="mx-auto mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold"
              style={{ backgroundColor: laneStyle.bg, color: laneStyle.fg }}
            >
              {studentLaneLabel(summary.finalLane)}
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
              {laneCopy.line}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[var(--anx-surface-container-low)] px-3 py-4">
              <p className="m-0 text-2xl font-bold tabular-nums" style={{ color: 'var(--anx-text)' }}>
                {summary.attemptCount}
              </p>
              <p className="m-0 mt-1 text-xs font-medium" style={{ color: 'var(--anx-text-muted)' }}>
                Answered
              </p>
            </div>
            <div className="rounded-xl bg-[var(--anx-surface-container-low)] px-3 py-4">
              <p className="m-0 text-2xl font-bold tabular-nums" style={{ color: 'var(--anx-success)' }}>
                {summary.correctCount}
              </p>
              <p className="m-0 mt-1 text-xs font-medium" style={{ color: 'var(--anx-text-muted)' }}>
                Correct
              </p>
            </div>
            <div className="rounded-xl bg-[var(--anx-surface-container-low)] px-3 py-4">
              <p className="m-0 text-2xl font-bold tabular-nums" style={{ color: 'var(--anx-text)' }}>
                {accuracy}%
              </p>
              <p className="m-0 mt-1 text-xs font-medium" style={{ color: 'var(--anx-text-muted)' }}>
                Accuracy
              </p>
            </div>
          </div>
        </div>

        {summary.strengths.length > 0 ? (
          <div className="anx-card space-y-2 p-5 text-left sm:p-6">
            <h3 className="m-0 text-sm font-bold" style={{ color: 'var(--anx-text)' }}>
              What went well
            </h3>
            <ul className="m-0 list-none space-y-1.5 p-0">
              {summary.strengths.map((label) => (
                <li key={label} className="flex items-start gap-2 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>
                  <span aria-hidden style={{ color: 'var(--anx-success)' }}>✓</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {summary.focusAreas.length > 0 ? (
          <div className="anx-card space-y-3 p-5 text-left sm:p-6">
            <h3 className="m-0 text-sm font-bold" style={{ color: 'var(--anx-text)' }}>
              What to focus on next
            </h3>
            <ul className="m-0 list-none space-y-3 p-0">
              {summary.focusAreas.map((area) => (
                <li key={`${area.kind}-${area.label}`} className="space-y-0.5">
                  <p className="m-0 text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
                    {area.label}
                  </p>
                  {area.description ? (
                    <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                      {area.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="text-center">
          <Link
            href="/dashboard"
            data-live-primary-focus=""
            className="anx-btn-primary inline-flex w-full justify-center py-3.5 no-underline sm:w-auto sm:min-w-[12rem]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
