'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnnotationCanvas,
  type AnnotationCanvasHandle,
  type AnnotationCanvasState,
  CANVAS_W,
  CANVAS_H,
  type CanvasTool,
} from './AnnotationCanvas';
import { AnnotationToolbar } from './AnnotationToolbar';
import { TeachingModePanel, type TeachingMode } from './TeachingModePanel';
import { AnimationRenderer } from '@/components/explanation/AnimationRenderer';
import { StudentSignalsPanel, type ClassOverview, type InterpretedSignal } from './StudentSignalsPanel';
import { TeacherBottomBar } from './TeacherBottomBar';
import { InviteIcon, SettingsIcon } from './icons';
import type { LiveStroke } from '@/lib/live/whiteboard-strokes';

interface LessonPhase {
  index: number;
  skillId: string;
  skillCode: string;
  skillName: string;
  type: 'PRACTICE' | 'EXPLANATION';
  label: string;
}

interface ResponseSummary {
  skillId: string;
  totalParticipants: number;
  answeredCount: number;
  correctCount: number;
}

interface LaneStudent {
  id: string;
  name: string | null;
  email: string;
  hasFlag?: boolean;
}

interface SupportSummary {
  shownCount: number;
  acknowledgedCount: number;
  recheckStartedCount: number;
  rejoinedCount: number;
  escalatedCount: number;
  latestOutcomes: Array<{
    studentUserId: string;
    studentName: string;
    outcome: 'rejoined_lane_1' | 'stayed_lane_2' | 'escalated_lane_3';
    createdAt: string;
  }>;
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
  supportSummary?: SupportSummary;
  skill?: { id: string; code: string; name: string } | null;
}

interface RouteWithSteps {
  id: string;
  routeType: 'A' | 'B' | 'C';
  misconceptionSummary: string;
  workedExample: string;
  animationSchema: unknown;
  steps: { title: string; explanation: string }[];
}

interface ActiveExplanation {
  route: RouteWithSteps;
  stepIndex: number;
}

interface Props {
  sessionId: string;
}

const BROADCAST_DEBOUNCE_MS = 350;

function deriveSignals(snapshot: SessionSnapshot | null): {
  overview: ClassOverview;
  signals: InterpretedSignal[];
  topMisconception: { text: string; studentCount: number } | null;
  suggestedMove: { text: string; cta?: string } | null;
} {
  if (!snapshot) {
    return {
      overview: { total: 0, responded: 0, correct: 0, partiallyCorrect: 0, incorrect: 0 },
      signals: [],
      topMisconception: null,
      suggestedMove: null,
    };
  }
  const total = snapshot.participantCount;
  const summary = snapshot.responseSummary[0];
  const responded = summary?.answeredCount ?? 0;
  const correct = summary?.correctCount ?? 0;
  const incorrect = Math.max(0, responded - correct);

  const overview: ClassOverview = {
    total,
    responded,
    correct,
    partiallyCorrect: 0,
    incorrect,
  };

  const skillName = snapshot.skill?.name ?? 'this concept';
  const correctRate = responded > 0 ? correct / responded : 0;

  const signals: InterpretedSignal[] = [];
  if (responded === 0 && snapshot.status === 'ACTIVE') {
    signals.push({ tone: 'warn', text: 'Waiting for the class to respond.' });
  } else {
    if (correctRate >= 0.7) {
      signals.push({ tone: 'ok', text: `Most students understand ${skillName}.` });
    } else if (correctRate >= 0.4) {
      signals.push({ tone: 'warn', text: `Many are still working through ${skillName}.` });
    } else if (responded > 0) {
      signals.push({ tone: 'issue', text: `Many are struggling with ${skillName}.` });
    }
  }
  if (snapshot.laneCounts.LANE_3 > 0) {
    signals.push({
      tone: 'issue',
      text: `${snapshot.laneCounts.LANE_3} student${snapshot.laneCounts.LANE_3 === 1 ? '' : 's'} need${snapshot.laneCounts.LANE_3 === 1 ? 's' : ''} a reteach.`,
    });
  }
  if (snapshot.laneCounts.LANE_2 >= 3) {
    signals.push({ tone: 'warn', text: 'Sign errors are appearing in several answers.' });
  }

  const topMisconception =
    snapshot.laneCounts.LANE_3 > 0
      ? {
          text: `Common mistake on the most recent ${skillName} question.`,
          studentCount: snapshot.laneCounts.LANE_3,
        }
      : null;

  const suggestedMove =
    correctRate < 0.5 && responded > 0
      ? { text: `Reinforce ${skillName} with a quick worked example.`, cta: 'Show example' }
      : snapshot.laneCounts.LANE_3 > 0
        ? { text: 'Push a misconception repair to Lane 3.', cta: 'Send repair' }
        : null;

  return { overview, signals, topMisconception, suggestedMove };
}

