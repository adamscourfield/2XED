'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CurriculumPlanSummary } from '@/app/api/curriculum-plans/route';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Subject {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  plans: CurriculumPlanSummary[];
  subjects: Subject[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUpdatedPhrase(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startUpdated = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startToday - startUpdated) / 86400000);
  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 7) return `Updated ${diffDays} days ago`;
  return `Updated ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// ── New Plan Modal ─────────────────────────────────────────────────────────────

function NewPlanModal({ subjects, onClose }: {
  subjects: Subject[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [academicYear, setAcademicYear] = useState('');
  const [termLabel, setTermLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/curriculum-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), subjectId, academicYear: academicYear || undefined, termLabel: termLabel || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const plan = await res.json() as CurriculumPlanSummary & { subject: { title: string } };
      // Redirect directly to the new plan
      router.push(`/teacher/curriculum/${plan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create plan');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
      role="dialog"
      aria-modal
      aria-labelledby="new-plan-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-4 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="white" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 id="new-plan-title" className="font-bold text-white">New curriculum plan</h2>
            <p className="mt-0.5 text-sm text-white/80">Set up topics, aims, and lessons before you teach.</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-white/70 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Plan title
            </label>
            <input
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
              placeholder="e.g. Year 9 Maths — Autumn Term"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Subject
            </label>
            <select
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Academic year <span className="font-normal normal-case text-[#9ca3af]">(optional)</span>
              </label>
              <input
                className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                placeholder="2025–26"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Term <span className="font-normal normal-case text-[#9ca3af]">(optional)</span>
              </label>
              <input
                className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                placeholder="Autumn"
                value={termLabel}
                onChange={(e) => setTermLabel(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !subjectId}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(99,102,241,0.35)] transition hover:brightness-[1.03] disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: CurriculumPlanSummary }) {
  return (
    <a
      href={`/teacher/curriculum/${plan.id}`}
      className="group block w-full max-w-2xl rounded-2xl border border-[#EEF0FB] bg-white shadow-[0_4px_28px_rgba(26,26,61,0.07)] transition hover:border-[#6366F1]/25 hover:shadow-[0_8px_32px_rgba(99,102,241,0.10)]"
    >
      <div className="flex gap-4 p-6 pb-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#6366F1]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-lg font-bold tracking-tight text-[#1A1A3D] transition-colors group-hover:text-[#6366F1]">
            {plan.title}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">
            {plan.subjectTitle}
            {plan.academicYear && ` · ${plan.academicYear}`}
            {plan.termLabel && ` · ${plan.termLabel}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-[#EEF0F4] px-6 py-4 text-sm">
        <span className="text-[#6B7280]">
          <span className="font-bold text-[#374151]">{plan.unitCount}</span>
          {plan.unitCount === 1 ? ' unit' : ' units'}
        </span>
        <span className="text-center text-[#6B7280]">
          <span className="font-bold text-[#374151]">{plan.lessonCount}</span>
          {plan.lessonCount === 1 ? ' lesson' : ' lessons'}
        </span>
        <span className="text-right text-[#6B7280]">{formatUpdatedPhrase(plan.updatedAt)}</span>
      </div>
    </a>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CurriculumPlanner({ plans, subjects }: Props) {
  const [showNew, setShowNew] = useState(false);

  const gradientBtn =
    'inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(99,102,241,0.35)] transition hover:brightness-[1.03] active:scale-[0.99]';

  return (
    <div className="-mx-4 bg-[#F8F8FD] px-4 pb-16 pt-1 sm:-mx-6 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1A3D] sm:text-[2rem] sm:leading-tight">
          Curriculum
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-[#6B7280]">
          Map your topics, set aims and success measures, then build lessons from here.
        </p>
      </header>

      <div className="mt-10 flex max-w-2xl flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#9CA3AF]">
          {plans.length === 0
            ? '0 plans'
            : `${plans.length} ${plans.length === 1 ? 'plan' : 'plans'}`}
        </p>
        <button type="button" onClick={() => setShowNew(true)} className={gradientBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.25" strokeLinecap="round" />
          </svg>
          New plan
        </button>
      </div>

      <div className="mt-8">
        {plans.length > 0 ? (
          <div className="flex flex-col gap-5">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
        ) : (
          <div className="max-w-2xl rounded-2xl border border-dashed border-[#D9DCF0] bg-white/70 px-8 py-14 text-center shadow-[0_2px_16px_rgba(26,26,61,0.04)]">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF2FF] text-[#6366F1]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-lg font-bold text-[#1A1A3D]">Plan before you teach</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#6B7280]">
              Create a curriculum plan to map your units, set aims and success measures, and build lessons in context.
            </p>
            <button type="button" onClick={() => setShowNew(true)} className={`${gradientBtn} mt-6`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.25" strokeLinecap="round" />
              </svg>
              Create your first plan
            </button>
          </div>
        )}
      </div>

      {showNew && <NewPlanModal subjects={subjects} onClose={() => setShowNew(false)} />}
    </div>
  );
}
