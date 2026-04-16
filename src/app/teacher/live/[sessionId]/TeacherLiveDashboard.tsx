'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TeacherLiveWhiteboard } from '@/components/teacher/TeacherLiveWhiteboard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LessonPhase {
  index: number;
  skillId: string;
  skillCode: string;
  skillName: string;
  type: 'PRACTICE' | 'EXPLANATION';
  label: string;
}

interface LaneStudent {
  id: string;
  name: string | null;
  email: string;
  hasFlag?: boolean;
}

interface ResponseSummary {
  skillId: string;
  totalParticipants: number;
  answeredCount: number;
  correctCount: number;
}

interface SessionSnapshot {
  sessionId: string;
  status: 'LOBBY' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  joinCode: string;
  startedAt: string | null;
  phases: LessonPhase[] | null;
  currentPhaseIndex: number;
  currentContent: unknown;
  participantCount: number;
  laneCounts: { LANE_1: number; LANE_2: number; LANE_3: number };
  laneStudents: { LANE_1: LaneStudent[]; LANE_2: LaneStudent[]; LANE_3: LaneStudent[] };
  responseSummary: ResponseSummary[];
}

interface Props {
  sessionId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) return '—';
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function pct(n: number, d: number): string {
  if (d === 0) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConductorTopBar({
  snapshot,
  elapsed,
  onStatusChange,
  onOpenWhiteboard,
}: {
  snapshot: SessionSnapshot;
  elapsed: string;
  onStatusChange: (s: 'ACTIVE' | 'PAUSED' | 'COMPLETED') => void;
  onOpenWhiteboard?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function updateStatus(newStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED') {
    setLoading(true);
    try {
      await fetch(`/api/live-sessions/${snapshot.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusChange(newStatus);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(snapshot.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const statusColour =
    snapshot.status === 'ACTIVE' ? 'anx-badge-green' :
    snapshot.status === 'LOBBY' ? 'anx-badge-amber' :
    snapshot.status === 'PAUSED' ? 'anx-badge-amber' :
    'anx-badge-blue';

  return (
    <div className="anx-conductor-topbar flex flex-wrap items-center gap-4 px-5 py-3">
      {/* Live dot + session info */}
      <div className="flex items-center gap-3">
        {snapshot.status === 'ACTIVE' && <span className="anx-live-dot" />}
        <div>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 font-mono text-2xl font-bold tracking-widest transition-opacity hover:opacity-70"
            style={{ color: 'var(--anx-primary)' }}
            title="Click to copy join code"
          >
            {snapshot.joinCode}
            <span className="text-sm font-normal" style={{ color: 'var(--anx-text-muted)' }}>
              {copied ? '✓ Copied' : '⎘'}
            </span>
          </button>
          <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
            Join code · {snapshot.participantCount} student{snapshot.participantCount !== 1 ? 's' : ''} · {elapsed}
          </p>
        </div>
      </div>

      <span className={`anx-badge ${statusColour} ml-1`}>{snapshot.status}</span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {onOpenWhiteboard && (snapshot.status === 'ACTIVE' || snapshot.status === 'PAUSED') && (
          <button
            type="button"
            onClick={onOpenWhiteboard}
            className="anx-btn-secondary px-4 py-2 text-sm"
          >
            Blank whiteboard
          </button>
        )}
        {snapshot.status === 'LOBBY' && (
          <button
            onClick={() => updateStatus('ACTIVE')}
            disabled={loading}
            className="anx-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            Start lesson
          </button>
        )}
        {snapshot.status === 'ACTIVE' && (
          <button
            onClick={() => updateStatus('PAUSED')}
            disabled={loading}
            className="anx-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
            Pause
          </button>
        )}
        {snapshot.status === 'PAUSED' && (
          <button
            onClick={() => updateStatus('ACTIVE')}
            disabled={loading}
            className="anx-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            Resume
          </button>
        )}
        {(snapshot.status === 'ACTIVE' || snapshot.status === 'PAUSED') && (
          <button
            onClick={() => updateStatus('COMPLETED')}
            disabled={loading}
            className="anx-btn-ghost px-4 py-2 text-sm"
            style={{ color: 'var(--anx-danger-text)' }}
          >
            End
          </button>
        )}
      </div>
    </div>
  );
}

function PhaseList({
  phases,
  currentIndex,
  sessionId,
  onPhaseDeployed,
}: {
  phases: LessonPhase[];
  currentIndex: number;
  sessionId: string;
  onPhaseDeployed: (index: number) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function deployPhase(index: number) {
    setLoading(true);
    try {
      await fetch(`/api/live-sessions/${sessionId}/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseIndex: index }),
      });
      onPhaseDeployed(index);
    } finally {
      setLoading(false);
    }
  }

  if (phases.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>No phase plan.</p>
        <p className="text-xs" style={{ color: 'var(--anx-text-faint)' }}>Session is open-ended.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-4">
      <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>Lesson plan</p>
      {phases.map((phase, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isNext = i === currentIndex + 1;
        return (
          <div
            key={phase.index}
            className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-all ${
              isCurrent
                ? 'bg-[var(--anx-primary-soft)] ring-1 ring-[var(--anx-primary)]'
                : isDone
                ? 'opacity-40'
                : ''
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isDone ? 'bg-[var(--anx-success)] text-white' :
                isCurrent ? 'bg-[var(--anx-primary)] text-white' :
                'bg-[var(--anx-surface-container-high)] text-[var(--anx-text-muted)]'
              }`}
            >
              {isDone ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-xs font-medium ${isCurrent ? 'text-[var(--anx-primary)]' : 'text-[var(--anx-text)]'}`}>
                {phase.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                {phase.type === 'PRACTICE' ? 'Practice' : 'Explanation'}
              </p>
            </div>
            {isNext && (
              <button
                onClick={() => deployPhase(i)}
                disabled={loading}
                className="shrink-0 rounded-lg bg-[var(--anx-primary)] px-2 py-1 text-xs font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-80"
              >
                Deploy
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClassPulse({ snapshot }: { snapshot: SessionSnapshot }) {
  // Aggregate across all skills for a class-wide view
  const totalAnswered = snapshot.responseSummary.reduce((sum, s) => Math.max(sum, s.answeredCount), 0);
  const totalCorrect = snapshot.responseSummary.reduce((sum, s) => sum + s.correctCount, 0);
  const totalParticipants = snapshot.participantCount;

  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const responseRate = totalParticipants > 0 ? Math.round((totalAnswered / totalParticipants) * 100) : 0;

  const lane1Acc = snapshot.responseSummary.reduce((sum, s) => {
    // Simplified: we don't yet have per-lane accuracy, use overall
    return sum + s.correctCount;
  }, 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="anx-section-label" style={{ color: 'var(--anx-text-muted)' }}>Class pulse</p>

      {/* Response counter */}
      <div className="anx-card p-4 text-center">
        <p className="text-3xl font-bold font-serif" style={{ color: 'var(--anx-text)' }}>
          {totalAnswered}<span className="text-lg" style={{ color: 'var(--anx-text-muted)' }}> / {totalParticipants}</span>
        </p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--anx-text-muted)' }}>responded</p>

        {/* Response bar */}
        <div className="anx-progress-track mt-3">
          <div
            className="anx-progress-bar"
            style={{ width: `${responseRate}%` }}
          />
        </div>
        <p className="mt-1 text-xs font-medium" style={{ color: 'var(--anx-text-secondary)' }}>{responseRate}% response rate</p>
      </div>

      {/* Accuracy */}
      {overallAccuracy !== null && (
        <div className="anx-card p-4 text-center">
          <p
            className="text-3xl font-bold font-serif"
            style={{
              color: overallAccuracy >= 80
                ? 'var(--anx-success)'
                : overallAccuracy >= 50
                ? 'var(--anx-warning-text)'
                : 'var(--anx-danger-text)',
            }}
          >
            {overallAccuracy}%
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--anx-text-muted)' }}>class accuracy</p>
        </div>
      )}

      {/* Lane distribution */}
      <div>
        <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>Lane distribution</p>
        <div className="anx-lane-band">
          <div className="anx-lane anx-lane-1">
            <span className="anx-section-label">Lane 1</span>
            <span className="text-xl font-bold font-serif" style={{ color: 'var(--anx-success)' }}>
              {snapshot.laneCounts.LANE_1}
            </span>
            <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Independent</span>
          </div>
          <div className="anx-lane anx-lane-2">
            <span className="anx-section-label">Lane 2</span>
            <span className="text-xl font-bold font-serif" style={{ color: 'var(--anx-warning-text)' }}>
              {snapshot.laneCounts.LANE_2}
            </span>
            <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Guided</span>
          </div>
          <div className="anx-lane anx-lane-3">
            <span className="anx-section-label">Lane 3</span>
            <span className="text-xl font-bold font-serif" style={{ color: 'var(--anx-danger-text)' }}>
              {snapshot.laneCounts.LANE_3}
            </span>
            <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Reteach</span>
          </div>
        </div>
      </div>

      {/* Per-skill breakdown */}
      {snapshot.responseSummary.length > 0 && (
        <div>
          <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>By skill</p>
          <div className="space-y-2">
            {snapshot.responseSummary.map((s) => (
              <div key={s.skillId} className="anx-card p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-mono" style={{ color: 'var(--anx-text-secondary)' }}>{s.skillId.slice(0, 8)}…</span>
                  <span style={{ color: 'var(--anx-text-muted)' }}>{s.answeredCount}/{s.totalParticipants} · {pct(s.correctCount, s.answeredCount)} correct</span>
                </div>
                <div className="anx-progress-track">
                  <div className="anx-progress-bar" style={{ width: `${s.totalParticipants > 0 ? Math.round((s.answeredCount / s.totalParticipants) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data state */}
      {snapshot.responseSummary.length === 0 && snapshot.status === 'ACTIVE' && (
        <div className="anx-callout-info text-center text-sm">
          Waiting for student responses…
        </div>
      )}
      {snapshot.status === 'LOBBY' && (
        <div className="anx-callout-info text-center text-sm">
          Students can join with code <strong className="font-mono">{snapshot.joinCode}</strong>
        </div>
      )}
    </div>
  );
}

function ClassRoster({
  snapshot,
  sessionId,
  onBroadcast,
}: {
  snapshot: SessionSnapshot;
  sessionId: string;
  onBroadcast: () => void;
}) {
  const [expandedLane, setExpandedLane] = useState<'LANE_1' | 'LANE_2' | 'LANE_3' | null>('LANE_3');
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  async function pushExplanationToLane3() {
    setBroadcastLoading(true);
    try {
      await fetch(`/api/live-sessions/${sessionId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lanes: ['LANE_3'],
          contentType: 'MESSAGE',
          message: 'Your teacher is coming to help you. Please wait.',
        }),
      });
      onBroadcast();
    } finally {
      setBroadcastLoading(false);
    }
  }

  const lanes: Array<{ key: 'LANE_1' | 'LANE_2' | 'LANE_3'; label: string; description: string; colour: string }> = [
    { key: 'LANE_1', label: 'Lane 1', description: 'Independent', colour: 'var(--anx-success)' },
    { key: 'LANE_2', label: 'Lane 2', description: 'Guided', colour: 'var(--anx-warning-text)' },
    { key: 'LANE_3', label: 'Lane 3', description: 'Reteach', colour: 'var(--anx-danger-text)' },
  ];

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-4">
      <p className="anx-section-label" style={{ color: 'var(--anx-text-muted)' }}>Class roster</p>

      {lanes.map(({ key, label, description, colour }) => {
        const students = snapshot.laneStudents[key] ?? [];
        const count = snapshot.laneCounts[key] ?? 0;
        const isExpanded = expandedLane === key;

        return (
          <div key={key} className="anx-card overflow-hidden">
            <button
              onClick={() => setExpandedLane(isExpanded ? null : key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: colour }}>{label}</span>
                <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>{description}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-serif" style={{ color: colour }}>{count}</span>
                <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </button>

            {isExpanded && students.length > 0 && (
              <div className="border-t px-4 pb-3" style={{ borderColor: 'var(--anx-border)' }}>
                <div className="mt-2 space-y-1">
                  {students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1">
                      <span className="text-sm" style={{ color: 'var(--anx-text)' }}>
                        {s.name ?? s.email}
                        {s.hasFlag && (
                          <span className="ml-1.5 anx-badge anx-badge-red text-xs">⚑</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isExpanded && students.length === 0 && (
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--anx-border)' }}>
                <p className="text-xs" style={{ color: 'var(--anx-text-faint)' }}>No students in this lane yet.</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Lane 3 action */}
      {snapshot.laneCounts.LANE_3 > 0 && (
        <button
          onClick={pushExplanationToLane3}
          disabled={broadcastLoading}
          className="anx-btn-secondary w-full text-sm"
          style={{ borderColor: 'var(--anx-danger)', color: 'var(--anx-danger-text)' }}
        >
          {broadcastLoading ? 'Sending…' : `Send support message → Lane 3 (${snapshot.laneCounts.LANE_3})`}
        </button>
      )}
    </div>
  );
}

function ActionBar({
  snapshot,
  sessionId,
  onPhaseDeployed,
}: {
  snapshot: SessionSnapshot;
  sessionId: string;
  onPhaseDeployed: (index: number) => void;
}) {
  const phases = snapshot.phases ?? [];
  const currentIndex = snapshot.currentPhaseIndex;
  const nextIndex = currentIndex + 1;
  const hasNextPhase = nextIndex < phases.length;
  const nextPhase = hasNextPhase ? phases[nextIndex] : null;
  const [loading, setLoading] = useState(false);

  async function deployNext() {
    setLoading(true);
    try {
      await fetch(`/api/live-sessions/${sessionId}/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseIndex: nextIndex }),
      });
      onPhaseDeployed(nextIndex);
    } finally {
      setLoading(false);
    }
  }

  if (!hasNextPhase || snapshot.status !== 'ACTIVE') return null;

  return (
    <div className="anx-conductor-actionbar flex items-center justify-between gap-4 px-5 py-3">
      <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
        Up next: <span className="font-medium" style={{ color: 'var(--anx-text)' }}>{nextPhase?.label}</span>
      </p>
      <button
        onClick={deployNext}
        disabled={loading}
        className="anx-btn-primary px-5 py-2 text-sm disabled:opacity-40"
      >
        {loading ? 'Deploying…' : `Deploy Phase ${nextIndex + 1} →`}
      </button>
    </div>
  );
}

// ── Main conductor component ───────────────────────────────────────────────────

export function TeacherLiveDashboard({ sessionId }: Props) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState('—');
  const sseRef = useRef<EventSource | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot((prev) => {
        if (prev?.startedAt) {
          setElapsed(formatElapsed(prev.startedAt));
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/state`);
      if (!res.ok) { setError('Failed to load session.'); return; }
      const data = await res.json();
      setSnapshot(data);
      if (data.startedAt) setElapsed(formatElapsed(data.startedAt));
    } catch {
      setError('Network error.');
    }
  }, [sessionId]);

  // Connect to SSE; fall back to polling if SSE fails
  useEffect(() => {
    let sseConnected = false;

    function startPolling() {
      if (fallbackRef.current) return;
      fallbackRef.current = setInterval(fetchSnapshot, 3000);
    }

    fetchSnapshot(); // initial load

    try {
      const es = new EventSource(`/api/live-sessions/${sessionId}/stream`);
      sseRef.current = es;

      es.addEventListener('state', (e) => {
        sseConnected = true;
        const data = JSON.parse(e.data) as SessionSnapshot;
        setSnapshot(data);
        if (data.startedAt) setElapsed(formatElapsed(data.startedAt));
      });

      es.onerror = () => {
        if (!sseConnected) {
          // SSE never connected; fall back to polling
          startPolling();
        }
      };
    } catch {
      startPolling();
    }

    return () => {
      sseRef.current?.close();
      if (fallbackRef.current) clearInterval(fallbackRef.current);
    };
  }, [sessionId, fetchSnapshot]);

  function handleStatusChange(newStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED') {
    setSnapshot((prev) => prev ? { ...prev, status: newStatus } : prev);
    fetchSnapshot();
  }

  function handlePhaseDeployed(index: number) {
    setSnapshot((prev) => prev ? { ...prev, currentPhaseIndex: index } : prev);
    fetchSnapshot();
  }

  if (error) {
    return <div className="p-8 text-sm" style={{ color: 'var(--anx-danger-text)' }}>{error}</div>;
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>Loading conductor…</p>
      </div>
    );
  }

  const phases = snapshot.phases ?? [];

  return (
    <div className="anx-conductor-shell">
      <TeacherLiveWhiteboard
        sessionId={sessionId}
        open={whiteboardOpen}
        onClose={() => setWhiteboardOpen(false)}
        onPushed={fetchSnapshot}
      />
      {/* Top bar */}
      <ConductorTopBar
        snapshot={snapshot}
        elapsed={elapsed}
        onStatusChange={handleStatusChange}
        onOpenWhiteboard={() => setWhiteboardOpen(true)}
      />

      {/* Three-panel body */}
      <div className="anx-conductor-body">
        {/* Left: Phase list */}
        <div className="anx-conductor-panel anx-conductor-panel-left">
          <PhaseList
            phases={phases}
            currentIndex={snapshot.currentPhaseIndex}
            sessionId={sessionId}
            onPhaseDeployed={handlePhaseDeployed}
          />
        </div>

        {/* Centre: Class pulse */}
        <div className="anx-conductor-panel anx-conductor-panel-centre overflow-y-auto">
          <ClassPulse snapshot={snapshot} />
        </div>

        {/* Right: Class roster */}
        <div className="anx-conductor-panel anx-conductor-panel-right">
          <ClassRoster
            snapshot={snapshot}
            sessionId={sessionId}
            onBroadcast={fetchSnapshot}
          />
        </div>
      </div>

      {/* Bottom action bar */}
      <ActionBar
        snapshot={snapshot}
        sessionId={sessionId}
        onPhaseDeployed={handlePhaseDeployed}
      />
    </div>
  );
}