function classLabel(snapshot: SessionSnapshot | null): string {
  if (!snapshot?.skill) return 'Live class';
  return snapshot.skill.code ?? 'Live class';
}

function lessonTitle(snapshot: SessionSnapshot | null): string {
  return snapshot?.skill?.name ?? 'Live lesson';
}

export function TeacherLiveWorkspace({ sessionId }: Props) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<CanvasTool>('pen');
  const [color, setColor] = useState<string>('#1f1f23');
  const [mode, setMode] = useState<TeachingMode>('CHECK');
  const [screensLocked, setScreensLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [endingPrompt, setEndingPrompt] = useState(false);
  const [latestVersion, setLatestVersion] = useState(0);

  const [availableRoutes, setAvailableRoutes] = useState<Record<string, RouteWithSteps> | null>(null);
  const [activeExplanation, setActiveExplanation] = useState<ActiveExplanation | null>(null);

  const canvasRef = useRef<AnnotationCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingStateRef = useRef<{ state: AnnotationCanvasState; version: number } | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasEnsuredVisibleRef = useRef(false);

  // ── Snapshot loading (SSE + polling fallback) ──────────────────────────────
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/state`);
      if (!res.ok) {
        setError('Failed to load session.');
        return;
      }
      const data = await res.json();
      setSnapshot(data);
      setPaused(data.status === 'PAUSED');
    } catch {
      setError('Network error.');
    }
  }, [sessionId]);

  useEffect(() => {
    let sseConnected = false;

    function startPolling() {
      if (fallbackRef.current) return;
      fallbackRef.current = setInterval(fetchSnapshot, 3000);
    }

    fetchSnapshot();

    try {
      const es = new EventSource(`/api/live-sessions/${sessionId}/stream`);
      sseRef.current = es;
      es.addEventListener('state', (e) => {
        sseConnected = true;
        const data = JSON.parse((e as MessageEvent).data) as SessionSnapshot;
        setSnapshot(data);
        setPaused(data.status === 'PAUSED');
      });
      es.onerror = () => {
        if (!sseConnected) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      sseRef.current?.close();
      if (fallbackRef.current) clearInterval(fallbackRef.current);
    };
  }, [sessionId, fetchSnapshot]);

  // ── Explanation routes for current skill ──────────────────────────────────
  useEffect(() => {
    if (!snapshot) return;
    setAvailableRoutes(null); // clear stale routes before fetching for the new phase
    fetch(`/api/live-sessions/${sessionId}/explanation-routes`)
      .then((r) => r.json())
      .then((data: { routes: Record<string, RouteWithSteps> }) => setAvailableRoutes(data.routes))
      .catch(() => { /* soft fail */ });
  }, [sessionId, snapshot?.skill?.id, snapshot?.currentPhaseIndex]);

  // When leaving EXPLAIN mode, clear the canvas and broadcast 'clear' so students exit
  // the explanation phase. The 'clear' action is the exit signal on the student side.
  const prevModeRef = useRef<TeachingMode>(mode);
  useEffect(() => {
    const wasExplain = prevModeRef.current === 'EXPLAIN';
    prevModeRef.current = mode;
    if (wasExplain && mode !== 'EXPLAIN') {
      setActiveExplanation(null);
      canvasRef.current?.clear();
      const v = Date.now();
      setLatestVersion(v);
      void broadcastStrokes([], v, 'clear');
    } else if (mode !== 'EXPLAIN') {
      setActiveExplanation(null);
    }
  }, [mode, broadcastStrokes]);

  // ── Canvas → student broadcast ─────────────────────────────────────────────
  const broadcastStrokes = useCallback(
    async (strokes: LiveStroke[], version: number, action: 'show' | 'clear' | 'hide' = 'show') => {
      try {
        await fetch(`/api/live-sessions/${sessionId}/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lanes: ['LANE_1', 'LANE_2', 'LANE_3'],
            contentType: 'WHITEBOARD',
            whiteboard: {
              action,
              width: CANVAS_W,
              height: CANVAS_H,
              version,
              strokes,
            },
          }),
        });
      } catch {
        // soft fail — students get next version on the next stroke
      }
    },
    [sessionId],
  );

  const ensureVisibleToStudents = useCallback(async () => {
    if (hasEnsuredVisibleRef.current) return;
    hasEnsuredVisibleRef.current = true;
    setLatestVersion((v) => v + 1);
    await broadcastStrokes([], Date.now(), 'show');
  }, [broadcastStrokes]);

  useEffect(() => {
    if (snapshot?.status === 'ACTIVE') {
      void ensureVisibleToStudents();
    }
  }, [snapshot?.status, ensureVisibleToStudents]);

  function scheduleBroadcast(state: AnnotationCanvasState, version: number) {
    pendingStateRef.current = { state, version };
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    broadcastTimerRef.current = setTimeout(() => {
      const pending = pendingStateRef.current;
      if (!pending) return;
      pendingStateRef.current = null;
      setLatestVersion(pending.version);
      void broadcastStrokes(pending.state.strokes, pending.version, 'show');
    }, BROADCAST_DEBOUNCE_MS);
  }

  // ── Status controls ───────────────────────────────────────────────────────
  async function setStatus(next: 'ACTIVE' | 'PAUSED' | 'COMPLETED') {
    await fetch(`/api/live-sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    fetchSnapshot();
  }

  // ── Top bar interactions ──────────────────────────────────────────────────
  function copyJoinCode() {
    if (!snapshot?.joinCode) return;
    navigator.clipboard.writeText(snapshot.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  // ── Canvas convenience ────────────────────────────────────────────────────
  function handleInsertImageRequest() {
    fileInputRef.current?.click();
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await canvasRef.current?.insertImage(file);
    e.target.value = '';
  }

  function handleClearBoard() {
    canvasRef.current?.clear();
    const v = Date.now();
    setLatestVersion(v);
    void broadcastStrokes([], v, 'clear');
  }

  // ── Mode-driven actions ───────────────────────────────────────────────────
  function handleNewCheckQuestion() {
    canvasRef.current?.insertText('New check question — type the prompt');
  }

  async function handleExplainOption(option: 'easier' | 'wrong-vs-right' | 'misconception' | 'comparison') {
    const typeMap: Record<typeof option, 'A' | 'B' | 'C'> = {
      easier: 'B',
      'wrong-vs-right': 'A',
      comparison: 'A',
      misconception: 'C',
    };
    const route = availableRoutes?.[typeMap[option]];
    if (!route) return;

    setActiveExplanation({ route, stepIndex: 0 });
    canvasRef.current?.clear();

    try {
      await fetch(`/api/live-sessions/${sessionId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'EXPLANATION',
          explanationRouteId: route.id,
          stepIndex: 0,
        }),
      });
    } catch {
      // soft fail
    }
  }

  async function handleStepChange(newStep: number) {
    if (!activeExplanation) return;
    setActiveExplanation((prev) => (prev ? { ...prev, stepIndex: newStep } : null));
    try {
      await fetch(`/api/live-sessions/${sessionId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'EXPLANATION',
          explanationRouteId: activeExplanation.route.id,
          stepIndex: newStep,
        }),
      });
    } catch {
      // soft fail
    }
  }
  async function handleAssignPractice(
    kind: 'easier' | 'similar' | 'challenge' | 'misconception',
    audience: 'all' | 'lane' | 'individual',
  ) {
    const lanes =
      audience === 'all'
        ? ['LANE_1', 'LANE_2', 'LANE_3']
        : audience === 'lane'
          ? ['LANE_2']
          : ['LANE_3'];
    try {
      await fetch(`/api/live-sessions/${sessionId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lanes,
          contentType: 'MESSAGE',
          message: `Practice → ${kind} (${audience}). Open your devices.`,
        }),
      });
    } catch {
      // ignore — visual cue stays in canvas
    }
  }

  // ── Derived presentation ──────────────────────────────────────────────────
  const studentSignals = useMemo(() => deriveSignals(snapshot), [snapshot]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="anx-callout-danger max-w-md text-center text-sm">{error}</div>
        <Link href="/teacher/dashboard" className="anx-btn-secondary mt-6 px-5 py-2.5 text-sm no-underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const sessionStatus = snapshot?.status ?? 'LOBBY';

  return (
    <div className="anx-workspace-shell">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="anx-workspace-topbar">
        <Link
          href="/teacher/dashboard"
          className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-[var(--anx-surface-hover)]"
          aria-label="Ember home"
        >
          <Image src="/Ember_logo_icon.png" alt="Ember" width={512} height={512} className="h-7 w-7" priority />
        </Link>

        <span className="anx-live-pill">
          <span className="anx-live-pill-dot" />
          {sessionStatus === 'PAUSED' ? 'Paused' : sessionStatus === 'COMPLETED' ? 'Ended' : 'Live'}
        </span>

        <div className="min-w-0">
          <p className="text-xs font-medium leading-none" style={{ color: 'var(--anx-text-muted)' }}>
            {classLabel(snapshot)}
          </p>
          <p className="mt-1 truncate text-base font-bold leading-none" style={{ color: 'var(--anx-text)' }}>
            {lessonTitle(snapshot)}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
          >
            <span aria-hidden>👥</span>
            {snapshot?.participantCount ?? 0} students
          </span>

          <button
            type="button"
            onClick={copyJoinCode}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition hover:bg-[var(--anx-surface-hover)]"
            style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
            title="Copy join code"
          >
            <InviteIcon size={14} />
            {copied ? 'Copied' : 'Invite'}
            {snapshot?.joinCode && (
              <span className="font-mono text-[11px]" style={{ color: 'var(--anx-primary)' }}>
                {snapshot.joinCode}
              </span>
            )}
          </button>

          <Link
            href={`/teacher/live/${sessionId}/lanes`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--anx-surface-hover)]"
            style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
            aria-label="Settings / lane view"
            title="Lane view & settings"
          >
            <SettingsIcon size={16} />
          </Link>

          {sessionStatus === 'LOBBY' && (
            <button
              type="button"
              onClick={() => setStatus('ACTIVE')}
              className="anx-btn-primary px-3 py-1.5 text-xs"
            >
              Start lesson
            </button>
          )}
          {(sessionStatus === 'ACTIVE' || sessionStatus === 'PAUSED') && (
            <button
              type="button"
              onClick={() => setEndingPrompt(true)}
              className="anx-workspace-bottombar-btn"
              data-tone="danger"
              style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--anx-danger)' }}
            >
              End session
            </button>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="anx-workspace-body">
        <AnnotationToolbar
          tool={tool}
          color={color}
          onToolChange={setTool}
          onColorChange={setColor}
          onUndo={() => canvasRef.current?.undo()}
          onRedo={() => canvasRef.current?.redo()}
          onInsertImage={handleInsertImageRequest}
        />

        <div className="anx-canvas-stage">
          <div className="anx-canvas-board" style={{ position: 'relative' }}>
            {/* Explanation layer — AnimationRenderer sits behind the transparent canvas */}
            {activeExplanation?.route.animationSchema && (
              <div
                className="absolute inset-0 overflow-hidden bg-white"
                style={{ zIndex: 0 }}
              >
                <AnimationRenderer
                  schema={activeExplanation.route.animationSchema as Parameters<typeof AnimationRenderer>[0]['schema']}
                  currentStep={activeExplanation.stepIndex}
                  onStepChange={handleStepChange}
                />
              </div>
            )}
            <AnnotationCanvas
              ref={canvasRef}
              tool={tool}
              color={color}
              width={3}
              onStateChange={scheduleBroadcast}
              transparent={!!activeExplanation}
              watermark={
                !activeExplanation && sessionStatus === 'LOBBY' ? 'Lesson starts when you click Start' : undefined
              }
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
            {sessionStatus === 'ACTIVE' && (
              <div className="anx-canvas-floating">
                <span className="anx-canvas-floating-label">Mode</span>
                <span style={{ color: 'var(--anx-primary)', fontWeight: 600, fontSize: 12 }}>
                  {mode === 'CHECK' && 'Check understanding'}
                  {mode === 'MODEL' && 'Modelling'}
                  {mode === 'EXPLAIN' && 'Explaining'}
                  {mode === 'PRACTICE' && 'Practice'}
                </span>
              </div>
            )}
          </div>
        </div>

        <aside className="anx-workspace-side">
          <TeachingModePanel
            mode={mode}
            onModeChange={setMode}
            onNewCheckQuestion={handleNewCheckQuestion}
            onExplainOption={handleExplainOption}
            onAssignPractice={handleAssignPractice}
            activeExplanation={
              activeExplanation
                ? {
                    routeType: activeExplanation.route.routeType,
                    stepIndex: activeExplanation.stepIndex,
                    totalSteps:
                      (activeExplanation.route.animationSchema as { steps?: unknown[] } | null)?.steps?.length ?? 1,
                  }
                : null
            }
            onStepChange={handleStepChange}
          />
          <StudentSignalsPanel
            overview={studentSignals.overview}
            signals={studentSignals.signals}
            topMisconception={studentSignals.topMisconception}
            suggestedMove={
              studentSignals.suggestedMove
                ? {
                    ...studentSignals.suggestedMove,
                    onAct: () => setMode('EXPLAIN'),
                  }
                : null
            }
          />
        </aside>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <TeacherBottomBar
        paused={paused}
        screensLocked={screensLocked}
        onTogglePause={() => setStatus(paused ? 'ACTIVE' : 'PAUSED')}
        onStudentsView={() => window.open('/student/live', '_blank', 'noopener')}
        onLockScreens={() => setScreensLocked((v) => !v)}
        onClearBoard={handleClearBoard}
        onMore={() => {
          /* future overflow menu */
        }}
      />

      {/* End session confirmation */}
      {endingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="anx-card max-w-sm space-y-4 p-6">
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--anx-text)' }}>
                End the session?
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                Students will be returned to their dashboard. You can review responses afterwards.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEndingPrompt(false)} className="anx-btn-secondary px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setEndingPrompt(false);
                  void setStatus('COMPLETED');
                }}
                className="anx-btn-primary px-4 py-2 text-sm"
                style={{ background: 'var(--anx-danger-text)' }}
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden version readout for downstream tests / debug */}
      <span aria-hidden style={{ display: 'none' }} data-canvas-version={latestVersion} />
    </div>
  );
}
