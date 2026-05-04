'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SkillDiagnosticRow, SkillRecommendation } from '@/components/teacher/ClassSkillDiagnostic';
import type { AiLessonPlanResponse } from '@/app/api/teacher/ai/lesson-plan/route';

// ── Shared types (exported for step components) ────────────────────────────────

export interface Classroom { id: string; name: string; yearGroup: string | null }
export interface Subject   { id: string; title: string; slug: string }
export interface Skill     { id: string; code: string; name: string; strand: string; subjectId: string }

/**
 * One skill's place in the lesson plan. The three boolean flags map directly
 * to the I Do / We Do / You Do framework:
 *   hasExplanation → teacher introduces/models   (I Do)
 *   hasCheck       → class checks for understanding (We Do)
 *   hasPractice    → students work independently  (You Do)
 */
export interface SkillPlanConfig {
  skillId: string;
  skillCode: string;
  skillName: string;
  recommendation: SkillRecommendation | null;
  hasExplanation: boolean;
  hasCheck: boolean;
  hasPractice: boolean;
  sortIndex: number;
}

export interface CheckSlotDraft  { skillId: string; itemId: string; stemPreview: string }
export interface BankItem        { id: string; question: string }
export interface RecentSessionRow { id: string; label: string }

// ── Helper functions ───────────────────────────────────────────────────────────

