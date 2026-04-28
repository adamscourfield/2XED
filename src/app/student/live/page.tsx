'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
import type { CanvasInputData } from '@/components/question/CanvasInput';
import { stripStudentQuestionLabel } from '@/features/items/itemMeta';
import type { LiveWhiteboardPayload } from '@/lib/live/whiteboard-strokes';
import { StudentLiveUnifiedShell } from '@/components/student/live/StudentLiveUnifiedShell';
import { StudentLiveSceneShell } from '@/components/student/live/StudentLiveSceneShell';
import type { StudentLiveChromeMode } from '@/components/student/live/StudentLiveSessionChrome';
import { appShellPhaseToStripStep, type LiveStripStepId } from '@/components/student/live/StudentLivePhaseStrip';
import { StudentFeedbackConfetti } from '@/components/student/live/StudentFeedbackEffects';
import { useLivePhasePrimaryFocus } from '@/components/student/live/useLivePhasePrimaryFocus';

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
  /** Present for opening checks / differentiated queue */
  skillId?: string;
}

interface ExplanationRouteData {
  id: string;
  routeType: string;
  misconceptionSummary: string;
  workedExample: string;
  animationSchema: unknown;
}

interface CurrentContent {
  contentType: 'EXPLANATION' | 'MESSAGE' | 'PHASE' | 'WHITEBOARD' | 'PRACTICE' | 'CHECK';
  targetLanes?: string[];
  message?: string;
  phaseIndex?: number;
  broadcastAt?: string;
  whiteboard?: LiveWhiteboardPayload;
  explanation?: ExplanationRouteData;
  stepIndex?: number;
  totalSteps?: number;
  item?: Item;
  totalQuestions?: number;
  questionNumber?: number;
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
  | { phase: 'explanation'; session: JoinedSession; explanationRoute: ExplanationRouteData; stepIndex: number; totalSteps: number; whiteboard: LiveWhiteboardPayload | null }
  | { phase: 'question'; session: JoinedSession; item: Item; source: 'broadcast' | 'targeted' }
  | { phase: 'practice'; session: JoinedSession; item: Item; index: number; total: number }
  | { phase: 'feedback'; session: JoinedSession; correct: boolean; nextItem: (Item & { skillId?: string }) | null; index: number; total: number }
  | { phase: 'done'; session: JoinedSession };

function broadcastTargetsStudentLane(content: CurrentContent, studentLane: string | null | undefined): boolean {
  const lanes = content.targetLanes;
  if (!lanes || lanes.length === 0) return true;
  if (!studentLane) return true;
  return lanes.includes(studentLane);
}

function shellChromeMode(state: AppState): StudentLiveChromeMode {
  if (state.phase === 'practice') return 'practice';
  if (state.phase === 'explanation') return 'explanation';
  if (state.phase === 'done') return 'ended';
  return 'live';
}

function shellPhaseHint(state: AppState): string | undefined {
  switch (state.phase) {
    case 'waiting':
      return 'Waiting · Teacher preparing';
    case 'between-phases':
      return 'Message · Read';
    case 'whiteboard':
      return 'Watching · Follow the board';
    case 'explanation':
      return `Model · Step ${Math.min(state.stepIndex + 1, state.totalSteps)} of ${Math.max(state.totalSteps, 1)}`;
    case 'question':
      return 'Quick check · Your answer';
    case 'practice':
      return 'Practice · Your turn';
    case 'feedback':
      return state.correct ? 'Feedback · Nice work' : 'Feedback · Keep going';
    case 'done':
      return 'Lesson ended';
    default:
      return undefined;
  }
}

function shellStripActive(state: AppState): LiveStripStepId {
  switch (state.phase) {
    case 'waiting':
      return appShellPhaseToStripStep('waiting');
    case 'between-phases':
      return appShellPhaseToStripStep('message');
    case 'whiteboard':
      return appShellPhaseToStripStep('watch');
    case 'explanation':
      return appShellPhaseToStripStep('model');
    case 'question':
      return appShellPhaseToStripStep('check');
    case 'practice':
      return appShellPhaseToStripStep('practice');
    case 'feedback':
      return appShellPhaseToStripStep('feedback');
    case 'done':
      return appShellPhaseToStripStep('done');
    default:
      return 'Ready';
  }
}

function studentLiveSceneKey(state: AppState): string {
  switch (state.phase) {
    case 'waiting':
      return 'waiting';
    case 'between-phases':
      return `msg-${state.message.slice(0, 48)}`;
    case 'whiteboard':
      return `wb-${state.whiteboard.version}`;
    case 'explanation':
      return `ex-${state.explanationRoute.id}-${state.stepIndex}`;
    case 'question':
      return `chk-${state.item.id}`;
    case 'practice':
      return `pr-${state.item.id}-${state.index}`;
    case 'feedback':
      return `fb-${state.session.sessionId}-${state.correct}-${state.index}-${state.nextItem?.id ?? 'none'}`;
    case 'done':
      return 'done';
    default:
      return 'live';
  }
}

const FEEDBACK_CORRECT_LINES = [
  'Your teacher will guide what happens next.',
  'Keep this tab open — the next step loads automatically.',
  'Take a breath — you can refine your thinking on the next one.',
] as const;

const FEEDBACK_INCORRECT_LINES = [
  'Mistakes are data — your teacher will steer from here.',
  'Hang tight — another question or explanation may follow.',
  'Stay curious — the next step often clicks things into place.',
] as const;

const FEEDBACK_CORRECT_TITLES = ['Nice one!', 'Got it!', 'Spot on!'] as const;
const FEEDBACK_INCORRECT_TITLES = ['Not quite…', 'Almost…', 'Keep thinking…'] as const;

export default function StudentLivePage() {
  const { data: authSession, status } = useSession();
  const isPracticeMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'practice';

  const initialCode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('code')?.toUpperCase().slice(0, 6) ?? ''
      : '';

  const [joinCode, setJoinCode] = useState(initialCode);
  const [joinCodeFlash, setJoinCodeFlash] = useState(false);
  const [appState, setAppState] = useState<AppState>({ phase: 'join' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pollSlowSince, setPollSlowSince] = useState<number | null>(null);

  const lastPhaseIndexRef = useRef<number>(-1);
  const lastBroadcastAtRef = useRef<string | null>(null);
  const lastWhiteboardVersionRef = useRef<number>(-1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<JoinedSession | null>(null);
  const liveWhiteboardRef = useRef<LiveWhiteboardPayload | null>(null);
  const lastExplanationTelemetryIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (joinCode.length === 6) {
      setJoinCodeFlash(true);
      const t = window.setTimeout(() => setJoinCodeFlash(false), 900);
      return () => window.clearTimeout(t);
    }
    setJoinCodeFlash(false);
    return undefined;
  }, [joinCode.length]);

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
      setPollSlowSince(null);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const sessionId = sessionRef.current?.sessionId;
    if (!sessionId) return;

    async function pollSession() {
      const sid = sessionRef.current?.sessionId;
      if (!sid) return;
      const pollStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
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
          const skipRecheckPull =
            appState.phase === 'question' || appState.phase === 'explanation' || appState.phase === 'feedback';
          if (sess && !skipRecheckPull) {
            setAppState({ phase: 'question', session: sess, item: data.pendingRecheckItem, source: 'targeted' });
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
                totalSteps: cc.totalSteps ?? (((cc.explanation.animationSchema as { steps?: unknown[] } | null)?.steps?.length ?? 1)),
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
          } else if (cc.contentType === 'PRACTICE' && laneOk && cc.item) {
            const sess = sessionRef.current;
            if (sess) {
              setAppState({
                phase: 'practice',
                session: sess,
                item: cc.item,
                index: cc.questionNumber ?? 1,
                total: cc.totalQuestions ?? 1,
              });
            }
          } else if (cc.contentType === 'CHECK' && laneOk && cc.item) {
            const sess = sessionRef.current;
            if (sess) {
              setAppState({
                phase: 'question',
                session: sess,
                item: cc.item,
                source: 'broadcast',
              });
            }
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
      } finally {
        const elapsed =
          typeof performance !== 'undefined'
            ? performance.now() - pollStartedAt
            : Date.now() - pollStartedAt;
        if (elapsed >= 1800) {
          setPollSlowSince((prev) => prev ?? Date.now());
        } else {
          setPollSlowSince(null);
        }
      }
    }

    const pollMs = appState.phase === 'whiteboard' || appState.phase === 'explanation' ? 1500 : 3000;
    pollRef.current = setInterval(pollSession, pollMs);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.phase]);

  const unifiedSceneKey =
    appState.phase === 'join' ? 'join' : studentLiveSceneKey(appState);

  useLivePhasePrimaryFocus(unifiedSceneKey);

  const feedbackVariantIdx = useMemo(() => {
    if (appState.phase !== 'feedback') return 0;
    let h = 0;
    const id = appState.session.sessionId;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    h = (h + (appState.correct ? 7919 : 9973) + appState.index * 17) | 0;
    return Math.abs(h);
  }, [appState]);

  const feedbackTitle =
    appState.phase === 'feedback'
      ? appState.correct
        ? FEEDBACK_CORRECT_TITLES[feedbackVariantIdx % FEEDBACK_CORRECT_TITLES.length]
        : FEEDBACK_INCORRECT_TITLES[feedbackVariantIdx % FEEDBACK_INCORRECT_TITLES.length]
      : '';

  const feedbackLine =
    appState.phase === 'feedback'
      ? appState.correct
        ? FEEDBACK_CORRECT_LINES[feedbackVariantIdx % FEEDBACK_CORRECT_LINES.length]
        : FEEDBACK_INCORRECT_LINES[feedbackVariantIdx % FEEDBACK_INCORRECT_LINES.length]
      : '';

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
      lastExplanationTelemetryIdRef.current = null;
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
    const { session, item, source } = appState;
    const skillId = item.skillId ?? session.skill?.id;
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
      const result: { correct: boolean; nextItem: (Item & { skillId?: string }) | null } = await res.json();
      setAppState({
        phase: 'feedback',
        session,
        correct: result.correct,
        nextItem: source === 'broadcast' ? null : result.nextItem,
        index: 1,
        total: 1,
      });
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitPracticeAnswer(answer: string, confidence: Confidence | null, canvasData?: CanvasInputData | null) {
    if (appState.phase !== 'practice') return;
    setSubmitError(null);
    const { session, item, index, total } = appState;
    const skillId = item.skillId ?? session.skill?.id;
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
          canvasData: canvasData
            ? {
                snapshotBase64: canvasData.snapshotBase64,
                snapshotCropped: canvasData.snapshotCropped,
                strokes: canvasData.strokes,
              }
            : null,
          responseTimeMs: Date.now() - start,
          ...(confidence ? { confidence } : {}),
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

  const session = appState.phase !== 'join' ? (appState as { session: JoinedSession }).session : null;
  const lessonTitle = session?.skill?.name ?? session?.subject.title ?? '';
  const classLabel = session?.skill?.code ?? session?.subject.title ?? '';

  // ── Join screen ─────────────────────────────────────────────────────────
  if (appState.phase === 'join') {
    return (
      <div key={unifiedSceneKey} className="anx-student-live-page-scene flex min-h-screen flex-1 flex-col">
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
                      className={`anx-input text-center text-2xl font-mono tracking-widest uppercase transition-shadow duration-300 ${joinCodeFlash ? 'student-join-code-ready' : ''}`}
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
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
      </div>
    );
  }

  if (!session) {
    return null;
  }

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
    screen = { kind: 'waiting' };
  }

  const coreEscalate = (body: Record<string, unknown>) => {
    void fetch(`/api/live-sessions/${session.sessionId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  };

  return (
    <div key={unifiedSceneKey} className="anx-student-live-page-scene flex min-h-screen flex-1 flex-col bg-[color:var(--anx-surface-bright)]">
      <StudentLiveUnifiedShell
        lessonTitle={lessonTitle}
        classLabel={classLabel}
        stripActive={shellStripActive(appState)}
        mode={shellChromeMode(appState)}
        phaseHint={shellPhaseHint(appState)}
        phaseHintSuffix={
          pollSlowSince != null ? 'Updating…' : undefined
        }
        onLeave={
          appState.phase === 'done'
            ? undefined
            : () => {
                if (appState.phase === 'practice' || appState.phase === 'explanation') {
                  setAppState({ phase: 'waiting', session });
                  return;
                }
                setAppState({ phase: 'done', session });
              }
        }
      >
        <StudentLiveSceneShell sceneKey={unifiedSceneKey}>
          {appState.phase === 'feedback' ? (
            <main className="relative flex flex-1 items-center justify-center px-4 py-10">
              <StudentFeedbackConfetti active={appState.correct} />
              <div className="anx-card relative w-full max-w-md space-y-5 p-8 text-center">
                <div
                  className={`text-5xl ${appState.correct ? 'animate-[anxPulseCorrect_220ms_ease-out]' : 'animate-[anxShakeIncorrect_260ms_ease-out]'}`}
                  aria-hidden
                >
                  {appState.correct ? '✅' : '❌'}
                </div>
                <div>
                  <p className="student-dash-eyebrow">Live lesson</p>
                  <h2
                    className="mt-2 text-2xl font-bold tracking-tight"
                    style={{ color: appState.correct ? 'var(--anx-success)' : 'var(--anx-danger)' }}
                  >
                    {feedbackTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                    {feedbackLine}
                  </p>
                  {appState.total > 1 ? (
                    <p className="mt-3 text-xs font-medium tabular-nums" style={{ color: 'var(--anx-text-muted)' }}>
                      Question {Math.min(appState.index, appState.total)} of {appState.total}
                      {appState.nextItem ? ' · Next up when you continue' : ''}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  data-live-primary-focus=""
                  onClick={() => {
                    const sess = appState.session;
                    if (appState.nextItem) {
                      const ni = appState.nextItem;
                      const mergedSession =
                        ni.skillId && sess.skill?.id !== ni.skillId
                          ? { ...sess, skill: { id: ni.skillId, code: sess.skill?.code ?? '', name: sess.skill?.name ?? '' } }
                          : sess;
                      const resumePractice = appState.total > 1;
                      if (resumePractice) {
                        setAppState({
                          phase: 'practice',
                          session: mergedSession,
                          item: ni,
                          index: appState.index + 1,
                          total: appState.total,
                        });
                      } else {
                        setAppState({ phase: 'question', session: mergedSession, item: ni, source: 'targeted' });
                      }
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
          ) : null}

          {appState.phase === 'done' ? (
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
                    You&apos;ve completed the questions for this session. Head home when your teacher dismisses you.
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
          ) : null}

          {appState.phase === 'practice' || isPracticeMode ? (
            appState.phase !== 'practice' ? (
              <main className="flex flex-1 items-center justify-center px-4 py-10">
                <div className="anx-card w-full max-w-md space-y-3 p-8 text-center">
                  <h2 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>
                    No practice available
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                    Your teacher hasn&apos;t pushed practice work yet.
                  </p>
                </div>
              </main>
            ) : (
              (() => {
                const item = appState.item;
                const stem = stripStudentQuestionLabel(item.question) || item.question;
                const options = Array.isArray(item.options)
                  ? (item.options as string[])
                  : item.options &&
                      typeof item.options === 'object' &&
                      Array.isArray((item.options as { choices?: unknown }).choices)
                    ? (item.options as { choices: unknown[] }).choices.filter((choice): choice is string => typeof choice === 'string')
                    : [];
                const question: PracticeQuestion = {
                  id: item.id,
                  type: item.type,
                  stem: <p className="m-0 whitespace-pre-wrap">{stem}</p>,
                  placeholder: item.type === 'EXTENDED_WRITING' ? 'Write your response here…' : 'Type your answer…',
                  tip: 'Take your time — read the question carefully first.',
                  options: options.length > 0 ? options : undefined,
                };
                return (
                  <StudentPracticeView
                    embedChromeless
                    lessonTitle={lessonTitle}
                    classLabel={classLabel}
                    question={question}
                    questionNumber={appState.index}
                    totalQuestions={appState.total}
                    busy={loading}
                    error={submitError}
                    onSubmit={submitPracticeAnswer}
                    onLeave={() => setAppState({ phase: 'waiting', session: appState.session })}
                    onMessageTeacher={(msg) => coreEscalate({ reason: 'student_message', message: msg })}
                    onNeedHelp={() => coreEscalate({ reason: 'student_help_request' })}
                  />
                );
              })()
            )
          ) : null}

          {appState.phase === 'explanation' ? (
            <StudentExplanationView
              embedChromeless
              lessonTitle={lessonTitle}
              classLabel={classLabel}
              explanationRoute={appState.explanationRoute}
              stepIndex={appState.stepIndex}
              totalSteps={appState.totalSteps}
              whiteboard={appState.whiteboard}
              onLeave={() => setAppState({ phase: 'waiting', session })}
              onNeedHelp={() => coreEscalate({ reason: 'student_help_request' })}
            />
          ) : null}

          {appState.phase === 'waiting' ||
          appState.phase === 'between-phases' ||
          appState.phase === 'whiteboard' ||
          appState.phase === 'question' ? (
            <StudentLiveView
              embedChromeless
              lessonTitle={lessonTitle}
              classLabel={classLabel}
              screen={screen}
              onLeave={() => setAppState({ phase: 'done', session })}
              onNeedHelp={() => coreEscalate({ reason: 'student_help_request' })}
              onMessageTeacher={(msg) => coreEscalate({ reason: 'student_message', message: msg })}
            />
          ) : null}
        </StudentLiveSceneShell>
      </StudentLiveUnifiedShell>
    </div>
  );
}
