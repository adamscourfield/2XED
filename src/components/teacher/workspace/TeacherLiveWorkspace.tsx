'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { LANES } from '@/lib/live/lanes';
import { ConductorLaneBoard, type ConductorLaneStudent } from './ConductorLaneBoard';

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
  escalationReason?: string | null;
  isUnexpectedFailure?: boolean;
  holdingAtFinalCheck?: boolean;
  movedRecently?: boolean;
}

/** Fill defaults so the (older, looser) snapshot shape satisfies the board. */
function toBoardStudent(s: LaneStudent): ConductorLaneStudent {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    hasFlag: s.hasFlag ?? false,
    escalationReason: s.escalationReason ?? null,
    isUnexpectedFailure: s.isUnexpectedFailure ?? false,
    holdingAtFinalCheck: s.holdingAtFinalCheck ?? false,
    movedRecently: s.movedRecently ?? false,
  };
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

export interface LaneSummaryEntry {
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
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
  /** Per-lane attempt tally for the current skill (shadow-check progress). */
  laneSummary?: { LANE_1: LaneSummaryEntry; LANE_2: LaneSummaryEntry; LANE_3: LaneSummaryEntry } | null;
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

const LANE_LABELS: Record<string, string> = {
  LANE_1: LANES.LANE_1.teacherLabel,
  LANE_2: LANES.LANE_2.teacherLabel,
  LANE_3: LANES.LANE_3.teacherLabel,
};
const LANE_COLORS: Record<string, string> = {
  LANE_1: LANES.LANE_1.colorVar,
  LANE_2: LANES.LANE_2.colorVar,
  LANE_3: LANES.LANE_3.colorVar,
};

function LaneSummaryBar({
  laneCounts,
  laneSummary,
}: {
  laneCounts: SessionSnapshot['laneCounts'];
  laneSummary: SessionSnapshot['laneSummary'];
}) {
  const lanes = ['LANE_1', 'LANE_2', 'LANE_3'] as const;
  const hasActivity = lanes.some((l) => (laneSummary?.[l]?.answeredCount ?? 0) > 0);
  if (!hasActivity) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--anx-text-muted)' }}>
        Lane progress
      </p>
      {lanes.map((lane) => {
        const total = laneCounts[lane];
        const summary = laneSummary?.[lane];
        const answered = summary?.answeredCount ?? 0;
        const correct = summary?.correctCount ?? 0;
        if (total === 0) return null;
        const correctPct = answered > 0 ? (correct / answered) * 100 : 0;
        const incorrectPct = answered > 0 ? ((answered - correct) / answered) * 100 : 0;
        return (
          <div key={lane}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium" style={{ color: LANE_COLORS[lane] }}>
                {LANE_LABELS[lane]}
              </span>
              <span style={{ color: 'var(--anx-text-muted)' }}>
                {answered}/{total} replied · {correct} correct
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--anx-outline-variant)' }}>
              <div className="flex h-full">
                <span style={{ width: `${correctPct}%`, background: 'var(--anx-success)', transition: 'width 0.4s ease' }} />
                <span style={{ width: `${incorrectPct}%`, background: LANE_COLORS[lane], opacity: 0.45, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
  const router = useRouter();
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
  // Toast for action feedback (H3)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  const [latestVersion, setLatestVersion] = useState(0);
  const [canvasHasContent, setCanvasHasContent] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [availableRoutes, setAvailableRoutes] = useState<Record<string, RouteWithSteps | null> | null>(null);
  const [explainRoutesLoading, setExplainRoutesLoading] = useState(false);
  const [explainRoutesHint, setExplainRoutesHint] = useState<string | null>(null);
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
      const data = await res.json() as SessionSnapshot;
      setSnapshot(data);
      setPaused(data.status === 'PAUSED');
    } catch {
      setError('Network error.');
    } finally {
      setSnapshotLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    function startPolling() {
      if (fallbackRef.current) return; // guard: never start twice
      fallbackRef.current = setInterval(() => void fetchSnapshot(), 3000);
    }

    fetchSnapshot();

    try {
      const es = new EventSource(`/api/live-sessions/${sessionId}/stream`);
      sseRef.current = es;
      es.addEventListener('state', (e) => {
        const data = JSON.parse((e as MessageEvent).data) as SessionSnapshot;
        setSnapshot(data);
        setPaused(data.status === 'PAUSED');
      });
      // C2: always start polling on SSE error — handles mid-session drops too
      es.onerror = () => {
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      sseRef.current?.close();
      sseRef.current = null;
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current);
        // C3: reset to null so the startPolling guard works correctly if the effect
        // ever re-runs (stable deps, but belt-and-suspenders for HMR / strict mode).
        fallbackRef.current = null;
      }
      // C2: clear the pending broadcast debounce and toast timers on unmount
      // so we never call setState on an unmounted component.
      if (broadcastTimerRef.current) {
        clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [sessionId, fetchSnapshot]);

  // ── Explanation routes for current skill ──────────────────────────────────
  useEffect(() => {
    if (!snapshot) return;
    setAvailableRoutes(null);
    setExplainRoutesLoading(true);
    setExplainRoutesHint(null);
    let cancelled = false;
    void fetch(`/api/live-sessions/${sessionId}/explanation-routes`)
      .then(async (r) => {
        if (!r.ok) throw new Error('bad status');
        return r.json() as Promise<{ routes: Record<string, RouteWithSteps | null> }>;
      })
      .then((data) => {
        if (cancelled) return;
        setAvailableRoutes(data.routes);
        const r = data.routes;
        const hasAny = Boolean(r?.A || r?.B || r?.C);
        setExplainRoutesHint(
          hasAny ? null : 'No scripted explanation models exist for this skill yet. Use Model to teach on the whiteboard, or choose another phase.',
        );
      })
      .catch(() => {
        if (!cancelled) {
          setExplainRoutesHint('Could not load explanation models. Check your connection and try changing phase or refreshing.');
        }
      })
      .finally(() => {
        if (!cancelled) setExplainRoutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
    const r = await fetch(`/api/live-sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!r.ok) {
      showToast(false, next === 'PAUSED' ? 'Could not pause the session.' : next === 'ACTIVE' ? 'Could not resume the session.' : 'Could not end the session.');
      return;
    }
    if (next === 'COMPLETED') {
      router.push(`/teacher/live/${sessionId}/review`);
      return;
    }
    // M5: only update local state after a confirmed API success, preventing desync
    setPaused(next === 'PAUSED');
    void fetchSnapshot();
  }

  // ── Emergency controls (#26) ──────────────────────────────────────────────
  /** Restart the active explanation from step 0 */
  // C4: useCallback so that the JSX reference is stable and avoids re-creating the
  // closure on every render. activeExplanation is listed as a dep because we read
  // .route.id from it — without this the stale closure would replay the wrong route.
  const replayExplanation = useCallback(() => {
    if (!activeExplanation) return;
    setActiveExplanation((prev) => (prev ? { ...prev, stepIndex: 0 } : null));
    void fetch(`/api/live-sessions/${sessionId}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: 'EXPLANATION',
        explanationRouteId: activeExplanation.route.id,
        stepIndex: 0,
      }),
    }).catch(() => void 0);
  }, [sessionId, activeExplanation]);

  /** Navigate to previous or next lesson phase */
  async function navigatePhase(delta: -1 | 1) {
    const current = snapshot?.currentPhaseIndex ?? 0;
    const total = snapshot?.phases?.length ?? 0;
    if (total === 0) return;
    const next = Math.max(0, Math.min(total - 1, current + delta));
    if (next === current) return;
    // C1: use the correct /phase endpoint with phaseIndex
    const res = await fetch(`/api/live-sessions/${sessionId}/phase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseIndex: next }),
    });
    if (!res.ok) {
      showToast(false, 'Could not navigate to that phase.');
      return;
    }
    void fetchSnapshot();
  }

  // ── Top bar interactions ──────────────────────────────────────────────────
  function copyJoinCode() {
    const code = snapshot?.joinCode;
    if (!code) return;
    // M6: navigator.clipboard requires HTTPS; fall back to execCommand for local/HTTP contexts
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }).catch(() => {
        showToast(false, 'Could not copy join code. Try copying manually.');
      });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        showToast(false, 'Could not copy join code. Try copying manually.');
      }
    }
  }

  // ── Canvas convenience ────────────────────────────────────────────────────
  function handleInsertImageRequest() {
    fileInputRef.current?.click();
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // L2: reject images over 10 MB before attempting canvas insertion
    if (file.size > 10 * 1024 * 1024) {
      showToast(false, 'Image is too large (max 10 MB). Please choose a smaller file.');
      e.target.value = '';
      return;
    }
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
      const r = await fetch(`/api/live-sessions/${sessionId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!r.ok) {
        showToast(false, 'Could not send check question to students.');
      } else {
        showToast(true, 'Check question sent.');
      }
    } catch {
      showToast(false, 'Network error — check question not sent.');
    }
  }

  async function handleExplainOption(option: 'easier' | 'wrong-vs-right' | 'misconception' | 'comparison') {
    const typeMap: Record<typeof option, 'A' | 'B' | 'C'> = {
      easier: 'B',
      'wrong-vs-right': 'A',
      comparison: 'A',
      misconception: 'C',
    };
    const preferred = typeMap[option];
    let route = availableRoutes?.[preferred];
    if (!route) {
      const order: Array<'A' | 'B' | 'C'> = [preferred, 'A', 'B', 'C'];
      const seen = new Set<string>();
      for (const key of order) {
        if (seen.has(key)) continue;
        seen.add(key);
        const r = availableRoutes?.[key];
        if (r) {
          route = r;
          break;
        }
      }
    }
    if (!route) {
      setExplainRoutesHint(
        'No explanation route is available for this skill. Use Model on the canvas, or add curriculum explanation content for this skill.',
      );
      return;
    }

    // C5: clear canvas optimistically, but only commit activeExplanation after broadcast confirms
    canvasRef.current?.clear();

    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'EXPLANATION',
          explanationRouteId: route.id,
          stepIndex: 0,
        }),
      });
      if (!res.ok) throw new Error('broadcast failed');
      // Only set active explanation after a confirmed delivery
      setActiveExplanation({ route, stepIndex: 0 });
      setExplainRoutesHint(null);
    } catch {
      setExplainRoutesHint('Could not send the explanation to students. Try again.');
      showToast(false, 'Explanation not sent — please try again.');
    }
  }

  async function handleStepChange(newStep: number) {
    if (!activeExplanation) return;
    // M4: clamp to valid step range to prevent out-of-bounds broadcast
    const totalSteps = activeExplanation.route.steps?.length ?? 1;
    const clampedStep = Math.max(0, Math.min(totalSteps - 1, newStep));
    setActiveExplanation((prev) => (prev ? { ...prev, stepIndex: clampedStep } : null));
    try {
      await fetch(`/api/live-sessions/${sessionId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'EXPLANATION',
          explanationRouteId: activeExplanation.route.id,
          stepIndex: clampedStep,
        }),
      });
    } catch {
      // soft fail — step is already applied locally; next broadcast will sync
    }
  }
  async function handleAssignPractice(
    kind: 'easier' | 'similar' | 'challenge' | 'misconception',
    audience: 'all' | 'lane' | 'individual',
    // H1: practiceTargetLane allows the caller to specify which lane gets practice
    // when audience === 'lane'. Defaults to LANE_2 (Nearly there).
    practiceTargetLane: 'LANE_1' | 'LANE_2' | 'LANE_3' = 'LANE_2',
  ) {
    const lanes =
      audience === 'all'
        ? ['LANE_1', 'LANE_2', 'LANE_3']
        : audience === 'lane'
          ? [practiceTargetLane]
          : ['LANE_3'];
    try {
      const r = await fetch(`/api/live-sessions/${sessionId}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, audience, lanes }),
      });
      if (!r.ok) {
        showToast(false, 'Could not assign practice to students.');
      } else {
        const laneLabel = audience === 'all' ? 'all students' : audience === 'lane' ? `${practiceTargetLane.replace('_', ' ')} lane` : 'Lane 3';
        showToast(true, `Practice assigned to ${laneLabel}.`);
      }
    } catch {
      showToast(false, 'Network error — practice not assigned.');
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
      {/* ── Action toast (H3) ───────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '0.5rem 1.1rem',
            borderRadius: '0.625rem',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#fff',
            background: toast.ok ? 'var(--anx-success)' : 'var(--anx-danger)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.msg}
        </div>
      )}

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
            href={`/teacher/live/${sessionId}/seating`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--anx-surface-hover)]"
            style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
            aria-label="Seating plan"
            title="Seating plan — see lanes on your classroom layout"
          >
            <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>🪑</span>
          </Link>

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
            explainRoutesLoading={explainRoutesLoading}
            explainRoutesHint={explainRoutesHint}
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
          {snapshot?.laneCounts && snapshot?.laneStudents && (
            <ConductorLaneBoard
              laneCounts={snapshot.laneCounts}
              laneStudents={{
                LANE_1: snapshot.laneStudents.LANE_1.map(toBoardStudent),
                LANE_2: snapshot.laneStudents.LANE_2.map(toBoardStudent),
                LANE_3: snapshot.laneStudents.LANE_3.map(toBoardStudent),
              }}
            />
          )}
          {snapshot?.laneCounts && (
            <LaneSummaryBar
              laneCounts={snapshot.laneCounts}
              laneSummary={snapshot.laneSummary ?? null}
            />
          )}
        </aside>
      </div>

      {/* ── Emergency controls (#26) — visible only during ACTIVE sessions ── */}
      {sessionStatus === 'ACTIVE' && (
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-2"
          style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface)' }}
        >
          <span
            className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: 'var(--anx-text-muted)' }}
          >
            Quick actions
          </span>

          {/* Restart current explanation from step 0 */}
          {activeExplanation && (
            <button
              type="button"
              onClick={replayExplanation}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--anx-surface-hover)]"
              style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
              title="Restart the explanation from the beginning"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M1 4v6h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.95L1 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Replay explanation
            </button>
          )}

          {/* Phase navigation — only rendered when session has multiple phases */}
          {(snapshot?.phases?.length ?? 0) > 1 && (
            <>
              <button
                type="button"
                disabled={(snapshot?.currentPhaseIndex ?? 0) === 0}
                onClick={() => void navigatePhase(-1)}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--anx-surface-hover)] disabled:opacity-40"
                style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
                title="Go back to the previous phase"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Prev phase
              </button>
              <button
                type="button"
                disabled={(snapshot?.currentPhaseIndex ?? 0) >= (snapshot?.phases?.length ?? 1) - 1}
                onClick={() => void navigatePhase(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--anx-surface-hover)] disabled:opacity-40"
                style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
                title="Advance to the next phase"
              >
                Next phase
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span
                className="text-[11px]"
                style={{ color: 'var(--anx-text-muted)' }}
              >
                Phase {(snapshot?.currentPhaseIndex ?? 0) + 1} / {snapshot?.phases?.length}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <TeacherBottomBar
        paused={paused}
        screensLocked={screensLocked}
        onTogglePause={() => setStatus(paused ? 'ACTIVE' : 'PAUSED')}
        onStudentsView={() => {
          // Pass the join code so the student view auto-fills and skips the join screen.
          const code = snapshot?.joinCode;
          const url = code ? `/student/live?code=${code}` : '/student/live';
          window.open(url, '_blank', 'noopener');
        }}
        onLockScreens={() => {
          const next = !screensLocked;
          setScreensLocked(next);
          // C3: broadcast the lock state change so student screens respond immediately
          void fetch(`/api/live-sessions/${sessionId}/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lanes: ['LANE_1', 'LANE_2', 'LANE_3'],
              contentType: 'MESSAGE',
              message: next
                ? 'SCREEN_LOCK'
                : 'SCREEN_UNLOCK',
            }),
          });
        }}
        onClearBoard={handleClearBoard}
        onMore={() => {
          // M7: copy the shareable student join link instead of a dead overflow menu
          const joinCode = snapshot?.joinCode;
          if (!joinCode) return;
          const url = `${window.location.origin}/join/${joinCode}`;
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(url).then(() => showToast(true, 'Student link copied.')).catch(() => showToast(false, 'Could not copy link.'));
          } else {
            try {
              const ta = document.createElement('textarea');
              ta.value = url;
              ta.style.position = 'fixed'; ta.style.opacity = '0';
              document.body.appendChild(ta); ta.focus(); ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
              showToast(true, 'Student link copied.');
            } catch { showToast(false, 'Could not copy link.'); }
          }
        }}
      />

      {/* End session confirmation */}
      <EndSessionDialog
        open={endingPrompt}
        title="End the session?"
        description="Students will be returned to their dashboard. You'll go straight to the session review."
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
