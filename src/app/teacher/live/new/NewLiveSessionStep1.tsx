'use client';

import { ClassSkillDiagnostic } from '@/components/teacher/ClassSkillDiagnostic';
import { AiLessonBuilder } from '@/components/teacher/AiLessonBuilder';
import type { Classroom, Subject, Skill, NewLiveSessionState } from './useNewLiveSession';

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

interface Props {
  classrooms: Classroom[];
  subjects: Subject[];
  skillsBySubject: Skill[];
  data: NewLiveSessionState;
}

export function NewLiveSessionStep1({ classrooms, subjects, skillsBySubject, data }: Props) {
  const {
    classroomId, subjectId, selectedSkillIds,
    diagnosticSkills, diagnosticTotal, diagnosticLoading,
    aiBuilderOpen, strandGroups, stepEnterClass,
    error,
    setClassroomId, setSubjectId, toggleSkill,
    goToStep2, setAiBuilderOpen, handleAiPlanGenerated,
  } = data;

  const skillsForSubject = skillsBySubject.filter((s) => s.subjectId === subjectId);

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
            onChange={(e) => setSubjectId(e.target.value, true)}
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
