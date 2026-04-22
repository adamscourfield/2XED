'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppChrome } from '@/components/AppChrome';
import { AnimationRenderer } from '@/components/explanation/AnimationRenderer';
import { LiveWhiteboardViewer } from '@/components/student/LiveWhiteboardViewer';
import type { LiveWhiteboardPayload } from '@/lib/live/whiteboard-strokes';

interface SkillMeta {
  id: string;
  code: string;
  name: string;
}

interface SubjectMeta {
  id: string;
  title: string;
  slug: string;
}

interface JoinedSession {
  sessionId: string;
  status: string;
  subject: SubjectMeta;
  skill: SkillMeta | null;
}

interface Item {
  id: string;
  question: string;
  type: string;
  options: unknown;
}

interface ExplanationAnimationSchema {
  schemaVersion: string;
  skillCode: string;
  skillName: string;
  routeType: string;
  routeLabel: string;
  misconceptionSummary: string;
  generatedAt: string;
  steps: Array<{
    stepIndex: number;
    id: string;
    visuals: unknown[];
    narration: string;
    audioFile: string | null;
  }>;
  misconceptionStrip: {
    text: string;
    audioNarration: string;
  };
  loopable: boolean;
  pauseAtEndMs: number;
}

interface LiveExplanationPayload {
  id: string;
  skillId: string;
  routeType: string;
  misconceptionSummary: string;
  workedExample?: string;
  animationSchema?: ExplanationAnimationSchema | null;
}

interface CurrentContent {
  contentType: 'EXPLANATION' | 'MESSAGE' | 'PHASE' | 'WHITEBOARD';
  targetLanes?: string[];
  message?: string;
  phaseIndex?: number;
  broadcastAt?: string;
  whiteboard?: LiveWhiteboardPayload;
  explanation?: LiveExplanationPayload;
}

interface SessionPoll {
  status: string;
  currentPhaseIndex: number;
  currentContent: CurrentContent | null;
  studentLane?: string | null;
  pendingRecheckItem?: Item | null;
}

type AppState =
  | { phase: 'join' }
  | { phase: 'waiting'; session: JoinedSession }
  | { phase: 'between-phases'; session: JoinedSession; message: string }
  | { phase: 'whiteboard'; session: JoinedSession; whiteboard: LiveWhiteboardPayload }
  | { phase: 'explanation'; session: JoinedSession; explanation: LiveExplanationPayload }
  | { phase: 'question'; session: JoinedSession; item: Item }
  | { phase: 'feedback'; session: JoinedSession; correct: boolean; nextItem: Item | null }
  | { phase: 'done'; session: JoinedSession };

function broadcastTargetsStudentLane(content: CurrentContent, studentLane: string | null | undefined): boolean {
  const lanes = content.targetLanes;
  if (!lanes || lanes.length === 0) return true;
  if (!studentLane) return true;
  return lanes.includes(studentLane);
}

