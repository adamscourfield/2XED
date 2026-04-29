'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnnotationCanvas,
  annotationStateHasContent,
  type AnnotationCanvasHandle,
  type AnnotationCanvasState,
  CANVAS_W,
  CANVAS_H,
  type CanvasTool,
} from './AnnotationCanvas';
import { AnnotationToolbar } from './AnnotationToolbar';
import { TeachingModePanel, type TeachingMode } from './TeachingModePanel';
import { AnimationRenderer } from '@/components/explanation/AnimationRenderer';
import { StudentSignalsPanel, type ClassOverview, type InterpretedSignal, type MisconceptionSignal, type StudentMessageSignal, type StudentResponseDetail, type RubricCriterionSignal } from './StudentSignalsPanel';
import { TeacherBottomBar } from './TeacherBottomBar';
import { EndSessionDialog } from './EndSessionDialog';
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

function currentPhaseSkill(snapshot: SessionSnapshot | null): { id: string; code: string; name: string } | null {
  if (!snapshot?.phases?.length) return snapshot?.skill ?? null;
  const idx = Math.min(Math.max(0, snapshot.currentPhaseIndex), snapshot.phases.length - 1);
  const phase = snapshot.phases[idx];
  if (!phase?.skillId) return snapshot.skill ?? null;
  return {
    id: phase.skillId,
    code: phase.skillCode,
    name: phase.skillName,
  };
}

