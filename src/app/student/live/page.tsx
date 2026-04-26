'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppChrome } from '@/components/AppChrome';
import { StudentFlowHero } from '@/components/student/StudentFlowHero';
import { StudentLiveView, type StudentLiveScreen } from '@/components/student/live/StudentLiveView';
import { StudentExplanationView } from '@/components/student/live/StudentExplanationView';
import {
  StudentPracticeView,
  type Confidence,
  type PracticeQuestion,
} from '@/components/student/live/StudentPracticeView';
import { stripStudentQuestionLabel } from '@/features/items/itemMeta';
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

interface ExplanationRouteData {
  id: string;
  routeType: string;
  misconceptionSummary: string;
  workedExample: string;
  animationSchema: unknown;
}

interface CurrentContent {
  contentType: 'EXPLANATION' | 'MESSAGE' | 'PHASE' | 'WHITEBOARD';
  targetLanes?: string[];
  message?: string;
  phaseIndex?: number;
  broadcastAt?: string;
  whiteboard?: LiveWhiteboardPayload;
  explanation?: ExplanationRouteData;
  stepIndex?: number;
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
  | { phase: 'explanation'; session: JoinedSession; explanationRoute: ExplanationRouteData; stepIndex: number; whiteboard: LiveWhiteboardPayload | null }
  | { phase: 'question'; session: JoinedSession; item: Item }
  | { phase: 'practice'; session: JoinedSession; item: Item; index: number; total: number }
  | { phase: 'feedback'; session: JoinedSession; correct: boolean; nextItem: Item | null; index: number; total: number }
  | { phase: 'done'; session: JoinedSession };

function broadcastTargetsStudentLane(content: CurrentContent, studentLane: string | null | undefined): boolean {
  const lanes = content.targetLanes;
  if (!lanes || lanes.length === 0) return true;
  if (!studentLane) return true;
  return lanes.includes(studentLane);
}

export default function StudentLivePage() {
  const { data: authSession, status } = useSession();
  const isPracticeMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'practice';

  const initialCode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('code')?.toUpperCase().slice(0, 6) ?? ''
      : '';

  const [joinCode, setJoinCode] = useState(initialCode);
  const [appState, setAppState] = useState<AppState>({ phase: 'join' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lastPhaseIndexRef = useRef<number>(-1);
  const lastBroadcastAtRef = useRef<string | null>(null);
  const lastWhiteboardVersionRef = useRef<number>(-1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<JoinedSession | null>(null);
  const liveWhiteboardRef = useRef<LiveWhiteboardPayload | null>(null);

  useEffect(() => {
    if (appState.phase !== 'join') {
      sessionRef.current = (appState as { session: JoinedSession }).session ?? null;
    }
    if (appState.phase === 'whiteboard') {
      liveWhiteboardRef.current = appState.whiteboard;
    }
    if (appState.phase === 'explanation') {
      liveWhiteboardRef.current = appState.whiteboard;
    }
  }, [appState]);

  useEffect(() => {
    const isInSession = appState.phase !== 'join' && appState.phase !== 'done';
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

        if (data.status === 'COMPLETED') {
          const sess = sessionRef.current;
          if (sess) setAppState({ phase: 'done', session: sess });
          return;
        }

        const phaseChanged = data.currentPhaseIndex !== lastPhaseIndexRef.current && lastPhaseIndexRef.current !== -1;
        const newBroadcast = data.currentContent?.broadcastAt && data.currentContent.broadcastAt !== lastBroadcastAtRef.current;

        if (phaseChanged) {
          lastPhaseIndexRef.current = data.currentPhaseIndex;
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
          if (cc.contentType === 'EXPLANATION' && laneOk && cc.explanation) {
            const sess = sessionRef.current;
            if (sess) {
              setAppState({
                phase: 'explanation',
                session: sess,
                explanationRoute: cc.explanation,
                stepIndex: cc.stepIndex ?? 0,
                whiteboard: liveWhiteboardRef.current,
              });
            }
          } else if (cc.contentType === 'WHITEBOARD' && laneOk && cc.whiteboard) {
            const wb = cc.whiteboard;
            const sess = sessionRef.current;
            if (!sess) return;
            if (wb.action === 'hide') {
              lastWhiteboardVersionRef.current = wb.version;
              liveWhiteboardRef.current = null;
              setAppState({ phase: 'waiting', session: sess });
            } else if (wb.action === 'show' || wb.action === 'clear') {
              if (wb.version >= lastWhiteboardVersionRef.current) {
                lastWhiteboardVersionRef.current = wb.version;
                liveWhiteboardRef.current = wb;
                // Stay in explanation phase on 'show' (incremental annotation).
                // On 'clear' the teacher is resetting the board — exit explanation.
                setAppState((prev) => {
                  if (prev.phase === 'explanation' && wb.action === 'show') return { ...prev, whiteboard: wb };
                  return { phase: 'whiteboard', session: sess, whiteboard: wb };
                });
              }
            }
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
        // silent
      }
    }

    const pollMs = appState.phase === 'whiteboard' || appState.phase === 'explanation' ? 1500 : 3000;
    pollRef.current = setInterval(pollSession, pollMs);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.phase]);

  if (status === 'loading') {
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="anx-flow-loading-card">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-[var(--anx-surface-container-high)] border-t-[var(--anx-primary)]" />
            <div>
              <p className="m-0 text-base font-semibold" style={{ color: 'var(--anx-text)' }}>Opening live room…</p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                One moment while we load your session.
              </p>
            </div>
          </div>
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
      setAppState({ phase: 'waiting', session });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitCheckAnswer(answer: string) {
    if (appState.phase !== 'question') return;
    setSubmitError(null);
    const { session, item } = appState;
    const skillId = session.skill?.id;
    if (!skillId) { setSubmitError('No skill associated with this session.'); return; }

    setLoading(true);
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
        setSubmitError(data.error ?? 'Failed to submit answer.');
        return;
      }
      const result: { correct: boolean; nextItem: Item | null } = await res.json();
      setAppState({ phase: 'feedback', session, correct: result.correct, nextItem: result.nextItem, index: 1, total: 1 });
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitPracticeAnswer(answer: string, _confidence: Confidence | null) {
    if (appState.phase !== 'practice') return;
    void _confidence; // confidence is captured client-side; backend integration is left for a follow-up
    setSubmitError(null);
    const { session, item, index, total } = appState;
    const skillId = session.skill?.id;
    if (!skillId) { setSubmitError('No skill associated with this session.'); return; }

    setLoading(true);
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
        setSubmitError(data.error ?? 'Failed to submit answer.');
        return;
      }
      const result: { correct: boolean; nextItem: Item | null } = await res.json();
      setAppState({ phase: 'feedback', session, correct: result.correct, nextItem: result.nextItem, index, total });
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Join screen ─────────────────────────────────────────────────────────
  if (appState.phase === 'join') {
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-12">
          <div className="w-full max-w-md space-y-6">
            <StudentFlowHero
              variant="compact"
              eyebrow="Live lesson"
              title="Join your class"
              lead="Enter the six-letter code your teacher shows on the board."
            />
            <div className="anx-card space-y-5 p-6 sm:p-8">
              {error ? <div className="anx-callout-danger text-sm">{error}</div> : null}
              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label htmlFor="joinCode" className="mb-2 block text-sm font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
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
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                    Codes are not case-sensitive. You need all six characters before joining.
                  </p>
                </div>
                <button type="submit" disabled={loading || joinCode.length !== 6} className="anx-btn-primary w-full py-3.5">
                  {loading ? 'Joining…' : 'Join lesson'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </AppChrome>
    );
  }

  // ── Done ────────────────────────────────────────────────────────────────
  if (appState.phase === 'done') {
    return (
      <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)]">
        <header
          className="flex items-center gap-3 border-b px-4 py-3 sm:px-6"
          style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)' }}
        >
          <Image src="/Ember_logo_icon.png" alt="Ember" width={512} height={512} className="h-7 w-7" priority />
          <span className="anx-live-pill" style={{ background: 'var(--anx-success-soft)', color: 'var(--anx-success)' }}>Ended</span>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="anx-card w-full max-w-md space-y-5 p-8 text-center">
            <div className="text-5xl" aria-hidden>🎉</div>
            <div>
              <p className="student-dash-eyebrow">Live lesson</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>All done</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                You&apos;ve completed the questions for this session. Head home when your teacher dismisses you.
              </p>
            </div>
            <Link href="/dashboard" className="anx-btn-primary inline-flex w-full justify-center py-3.5 no-underline sm:w-auto sm:min-w-[12rem]">
              Back to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const session = (appState as { session: JoinedSession }).session;
  const lessonTitle = session.skill?.name ?? session.subject.title;
  const classLabel = session.skill?.code ?? session.subject.title;

  // ── Feedback after a check ─────────────────────────────────────────────
  if (appState.phase === 'feedback') {
    return (
      <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)]">
        <header
          className="flex items-center gap-3 border-b px-4 py-3 sm:px-6"
          style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)' }}
        >
          <Image src="/Ember_logo_icon.png" alt="Ember" width={512} height={512} className="h-7 w-7" priority />
          <span className="anx-live-pill"><span className="anx-live-pill-dot" />Live</span>
          <p className="ml-2 truncate text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>{lessonTitle}</p>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="anx-card w-full max-w-md space-y-5 p-8 text-center">
            <div className={`text-5xl ${appState.correct ? 'animate-[anxPulseCorrect_220ms_ease-out]' : 'animate-[anxShakeIncorrect_260ms_ease-out]'}`} aria-hidden>
              {appState.correct ? '✅' : '❌'}
            </div>
            <div>
              <p className="student-dash-eyebrow">Live lesson</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: appState.correct ? 'var(--anx-success)' : 'var(--anx-danger)' }}>
                {appState.correct ? 'Nice one!' : 'Not quite…'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                Your teacher will guide what happens next.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const sess = appState.session;
                if (appState.nextItem) {
                  setAppState({ phase: 'practice', session: sess, item: appState.nextItem, index: appState.index + 1, total: appState.total });
                } else {
                  setAppState({ phase: 'waiting', session: sess });
                }
              }}
              className="anx-btn-primary w-full py-3.5 sm:w-auto sm:min-w-[12rem]"
            >
              {appState.nextItem ? 'Next question' : 'Keep going'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Practice mode ──────────────────────────────────────────────────────
  if (appState.phase === 'practice' || isPracticeMode) {
    if (appState.phase !== 'practice') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[color:var(--anx-surface-bright)] px-4">
          <div className="anx-card w-full max-w-md space-y-3 p-8 text-center">
            <h2 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>No practice available</h2>
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              Your teacher hasn’t pushed practice work yet.
            </p>
          </div>
        </div>
      );
    }
    const item = appState.item;
    const stem = stripStudentQuestionLabel(item.question) || item.question;
    const question: PracticeQuestion = {
      id: item.id,
      stem: <p className="m-0 whitespace-pre-wrap">{stem}</p>,
      answerPrefix: 'x =',
      placeholder: 'Type your answer…',
      tip: 'Take your time — read the question carefully first.',
    };
    return (
      <StudentPracticeView
        lessonTitle={lessonTitle}
        classLabel={classLabel}
        question={question}
        questionNumber={appState.index}
        totalQuestions={appState.total}
        busy={loading}
        error={submitError}
        onSubmit={submitPracticeAnswer}
        onLeave={() => setAppState({ phase: 'waiting', session: appState.session })}
        onMessageTeacher={(msg) => {
          // For now: surface as a flag/intervention via a generic message endpoint stub.
          void fetch(`/api/live-sessions/${appState.session.sessionId}/escalate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'student_message', message: msg }),
          }).catch(() => {});
        }}
        onNeedHelp={() => {
          void fetch(`/api/live-sessions/${appState.session.sessionId}/escalate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'student_help_request' }),
          }).catch(() => {});
        }}
      />
    );
  }

  // ── Explanation mode ───────────────────────────────────────────────────
  if (appState.phase === 'explanation') {
    return (
      <StudentExplanationView
        lessonTitle={lessonTitle}
        classLabel={classLabel}
        explanationRoute={appState.explanationRoute}
        stepIndex={appState.stepIndex}
        whiteboard={appState.whiteboard}
        onLeave={() => setAppState({ phase: 'waiting', session })}
        onNeedHelp={() => {
          void fetch(`/api/live-sessions/${session.sessionId}/escalate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'student_help_request' }),
          }).catch(() => {});
        }}
      />
    );
  }

  // ── Live model / check / waiting ───────────────────────────────────────
  let screen: StudentLiveScreen;
  if (appState.phase === 'between-phases') {
    screen = { kind: 'message', message: appState.message };
  } else if (appState.phase === 'whiteboard') {
    screen = { kind: 'watch', whiteboard: appState.whiteboard };
  } else if (appState.phase === 'question') {
    const opts = Array.isArray(appState.item.options) ? (appState.item.options as string[]) : [];
    const stem = stripStudentQuestionLabel(appState.item.question) || appState.item.question;
    screen = {
      kind: 'check',
      whiteboard: liveWhiteboardRef.current,
      questionStem: stem,
      options: opts.length > 0 ? opts : undefined,
      busy: loading,
      error: submitError,
      onSubmit: submitCheckAnswer,
    };
  } else {
    // waiting
    screen = { kind: 'waiting' };
  }

  return (
    <StudentLiveView
      lessonTitle={lessonTitle}
      classLabel={classLabel}
      screen={screen}
      onLeave={() => setAppState({ phase: 'done', session })}
      onNeedHelp={() => {
        void fetch(`/api/live-sessions/${session.sessionId}/escalate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'student_help_request' }),
        }).catch(() => {});
      }}
      onMessageTeacher={(msg) => {
        void fetch(`/api/live-sessions/${session.sessionId}/escalate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'student_message', message: msg }),
        }).catch(() => {});
      }}
    />
  );
}
