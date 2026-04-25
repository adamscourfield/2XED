'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Classroom {
  id: string;
  name: string;
  yearGroup: string | null;
}

interface Subject {
  id: string;
  title: string;
  slug: string;
}

interface Skill {
  id: string;
  code: string;
  name: string;
  strand: string;
  subjectId: string;
}

interface LessonPhase {
  id: string; // local draft id
  skillId: string;
  skillCode: string;
  skillName: string;
  type: 'PRACTICE' | 'EXPLANATION';
  label: string;
}

interface CheckSlotDraft {
  skillId: string;
  itemId: string;
  stemPreview: string;
}

interface BankItem {
  id: string;
  question: string;
}

interface RecentSessionRow {
  id: string;
  label: string;
}

interface Props {
  classrooms: Classroom[];
  subjects: Subject[];
  skillsBySubject: Skill[];
}

let phaseCounter = 0;
function nextPhaseId() {
  return `phase-${++phaseCounter}`;
}

function StepIndicator({ current }: { current: 1 | 2 }) {
  const steps = [
    { n: 1 as const, label: 'Class & skills' },
    { n: 2 as const, label: 'Lesson plan' },
  ];
  return (
    <div className="mb-6 flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const active = s.n === current;
        const done = s.n < current;
        return (
          <div key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
            {i > 0 ? <div className="h-px flex-1 bg-[var(--anx-surface-container-high)]" aria-hidden /> : null}
            <div
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? 'bg-[var(--anx-primary-soft)] text-[var(--anx-primary)] ring-1 ring-[var(--anx-primary)]/25'
                  : done
                    ? 'bg-[var(--anx-success-soft)] text-[var(--anx-success)]'
                    : 'bg-[var(--anx-surface-container-low)] text-[var(--anx-text-muted)]'
              }`}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  background: active || done ? 'currentColor' : 'var(--anx-surface-container-high)',
                  color: active || done ? '#fff' : 'var(--anx-text-muted)',
                }}
              >
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

export function NewLiveSessionForm({ classrooms, subjects, skillsBySubject }: Props) {
  const router = useRouter();

  // Step 1 fields
  const [classroomId, setClassroomId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  // Step 2 — ordered phase list
  const [phases, setPhases] = useState<LessonPhase[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openingShared, setOpeningShared] = useState<CheckSlotDraft[]>([]);
  const [openingDifferentiated, setOpeningDifferentiated] = useState(false);
  const [openingPerStudent, setOpeningPerStudent] = useState<Record<string, CheckSlotDraft[]>>({});
  const [lastSessionId, setLastSessionId] = useState('');
  const [recentSessions, setRecentSessions] = useState<RecentSessionRow[]>([]);
  const [bankBySkill, setBankBySkill] = useState<Array<{ skillId: string; items: BankItem[] }>>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [perStudentSuggestLoading, setPerStudentSuggestLoading] = useState(false);

  const skillsForSubject = skillsBySubject.filter((s) => s.subjectId === subjectId);

  // Group skills by strand for step 1 display
  const strandGroups = skillsForSubject.reduce<Record<string, Skill[]>>((acc, skill) => {
    const strand = skill.strand || 'General';
    if (!acc[strand]) acc[strand] = [];
    acc[strand].push(skill);
    return acc;
  }, {});

  const practiceSkillIdsInPlan = useMemo(
    () => [...new Set(phases.filter((p) => p.type === 'PRACTICE').map((p) => p.skillId))],
    [phases],
  );

  useEffect(() => {
    if (!classroomId) {
      setRecentSessions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/teacher/classrooms/${classroomId}/recent-live-sessions`);
        if (!res.ok) return;
        const data = (await res.json()) as { sessions?: RecentSessionRow[] };
        if (!cancelled) setRecentSessions(data.sessions ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  }

  function buildPhasesFromSelection() {
    const selected = skillsForSubject.filter((s) => selectedSkillIds.includes(s.id));
    const built: LessonPhase[] = selected.map((skill) => ({
      id: nextPhaseId(),
      skillId: skill.id,
      skillCode: skill.code,
      skillName: skill.name,
      type: 'PRACTICE',
      label: `${skill.code}: ${skill.name}`,
    }));
    setPhases(built);
  }

  function goToStep2() {
    if (!classroomId || !subjectId || selectedSkillIds.length === 0) {
      setError('Please select a classroom, subject, and at least one skill.');
      return;
    }
    setError(null);
    buildPhasesFromSelection();
    setStep(2);
  }

  function addExplanationPhase(afterIndex: number, phase: LessonPhase) {
    const explPhase: LessonPhase = {
      id: nextPhaseId(),
      skillId: phase.skillId,
      skillCode: phase.skillCode,
      skillName: phase.skillName,
      type: 'EXPLANATION',
      label: `Explanation: ${phase.skillCode}`,
    };
    setPhases((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, explPhase);
      return next;
    });
  }

  function removePhase(id: string) {
    setPhases((prev) => prev.filter((p) => p.id !== id));
  }

  function movePhase(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= phases.length) return;
    setPhases((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addSharedSlot(slot: CheckSlotDraft) {
    setOpeningShared((prev) => {
      if (prev.some((p) => p.itemId === slot.itemId)) return prev;
      if (prev.length >= 12) return prev;
      return [...prev, slot];
    });
  }

  function removeSharedSlot(itemId: string) {
    setOpeningShared((prev) => prev.filter((p) => p.itemId !== itemId));
  }

  async function loadQuestionBank() {
    if (!subjectId || practiceSkillIdsInPlan.length === 0) return;
    setBankLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        subjectId,
        skillIds: practiceSkillIdsInPlan.join(','),
      });
      if (classroomId) {
        qs.set('classroomId', classroomId);
        if (lastSessionId) qs.set('lastSessionId', lastSessionId);
      }
      const res = await fetch(`/api/teacher/live-items-suggest?${qs.toString()}`);
      if (!res.ok) {
        setError('Could not load sample questions.');
        return;
      }
      const data = (await res.json()) as {
        itemsBySkill: Array<{ skillId: string; items: BankItem[] }>;
        recapItemsBySkill?: Array<{ skillId: string; items: BankItem[] }>;
      };
      const merged = new Map<string, BankItem[]>();
      for (const row of data.itemsBySkill ?? []) {
        merged.set(row.skillId, [...(merged.get(row.skillId) ?? []), ...row.items]);
      }
      for (const row of data.recapItemsBySkill ?? []) {
        const cur = merged.get(row.skillId) ?? [];
        const seen = new Set(cur.map((i) => i.id));
        for (const it of row.items) {
          if (!seen.has(it.id)) {
            cur.push(it);
            seen.add(it.id);
          }
        }
        merged.set(row.skillId, cur);
      }
      setBankBySkill(
        [...merged.entries()].map(([skillId, items]) => ({
          skillId,
          items: items.slice(0, 24),
        })),
      );
    } catch {
      setError('Could not load sample questions.');
    } finally {
      setBankLoading(false);
    }
  }

  async function suggestPerStudentRecap() {
    if (!classroomId || !subjectId || practiceSkillIdsInPlan.length === 0) return;
    setPerStudentSuggestLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        subjectId,
        skillIds: practiceSkillIdsInPlan.join(','),
      });
      if (lastSessionId) qs.set('lastSessionId', lastSessionId);
      const res = await fetch(
        `/api/teacher/classrooms/${classroomId}/opening-check-suggestions?${qs.toString()}`,
      );
      if (!res.ok) {
        setError('Could not build per-student suggestions.');
        return;
      }
      const data = (await res.json()) as {
        students: Array<{
          studentUserId: string;
          suggested: Array<{ skillId: string; itemId: string; questionPreview: string }>;
        }>;
      };
      const next: Record<string, CheckSlotDraft[]> = {};
      for (const row of data.students ?? []) {
        next[row.studentUserId] = row.suggested.map((s) => ({
          skillId: s.skillId,
          itemId: s.itemId,
          stemPreview: s.questionPreview,
        }));
      }
      setOpeningPerStudent(next);
      setOpeningDifferentiated(true);
    } catch {
      setError('Could not build per-student suggestions.');
    } finally {
      setPerStudentSuggestLoading(false);
    }
  }

  async function handleLaunch() {
    if (phases.length === 0) {
      setError('Add at least one phase before launching.');
      return;
    }
    setError(null);
    setLoading(true);

    // Use first practice skill as the primary skillId for backwards compatibility
    const primarySkill = phases.find((p) => p.type === 'PRACTICE');

    const phasesPayload = phases.map((p, i) => ({
      index: i,
      skillId: p.skillId,
      skillCode: p.skillCode,
      skillName: p.skillName,
      type: p.type,
      label: p.label,
    }));

    const checkPlanPayload =
      openingShared.length > 0 || (openingDifferentiated && Object.keys(openingPerStudent).length > 0)
        ? {
            shared:
              openingShared.length > 0
                ? openingShared.map((s) => ({ skillId: s.skillId, itemId: s.itemId }))
                : undefined,
            perStudent:
              openingDifferentiated && Object.keys(openingPerStudent).length > 0
                ? Object.fromEntries(
                    Object.entries(openingPerStudent).map(([uid, slots]) => [
                      uid,
                      slots.map((s) => ({ skillId: s.skillId, itemId: s.itemId })),
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
        setError(data.error ?? 'Failed to create session.');
        return;
      }

      const session = await res.json();
      router.push(`/teacher/live/${session.id}`);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1: Pick classroom, subject, skills ────────────────────────────────
  if (step === 1) {
    return (
      <div className="anx-card space-y-6 p-6 sm:p-8">
        <StepIndicator current={1} />
        <div>
          <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>Setup</p>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>Choose class and skills</h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
            Pick who this lesson is for, then tick the skills you want in this session.
          </p>
        </div>

        {error ? <div className="anx-callout-danger text-sm">{error}</div> : null}

        {classrooms.length === 0 ? (
          <div className="anx-callout-info text-sm">
            <p className="m-0 font-semibold text-[color:var(--anx-text)]">No classrooms yet</p>
            <p className="mt-1 m-0 leading-relaxed">
              Ask your school admin to link classes to your profile, then refresh this page.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }} htmlFor="classroom">
              Classroom
            </label>
            <select
              id="classroom"
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="anx-input"
              required
              disabled={classrooms.length === 0}
            >
              <option value="">Select classroom…</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.yearGroup ? ` (${c.yearGroup})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }} htmlFor="subject">
              Subject
            </label>
            <select
              id="subject"
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setSelectedSkillIds([]); }}
              className="anx-input"
              required
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>

        {subjectId && (
          <div>
            <p className="mb-3 text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }}>
              Skills to teach{selectedSkillIds.length > 0 ? ` (${selectedSkillIds.length} selected)` : ''}
            </p>
            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {Object.entries(strandGroups).map(([strand, skills]) => (
                <div key={strand}>
                  <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>{strand}</p>
                  <div className="space-y-1">
                    {skills.map((skill) => {
                      const selected = selectedSkillIds.includes(skill.id);
                      return (
                        <label
                          key={skill.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                            selected
                              ? 'bg-[var(--anx-primary-soft)] font-medium text-[var(--anx-primary)]'
                              : 'text-[var(--anx-text-secondary)] hover:bg-[var(--anx-surface-container-low)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSkill(skill.id)}
                            className="accent-[var(--anx-primary)]"
                          />
                          <span className="font-mono text-xs opacity-60">{skill.code}</span>
                          <span className="flex-1">{skill.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={goToStep2}
          disabled={classrooms.length === 0 || !classroomId || !subjectId || selectedSkillIds.length === 0}
          className="anx-btn-primary w-full py-3.5 disabled:opacity-40"
        >
          Build lesson plan →
        </button>
      </div>
    );
  }

  // ── Step 2: Arrange phases ─────────────────────────────────────────────────
  return (
    <div className="anx-card space-y-6 p-6 sm:p-8">
      <StepIndicator current={2} />
      <div>
        <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>Lesson plan</p>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>Order your phases</h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
          Drag order with the arrows, slot in explanations after practice blocks, or go back to change skills.
        </p>
      </div>

      {error && <div className="anx-callout-danger text-sm">{error}</div>}

      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--anx-outline-variant)' }}>
        <p className="anx-section-label mb-1" style={{ color: 'var(--anx-text-muted)' }}>Opening checks</p>
        <h3 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>Quick checks when you start</h3>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
          Pick questions now so students see them automatically in check mode when the lesson goes live. You can use one
          set for everyone, or different first questions per student (for example recap based on prior lesson or mastery).
          With a class selected, suggested items are ranked using recent wrong answers in this cohort and, when you pick a
          last lesson, how the class performed on those live checks.
        </p>

        {recentSessions.length > 0 && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--anx-text-secondary)' }} htmlFor="lastSess">
              Last lesson in this class (optional — adds recap topic samples)
            </label>
            <select
              id="lastSess"
              value={lastSessionId}
              onChange={(e) => setLastSessionId(e.target.value)}
              className="anx-input text-sm"
            >
              <option value="">None</option>
              {recentSessions.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadQuestionBank()}
            disabled={bankLoading || !subjectId || practiceSkillIdsInPlan.length === 0}
            className="anx-btn-secondary px-3 py-2 text-xs disabled:opacity-40"
          >
            {bankLoading ? 'Loading bank…' : 'Load sample questions'}
          </button>
          <button
            type="button"
            onClick={() => void suggestPerStudentRecap()}
            disabled={perStudentSuggestLoading || !classroomId || !subjectId || practiceSkillIdsInPlan.length === 0}
            className="anx-btn-secondary px-3 py-2 text-xs disabled:opacity-40"
          >
            {perStudentSuggestLoading ? 'Suggesting…' : 'Suggest per-student recap'}
          </button>
        </div>

        {bankBySkill.length > 0 && (
          <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1">
            {bankBySkill.map((row) => {
              const sk = skillsForSubject.find((s) => s.id === row.skillId);
              return (
                <div key={row.skillId}>
                  <p className="mb-1 text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
                    {sk ? `${sk.code} · ${sk.name}` : row.skillId}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {row.items.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() =>
                          addSharedSlot({
                            skillId: row.skillId,
                            itemId: it.id,
                            stemPreview: it.question.slice(0, 80) + (it.question.length > 80 ? '…' : ''),
                          })
                        }
                        className="max-w-full rounded-lg border px-2 py-1 text-left text-[11px] leading-snug transition hover:bg-[var(--anx-primary-soft)]"
                        style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
                        title={it.question}
                      >
                        {it.question.slice(0, 56)}{it.question.length > 56 ? '…' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {openingShared.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>Whole class order</p>
            <ol className="m-0 list-decimal space-y-1 pl-5 text-sm" style={{ color: 'var(--anx-text)' }}>
              {openingShared.map((s) => (
                <li key={s.itemId} className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">{s.stemPreview}</span>
                  <button
                    type="button"
                    onClick={() => removeSharedSlot(s.itemId)}
                    className="shrink-0 text-xs font-medium"
                    style={{ color: 'var(--anx-danger-text)' }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>
          <input
            type="checkbox"
            checked={openingDifferentiated}
            onChange={(e) => setOpeningDifferentiated(e.target.checked)}
            className="accent-[var(--anx-primary)]"
          />
          Use per-student lists when set (overrides whole-class list for those students)
        </label>

        {openingDifferentiated && Object.keys(openingPerStudent).length > 0 && (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
            {Object.keys(openingPerStudent).length} students have a personalised first check. Others use the whole-class
            list if you added one.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {phases.map((phase, i) => (
          <div
            key={phase.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              phase.type === 'EXPLANATION'
                ? 'bg-[var(--anx-warning-soft)] ring-1 ring-[var(--anx-warning)]/35'
                : 'bg-[var(--anx-surface-container-low)]'
            }`}
          >
            <span className="w-5 text-center text-xs font-bold" style={{ color: 'var(--anx-text-muted)' }}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: 'var(--anx-text)' }}>{phase.label}</p>
              <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                {phase.type === 'PRACTICE' ? 'Practice questions' : 'Teacher explanation'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => movePhase(i, -1)}
                disabled={i === 0}
                className="rounded p-1 text-xs disabled:opacity-30 hover:bg-[var(--anx-surface-container-low)]"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => movePhase(i, 1)}
                disabled={i === phases.length - 1}
                className="rounded p-1 text-xs disabled:opacity-30 hover:bg-[var(--anx-surface-container-low)]"
                aria-label="Move down"
              >
                ↓
              </button>
              {phase.type === 'PRACTICE' && (
                <button
                  type="button"
                  onClick={() => addExplanationPhase(i, phase)}
                  className="rounded px-2 py-1 text-xs font-medium hover:bg-[var(--anx-warning-soft)]"
                  style={{ color: 'var(--anx-warning-text)' }}
                  title="Insert an explanation phase after this"
                >
                  + Explain
                </button>
              )}
              <button
                type="button"
                onClick={() => removePhase(phase.id)}
                className="rounded p-1 text-xs hover:bg-red-50"
                style={{ color: 'var(--anx-danger-text)' }}
                aria-label="Remove phase"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {phases.length === 0 && (
          <p className="py-4 text-center text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            No phases yet. Go back to select skills.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="anx-btn-secondary order-2 flex-1 py-3 sm:order-1"
        >
          ← Back to setup
        </button>
        <button
          type="button"
          onClick={handleLaunch}
          disabled={loading || phases.length === 0}
          className="anx-btn-primary order-1 flex-1 py-3.5 disabled:opacity-40 sm:order-2"
        >
          {loading ? 'Launching…' : 'Launch lesson →'}
        </button>
      </div>
    </div>
  );
}
