'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SeatingChart, type SeatRenderInfo } from './SeatingChart';
import { SEATING_MIN, SEATING_MAX, type Seat, type SeatingRosterEntry } from '@/lib/live/seatingPlan';

interface Props {
  sessionId: string;
  classroomId: string;
  className?: string;
}

type Mode = 'arrange' | 'live';

interface LaneStreamStudent { id: string; movedRecently?: boolean }

export function SeatingPlanClient({ sessionId, classroomId }: Props) {
  const [mode, setMode] = useState<Mode>('arrange');
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [roster, setRoster] = useState<SeatingRosterEntry[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Live lane colours (live mode).
  const [laneByStudent, setLaneByStudent] = useState<Map<string, { lane: string; movedRecently: boolean }>>(new Map());
  const sseRef = useRef<EventSource | null>(null);

  // ── Load plan + roster ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/classrooms/${classroomId}/seating-plan`);
        if (!res.ok) throw new Error('Could not load the seating plan.');
        const data = (await res.json()) as { plan: { rows: number; cols: number; seats: Seat[] }; roster: SeatingRosterEntry[] };
        if (cancelled) return;
        setRows(data.plan.rows);
        setCols(data.plan.cols);
        setSeats(data.plan.seats);
        setRoster(data.roster);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  // ── Live lane stream (live mode only) ───────────────────────────────────────
  useEffect(() => {
    if (mode !== 'live') {
      sseRef.current?.close();
      sseRef.current = null;
      return;
    }
    let poll: ReturnType<typeof setInterval> | null = null;
    const apply = (laneStudents: Record<string, LaneStreamStudent[]>) => {
      const next = new Map<string, { lane: string; movedRecently: boolean }>();
      for (const lane of ['LANE_1', 'LANE_2', 'LANE_3']) {
        for (const s of laneStudents[lane] ?? []) {
          next.set(s.id, { lane, movedRecently: Boolean(s.movedRecently) });
        }
      }
      setLaneByStudent(next);
    };
    async function pollOnce() {
      try {
        const res = await fetch(`/api/live-sessions/${sessionId}/state`);
        if (res.ok) {
          const data = (await res.json()) as { laneStudents?: Record<string, LaneStreamStudent[]> };
          if (data.laneStudents) apply(data.laneStudents);
        }
      } catch {
        /* leave last-known colours */
      }
    }
    try {
      const es = new EventSource(`/api/live-sessions/${sessionId}/stream`);
      sseRef.current = es;
      es.addEventListener('state', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as { laneStudents?: Record<string, LaneStreamStudent[]> };
          if (data.laneStudents) apply(data.laneStudents);
        } catch {
          /* ignore malformed frame */
        }
      });
      es.onerror = () => {
        if (!poll) {
          void pollOnce();
          poll = setInterval(() => void pollOnce(), 3000);
        }
      };
    } catch {
      void pollOnce();
      poll = setInterval(() => void pollOnce(), 3000);
    }
    return () => {
      sseRef.current?.close();
      sseRef.current = null;
      if (poll) clearInterval(poll);
    };
  }, [mode, sessionId]);

  const nameById = useMemo(() => new Map(roster.map((r) => [r.studentUserId, r.name])), [roster]);
  const placedIds = useMemo(() => new Set(seats.map((s) => s.studentUserId)), [seats]);
  const unplaced = useMemo(() => roster.filter((r) => !placedIds.has(r.studentUserId)), [roster, placedIds]);

  const studentInfo = useMemo(() => {
    const map = new Map<string, SeatRenderInfo>();
    for (const r of roster) {
      const live = laneByStudent.get(r.studentUserId);
      map.set(r.studentUserId, {
        studentUserId: r.studentUserId,
        name: r.name,
        lane: mode === 'live' ? live?.lane ?? null : null,
        movedRecently: mode === 'live' ? live?.movedRecently : false,
      });
    }
    return map;
  }, [roster, laneByStudent, mode]);

  const markDirty = useCallback(() => setSaved(false), []);

  function handleCellClick(row: number, col: number, occupantId: string | null) {
    if (mode !== 'arrange') return;
    markDirty();
    if (occupantId) {
      // Clicking an occupied seat unplaces that student.
      setSeats((prev) => prev.filter((s) => s.studentUserId !== occupantId));
      if (selectedStudentId === occupantId) setSelectedStudentId(null);
      return;
    }
    if (selectedStudentId) {
      setSeats((prev) => [
        ...prev.filter((s) => s.studentUserId !== selectedStudentId),
        { studentUserId: selectedStudentId, row, col },
      ]);
      setSelectedStudentId(null);
    }
  }

  function autoFill() {
    markDirty();
    setSeats((prev) => {
      const occupiedCells = new Set(prev.map((s) => `${s.row}:${s.col}`));
      const next = [...prev];
      const queue = roster.filter((r) => !new Set(next.map((s) => s.studentUserId)).has(r.studentUserId));
      let qi = 0;
      for (let r = 0; r < rows && qi < queue.length; r++) {
        for (let c = 0; c < cols && qi < queue.length; c++) {
          if (occupiedCells.has(`${r}:${c}`)) continue;
          next.push({ studentUserId: queue[qi].studentUserId, row: r, col: c });
          qi++;
        }
      }
      return next;
    });
  }

  function resizeGrid(nextRows: number, nextCols: number) {
    markDirty();
    setRows(nextRows);
    setCols(nextCols);
    // Drop any seats now outside the grid.
    setSeats((prev) => prev.filter((s) => s.row < nextRows && s.col < nextCols));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/seating-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, cols, seats }),
      });
      if (!res.ok) throw new Error('Could not save.');
      const data = (await res.json()) as { plan: { rows: number; cols: number; seats: Seat[] } };
      setSeats(data.plan.seats);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="anx-flow-loading-card max-w-sm">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--anx-surface-container-high)] border-t-[var(--anx-primary)]" />
        <p className="m-0 text-sm" style={{ color: 'var(--anx-text-muted)' }}>Loading seating plan…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--anx-surface-container-high)' }}>
          {(['arrange', 'live'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === m ? 'bg-white shadow-sm' : ''}`}
              style={mode === m ? { color: 'var(--anx-text)' } : { color: 'var(--anx-text-muted)' }}
            >
              {m === 'arrange' ? 'Arrange seats' : 'Live lanes'}
            </button>
          ))}
        </div>
        <Link href={`/teacher/live/${sessionId}`} className="anx-btn-secondary px-4 py-2 text-sm no-underline">
          ← Conductor
        </Link>
      </div>

      {error && <div className="anx-callout-danger text-sm">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr),16rem] lg:items-start">
        <div className="anx-card p-4 sm:p-5">
          <SeatingChart
            rows={rows}
            cols={cols}
            seats={seats}
            studentInfo={studentInfo}
            onCellClick={mode === 'arrange' ? handleCellClick : undefined}
          />
          {mode === 'live' && (
            <p className="mt-3 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              Seats colour by each student&apos;s current lane and update live. Empty seats are unplaced students.
            </p>
          )}
        </div>

        {mode === 'arrange' ? (
          <aside className="anx-card space-y-3 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Grid</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <label className="flex items-center gap-1">
                  Rows
                  <input
                    type="number" min={SEATING_MIN} max={SEATING_MAX} value={rows}
                    onChange={(e) => resizeGrid(Math.max(SEATING_MIN, Math.min(SEATING_MAX, Number(e.target.value) || SEATING_MIN)), cols)}
                    className="anx-input w-14 px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-1">
                  Cols
                  <input
                    type="number" min={SEATING_MIN} max={SEATING_MAX} value={cols}
                    onChange={(e) => resizeGrid(rows, Math.max(SEATING_MIN, Math.min(SEATING_MAX, Number(e.target.value) || SEATING_MIN)))}
                    className="anx-input w-14 px-2 py-1 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={autoFill} className="anx-btn-secondary flex-1 py-2 text-xs">Auto-fill</button>
              <button
                type="button"
                onClick={() => { markDirty(); setSeats([]); setSelectedStudentId(null); }}
                className="anx-btn-secondary flex-1 py-2 text-xs"
              >
                Clear
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                Unplaced ({unplaced.length})
              </p>
              {unplaced.length === 0 ? (
                <p className="mt-1 text-xs" style={{ color: 'var(--anx-text-muted)' }}>Everyone is seated.</p>
              ) : (
                <div className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                  {unplaced.map((s) => (
                    <button
                      key={s.studentUserId}
                      type="button"
                      onClick={() => setSelectedStudentId((id) => (id === s.studentUserId ? null : s.studentUserId))}
                      className="rounded-full border px-2.5 py-1 text-xs font-medium transition"
                      style={
                        selectedStudentId === s.studentUserId
                          ? { borderColor: 'var(--anx-primary)', background: 'var(--anx-primary-soft)', color: 'var(--anx-primary)' }
                          : { borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text)' }
                      }
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedStudentId && (
                <p className="mt-2 text-xs" style={{ color: 'var(--anx-primary)' }}>
                  Now click a seat to place {nameById.get(selectedStudentId)}.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="anx-btn-primary w-full py-2.5 text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save plan'}
            </button>
          </aside>
        ) : (
          <aside className="anx-card space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Lanes</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
              Watch for clusters — a table or row turning amber or red together is a sign to step in with the whole group.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
