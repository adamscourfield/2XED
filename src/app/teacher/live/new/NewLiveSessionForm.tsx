'use client';

import { useState } from 'react';
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

interface Props {
  classrooms: Classroom[];
  subjects: Subject[];
  skillsBySubject: Skill[];
}

let phaseCounter = 0;
function nextPhaseId() {
  return `phase-${++phaseCounter}`;
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

  const skillsForSubject = skillsBySubject.filter((s) => s.subjectId === subjectId);

  // Group skills by strand for step 1 display
  const strandGroups = skillsForSubject.reduce<Record<string, Skill[]>>((acc, skill) => {
    const strand = skill.strand || 'General';
    if (!acc[strand]) acc[strand] = [];
    acc[strand].push(skill);
    return acc;
  }, {});

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

    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          subjectId,
          skillId: primarySkill?.skillId,
          phases: phasesPayload,
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
      <div className="anx-panel space-y-6 p-6">
        <div>
          <p className="anx-section-label mb-4" style={{ color: 'var(--anx-text-muted)' }}>Step 1 of 2 — Setup</p>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>Choose class and skills</h2>
        </div>

        {error && <div className="anx-callout-danger text-sm">{error}</div>}

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
          disabled={!classroomId || !subjectId || selectedSkillIds.length === 0}
          className="anx-btn-primary w-full disabled:opacity-40"
        >
          Build lesson plan →
        </button>
      </div>
    );
  }

  // ── Step 2: Arrange phases ─────────────────────────────────────────────────
  return (
    <div className="anx-panel space-y-6 p-6">
      <div>
        <p className="anx-section-label mb-1" style={{ color: 'var(--anx-text-muted)' }}>Step 2 of 2 — Lesson plan</p>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>Order your phases</h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          Reorder, add explanation phases, or remove steps. You can also add more from step 1.
        </p>
      </div>

      {error && <div className="anx-callout-danger text-sm">{error}</div>}

      <div className="space-y-2">
        {phases.map((phase, i) => (
          <div
            key={phase.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
              phase.type === 'EXPLANATION'
                ? 'border-[var(--anx-warning)] bg-[var(--anx-warning-soft)]'
                : 'border-[var(--anx-border)] bg-white'
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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="anx-btn-ghost flex-1"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleLaunch}
          disabled={loading || phases.length === 0}
          className="anx-btn-primary flex-1 disabled:opacity-40"
        >
          {loading ? 'Launching…' : 'Launch lesson →'}
        </button>
      </div>
    </div>
  );
}