interface ResponseSummary {
  skillId: string;
  totalParticipants: number;
  answeredCount: number;
  correctCount: number;
  partialCount?: number;
  incorrectCount?: number;
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

interface RecommendedExplanation {
  explanationId: string;
  skillId: string;
  dle: number;
  routeType: string;
  misconceptionSummary: string;
  workedExample: string;
  animationSchema?: unknown | null;
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
  rubricCriteria?: RubricCriterionSignal[] | null;
  supportSummary?: SupportSummary;
  studentMessages?: StudentMessageSignal[] | null;
  skillId?: string | null;
  skill?: { id: string; code: string; name: string } | null;
  recommendedExplanation?: RecommendedExplanation | null;
  misconceptionSignals?: MisconceptionSignal[] | null;
  studentResponses?: StudentResponseDetail[] | null;
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
  misconceptionSignals: MisconceptionSignal[] | null;
  topMisconception: { text: string; studentCount: number } | null;
  suggestedMove: { text: string; cta?: string } | null;
} {
  if (!snapshot) {
    return {
      overview: { total: 0, responded: 0, correct: 0, partiallyCorrect: 0, incorrect: 0 },
      signals: [],
      misconceptionSignals: null,
      topMisconception: null,
      suggestedMove: null,
    };
  }
  const total = snapshot.participantCount;
  const focus = currentPhaseSkill(snapshot);
  const summary =
    focus && snapshot.responseSummary.length > 0
      ? snapshot.responseSummary.find((r) => r.skillId === focus.id) ?? snapshot.responseSummary[0]
      : snapshot.responseSummary[0];
  const responded = summary?.answeredCount ?? 0;
  const correct = summary?.correctCount ?? 0;
  const partial = summary?.partialCount ?? 0;
  const incorrect = summary?.incorrectCount ?? Math.max(0, responded - correct - partial);

  const overview: ClassOverview = {
    total,
    responded,
    correct,
    partiallyCorrect: partial,
    incorrect,
  };

  const skillName = focus?.name ?? snapshot.skill?.name ?? 'this concept';
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

  // Use real misconception signal data from the backend when available.
  const misconceptionSignals =
    snapshot.misconceptionSignals && snapshot.misconceptionSignals.length > 0
      ? snapshot.misconceptionSignals
      : null;

  // Legacy fallback: derive a rough top misconception from lane counts when
  // no tagged signals exist yet (e.g. early in the session, or authored items
  // without misconceptionMap).
  const topMisconception =
    !misconceptionSignals && snapshot.laneCounts.LANE_3 > 0
      ? {
          text: `Common mistake on the most recent ${skillName} question.`,
          studentCount: snapshot.laneCounts.LANE_3,
        }
      : null;

  // Surface the top misconception label in the interpretive signals if it's
  // affecting 3+ students, so the teacher gets a text-form alert too.
  if (misconceptionSignals && misconceptionSignals[0]?.studentCount >= 3) {
    signals.push({
      tone: 'issue',
      text: `${misconceptionSignals[0].studentCount} students: "${misconceptionSignals[0].label}"`,
    });
  }

  const suggestedMove =
    correctRate < 0.5 && responded > 0
      ? { text: `Reinforce ${skillName} with a quick worked example.`, cta: 'Show example' }
      : snapshot.laneCounts.LANE_3 > 0
        ? { text: 'Push a misconception repair to Lane 3.', cta: 'Send repair' }
        : misconceptionSignals && misconceptionSignals.length > 0
          ? { text: `Address "${misconceptionSignals[0].label}" — ${misconceptionSignals[0].studentCount} students affected.`, cta: 'Send repair' }
          : null;

  return { overview, signals, misconceptionSignals, topMisconception, suggestedMove };
}

function classLabel(snapshot: SessionSnapshot | null): string {
  const s = currentPhaseSkill(snapshot);
  if (!s) return 'Live class';
  return s.code ?? 'Live class';
}

function lessonTitle(snapshot: SessionSnapshot | null): string {
  return currentPhaseSkill(snapshot)?.name ?? snapshot?.skill?.name ?? 'Live lesson';
}

export function TeacherLiveWorkspace({ sessionId }: Props) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<CanvasTool>('pen');
  const [color, setColor] = useState<string>('#1f1f23');
  const [mode, setMode] = useState<TeachingMode>('CHECK');
  const [screensLocked, setScreensLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [endingPrompt, setEndingPrompt] = useState(false);
  const [latestVersion, setLatestVersion] = useState(0);
  const [canvasHasContent, setCanvasHasContent] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
        setSnapshotLoading(false);
        return;
      }
      const data = await res.json();
      setSnapshot(data);
      setPaused(data.status === 'PAUSED');
    } catch {
      setError('Network error.');
    } finally {
      setSnapshotLoading(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch routes when skill or phase index identity changes
  }, [sessionId, snapshot?.skill?.id, snapshot?.currentPhaseIndex]);

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
      setCanvasHasContent(annotationStateHasContent(pending.state));
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
  async function handleNewCheckQuestion() {
    try {
      await fetch(`/api/live-sessions/${sessionId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // soft fail for now
    }
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
      await fetch(`/api/live-sessions/${sessionId}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, audience, lanes }),
      });
    } catch {
      // soft fail for now
    }
  }

  // ── Suggested-move CTA ────────────────────────────────────────────────────
  // Called when the teacher clicks "Send repair" / "Show example" in StudentSignalsPanel.
  // Picks the most contextually appropriate explanation route and broadcasts it.
  async function pushRecommendedModelExample() {
    const hasLane3 = (snapshot?.laneCounts.LANE_3 ?? 0) > 0;
    const hasMisconceptions = (snapshot?.misconceptionSignals?.length ?? 0) > 0;
    // Misconception repair (C) for Lane 3 / tagged misconceptions; worked example (A) otherwise.
    const option: Parameters<typeof handleExplainOption>[0] =
      hasLane3 || hasMisconceptions ? 'misconception' : 'wrong-vs-right';
    await handleExplainOption(option);
    setMode('EXPLAIN');
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

  if (snapshotLoading && !snapshot) {
    return (
      <div className="anx-workspace-shell anx-workspace-shell--loading">
        <header className="anx-workspace-topbar anx-workspace-skeleton-bar">
          <div className="anx-workspace-skel-line h-7 w-7 rounded-lg" />
          <div className="anx-workspace-skel-line h-6 w-16 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="anx-workspace-skel-line h-3 w-24 rounded" />
            <div className="anx-workspace-skel-line h-5 w-48 max-w-full rounded" />
          </div>
          <div className="ml-auto flex gap-2">
            <div className="anx-workspace-skel-line h-8 w-24 rounded-full" />
            <div className="anx-workspace-skel-line h-8 w-20 rounded-full" />
          </div>
        </header>
        <div className="anx-workspace-body">
          <div className="anx-canvas-stage">
            <div className="anx-workspace-skel-canvas rounded-2xl" />
          </div>
          <aside className="anx-workspace-side anx-workspace-side-skel space-y-3">
            <div className="anx-workspace-skel-card rounded-2xl p-4">
              <div className="anx-workspace-skel-line mb-3 h-3 w-28 rounded" />
              <div className="space-y-2">
                <div className="anx-workspace-skel-line h-3 w-full rounded" />
                <div className="anx-workspace-skel-line h-3 max-w-[83%] rounded" />
              </div>
            </div>
            <div className="anx-workspace-skel-card rounded-2xl p-4">
              <div className="anx-workspace-skel-line mb-2 h-3 w-32 rounded" />
              <div className="anx-workspace-skel-line h-16 w-full rounded-xl" />
            </div>
          </aside>
        </div>
        <div className="anx-workspace-bottombar anx-workspace-skeleton-bar">
          <div className="anx-workspace-skel-line h-9 w-24 rounded-lg" />
          <div className="anx-workspace-skel-line h-9 w-28 rounded-lg" />
          <div className="anx-workspace-skel-line ml-auto h-9 w-20 rounded-lg" />
        </div>
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
        <div className="anx-canvas-stage">
          <div className="anx-canvas-board" style={{ position: 'relative' }}>
            <AnnotationToolbar
              tool={tool}
              color={color}
              canUndo={canUndo}
              canRedo={canRedo}
              onToolChange={setTool}
              onColorChange={setColor}
              onUndo={() => canvasRef.current?.undo()}
              onRedo={() => canvasRef.current?.redo()}
              onInsertImage={handleInsertImageRequest}
            />
            {/* Explanation layer — AnimationRenderer sits behind the transparent canvas */}
            {!!activeExplanation?.route.animationSchema && (
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
              onHistoryChange={(u, r) => {
                setCanUndo(u);
                setCanRedo(r);
              }}
              onBoardContentChange={setCanvasHasContent}
              transparent={!!activeExplanation}
              watermark={
                !activeExplanation && sessionStatus === 'LOBBY' ? 'Lesson starts when you click Start' : undefined
              }
            />
            {sessionStatus === 'ACTIVE' && paused ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-3 z-[18] flex justify-center px-4"
                aria-live="polite"
              >
                <p
                  className="max-w-lg rounded-full border border-outline-variant px-4 py-2 text-center text-xs font-medium shadow-md"
                  style={{
                    borderColor: 'var(--anx-outline-variant)',
                    background: 'var(--anx-warning-soft)',
                    color: 'var(--anx-text-secondary)',
                  }}
                >
                  Paused — students keep seeing the last frame until you resume.
                </p>
              </div>
            ) : null}
            {sessionStatus === 'ACTIVE' &&
            !paused &&
            !activeExplanation &&
            !canvasHasContent &&
            latestVersion > 0 ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-14 z-[18] flex justify-center px-4 sm:bottom-4"
                aria-live="polite"
              >
                <p
                  className="max-w-md rounded-xl border border-outline-variant px-3 py-2 text-center text-[11px] leading-snug shadow-md"
                  style={{
                    borderColor: 'var(--anx-outline-variant)',
                    background: 'rgba(255, 255, 255, 0.92)',
                    color: 'var(--anx-text-secondary)',
                  }}
                >
                  Students still see your last board until you draw again — or they follow along when you push checks and explanations.
                </p>
              </div>
            ) : null}
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
                    // For animation-schema routes: count schema steps.
                    // For text-based routes (animationSchema null): use DB step count.
                    totalSteps: activeExplanation.route.animationSchema
                      ? ((activeExplanation.route.animationSchema as { steps?: unknown[] }).steps?.length ?? 1)
                      : (activeExplanation.route.steps.length || 1),
                  }
                : null
            }
            onStepChange={handleStepChange}
          />
          <StudentSignalsPanel
            overview={studentSignals.overview}
            signals={studentSignals.signals}
            misconceptionSignals={studentSignals.misconceptionSignals}
            topMisconception={studentSignals.topMisconception}
            rubricCriteria={snapshot?.rubricCriteria ?? null}
            suggestedMove={
              studentSignals.suggestedMove
                ? {
                    ...studentSignals.suggestedMove,
                    onAct: () => {
                      void pushRecommendedModelExample();
                    },
                  }
                : null
            }
            studentMessages={snapshot?.studentMessages ?? null}
            studentResponses={snapshot?.studentResponses ?? null}
            laneCounts={snapshot?.laneCounts ?? null}
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
      <EndSessionDialog
        open={endingPrompt}
        title="End the session?"
        description="Students will be returned to their dashboard. You can review responses afterwards."
        cancelLabel="Cancel"
        confirmLabel="End session"
        onCancel={() => setEndingPrompt(false)}
        onConfirm={() => {
          setEndingPrompt(false);
          void setStatus('COMPLETED');
        }}
      />

      {/* Hidden version readout for downstream tests / debug */}
      <span aria-hidden style={{ display: 'none' }} data-canvas-version={latestVersion} />
    </div>
  );
}
