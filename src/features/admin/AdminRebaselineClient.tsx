'use client';

import { useState } from 'react';

interface SubjectOption {
  slug: string;
  title: string;
}

export function AdminRebaselineClient({ subjects }: { subjects: SubjectOption[] }) {
  const [studentEmail, setStudentEmail] = useState('');
  const [subjectSlug, setSubjectSlug] = useState(subjects[0]?.slug ?? '');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/students/rebaseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail, subjectSlug, reason }),
      });
      const data = (await res.json()) as { error?: string; message?: string; abandonedDiagnosticSessions?: number; clearedSkillMasteries?: number };
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Request failed');
        return;
      }
      setStatus('success');
      setMessage(
        data.message
        ?? `Abandoned ${data.abandonedDiagnosticSessions ?? 0} diagnostic session(s); cleared ${data.clearedSkillMasteries ?? 0} skill mastery row(s).`,
      );
    } catch {
      setStatus('error');
      setMessage('Network error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="anx-card space-y-5 p-6 sm:p-8">
      <div>
        <label htmlFor="rebaseline-email" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
          Student email
        </label>
        <input
          id="rebaseline-email"
          type="email"
          required
          autoComplete="email"
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          className="anx-input w-full"
          placeholder="student@example.com"
        />
      </div>
      <div>
        <label htmlFor="rebaseline-subject" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
          Subject
        </label>
        <select
          id="rebaseline-subject"
          value={subjectSlug}
          onChange={(e) => setSubjectSlug(e.target.value)}
          className="anx-input w-full"
          required
        >
          {subjects.map((s) => (
            <option key={s.slug} value={s.slug}>{s.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="rebaseline-reason" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
          Reason (audit log)
        </label>
        <textarea
          id="rebaseline-reason"
          required
          minLength={3}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="anx-input w-full resize-y"
          placeholder="e.g. Wrong account sat the diagnostic; placement needs redo after illness."
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="anx-btn-primary px-6 py-3 disabled:opacity-60"
      >
        {status === 'loading' ? 'Resetting…' : 'Re-baseline onboarding'}
      </button>
      {message && (
        <p
          className="text-sm leading-relaxed"
          style={{
            color: status === 'success' ? 'var(--anx-success)' : 'var(--anx-danger-text)',
          }}
        >
          {message}
        </p>
      )}
    </form>
  );
}
