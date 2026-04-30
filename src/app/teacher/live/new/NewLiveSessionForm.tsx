'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClassSkillDiagnostic, type SkillDiagnosticRow, type SkillRecommendation } from '@/components/teacher/ClassSkillDiagnostic';
import { AiLessonBuilder } from '@/components/teacher/AiLessonBuilder';
import type { AiLessonPlanResponse } from '@/app/api/teacher/ai/lesson-plan/route';

// ── Types ─────────────────────────────────────────────────────────────────

interface Classroom { id: string; name: string; yearGroup: string | null }
interface Subject   { id: string; title: string; slug: string }
interface Skill     { id: string; code: string; name: string; strand: string; subjectId: string }

/**
 * One skill's place in the lesson plan.  The three boolean flags map directly
 * to the I Do / We Do / You Do framework:
 *   hasExplanation → teacher introduces/models   (I Do)
 *   hasCheck       → class check for understanding (We Do)
 *   hasPractice    → students work independently  (You Do)
 */
interface SkillPlanConfig {
  skillId: string;
  skillCode: string;
  skillName: string;
  recommendation: SkillRecommendation | null;
  hasExplanation: boolean;
  hasCheck: boolean;
  hasPractice: boolean;
  sortIndex: number;
}

interface CheckSlotDraft  { skillId: string; itemId: string; stemPreview: string }
interface BankItem        { id: string; question: string }
interface RecentSessionRow { id: string; label: string }

interface Props {
  classrooms: Classroom[];
  subjects: Subject[];
  skillsBySubject: Skill[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

function defaultPlanConfig(
  skill: Skill,
  recommendation: SkillRecommendation | null,
  sortIndex: number,
): SkillPlanConfig {
  // Mastered → practice only (extend/deepen).  Everything else → full sequence.
  const mastered = recommendation === 'mastered';
  return {
    skillId:        skill.id,
    skillCode:      skill.code,
    skillName:      skill.name,
    recommendation,
    hasExplanation: !mastered,
    hasCheck:       !mastered,
    hasPractice:    true,
    sortIndex,
  };
}

function flattenToApiPhases(plans: SkillPlanConfig[]) {
  const sorted = [...plans].sort((a, b) => a.sortIndex - b.sortIndex);
  const out: Array<{
    index: number; skillId: string; skillCode: string; skillName: string;
    type: string; label: string;
  }> = [];
  let idx = 0;
  for (const p of sorted) {
    if (p.hasExplanation) out.push({ index: idx++, skillId: p.skillId, skillCode: p.skillCode, skillName: p.skillName, type: 'EXPLANATION', label: `Explain: ${p.skillCode}` });
    if (p.hasCheck)       out.push({ index: idx++, skillId: p.skillId, skillCode: p.skillCode, skillName: p.skillName, type: 'CHECK',       label: `Check: ${p.skillCode}` });
    if (p.hasPractice)    out.push({ index: idx++, skillId: p.skillId, skillCode: p.skillCode, skillName: p.skillName, type: 'PRACTICE',    label: `Practice: ${p.skillCode}` });
  }
  return out;
}

// ── Step indicator ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 }) {
  const steps = [
    { n: 1 as const, label: 'Class & skills' },
    { n: 2 as const, label: 'Your lesson' },
  ];
  return (
    <div className="mb-6 flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const active = s.n === current;
        const done   = s.n < current;
        return (
          <div key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
            {i > 0 && <div className="h-px flex-1 bg-[var(--anx-surface-container-high)]" aria-hidden />}
            <div className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              active ? 'bg-[var(--anx-primary-soft)] text-[var(--anx-primary)] ring-1 ring-[var(--anx-primary)]/25'
              : done  ? 'bg-[var(--anx-success-soft)] text-[var(--anx-success)]'
              :         'bg-[var(--anx-surface-container-low)] text-[var(--anx-text-muted)]'
            }`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: active || done ? 'currentColor' : 'var(--anx-surface-container-high)', color: active || done ? '#fff' : 'var(--anx-text-muted)' }}>
                {done ? '✓' : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Phase toggle button ───────────────────────────────────────────────────

const PHASE_COLOURS: Record<string, { on: string; off: string }> = {
  blue:    { on: 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm',     off: 'border-[var(--anx-outline-variant)] bg-white text-[var(--anx-text-muted)]' },
  violet:  { on: 'bg-violet-100 border-violet-300 text-violet-800 shadow-sm', off: 'border-[var(--anx-outline-variant)] bg-white text-[var(--anx-text-muted)]' },
  emerald: { on: 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm', off: 'border-[var(--anx-outline-variant)] bg-white text-[var(--anx-text-muted)]' },
};

function PhaseToggle({ active, label, sub, colour, onClick }: {
  active: boolean; label: string; sub: string; colour: string; onClick: () => void;
}) {
  const c = PHASE_COLOURS[colour];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center rounded-lg border px-2 py-2 text-center text-xs transition-all ${
        active ? `${c.on} font-semibold` : `${c.off} opacity-50 hover:opacity-80`
      }`}
    >
      <span className="font-semibold">{label}</span>
      <span className={`mt-0.5 text-[10px] ${active ? 'opacity-60' : 'opacity-50'}`}>{sub}</span>
    </button>
  );
}

