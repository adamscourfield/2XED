'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type LessonEvent = {
  at: string;
  kind: 'skill_review' | 'practice_due' | 'live_session' | 'class_review';
  title: string;
  href?: string;
  meta?: string;
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function endOfMonthExclusive(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function kindLabel(kind: LessonEvent['kind']): string {
  switch (kind) {
    case 'skill_review':
      return 'Review';
    case 'practice_due':
      return 'Practice';
    case 'live_session':
      return 'Live';
    case 'class_review':
      return 'Class';
    default:
      return '';
  }
}

function kindClass(kind: LessonEvent['kind']): string {
  switch (kind) {
    case 'live_session':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'skill_review':
      return 'border-violet-200 bg-violet-50 text-violet-900';
    case 'practice_due':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'class_review':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    default:
      return 'border-[var(--anx-border)] bg-[var(--anx-surface-soft)] text-[var(--anx-text)]';
  }
}

type Props = {
  /** Shown under the title */
  hint?: string;
};

export function DashboardLessonCalendar({ hint }: Props) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<LessonEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(() => localDateKey(new Date()));

  const rangeFrom = useMemo(() => startOfMonth(viewMonth), [viewMonth]);
  const rangeTo = useMemo(() => endOfMonthExclusive(viewMonth), [viewMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = rangeFrom.toISOString();
    const to = rangeTo.toISOString();
    const url = `/api/dashboard/upcoming-lessons?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === 'string' ? body.error : 'Could not load calendar');
        setEvents([]);
        return;
      }
      const data = (await res.json()) as { events?: LessonEvent[] };
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setError('Could not load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, LessonEvent[]>();
    for (const ev of events) {
      const key = localDateKey(new Date(ev.at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.at.localeCompare(b.at));
    }
    return map;
  }, [events]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(viewMonth),
    [viewMonth]
  );

  const first = startOfMonth(viewMonth);
  const lastExclusive = endOfMonthExclusive(viewMonth);
  const daysInMonth = Math.round((lastExclusive.getTime() - first.getTime()) / (24 * 60 * 60 * 1000));
  const leadingBlank = (first.getDay() + 6) % 7;

  const todayKey = localDateKey(new Date());

  useEffect(() => {
    const sel = parseLocalDateKey(selectedKey);
    if (sel < first || sel >= lastExclusive) {
      setSelectedKey(localDateKey(first));
    }
  }, [first, lastExclusive, selectedKey]);

  const selectedEvents = byDay.get(selectedKey) ?? [];

  return (
    <section className="anx-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[color:var(--anx-border)] bg-[color:var(--anx-surface-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--anx-text-muted)]">Calendar</p>
          <h3 className="mt-1 text-base font-semibold text-[color:var(--anx-text)]">Upcoming lessons</h3>
          {hint ? (
            <p className="mt-1 text-xs text-[color:var(--anx-text-secondary)]">{hint}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--anx-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--anx-text)] hover:bg-[var(--anx-surface-soft)]"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
          >
            ←
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-[color:var(--anx-text)]">{monthLabel}</span>
          <button
            type="button"
            className="rounded-lg border border-[var(--anx-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--anx-text)] hover:bg-[var(--anx-surface-soft)]"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
          >
            →
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div className="p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-[color:var(--anx-text-muted)]">Loading…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-700">{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[color:var(--anx-text-muted)]">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: leadingBlank }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square rounded-lg bg-transparent" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                  const key = localDateKey(cellDate);
                  const count = byDay.get(key)?.length ?? 0;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-[var(--anx-primary)] bg-[var(--anx-primary-soft)] text-[var(--anx-primary)]'
                          : 'border-transparent bg-[var(--anx-surface-soft)] text-[color:var(--anx-text)] hover:border-[var(--anx-border)]'
                      } ${isToday && !isSelected ? 'ring-1 ring-[var(--anx-primary)] ring-offset-1' : ''}`}
                    >
                      <span>{day}</span>
                      {count > 0 ? (
                        <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-[var(--anx-primary)]" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-[color:var(--anx-border)] bg-white p-4 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold text-[color:var(--anx-text-muted)]">
            {new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(parseLocalDateKey(selectedKey))}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--anx-text-secondary)]">Nothing scheduled for this day.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectedEvents.map((ev, idx) => {
                const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(ev.at));
                const key = `${ev.at}-${ev.kind}-${ev.title}-${idx}`;
                const card = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-snug">{ev.title}</span>
                      <span className="shrink-0 text-xs opacity-80">{time}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs opacity-90">
                      <span className="rounded bg-white/60 px-1.5 py-0.5 font-medium">{kindLabel(ev.kind)}</span>
                      {ev.meta ? <span>{ev.meta}</span> : null}
                    </div>
                  </>
                );
                if (ev.href) {
                  return (
                    <li key={key}>
                      <Link
                        href={ev.href}
                        className={`block rounded-lg border px-3 py-2 text-sm transition-opacity hover:opacity-90 ${kindClass(ev.kind)}`}
                      >
                        {card}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={key} className={`rounded-lg border px-3 py-2 text-sm ${kindClass(ev.kind)}`}>
                    {card}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