export default function StudentLivePage() {
  const { data: authSession, status } = useSession();

  // Pre-fill from ?code= query param (e.g. when redirected from dashboard)
  const initialCode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('code')?.toUpperCase().slice(0, 6) ?? ''
      : '';

  const [joinCode, setJoinCode] = useState(initialCode);
  const [appState, setAppState] = useState<AppState>({ phase: 'join' });
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last seen content to detect teacher pushes
  const lastPhaseIndexRef = useRef<number>(-1);
  const lastBroadcastAtRef = useRef<string | null>(null);
  const lastWhiteboardVersionRef = useRef<number>(-1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<JoinedSession | null>(null);
  const lastLiveExplanationIdRef = useRef<string | null>(null);

  // Update sessionRef when appState changes
  useEffect(() => {
    if (appState.phase !== 'join') {
      sessionRef.current = (appState as { session: JoinedSession }).session ?? null;
    }
  }, [appState]);

  // Poll for session state changes when in an active session
  useEffect(() => {
    const isInSession =
      appState.phase === 'waiting' ||
      appState.phase === 'between-phases' ||
      appState.phase === 'whiteboard' ||
      appState.phase === 'explanation' ||
      appState.phase === 'question' ||
      appState.phase === 'feedback';
    if (!isInSession) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const sessionId = sessionRef.current?.sessionId;
    if (!sessionId) return;

    async function pollSession() {
      const sid = sessionRef.current?.sessionId;
      if (!sid) return;
      try {
        const res = await fetch(`/api/live-sessions/${sid}/student-state`);
        if (!res.ok) return;
        const data: SessionPoll = await res.json();

        // Session ended
        if (data.status === 'COMPLETED') {
          const sess = sessionRef.current;
          if (sess) setAppState({ phase: 'done', session: sess });
          return;
        }

        // Teacher pushed new content / advanced phase
        const phaseChanged = data.currentPhaseIndex !== lastPhaseIndexRef.current && lastPhaseIndexRef.current !== -1;
        const newBroadcast = data.currentContent?.broadcastAt && data.currentContent.broadcastAt !== lastBroadcastAtRef.current;

        if (phaseChanged) {
          lastPhaseIndexRef.current = data.currentPhaseIndex;
          const sess = sessionRef.current;
          if (sess) setAppState({ phase: 'between-phases', session: sess, message: 'Your teacher has moved to the next phase. Get ready!' });
        }

        if (data.pendingRecheckItem) {
          const sess = sessionRef.current;
          if (sess && appState.phase !== 'question') {
            setAppState({ phase: 'question', session: sess, item: data.pendingRecheckItem });
            return;
          }
        }

        if (newBroadcast && data.currentContent) {
          lastBroadcastAtRef.current = data.currentContent.broadcastAt ?? null;
          const cc = data.currentContent;
          const laneOk = broadcastTargetsStudentLane(cc, data.studentLane);

          if (cc.contentType === 'WHITEBOARD' && laneOk && cc.whiteboard) {
            const wb = cc.whiteboard;
            const sess = sessionRef.current;
            if (!sess) return;
            if (wb.action === 'hide') {
              lastWhiteboardVersionRef.current = wb.version;
              setAppState({ phase: 'waiting', session: sess });
            } else if (wb.action === 'show' || wb.action === 'clear') {
              if (wb.version >= lastWhiteboardVersionRef.current) {
                lastWhiteboardVersionRef.current = wb.version;
                setAppState({ phase: 'whiteboard', session: sess, whiteboard: wb });
              }
            }
          } else if (cc.contentType === 'EXPLANATION' && laneOk && cc.explanation) {
            const sess = sessionRef.current;
            if (sess) setAppState({ phase: 'explanation', session: sess, explanation: cc.explanation });
          } else if (cc.contentType === 'MESSAGE' && laneOk && cc.message) {
            const sess = sessionRef.current;
            if (sess) setAppState({ phase: 'between-phases', session: sess, message: cc.message });
          }
        }

        if (lastPhaseIndexRef.current === -1) {
          lastPhaseIndexRef.current = data.currentPhaseIndex;
        }
        if (!lastBroadcastAtRef.current && data.currentContent?.broadcastAt) {
          lastBroadcastAtRef.current = data.currentContent.broadcastAt;
        }
      } catch {
        // silently ignore poll errors
      }
    }

    const pollMs = appState.phase === 'whiteboard' ? 1500 : 3000;
    pollRef.current = setInterval(pollSession, pollMs);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.phase]);

  useEffect(() => {
    if (appState.phase !== 'explanation') return;
    const explanationId = appState.explanation.id;
    if (!explanationId || lastLiveExplanationIdRef.current === explanationId) return;

    lastLiveExplanationIdRef.current = explanationId;
    void fetch(`/api/live-sessions/${appState.session.sessionId}/explanation-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'shown',
        explanationRouteId: explanationId,
        skillId: appState.explanation.skillId,
        routeType: appState.explanation.routeType,
      }),
    }).catch(() => {
      // ignore telemetry failures
    });
  }, [appState]);

  if (status === 'loading') {
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex flex-1 items-center justify-center">
          <p style={{ color: 'var(--anx-text-muted)' }}>Loading…</p>
        </main>
      </AppChrome>
    );
  }
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const user = authSession?.user as { role?: string } | undefined;
  if (user?.role !== 'STUDENT') {
    redirect('/dashboard');
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/live-sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.toUpperCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not join session.');
        return;
      }
      const session: JoinedSession = await res.json();
      lastPhaseIndexRef.current = -1;
      lastBroadcastAtRef.current = null;
      lastWhiteboardVersionRef.current = -1;

      if (session.status === 'LOBBY') {
        setAppState({ phase: 'waiting', session });
      } else {
        setAppState({ phase: 'waiting', session });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (appState.phase !== 'question') return;
    setError(null);
    setLoading(true);

    const { session, item } = appState;
    const skillId = session.skill?.id;
    if (!skillId) {
      setError('No skill associated with this session.');
      setLoading(false);
      return;
    }

    try {
      const start = Date.now();
      const res = await fetch(`/api/live-sessions/${session.sessionId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          skillId,
          answer,
          responseTimeMs: Date.now() - start,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to submit answer.');
        return;
      }

      const result: {
        correct: boolean;
        nextItem: Item | null;
        recheckOutcome?: 'rejoined_lane_1' | 'stayed_lane_2' | 'escalated_lane_3' | null;
        laneAfterAttempt?: 'LANE_1' | 'LANE_2' | 'LANE_3' | null;
      } = await res.json();
      setAnswer('');
      setAppState({
        phase: 'feedback',
        session,
        correct: result.correct,
        nextItem: result.nextItem,
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (appState.phase !== 'feedback') return;
    const { session, nextItem } = appState;
    if (!nextItem) {
      setAppState({ phase: 'waiting', session });
    } else {
      setAppState({ phase: 'question', session, item: nextItem });
    }
  }

  // ── Join screen ─────────────────────────────────────────────────────────────
  if (appState.phase === 'join') {
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex flex-1 items-center justify-center">
        <div className="anx-panel w-full max-w-sm p-8">
          <h1 className="mb-2 text-center text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>Join Live Session</h1>
          <p className="mb-6 text-center text-sm" style={{ color: 'var(--anx-text-muted)' }}>Enter the code your teacher shows on the board.</p>
          {error && <div className="anx-callout-danger mb-4 text-sm">{error}</div>}
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="joinCode" className="mb-1 block text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }}>
                Session code
              </label>
              <input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="anx-input text-center text-2xl font-mono tracking-widest uppercase"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || joinCode.length !== 6}
              className="anx-btn-primary w-full"
            >
              {loading ? 'Joining…' : 'Join'}
            </button>
          </form>
        </div>
        </main>
      </AppChrome>
    );
  }

  // ── Teacher whiteboard (read-only for students) ─────────────────────────────
  if (appState.phase === 'whiteboard') {
    const wb = appState.whiteboard;
    return (
      <AppChrome variant="student">
        <main className="anx-shell flex min-h-0 flex-1 flex-col px-4 py-6">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3">
            <div className="text-center">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>
                Teacher whiteboard
              </h2>
              <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                Your teacher is sketching on the board. This view updates automatically.
              </p>
            </div>
            <LiveWhiteboardViewer logicalWidth={wb.width} logicalHeight={wb.height} strokes={wb.strokes} className="min-h-[240px]" />
          </div>
        </main>
      </AppChrome>
    );
  }

  // ── Compact live explanation ───────────────────────────────────────────────
  if (appState.phase === 'explanation') {
    const { explanation } = appState;
    return (
      <AppChrome variant="student">
        <main className="anx-shell flex flex-1 items-center justify-center px-4 py-6">
          <div className="anx-panel w-full max-w-4xl p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold" style={{ color: 'var(--anx-text)' }}>Quick support</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                Stay with this explanation. You may get a short recheck question next.
              </p>
            </div>

            {explanation.animationSchema ? (
              <AnimationRenderer schema={explanation.animationSchema} />
            ) : (
              <div className="space-y-4 rounded-2xl border p-6" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface)' }}>
                <div className="anx-callout-warning">
                  <p className="font-medium">Watch out for this</p>
                  <p className="mt-1">{explanation.misconceptionSummary}</p>
                </div>
                {explanation.workedExample && (
                  <div className="anx-callout-info">
                    <p className="font-medium">Worked example</p>
                    <p className="mt-1 whitespace-pre-wrap">{explanation.workedExample}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => {
                  void fetch(`/api/live-sessions/${appState.session.sessionId}/explanation-event`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      eventType: 'acknowledged',
                      explanationRouteId: explanation.id,
                      skillId: explanation.skillId,
                      routeType: explanation.routeType,
                    }),
                  }).catch(() => {
                    // ignore telemetry failures
                  });
                  setAppState({ phase: 'waiting', session: appState.session });
                }}
                className="anx-btn-primary px-6 py-3"
              >
                I’m ready
              </button>
            </div>
          </div>
        </main>
      </AppChrome>
    );
  }

  // ── Waiting for session to start ────────────────────────────────────────────
  if (appState.phase === 'waiting') {
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex flex-1 items-center justify-center">
        <div className="anx-panel w-full max-w-sm p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--anx-surface-container-high)] border-t-[var(--anx-primary)]" />
          <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--anx-text)' }}>Waiting for your teacher…</h2>
          <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            You&apos;ve joined <strong>{appState.session.subject.title}</strong>.
            The lesson will begin shortly.
          </p>
        </div>
        </main>
      </AppChrome>
    );
  }

  // ── Between phases — teacher message ────────────────────────────────────────
  if (appState.phase === 'between-phases') {
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex flex-1 items-center justify-center">
        <div className="anx-panel w-full max-w-sm p-8 text-center">
          <div className="mb-4 text-4xl">💬</div>
          <h2 className="mb-3 text-xl font-semibold" style={{ color: 'var(--anx-text)' }}>
            From your teacher
          </h2>
          <p className="mb-6 text-base" style={{ color: 'var(--anx-text-secondary)' }}>
            {appState.message}
          </p>
          <button
            onClick={() => setAppState({ phase: 'waiting', session: appState.session })}
            className="anx-btn-primary px-6 py-2"
          >
            OK
          </button>
        </div>
        </main>
      </AppChrome>
    );
  }

  // ── Question screen ─────────────────────────────────────────────────────────
  if (appState.phase === 'question') {
    const { item } = appState;
    const opts = Array.isArray(item.options) ? (item.options as string[]) : [];
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex flex-1 items-center justify-center">
        <div className="anx-panel w-full max-w-lg p-8">
          {error && <div className="anx-callout-danger mb-4 text-sm">{error}</div>}
          <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
            Quick recheck
          </p>
          <p className="mb-6 text-base leading-relaxed" style={{ color: 'var(--anx-text)' }}>{item.question}</p>
          <form onSubmit={handleAnswer} className="space-y-3">
            {opts.length > 0 ? (
              opts.map((opt) => (
                <label
                  key={opt}
                  className={`anx-option flex cursor-pointer items-center gap-3 ${
                    answer === opt ? 'anx-option-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={opt}
                    checked={answer === opt}
                    onChange={() => setAnswer(opt)}
                    className="accent-[var(--anx-primary)]"
                  />
                  {opt}
                </label>
              ))
            ) : (
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer…"
                className="anx-input"
                required
              />
            )}
            <button
              type="submit"
              disabled={loading || !answer}
              className="anx-btn-primary mt-2 w-full"
            >
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </div>
        </main>
      </AppChrome>
    );
  }

  // ── Feedback screen ─────────────────────────────────────────────────────────
  if (appState.phase === 'feedback') {
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex flex-1 items-center justify-center">
        <div className="anx-panel w-full max-w-sm p-8 text-center">
          <div
            className={`mb-4 text-5xl ${appState.correct ? 'animate-[anxPulseCorrect_220ms_ease-out]' : 'animate-[anxShakeIncorrect_260ms_ease-out]'}`}
          >
            {appState.correct ? '✅' : '❌'}
          </div>
          <h2 className="mb-4 text-xl font-bold" style={{ color: appState.correct ? 'var(--anx-success)' : 'var(--anx-danger)' }}>
            {appState.correct ? 'Correct!' : 'Not quite…'}
          </h2>
          {appState.nextItem ? null : (
            <p className="mb-4 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              Your teacher will decide the next move.
            </p>
          )}
          <button
            onClick={handleNext}
            className="anx-btn-primary px-6 py-2"
          >
            {appState.nextItem ? 'Next question →' : 'Keep going'}
          </button>
        </div>
        </main>
      </AppChrome>
    );
  }

  // ── Done screen ─────────────────────────────────────────────────────────────
  return (
    <AppChrome variant="student">
      <main className="anx-shell anx-scene flex flex-1 items-center justify-center">
      <div className="anx-panel w-full max-w-sm p-8 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h2 className="mb-2 text-xl font-bold" style={{ color: 'var(--anx-text)' }}>All done!</h2>
        <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          You&apos;ve completed all questions for this session.
        </p>
      </div>
      </main>
    </AppChrome>
  );
}