// ── Recommendation badge config ───────────────────────────────────────────

const REC_BADGE: Record<SkillRecommendation, { label: string; cls: string }> = {
  recap_needed: { label: 'Recap needed', cls: 'bg-red-50 text-red-700' },
  in_progress:  { label: 'In progress',  cls: 'bg-amber-50 text-amber-700' },
  mastered:     { label: 'Mastered',     cls: 'bg-emerald-50 text-emerald-700' },
  not_started:  { label: 'Not started',  cls: 'bg-gray-100 text-gray-500' },
};

// ── Skill plan card ───────────────────────────────────────────────────────

function SkillPlanCard({ plan, isFirst, isLast, onChange, onMove }: {
  plan: SkillPlanConfig;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<SkillPlanConfig>) => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const badge      = plan.recommendation ? REC_BADGE[plan.recommendation] : null;
  const hasAny     = plan.hasExplanation || plan.hasCheck || plan.hasPractice;

  return (
    <div className={`rounded-xl border transition-all ${
      hasAny
        ? 'border-[var(--anx-outline-variant)] bg-[var(--anx-surface-container-low)]'
        : 'border-dashed border-red-200 bg-red-50/40'
    }`}>
      <div className="px-4 py-3.5">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 font-mono text-xs font-bold" style={{ color: 'var(--anx-text-muted)' }}>
                {plan.skillCode}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
                {plan.skillName}
              </span>
            </div>
            {badge && (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => onMove(-1)} disabled={isFirst}
              className="rounded p-1 text-xs disabled:opacity-20 hover:bg-[var(--anx-surface-container-high)]"
              aria-label="Move skill up">↑</button>
            <button type="button" onClick={() => onMove(1)} disabled={isLast}
              className="rounded p-1 text-xs disabled:opacity-20 hover:bg-[var(--anx-surface-container-high)]"
              aria-label="Move skill down">↓</button>
          </div>
        </div>

        {/* Phase toggles */}
        <div className="grid grid-cols-3 gap-2">
          <PhaseToggle active={plan.hasExplanation} label="Explain" sub="I Do"    colour="blue"    onClick={() => onChange({ hasExplanation: !plan.hasExplanation })} />
          <PhaseToggle active={plan.hasCheck}       label="Check"   sub="We Do"   colour="violet"  onClick={() => onChange({ hasCheck: !plan.hasCheck })} />
          <PhaseToggle active={plan.hasPractice}    label="Practice" sub="You Do" colour="emerald" onClick={() => onChange({ hasPractice: !plan.hasPractice })} />
        </div>

        {!hasAny && (
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--anx-danger-text)' }}>
            Enable at least one phase for this skill.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────

export function NewLiveSessionForm({ classrooms, subjects, skillsBySubject }: Props) {
  const router = useRouter();

  // ── Step 1 state ────────────────────────────────────────────────────────
  const [classroomId,      setClassroomId]      = useState('');
  const [subjectId,        setSubjectId]         = useState('');
  const [selectedSkillIds, setSelectedSkillIds]  = useState<string[]>([]);

  // Diagnostic surface (fetched when classroom + subject are picked)
  const [diagnosticSkills,  setDiagnosticSkills]  = useState<SkillDiagnosticRow[]>([]);
  const [diagnosticTotal,   setDiagnosticTotal]   = useState(0);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  // ── Step 2 state ────────────────────────────────────────────────────────
  const [skillPlans, setSkillPlans] = useState<SkillPlanConfig[]>([]);

  // Do Now (opening checks)
  const [doNowShared,         setDoNowShared]         = useState<CheckSlotDraft[]>([]);
  const [doNowDifferentiated, setDoNowDifferentiated] = useState(false);
  const [doNowPerStudent,     setDoNowPerStudent]     = useState<Record<string, CheckSlotDraft[]>>({});
  const [doNowSeeding,        setDoNowSeeding]        = useState(false);

  // Question bank (for manual question swapping in Do Now)
  const [bankBySkill,      setBankBySkill]      = useState<Array<{ skillId: string; items: BankItem[] }>>([]);
  const [bankExpanded,     setBankExpanded]      = useState(false);
  const [bankLoading,      setBankLoading]       = useState(false);

  // Per-student personalisation
  const [perStudentLoading, setPerStudentLoading] = useState(false);

  // Last session selector (for recap context)
  const [lastSessionId,  setLastSessionId]  = useState('');
  const [recentSessions, setRecentSessions] = useState<RecentSessionRow[]>([]);

  const [step,    setStep]    = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // AI lesson builder panel
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);

  // Skill flash animation (highlight newly AI-selected skills)
  const [skillFlashId, setSkillFlashId] = useState<string | null>(null);

  // Step transition animation direction
  const prevStepRef = useRef<1 | 2>(1);
  useEffect(() => { prevStepRef.current = step; }, [step]);
  const stepEnterClass =
    step > prevStepRef.current
      ? 'anx-new-session-step-enter--ltr'
      : step < prevStepRef.current
        ? 'anx-new-session-step-enter--rtl'
        : 'anx-new-session-step-enter--ltr';

  const skillsForSubject = skillsBySubject.filter((s) => s.subjectId === subjectId);

  // Group by strand for fallback plain list
  const strandGroups = skillsForSubject.reduce<Record<string, Skill[]>>((acc, skill) => {
    const strand = skill.strand || 'General';
    if (!acc[strand]) acc[strand] = [];
    acc[strand].push(skill);
    return acc;
  }, {});

  // ── Effects ──────────────────────────────────────────────────────────────

  // Fetch recent sessions for last-session selector
  useEffect(() => {
    if (!classroomId) { setRecentSessions([]); return; }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/teacher/classrooms/${classroomId}/recent-live-sessions`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { sessions?: RecentSessionRow[] };
        if (!cancelled) setRecentSessions(data.sessions ?? []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [classroomId]);

  // Fetch diagnostic whenever classroom + subject are both chosen
  useEffect(() => {
    if (!classroomId || !subjectId) {
      setDiagnosticSkills([]);
      setDiagnosticTotal(0);
      return;
    }
    let cancelled = false;
    setDiagnosticLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/teacher/classrooms/${classroomId}/skill-diagnostic?subjectId=${subjectId}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { skills?: SkillDiagnosticRow[]; totalStudents?: number };
        if (!cancelled) {
          setDiagnosticSkills(data.skills ?? []);
          setDiagnosticTotal(data.totalStudents ?? 0);
        }
      } catch { /* non-fatal */ } finally {
        if (!cancelled) setDiagnosticLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classroomId, subjectId]);

  // ── Step 1 handlers ──────────────────────────────────────────────────────

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
    setSkillFlashId(skillId);
    window.setTimeout(() => setSkillFlashId(null), 480);
  }

  async function goToStep2() {
    if (!classroomId || !subjectId || selectedSkillIds.length === 0) {
      setError('Please select a classroom, subject, and at least one skill.');
      return;
    }
    setError(null);

    // Build skill plans — use diagnostic recommendations where available
    const selected = skillsForSubject.filter((s) => selectedSkillIds.includes(s.id));
    const plans: SkillPlanConfig[] = selected.map((skill, i) => {
      const diag = diagnosticSkills.find((d) => d.skillId === skill.id);
      return defaultPlanConfig(skill, diag?.recommendation ?? null, i);
    });
    setSkillPlans(plans);
    setDoNowShared([]);
    setDoNowPerStudent({});
    setDoNowDifferentiated(false);
    setBankBySkill([]);
    setBankExpanded(false);
    setStep(2);

    // Auto-seed the Do Now with questions for skills that need recap or are in progress
    const seedSkillIds = plans
      .filter((p) => p.recommendation === 'recap_needed' || p.recommendation === 'in_progress')
      .map((p) => p.skillId);

    if (seedSkillIds.length > 0) {
      void autoSeedDoNow(seedSkillIds);
    }
  }

  // ── AI plan handler ──────────────────────────────────────────────────────

  /**
   * Called when AiLessonBuilder resolves.  Applies the plan to wizard state:
   *   1. Auto-selects skills that matched (adds to selectedSkillIds)
   *   2. Moves to step 2 and builds SkillPlanConfig from AI phase suggestions
   *   3. Pre-populates the Do Now from AI-generated items
   */
  function handleAiPlanGenerated(plan: AiLessonPlanResponse) {
    setAiBuilderOpen(false);

    if (!classroomId || !subjectId) {
      setError('Please select a classroom and subject before using AI build.');
      return;
    }

    // Auto-select matched skills (union with any already selected)
    const aiSkillIds = plan.matchedSkills.map((s) => s.skillId);
    setSelectedSkillIds((prev) => {
      const combined = [...prev];
      for (const id of aiSkillIds) if (!combined.includes(id)) combined.push(id);
      return combined;
    });

    if (aiSkillIds.length === 0) {
      // No skills matched — just close the builder and let the teacher pick manually
      return;
    }

    // Build SkillPlanConfig from AI phase suggestions
    const plans: SkillPlanConfig[] = plan.matchedSkills.map((s, i) => ({
      skillId:        s.skillId,
      skillCode:      s.skillCode,
      skillName:      s.skillName,
      recommendation: null,
      hasExplanation: s.hasExplanation,
      hasCheck:       s.hasCheck,
      hasPractice:    s.hasPractice,
      sortIndex:      i,
    }));
    setSkillPlans(plans);

    // Pre-populate Do Now from AI-generated items
    const doNow = plan.doNowItems.map((item) => ({
      skillId:     item.skillId,
      itemId:      item.itemId,
      stemPreview: item.stemPreview,
    }));
    setDoNowShared(doNow);
    setDoNowPerStudent({});
    setDoNowDifferentiated(false);
    setBankBySkill([]);
    setBankExpanded(false);

    setError(null);
    setStep(2);
  }

  // ── Do Now helpers ────────────────────────────────────────────────────────

  /**
   * Fetch the question bank for recap/in-progress skills, auto-add the top
   * question per skill to the Do Now list, and keep the full bank for manual
   * question swapping.
   */
  async function autoSeedDoNow(seedSkillIds: string[]) {
    setDoNowSeeding(true);
    try {
      const qs = new URLSearchParams({ subjectId, skillIds: seedSkillIds.join(',') });
      if (classroomId) qs.set('classroomId', classroomId);
      if (lastSessionId) qs.set('lastSessionId', lastSessionId);
      const res = await fetch(`/api/teacher/live-items-suggest?${qs.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        itemsBySkill: Array<{ skillId: string; items: BankItem[] }>;
        recapItemsBySkill?: Array<{ skillId: string; items: BankItem[] }>;
      };

      // Merge main + recap banks
      const merged = new Map<string, BankItem[]>();
      for (const row of data.itemsBySkill ?? []) merged.set(row.skillId, [...row.items]);
      for (const row of data.recapItemsBySkill ?? []) {
        const cur = merged.get(row.skillId) ?? [];
        const seen = new Set(cur.map((i) => i.id));
        for (const it of row.items) if (!seen.has(it.id)) { cur.push(it); seen.add(it.id); }
        merged.set(row.skillId, cur);
      }
      setBankBySkill([...merged.entries()].map(([skillId, items]) => ({ skillId, items: items.slice(0, 24) })));

      // Auto-add top item per skill to the shared Do Now
      const autoSlots: CheckSlotDraft[] = [];
      for (const skillId of seedSkillIds) {
        const items = merged.get(skillId);
        if (!items?.length) continue;
        const top = items[0];
        autoSlots.push({
          skillId,
          itemId: top.id,
          stemPreview: top.question.slice(0, 80) + (top.question.length > 80 ? '…' : ''),
        });
      }
      // Only seed if teacher hasn't already added questions manually
      setDoNowShared((prev) => (prev.length === 0 ? autoSlots.slice(0, 12) : prev));
    } catch { /* non-fatal */ } finally {
      setDoNowSeeding(false);
    }
  }

  async function loadFullBank() {
    const allSkillIds = skillPlans.map((p) => p.skillId);
    if (!subjectId || allSkillIds.length === 0) return;
    setBankLoading(true);
    try {
      const qs = new URLSearchParams({ subjectId, skillIds: allSkillIds.join(',') });
      if (classroomId) qs.set('classroomId', classroomId);
      if (lastSessionId) qs.set('lastSessionId', lastSessionId);
      const res = await fetch(`/api/teacher/live-items-suggest?${qs.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { itemsBySkill: Array<{ skillId: string; items: BankItem[] }> };
      const merged = new Map<string, BankItem[]>();
      for (const row of data.itemsBySkill ?? []) merged.set(row.skillId, row.items.slice(0, 24));
      setBankBySkill([...merged.entries()].map(([skillId, items]) => ({ skillId, items })));
    } catch { /* ignore */ } finally {
      setBankLoading(false);
    }
  }

  function addToDoNow(slot: CheckSlotDraft) {
    setDoNowShared((prev) => {
      if (prev.some((p) => p.itemId === slot.itemId)) return prev;
      if (prev.length >= 12) return prev;
      return [...prev, slot];
    });
  }

  function removeFromDoNow(itemId: string) {
    setDoNowShared((prev) => prev.filter((p) => p.itemId !== itemId));
  }

  async function suggestPerStudent() {
    const practiceSkillIds = skillPlans.filter((p) => p.hasPractice).map((p) => p.skillId);
    if (!classroomId || !subjectId || practiceSkillIds.length === 0) return;
    setPerStudentLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ subjectId, skillIds: practiceSkillIds.join(',') });
      if (lastSessionId) qs.set('lastSessionId', lastSessionId);
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/opening-check-suggestions?${qs.toString()}`);
      if (!res.ok) { setError('Could not build per-student suggestions.'); return; }
      const data = (await res.json()) as {
        students: Array<{
          studentUserId: string;
          suggested: Array<{ skillId: string; itemId: string; questionPreview: string }>;
        }>;
      };
      const next: Record<string, CheckSlotDraft[]> = {};
      for (const row of data.students ?? []) {
        next[row.studentUserId] = row.suggested.map((s) => ({
          skillId: s.skillId, itemId: s.itemId, stemPreview: s.questionPreview,
        }));
      }
      setDoNowPerStudent(next);
      setDoNowDifferentiated(true);
    } catch {
      setError('Could not build per-student suggestions.');
    } finally {
      setPerStudentLoading(false);
    }
  }

  // ── Skill plan handlers ───────────────────────────────────────────────────

  function updatePlan(skillId: string, patch: Partial<SkillPlanConfig>) {
    setSkillPlans((prev) => prev.map((p) => (p.skillId === skillId ? { ...p, ...patch } : p)));
  }

  function moveSkill(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= skillPlans.length) return;
    setSkillPlans((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      // Re-number sortIndex to match position
      return next.map((p, i) => ({ ...p, sortIndex: i }));
    });
  }

  // ── Launch ────────────────────────────────────────────────────────────────

  async function handleLaunch() {
    const hasAny = skillPlans.some((p) => p.hasExplanation || p.hasCheck || p.hasPractice);
    if (!hasAny) {
      setError('At least one skill needs a phase enabled before launching.');
      return;
    }
    setError(null);
    setLoading(true);

    const phasesPayload = flattenToApiPhases(skillPlans);
    const primarySkill  = skillPlans.find((p) => p.hasPractice) ?? skillPlans[0];

    const checkPlanPayload =
      doNowShared.length > 0 || (doNowDifferentiated && Object.keys(doNowPerStudent).length > 0)
        ? {
            shared: doNowShared.length > 0
              ? doNowShared.map((s) => ({ skillId: s.skillId, itemId: s.itemId }))
              : undefined,
            perStudent: doNowDifferentiated && Object.keys(doNowPerStudent).length > 0
              ? Object.fromEntries(
                  Object.entries(doNowPerStudent).map(([uid, slots]) => [
                    uid, slots.map((s) => ({ skillId: s.skillId, itemId: s.itemId })),
                  ]),
                )
              : undefined,
          }
        : undefined;

    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          subjectId,
          skillId: primarySkill?.skillId,
          phases: phasesPayload,
          checkPlan: checkPlanPayload,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to create session.');
        return;
      }
      const session = (await res.json()) as { id: string };
      router.push(`/teacher/live/${session.id}`);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1 ─────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div key="new-live-step-1" className={`anx-new-session-step-enter ${stepEnterClass}`}>
      <div className="anx-card space-y-6 p-6 sm:p-8">
        <StepIndicator current={1} />
        <div>
          <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>Setup</p>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>
            Choose class and skills
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
            Pick your class and subject — Ember will show you where students currently stand on each skill.
          </p>
        </div>

        {error && <div className="anx-callout-danger text-sm">{error}</div>}

        {classrooms.length === 0 && (
          <div className="anx-callout-info text-sm">
            <p className="m-0 font-semibold text-[color:var(--anx-text)]">No classrooms yet</p>
            <p className="mt-1 m-0 leading-relaxed">
              Ask your school admin to link classes to your profile, then refresh this page.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="classroom" style={{ color: 'var(--anx-text-secondary)' }}>
              Classroom
            </label>
            <select id="classroom" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}
              className="anx-input" required disabled={classrooms.length === 0}>
              <option value="">Select classroom…</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.yearGroup ? ` (${c.yearGroup})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="subject" style={{ color: 'var(--anx-text-secondary)' }}>
              Subject
            </label>
            <select id="subject" value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setSelectedSkillIds([]); }}
              className="anx-input" required>
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>

        {subjectId && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }}>
                Skills to teach
                {selectedSkillIds.length > 0 && (
                  <span className="ml-2 rounded-full bg-[var(--anx-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--anx-primary)]">
                    {selectedSkillIds.length} selected
                  </span>
                )}
              </p>
              {diagnosticLoading && (
                <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Loading class data…</span>
              )}
            </div>

            {diagnosticSkills.length > 0 ? (
              <ClassSkillDiagnostic
                skills={diagnosticSkills}
                totalStudents={diagnosticTotal}
                selectedSkillIds={selectedSkillIds}
                onToggle={toggleSkill}
              />
            ) : !diagnosticLoading ? (
              /* Fallback: no class data yet, show plain list */
              <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
                {Object.entries(strandGroups).map(([strand, skills]) => (
                  <div key={strand}>
                    <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>{strand}</p>
                    <div className="space-y-1">
                      {skills.map((skill) => {
                        const selected = selectedSkillIds.includes(skill.id);
                        return (
                          <label key={skill.id} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                            selected ? 'bg-[var(--anx-primary-soft)] font-medium text-[var(--anx-primary)]'
                            : 'text-[var(--anx-text-secondary)] hover:bg-[var(--anx-surface-container-low)]'
                          }`}>
                            <input type="checkbox" checked={selected} onChange={() => toggleSkill(skill.id)} className="accent-[var(--anx-primary)]" />
                            <span className="font-mono text-xs opacity-60">{skill.code}</span>
                            <span className="flex-1">{skill.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* AI lesson builder — shown inline when triggered */}
        {aiBuilderOpen && subjectId ? (
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-low)' }}>
            <AiLessonBuilder
              subjectId={subjectId}
              subjectTitle={subjects.find((s) => s.id === subjectId)?.title}
              onPlanGenerated={handleAiPlanGenerated}
              onClose={() => setAiBuilderOpen(false)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            {subjectId && (
              <button
                type="button"
                onClick={() => setAiBuilderOpen(true)}
                className="anx-btn-secondary flex-1 py-3 text-sm sm:flex-none"
              >
                ✨ Build with AI
              </button>
            )}
            <button type="button" onClick={() => void goToStep2()}
              disabled={classrooms.length === 0 || !classroomId || !subjectId || selectedSkillIds.length === 0}
              className="anx-btn-primary flex-1 py-3.5 disabled:opacity-40">
              Build lesson plan →
            </button>
          </div>
        )}
      </div>
      </div>
    );
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────

  const hasInvalidPlan = skillPlans.some((p) => !p.hasExplanation && !p.hasCheck && !p.hasPractice);

  return (
    <div key="new-live-step-2" className={`anx-new-session-step-enter ${stepEnterClass}`}>
    <div className="anx-card space-y-6 p-6 sm:p-8">
      <StepIndicator current={2} />
      <div>
        <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>Your lesson</p>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>
          Plan the flow
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
          Toggle the phases you want for each skill. Ember has suggested a sequence based on where your class currently stands.
        </p>
      </div>

      {error && <div className="anx-callout-danger text-sm">{error}</div>}

      {/* ── Do Now ──────────────────────────────────────────────────────── */}
      <section className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--anx-outline-variant)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--anx-primary)] px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wide">DO NOW</span>
              <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>5–10 min · students work independently on entry</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
              Entry activity
            </p>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
              {doNowSeeding
                ? 'Preparing questions from prior learning…'
                : doNowShared.length > 0
                  ? `${doNowShared.length} question${doNowShared.length !== 1 ? 's' : ''} queued — students see these automatically on entry.`
                  : 'No questions yet. Questions from skills needing recap will be auto-suggested, or add them below.'}
            </p>
          </div>
          {doNowSeeding && (
            <div className="shrink-0 h-4 w-4 animate-spin rounded-full border-2 border-[var(--anx-primary)] border-t-transparent" aria-hidden />
          )}
        </div>

        {/* Do Now question list */}
        {doNowShared.length > 0 && (
          <ol className="m-0 list-decimal space-y-1.5 pl-5 text-sm" style={{ color: 'var(--anx-text)' }}>
            {doNowShared.map((s) => (
              <li key={s.itemId} className="flex items-start gap-2">
                <span className="min-w-0 flex-1 leading-snug">{s.stemPreview}</span>
                <button type="button" onClick={() => removeFromDoNow(s.itemId)}
                  className="shrink-0 text-xs font-medium" style={{ color: 'var(--anx-danger-text)' }}>
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}

        {/* Optional: last session context for better suggestions */}
        {recentSessions.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="lastSess" style={{ color: 'var(--anx-text-secondary)' }}>
              Reference last lesson (refines question selection)
            </label>
            <select id="lastSess" value={lastSessionId} onChange={(e) => setLastSessionId(e.target.value)}
              className="anx-input text-sm">
              <option value="">None</option>
              {recentSessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        )}

        {/* Per-student personalisation */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setBankExpanded((v) => !v); if (!bankBySkill.length && !bankLoading) void loadFullBank(); }}
              className="anx-btn-secondary px-3 py-1.5 text-xs">
              {bankExpanded ? 'Hide question bank' : 'Swap / add questions'}
            </button>
            <button type="button" onClick={() => void suggestPerStudent()}
              disabled={perStudentLoading || !classroomId}
              className="anx-btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
              {perStudentLoading ? 'Building…' : 'Personalise per student'}
            </button>
          </div>

          {doNowDifferentiated && Object.keys(doNowPerStudent).length > 0 && (
            <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              {Object.keys(doNowPerStudent).length} students have a personalised Do Now.
              Others use the shared list above.
            </p>
          )}

          {doNowDifferentiated && (
            <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: 'var(--anx-text-secondary)' }}>
              <input type="checkbox" checked={doNowDifferentiated} onChange={(e) => setDoNowDifferentiated(e.target.checked)} className="accent-[var(--anx-primary)]" />
              Use personalised lists where available
            </label>
          )}
        </div>

        {/* Collapsible bank picker */}
        {bankExpanded && (
          <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-low)' }}>
            {bankLoading ? (
              <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Loading questions…</p>
            ) : bankBySkill.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>No questions found for these skills yet.</p>
            ) : (
              <div className="max-h-48 space-y-3 overflow-y-auto pr-1">
                {bankBySkill.map((row) => {
                  const sk = skillsForSubject.find((s) => s.id === row.skillId);
                  return (
                    <div key={row.skillId}>
                      <p className="mb-1 text-[10px] font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
                        {sk ? `${sk.code} · ${sk.name}` : row.skillId}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {row.items.map((it) => (
                          <button key={it.id} type="button"
                            onClick={() => addToDoNow({ skillId: row.skillId, itemId: it.id, stemPreview: it.question.slice(0, 80) + (it.question.length > 80 ? '…' : '') })}
                            className="max-w-full rounded-lg border px-2 py-1 text-left text-[11px] leading-snug transition hover:bg-[var(--anx-primary-soft)]"
                            style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
                            title={it.question}>
                            {it.question.slice(0, 56)}{it.question.length > 56 ? '…' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Lesson body ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>Lesson plan</p>
            <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              Toggle phases for each skill. Explain → Check → Practice is the suggested sequence.
            </p>
          </div>
          {/* Phase legend */}
          <div className="hidden flex-wrap items-center gap-3 sm:flex">
            {[
              { label: 'Explain', sub: 'I Do',    colour: 'text-blue-700' },
              { label: 'Check',   sub: 'We Do',   colour: 'text-violet-700' },
              { label: 'Practice', sub: 'You Do', colour: 'text-emerald-700' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1 text-[10px]">
                <span className={`font-semibold ${l.colour}`}>{l.label}</span>
                <span style={{ color: 'var(--anx-text-muted)' }}>{l.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {skillPlans.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            No skills selected. Go back to choose skills.
          </p>
        ) : (
          <div className="space-y-2">
            {skillPlans
              .slice()
              .sort((a, b) => a.sortIndex - b.sortIndex)
              .map((plan, i) => (
                <SkillPlanCard
                  key={plan.skillId}
                  plan={plan}
                  isFirst={i === 0}
                  isLast={i === skillPlans.length - 1}
                  onChange={(patch) => updatePlan(plan.skillId, patch)}
                  onMove={(dir) => moveSkill(i, dir)}
                />
              ))}
          </div>
        )}

        {hasInvalidPlan && (
          <p className="text-xs" style={{ color: 'var(--anx-danger-text)' }}>
            One or more skills have no phases enabled. Enable at least one phase per skill before launching.
          </p>
        )}
      </section>

      {/* ── Footer actions ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => setStep(1)}
          className="anx-btn-secondary order-2 flex-1 py-3 sm:order-1">
          ← Back to setup
        </button>
        <button type="button" onClick={() => void handleLaunch()}
          disabled={loading || skillPlans.length === 0 || hasInvalidPlan}
          className="anx-btn-primary order-1 flex-1 py-3.5 disabled:opacity-40 sm:order-2">
          {loading ? 'Launching…' : 'Launch lesson →'}
        </button>
      </div>
    </div>
    </div>
  );
}
