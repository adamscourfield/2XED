'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FocusArea {
  kind: 'misconception' | 'skill';
  label: string;
  description: string;
  skillId: string | null;
}

interface LastLessonFocus {
  sessionId: string;
  endedAt: string | null;
  subjectTitle: string;
  subjectSlug: string | null;
  skillName: string | null;
  areas: FocusArea[];
}

/**
 * "Keep working on" card — surfaces the focus areas from the student's most
 * recent completed live lesson so the post-lesson review carries forward into
 * what they practise next. Renders nothing when there's no recent focus.
 */
export function StudentFocusWidget() {
  const [focus, setFocus] = useState<LastLessonFocus | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/student/last-lesson-focus');
        if (!res.ok) return;
        const data = (await res.json()) as { focus: LastLessonFocus | null };
        if (!cancelled) setFocus(data.focus);
      } catch {
        // Leave focus null — the card simply doesn't render.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !focus || focus.areas.length === 0) return null;

  const practiceHref = focus.subjectSlug ? `/learn/${focus.subjectSlug}` : null;

  return (
    <section className="stu-dash-card" aria-label="Keep working on">
      <h2 className="stu-dash-card-title">Keep working on</h2>
      <p className="stu-dash-muted m-0 mb-3 text-xs">
        From your last lesson{focus.skillName ? ` on ${focus.skillName}` : ''}
      </p>
      <ul className="m-0 list-none space-y-2.5 p-0">
        {focus.areas.map((area) => (
          <li key={`${area.kind}-${area.label}`} className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 text-xs" style={{ color: 'var(--anx-primary)' }}>
              ◆
            </span>
            <div>
              <p className="m-0 text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
                {area.label}
              </p>
              {area.description ? (
                <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                  {area.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {practiceHref ? (
        <Link
          href={practiceHref}
          className="anx-btn-primary mt-4 inline-flex w-full justify-center py-2.5 text-sm no-underline"
        >
          Practise {focus.subjectTitle}
        </Link>
      ) : null}
    </section>
  );
}
