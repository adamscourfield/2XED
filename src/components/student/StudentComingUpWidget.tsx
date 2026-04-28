'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type UpcomingEvent = {
  at: string;
  kind: string;
  title: string;
  href?: string;
  meta?: string;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const t0 = startOfDay(d).getTime();
  if (t0 === today.getTime()) return 'Today';
  if (t0 === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function StudentComingUpWidget() {
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null);

  useEffect(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    const qs = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/upcoming-lessons?${qs}`);
        if (!res.ok) return;
        const data = (await res.json()) as { events?: UpcomingEvent[] };
        if (!cancelled) setEvents(data.events ?? []);
      } catch {
        if (!cancelled) setEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const list = events ?? [];
  const first = list[0];
  const second = list[1];

  return (
    <section className="stu-dash-card stu-dash-coming">
      <h2 className="stu-dash-card-title">
        <span className="stu-dash-cal-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
        Coming up
      </h2>
      {events === null ? (
        <div className="stu-dash-coming-skel" aria-hidden>
          <div className="stu-dash-coming-skel-feature">
            <span className="stu-dash-coming-skel-line stu-dash-coming-skel-line--short" />
            <span className="stu-dash-coming-skel-line stu-dash-coming-skel-line--medium" />
            <span className="stu-dash-coming-skel-line stu-dash-coming-skel-line--long" />
          </div>
          <div className="stu-dash-coming-skel-row">
            <span className="stu-dash-coming-skel-line stu-dash-coming-skel-line--tiny" />
            <span className="stu-dash-coming-skel-line stu-dash-coming-skel-line--grow" />
          </div>
        </div>
      ) : list.length === 0 ? (
        <p className="stu-dash-muted m-0 text-sm">Nothing scheduled in the next two weeks.</p>
      ) : (
        <div className="stu-dash-coming-list">
          {first ? (
            <div className="stu-dash-coming-feature">
              <p className="stu-dash-coming-day">{dayLabel(first.at)}</p>
              <p className="stu-dash-coming-time">{formatTime(first.at)}</p>
              {first.href ? (
                <Link href={first.href} className="stu-dash-coming-title-link">
                  {first.title}
                  {first.meta ? <span className="stu-dash-coming-sub"> · {first.meta}</span> : null}
                </Link>
              ) : (
                <p className="stu-dash-coming-title">
                  {first.title}
                  {first.meta ? <span className="stu-dash-coming-sub"> · {first.meta}</span> : null}
                </p>
              )}
              {first.kind === 'timetable_slot' ? (
                <span className="stu-dash-live-pill">
                  <span className="stu-dash-live-dot" aria-hidden />
                  Live
                </span>
              ) : null}
            </div>
          ) : null}
          {second ? (
            second.href ? (
              <Link href={second.href} className="stu-dash-coming-row">
                <span className="stu-dash-coming-time">{formatTime(second.at)}</span>
                <span className="min-w-0 flex-1">
                  <span className="stu-dash-coming-row-title">{second.title}</span>
                  {second.meta ? (
                    <span className="stu-dash-coming-row-meta block truncate">{second.meta}</span>
                  ) : null}
                </span>
                <span className="text-[color:var(--anx-text-muted)]" aria-hidden>
                  ›
                </span>
              </Link>
            ) : (
              <div className="stu-dash-coming-row stu-dash-coming-row--static">
                <span className="stu-dash-coming-time">{formatTime(second.at)}</span>
                <span className="min-w-0 flex-1">
                  <span className="stu-dash-coming-row-title">{second.title}</span>
                </span>
              </div>
            )
          ) : null}
        </div>
      )}
      <Link href="/dashboard" className="stu-dash-text-link mt-3 inline-block text-sm font-semibold">
        View timetable
      </Link>
    </section>
  );
}
