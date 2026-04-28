'use client';

import Link from 'next/link';
import { StaffAnalyticsDisclosure } from '@/components/staff/StaffAnalyticsDisclosure';

type Verdict = {
  label: string;
  colour: string;
  bg: string;
  description: string;
};

type Subject = { id: string; title: string; slug: string };

type Props = {
  verdict: Verdict;
  avgDle: number | null | undefined;
  durableCount: number;
  developingCount: number;
  atRiskCount: number;
  totalStates: number;
  durablePct: string;
  developingPct: string;
  atRiskPct: string;
  accuracyPct7d: number | null;
  accuracyTrend: number | null;
  activeStudents: number;
  recentTotal: number;
  liveSessions7d: number;
  openInterventions: number;
  realItemCount: number;
  itemCount: number;
  openNotes: number;
  coverageGaps: number;
  skillsWithItems: number;
  totalSkills: number;
  skillCoveragePct: string;
  subjects: Subject[];
};

export function AdminHomeDashboard(props: Props) {
  const {
    verdict,
    avgDle,
    durableCount,
    developingCount,
    atRiskCount,
    totalStates,
    durablePct,
    developingPct,
    atRiskPct,
    accuracyPct7d,
    accuracyTrend,
    activeStudents,
    recentTotal,
    liveSessions7d,
    openInterventions,
    realItemCount,
    itemCount,
    openNotes,
    coverageGaps,
    skillsWithItems,
    totalSkills,
    skillCoveragePct,
    subjects,
  } = props;

  const fmt = (n: number) => n.toLocaleString('en-GB');

  return (
    <>
      <section>
        <p className="anx-section-label mb-3" style={{ color: 'var(--anx-text-muted)' }}>
          Durability signal
        </p>
        <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--anx-border)', background: verdict.bg }}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black"
                style={{ background: verdict.colour, color: '#fff' }}
              >
                {verdict.label === 'POSITIVE' ? '↑' : verdict.label === 'CONCERN' ? '↓' : '~'}
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight" style={{ color: verdict.colour }}>
                  DLE {verdict.label}
                </p>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>
                  {verdict.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold font-serif" style={{ color: 'var(--anx-text)' }}>
                  {avgDle !== null && avgDle !== undefined ? avgDle.toFixed(2) : '—'}
                </p>
                <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                  avg DLE score
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-serif" style={{ color: 'var(--anx-success)' }}>
                  {fmt(durableCount)}
                </p>
                <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                  durable states
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-serif" style={{ color: 'var(--anx-warning-text)' }}>
                  {fmt(developingCount)}
                </p>
                <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                  developing
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-serif" style={{ color: 'var(--anx-danger-text)' }}>
                  {fmt(atRiskCount)}
                </p>
                <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                  at-risk
                </p>
              </div>
            </div>
          </div>

          {totalStates > 0 && (
            <div className="mt-5">
              <div className="flex h-3 overflow-hidden rounded-full">
                <div className="transition-all" style={{ width: durablePct, background: 'var(--anx-success)' }} />
                <div className="transition-all" style={{ width: developingPct, background: 'var(--anx-warning)' }} />
                <div className="transition-all" style={{ width: atRiskPct, background: 'var(--anx-danger)' }} />
              </div>
              <div className="mt-1.5 flex gap-4 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                <span>Durable {durablePct}</span>
                <span>Developing {developingPct}</span>
                <span>At-risk {atRiskPct}</span>
                <span className="ml-auto">{fmt(totalStates)} total skill states</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <StaffAnalyticsDisclosure
        storageKey="admin-home-operational"
        labelShowDetails="Show operational metrics & shortcuts"
        labelHideDetails="Hide operational metrics & shortcuts"
        summary={
          <>
            Student activity, content health, subject insights, and admin tools — open when you need detail.
          </>
        }
      >
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
            <p className="anx-section-label mb-4" style={{ color: 'var(--anx-text-muted)' }}>
              Student success — last 7 days
            </p>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p
                    className="text-3xl font-bold font-serif"
                    style={{
                      color:
                        accuracyPct7d === null
                          ? 'var(--anx-text-muted)'
                          : accuracyPct7d >= 75
                            ? 'var(--anx-success)'
                            : accuracyPct7d >= 55
                              ? 'var(--anx-warning-text)'
                              : 'var(--anx-danger-text)',
                    }}
                  >
                    {accuracyPct7d !== null ? `${accuracyPct7d}%` : '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    answer accuracy
                  </p>
                </div>
                {accuracyTrend !== null && (
                  <span
                    className={`anx-badge ${accuracyTrend > 2 ? 'anx-badge-green' : accuracyTrend < -2 ? 'anx-badge-red' : 'anx-badge-blue'}`}
                  >
                    {accuracyTrend > 0 ? `↑ +${accuracyTrend}pp` : accuracyTrend < 0 ? `↓ ${accuracyTrend}pp` : '→ stable'} vs prev 7d
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'var(--anx-surface-container-low)' }}>
                  <p className="text-lg font-bold font-serif" style={{ color: 'var(--anx-text)' }}>
                    {fmt(activeStudents)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    active learners
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--anx-surface-container-low)' }}>
                  <p className="text-lg font-bold font-serif" style={{ color: 'var(--anx-text)' }}>
                    {fmt(recentTotal)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    question attempts
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--anx-surface-container-low)' }}>
                  <p className="text-lg font-bold font-serif" style={{ color: 'var(--anx-text)' }}>
                    {fmt(liveSessions7d)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    live sessions
                  </p>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: openInterventions > 0 ? 'var(--anx-danger-soft)' : 'var(--anx-surface-container-low)',
                  }}
                >
                  <p
                    className="text-lg font-bold font-serif"
                    style={{ color: openInterventions > 0 ? 'var(--anx-danger-text)' : 'var(--anx-text)' }}
                  >
                    {fmt(openInterventions)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    open interventions
                  </p>
                </div>
              </div>
            </div>
            <Link href="/admin/interventions" className="mt-4 block text-xs font-medium" style={{ color: 'var(--anx-primary)' }}>
              View interventions →
            </Link>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
            <p className="anx-section-label mb-4" style={{ color: 'var(--anx-text-muted)' }}>
              Question database
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold font-serif" style={{ color: 'var(--anx-text)' }}>
                  {fmt(realItemCount)}
                </p>
                <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                  active items ({fmt(itemCount)} total incl. unlinked)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: openNotes > 0 ? 'var(--anx-warning-soft)' : 'var(--anx-surface-container-low)',
                  }}
                >
                  <p
                    className="text-lg font-bold font-serif"
                    style={{ color: openNotes > 0 ? 'var(--anx-warning-text)' : 'var(--anx-text)' }}
                  >
                    {fmt(openNotes)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    flagged items
                  </p>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: coverageGaps > 0 ? 'var(--anx-danger-soft)' : 'var(--anx-surface-container-low)',
                  }}
                >
                  <p
                    className="text-lg font-bold font-serif"
                    style={{ color: coverageGaps > 0 ? 'var(--anx-danger-text)' : 'var(--anx-text)' }}
                  >
                    {fmt(coverageGaps)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    skills with no items
                  </p>
                </div>
                <div className="col-span-2 rounded-xl p-3" style={{ background: 'var(--anx-surface-container-low)' }}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      skill coverage
                    </p>
                    <p className="text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
                      {skillCoveragePct}
                    </p>
                  </div>
                  <div className="anx-progress-track">
                    <div className="anx-progress-bar" style={{ width: skillCoveragePct }} />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    {fmt(skillsWithItems)} of {fmt(totalSkills)} skills have questions
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {subjects.slice(0, 2).map((s) => (
                <Link key={s.id} href={`/admin/content/${s.slug}`} className="text-xs font-medium" style={{ color: 'var(--anx-primary)' }}>
                  {s.title} QA →
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border p-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
          <p className="anx-section-label mb-4" style={{ color: 'var(--anx-text-muted)' }}>
            Insights & admin tools
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                Subject insights
              </p>
              {subjects.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/insight/${s.slug}`}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--anx-surface-container-low)]"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
                      {s.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      Insight dashboard
                    </p>
                  </div>
                  <span style={{ color: 'var(--anx-text-faint)' }}>→</span>
                </Link>
              ))}
            </div>
            <div className="space-y-1 border-t pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0" style={{ borderColor: 'var(--anx-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                Operations
              </p>
              {[
                { label: 'Question Bank', href: '/admin/questions', sub: 'Author & manage all questions' },
                { label: 'Content audit', href: '/admin/content-audit', sub: 'Coverage & gaps by strand' },
                { label: 'Content ingestion', href: '/admin/content-ingestion', sub: 'Review & publish batches' },
                { label: 'Knowledge state', href: '/admin/knowledge-state', sub: 'Debug learner state traces' },
                { label: 'Re-baseline onboarding', href: '/admin/students/rebaseline', sub: 'Reset diagnostic placement for a student' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-[var(--anx-surface-container-low)]"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      {item.sub}
                    </p>
                  </div>
                  <span style={{ color: 'var(--anx-text-faint)' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section
          className="mt-8 rounded-2xl border"
          style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}
        >
          <div className="grid divide-x sm:grid-cols-3 lg:grid-cols-6" style={{ borderColor: 'var(--anx-border)' }}>
            {[
              { label: 'Insight', href: subjects[0] ? `/admin/insight/${subjects[0].slug}` : '/admin/insight/ks3-maths', icon: '📊' },
              { label: 'Interventions', href: '/admin/interventions', icon: '⚑', alert: openInterventions > 0 },
              { label: 'Questions', href: '/admin/questions', icon: '✏️' },
              {
                label: 'QA Workbench',
                href: subjects[0] ? `/admin/content/${subjects[0].slug}` : '/admin/content/ks3-maths',
                icon: '🔬',
                alert: openNotes > 0,
              },
              { label: 'Content Audit', href: '/admin/content-audit', icon: '📋' },
              { label: 'Ingestion', href: '/admin/content-ingestion', icon: '📥' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-1 px-4 py-4 text-center transition-colors hover:bg-[var(--anx-surface-container-low)] first:rounded-l-2xl last:rounded-r-2xl"
              >
                <span className="text-xl">{link.icon}</span>
                <span
                  className="text-xs font-medium"
                  style={{ color: link.alert ? 'var(--anx-danger-text)' : 'var(--anx-text-secondary)' }}
                >
                  {link.label}
                  {link.alert && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--anx-danger)]" />}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </StaffAnalyticsDisclosure>
    </>
  );
}
