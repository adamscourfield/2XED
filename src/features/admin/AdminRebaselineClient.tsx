'use client';

import React from 'react';
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
  const [confirming, setConfirming] = useState(false);

  const selectedSubject = subjects.find((subject) => subject.slug === subjectSlug);
  const canSubmit = studentEmail.trim().length > 0 && subjectSlug.length > 0 && reason.trim().length >= 3 && subjects.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirming) {
      setConfirming(true);
      setMessage(null);
      return;
    }
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/students/rebaseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail, subjectSlug, reason }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        abandonedDiagnosticSessions?: number;
        abandonedBaselineSessions?: number;
        clearedSkillMasteries?: number;
        clearedSkillStates?: number;
        clearedReviews?: number;
      };
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Request failed');
        return;
      }
      setStatus('success');
      setConfirming(false);
      setMessage(
        data.message
        ?? [
          `Reset ${data.abandonedDiagnosticSessions ?? 0} diagnostic session(s).`,
          `Reset ${data.abandonedBaselineSessions ?? 0} baseline session(s).`,
          `Cleared ${data.clearedSkillMasteries ?? 0} mastery row(s).`,
        ].join(' '),
      );
    } catch {
      setStatus('error');
      setMessage('Network error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="anx-card space-y-5 p-6 sm:p-8" aria-describedby="rebaseline-help rebaseline-status">
      <p id="rebaseline-help" className="m-0 text-sm text-[color:var(--anx-text-secondary)]">
        This sends a student back through onboarding for one subject and records the reason in the audit log.
      </p>
      {subjects.length === 0 ? (
        <div className="anx-callout-warning" role="alert">
          Add at least one subject before re-baselining students.
        </div>
      ) : null}
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
          onBlur={() => setConfirming(false)}
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
          onChange={(e) => { setSubjectSlug(e.target.value); setConfirming(false); }}
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
          onChange={(e) => { setReason(e.target.value); setConfirming(false); }}
          className="anx-input w-full resize-y"
          placeholder="e.g. Wrong account sat the diagnostic; placement needs redo after illness."
        />
      </div>
      {confirming ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          <p className="m-0 font-semibold">Confirm re-baseline</p>
          <p className="mt-1">
            {studentEmail.trim()} will restart onboarding for {selectedSubject?.title ?? subjectSlug}. Completed diagnostic and baseline sessions for this subject will no longer count.
          </p>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={status === 'loading' || !canSubmit}
        className="anx-btn-primary px-6 py-3 disabled:opacity-60"
      >
        {status === 'loading' ? 'Resetting…' : confirming ? 'Confirm reset' : 'Review reset'}
      </button>
      {message && (
        <p
          id="rebaseline-status"
          role={status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
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
