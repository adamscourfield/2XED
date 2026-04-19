'use client';

import { useCallback, useEffect, useState } from 'react';

type Recurrence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY_NTH';

type SlotRow = {
  id: string;
  classroomId: string;
  label: string | null;
  room: string | null;
  dayOfWeek: number;
  minuteOfDay: number;
  durationMinutes: number;
  recurrence: Recurrence;
  week0Anchor: string | null;
  nthWeekOfMonth: number | null;
  timezone: string;
};

type ClassroomRow = {
  id: string;
  name: string;
  subjectSlug: string | null;
  slots: SlotRow[];
};

const DAYS: { v: number; l: string }[] = [
  { v: 0, l: 'Monday' },
  { v: 1, l: 'Tuesday' },
  { v: 2, l: 'Wednesday' },
  { v: 3, l: 'Thursday' },
  { v: 4, l: 'Friday' },
  { v: 5, l: 'Saturday' },
  { v: 6, l: 'Sunday' },
];

function minuteOfDayFromTimeInput(value: string): number {
  const [h, m] = value.split(':').map((x) => Number(x));
  if (Number.isNaN(h) || Number.isNaN(m)) return 540;
  return Math.min(1439, Math.max(0, h * 60 + m));
}

function timeInputFromMinuteOfDay(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatSlotSummary(s: SlotRow): string {
  const day = DAYS.find((d) => d.v === s.dayOfWeek)?.l ?? 'Day';
  const t = timeInputFromMinuteOfDay(s.minuteOfDay);
  return `${day} ${t} · ${s.recurrence}`;
}

export function TeacherTimetablePage() {
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teacher/timetable');
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(typeof b.error === 'string' ? b.error : 'Could not load timetable');
        setClassrooms([]);
        return;
      }
      const data = (await res.json()) as { classrooms?: ClassroomRow[] };
      setClassrooms(Array.isArray(data.classrooms) ? data.classrooms : []);
    } catch {
      setError('Could not load timetable');
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addSlot(classroomId: string) {
    setSavingId(classroomId);
    setError(null);
    try {
      const res = await fetch('/api/teacher/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          label: 'Lesson',
          dayOfWeek: 0,
          minuteOfDay: 9 * 60,
          durationMinutes: 60,
          recurrence: 'WEEKLY',
          timezone: 'Europe/London',
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(typeof b.error === 'string' ? b.error : 'Could not add slot');
        return;
      }
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function deleteSlot(slotId: string) {
    setSavingId(slotId);
    setError(null);
    try {
      const res = await fetch(`/api/teacher/timetable/${slotId}`, { method: 'DELETE' });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(typeof b.error === 'string' ? b.error : 'Could not delete');
        return;
      }
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function saveSlot(slot: SlotRow, patch: Partial<SlotRow>) {
    setSavingId(slot.id);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...patch };
      if (patch.week0Anchor === '') body.week0Anchor = null;
      const res = await fetch(`/api/teacher/timetable/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(typeof b.error === 'string' ? b.error : 'Could not save');
        return;
      }
      await load();
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[color:var(--anx-text-muted)]">Loading timetable…</p>;
  }

  if (classrooms.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        No classes are linked to your teacher profile yet. Once Observe classes are connected, you can add recurring slots here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      <p className="text-sm text-[color:var(--anx-text-secondary)]">
        Recurring slots appear on student and teacher dashboards in the lesson calendar (subject link uses the class subject when set).
      </p>

      {classrooms.map((cls) => (
        <div key={cls.id} className="anx-card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[color:var(--anx-border)] bg-[color:var(--anx-surface-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--anx-text)]">{cls.name}</h2>
              <p className="text-xs text-[color:var(--anx-text-muted)]">
                Subject slug: {cls.subjectSlug ?? '—'}
              </p>
            </div>
            <button
              type="button"
              className="anx-btn-secondary shrink-0 text-sm"
              disabled={savingId === cls.id}
              onClick={() => void addSlot(cls.id)}
            >
              {savingId === cls.id ? 'Adding…' : 'Add slot'}
            </button>
          </div>

          {cls.slots.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[color:var(--anx-text-secondary)]">No timetable rows yet.</p>
          ) : (
            <div className="divide-y divide-[color:var(--anx-border)]">
              {cls.slots.map((slot) => (
                <div key={slot.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-[color:var(--anx-text-muted)]">{formatSlotSummary(slot)}</p>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-700 hover:underline"
                      disabled={savingId === slot.id}
                      onClick={() => void deleteSlot(slot.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium text-[color:var(--anx-text-muted)]">Label</span>
                      <input
                        className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                        defaultValue={slot.label ?? ''}
                        key={`${slot.id}-label`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (slot.label ?? '')) void saveSlot(slot, { label: v || null });
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium text-[color:var(--anx-text-muted)]">Room</span>
                      <input
                        className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                        defaultValue={slot.room ?? ''}
                        key={`${slot.id}-room`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (slot.room ?? '')) void saveSlot(slot, { room: v || null });
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium text-[color:var(--anx-text-muted)]">Day</span>
                      <select
                        className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                        defaultValue={String(slot.dayOfWeek)}
                        onChange={(e) => void saveSlot(slot, { dayOfWeek: Number(e.target.value) })}
                      >
                        {DAYS.map((d) => (
                          <option key={d.v} value={d.v}>
                            {d.l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium text-[color:var(--anx-text-muted)]">Start time</span>
                      <input
                        type="time"
                        className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                        defaultValue={timeInputFromMinuteOfDay(slot.minuteOfDay)}
                        onBlur={(e) => {
                          const mod = minuteOfDayFromTimeInput(e.target.value);
                          if (mod !== slot.minuteOfDay) void saveSlot(slot, { minuteOfDay: mod });
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium text-[color:var(--anx-text-muted)]">Duration (min)</span>
                      <input
                        type="number"
                        min={5}
                        max={600}
                        className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                        defaultValue={slot.durationMinutes}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isNaN(n) && n !== slot.durationMinutes) void saveSlot(slot, { durationMinutes: n });
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium text-[color:var(--anx-text-muted)]">Recurrence</span>
                      <select
                        className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                        defaultValue={slot.recurrence}
                        onChange={(e) => {
                          const next = e.target.value as Recurrence;
                          if (next === 'BIWEEKLY' && !slot.week0Anchor) {
                            void saveSlot(slot, {
                              recurrence: 'BIWEEKLY',
                              week0Anchor: new Date().toISOString(),
                            });
                          } else if (next === 'MONTHLY_NTH') {
                            void saveSlot(slot, {
                              recurrence: 'MONTHLY_NTH',
                              nthWeekOfMonth: slot.nthWeekOfMonth ?? 1,
                            });
                          } else {
                            void saveSlot(slot, { recurrence: next });
                          }
                        }}
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Fortnightly</option>
                        <option value="MONTHLY_NTH">Monthly (nth weekday)</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium text-[color:var(--anx-text-muted)]">Timezone</span>
                      <input
                        className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                        defaultValue={slot.timezone}
                        key={`${slot.id}-tz`}
                        onBlur={(e) => {
                          const v = e.target.value.trim() || 'Europe/London';
                          if (v !== slot.timezone) void saveSlot(slot, { timezone: v });
                        }}
                      />
                    </label>
                    {slot.recurrence === 'BIWEEKLY' ? (
                      <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                        <span className="font-medium text-[color:var(--anx-text-muted)]">Week-zero anchor (any date in “week A”)</span>
                        <input
                          type="date"
                          className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                          defaultValue={
                            slot.week0Anchor
                              ? new Date(slot.week0Anchor).toISOString().slice(0, 10)
                              : ''
                          }
                          key={`${slot.id}-anchor`}
                          onBlur={(e) => {
                            const v = e.target.value;
                            const iso = v ? new Date(`${v}T12:00:00`).toISOString() : null;
                            const cur = slot.week0Anchor;
                            if (iso !== cur) void saveSlot(slot, { week0Anchor: iso });
                          }}
                        />
                      </label>
                    ) : null}
                    {slot.recurrence === 'MONTHLY_NTH' ? (
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-[color:var(--anx-text-muted)]">Nth weekday (1–4, 5=last)</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          className="rounded-lg border border-[var(--anx-border)] px-2 py-1.5 text-sm"
                          defaultValue={slot.nthWeekOfMonth ?? 1}
                          key={`${slot.id}-nth`}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isNaN(n) && n !== (slot.nthWeekOfMonth ?? 1)) {
                              void saveSlot(slot, { nthWeekOfMonth: n });
                            }
                          }}
                        />
                      </label>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
