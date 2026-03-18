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
  subjectId: string;
}

interface Props {
  classrooms: Classroom[];
  subjects: Subject[];
  skillsBySubject: Skill[];
}

export function NewLiveSessionForm({ classrooms, subjects, skillsBySubject }: Props) {
  const router = useRouter();
  const [classroomId, setClassroomId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [skillId, setSkillId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skillsForSubject = skillsBySubject.filter((s) => s.subjectId === subjectId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!classroomId || !subjectId) {
      setError('Please select a classroom and subject.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          subjectId,
          skillId: skillId || undefined,
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

  return (
    <form onSubmit={handleSubmit} className="anx-panel space-y-5 p-6">
      {error && (
        <div className="anx-callout-danger">{error}</div>
      )}

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
          onChange={(e) => { setSubjectId(e.target.value); setSkillId(''); }}
          className="anx-input"
          required
        >
          <option value="">Select subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }} htmlFor="skill">
          Skill <span style={{ color: 'var(--anx-text-faint)' }}>(optional)</span>
        </label>
        <select
          id="skill"
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
          disabled={!subjectId}
          className="anx-input disabled:opacity-50"
        >
          <option value="">All skills / no specific skill</option>
          {skillsForSubject.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="anx-btn-primary w-full"
      >
        {loading ? 'Creating…' : 'Create Session'}
      </button>
    </form>
  );
}