export function defaultPlanConfig(
  skill: Skill,
  recommendation: SkillRecommendation | null,
  sortIndex: number,
): SkillPlanConfig {
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

export function flattenToApiPhases(plans: SkillPlanConfig[]) {
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

// ── Hook ───────────────────────────────────────────────────────────────────────

interface HookParams {
  classrooms: Classroom[];
  subjects: Subject[];
  skillsBySubject: Skill[];
}

export interface NewLiveSessionState {
  // Step
  step: 1 | 2;
  stepEnterClass: string;
  setStep: (s: 1 | 2) => void;

  // Step 1 state
  classroomId: string;
  subjectId: string;
  selectedSkillIds: string[];
  diagnosticSkills: SkillDiagnosticRow[];
  diagnosticTotal: number;
  diagnosticLoading: boolean;
  aiBuilderOpen: boolean;
  skillsForSubject: Skill[];
  strandGroups: Record<string, Skill[]>;

  // Step 2 state
  skillPlans: SkillPlanConfig[];
  doNowShared: CheckSlotDraft[];
  doNowDifferentiated: boolean;
  doNowPerStudent: Record<string, CheckSlotDraft[]>;
  doNowSeeding: boolean;
  bankBySkill: Array<{ skillId: string; items: BankItem[] }>;
  bankExpanded: boolean;
  bankLoading: boolean;
  perStudentLoading: boolean;
  lastSessionId: string;
  recentSessions: RecentSessionRow[];
  hasInvalidPlan: boolean;

  // Shared
  loading: boolean;
  error: string | null;

  // Handlers
  setClassroomId: (id: string) => void;
  setSubjectId: (id: string, clearSkills?: boolean) => void;
  toggleSkill: (skillId: string) => void;
  goToStep2: () => Promise<void>;
  setAiBuilderOpen: (open: boolean) => void;
  handleAiPlanGenerated: (plan: AiLessonPlanResponse) => void;
  setLastSessionId: (id: string) => void;
  addToDoNow: (slot: CheckSlotDraft) => void;
  removeFromDoNow: (itemId: string) => void;
  setDoNowDifferentiated: (v: boolean) => void;
  suggestPerStudent: () => Promise<void>;
  loadFullBank: () => Promise<void>;
  setBankExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  updatePlan: (skillId: string, patch: Partial<SkillPlanConfig>) => void;
  moveSkill: (index: number, dir: -1 | 1) => void;
  handleLaunch: () => Promise<void>;
}

export function useNewLiveSession({ classrooms: _classrooms, subjects: _subjects, skillsBySubject }: HookParams): NewLiveSessionState {
  const router = useRouter();

  // Step 1
  const [classroomId,      setClassroomId]      = useState('');
  const [subjectId,        setSubjectIdRaw]      = useState('');
  const [selectedSkillIds, setSelectedSkillIds]  = useState<string[]>([]);
  const [diagnosticSkills,  setDiagnosticSkills]  = useState<SkillDiagnosticRow[]>([]);
  const [diagnosticTotal,   setDiagnosticTotal]   = useState(0);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [aiBuilderOpen,     setAiBuilderOpen]     = useState(false);

  // Step 2
  const [skillPlans,          setSkillPlans]          = useState<SkillPlanConfig[]>([]);
  const [doNowShared,         setDoNowShared]         = useState<CheckSlotDraft[]>([]);
  const [doNowDifferentiated, setDoNowDifferentiated] = useState(false);
  const [doNowPerStudent,     setDoNowPerStudent]     = useState<Record<string, CheckSlotDraft[]>>({});
  const [doNowSeeding,        setDoNowSeeding]        = useState(false);
  const [bankBySkill,         setBankBySkill]         = useState<Array<{ skillId: string; items: BankItem[] }>>([]);
  const [bankExpanded,        setBankExpanded]        = useState(false);
  const [bankLoading,         setBankLoading]         = useState(false);
  const [perStudentLoading,   setPerStudentLoading]   = useState(false);
  const [lastSessionId,       setLastSessionId]       = useState('');
  const [recentSessions,      setRecentSessions]      = useState<RecentSessionRow[]>([]);

  // Shared
  const [step,    setStep]    = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Step transition direction
  const prevStepRef = useRef<1 | 2>(1);
  useEffect(() => { prevStepRef.current = step; }, [step]);
  const stepEnterClass =
    step > prevStepRef.current ? 'anx-new-session-step-enter--ltr'
    : step < prevStepRef.current ? 'anx-new-session-step-enter--rtl'
    : 'anx-new-session-step-enter--ltr';

  const skillsForSubject = skillsBySubject.filter((s) => s.subjectId === subjectId);
  const strandGroups = skillsForSubject.reduce<Record<string, Skill[]>>((acc, skill) => {
    const strand = skill.strand || 'General';
    if (!acc[strand]) acc[strand] = [];
    acc[strand].push(skill);
    return acc;
  }, {});

  const hasInvalidPlan = skillPlans.some((p) => !p.hasExplanation && !p.hasCheck && !p.hasPractice);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!classroomId) { setRecentSessions([]); return; }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/teacher/classrooms/${classroomId}/recent-live-sessions`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { sessions?: RecentSessionRow[] };
        if (!cancelled) setRecentSessions(data.sessions ?? []);
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [classroomId]);

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

  // ── Handlers ───────────────────────────────────────────────────────────────

  function setSubjectId(id: string, clearSkills = false) {
    setSubjectIdRaw(id);
    if (clearSkills) setSelectedSkillIds([]);
  }

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  }

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
      const merged = new Map<string, BankItem[]>();
      for (const row of data.itemsBySkill ?? []) merged.set(row.skillId, [...row.items]);
      for (const row of data.recapItemsBySkill ?? []) {
        const cur = merged.get(row.skillId) ?? [];
        const seen = new Set(cur.map((i) => i.id));
        for (const it of row.items) if (!seen.has(it.id)) { cur.push(it); seen.add(it.id); }
        merged.set(row.skillId, cur);
      }
      setBankBySkill([...merged.entries()].map(([sid, items]) => ({ skillId: sid, items: items.slice(0, 24) })));
      const autoSlots: CheckSlotDraft[] = [];
      for (const sid of seedSkillIds) {
        const items = merged.get(sid);
        if (!items?.length) continue;
        const top = items[0]!;
        autoSlots.push({
          skillId: sid,
          itemId: top.id,
          stemPreview: top.question.slice(0, 80) + (top.question.length > 80 ? '…' : ''),
        });
      }
      setDoNowShared((prev) => (prev.length === 0 ? autoSlots.slice(0, 12) : prev));
    } catch { /* non-fatal */ } finally {
      setDoNowSeeding(false);
    }
  }

  async function goToStep2() {
    if (!classroomId || !subjectId || selectedSkillIds.length === 0) {
      setError('Please select a classroom, subject, and at least one skill.');
      return;
    }
    setError(null);
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
    const seedSkillIds = plans
      .filter((p) => p.recommendation === 'recap_needed' || p.recommendation === 'in_progress')
      .map((p) => p.skillId);
    if (seedSkillIds.length > 0) void autoSeedDoNow(seedSkillIds);
  }

  function handleAiPlanGenerated(plan: AiLessonPlanResponse) {
    setAiBuilderOpen(false);
    if (!classroomId || !subjectId) {
      setError('Please select a classroom and subject before using AI build.');
      return;
    }
    const aiSkillIds = plan.matchedSkills.map((s) => s.skillId);
    setSelectedSkillIds((prev) => {
      const combined = [...prev];
      for (const id of aiSkillIds) if (!combined.includes(id)) combined.push(id);
      return combined;
    });
    if (aiSkillIds.length === 0) return;
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
      setBankBySkill([...merged.entries()].map(([sid, items]) => ({ skillId: sid, items })));
    } catch { /* non-fatal */ } finally {
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

  function updatePlan(skillId: string, patch: Partial<SkillPlanConfig>) {
    setSkillPlans((prev) => prev.map((p) => (p.skillId === skillId ? { ...p, ...patch } : p)));
  }

  function moveSkill(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= skillPlans.length) return;
    setSkillPlans((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next.map((p, i) => ({ ...p, sortIndex: i }));
    });
  }

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
      const sess = (await res.json()) as { id: string };
      router.push(`/teacher/live/${sess.id}`);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return {
    step, stepEnterClass, setStep,
    classroomId, subjectId, selectedSkillIds,
    diagnosticSkills, diagnosticTotal, diagnosticLoading,
    aiBuilderOpen, skillsForSubject, strandGroups,
    skillPlans, doNowShared, doNowDifferentiated, doNowPerStudent,
    doNowSeeding, bankBySkill, bankExpanded, bankLoading, perStudentLoading,
    lastSessionId, recentSessions, hasInvalidPlan,
    loading, error,
    setClassroomId, setSubjectId, toggleSkill,
    goToStep2, setAiBuilderOpen, handleAiPlanGenerated,
    setLastSessionId, addToDoNow, removeFromDoNow, setDoNowDifferentiated,
    suggestPerStudent, loadFullBank, setBankExpanded, updatePlan, moveSkill, handleLaunch,
  };
}
