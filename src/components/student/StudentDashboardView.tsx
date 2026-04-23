import Link from 'next/link';
import { JoinSessionInput } from '@/components/JoinSessionInput';
import { DashboardLessonCalendar } from '@/components/DashboardLessonCalendar';
import type { UserGamificationSummary } from '@/features/gamification/gamificationService';

export type JourneyMonthBar = {
  key: string;
  label: string;
  count: number;
};

export type DashboardSubjectSummary = {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  onboardingComplete: boolean;
  averageMastery: number;
  startedSkills: number;
  totalSkills: number;
  nextSkillName: string | null;
  nextHref: string;
  nextLabel: string;
  nextSkillStarted: boolean;
  nextSkillIsDue: boolean;
};

export type DashboardRecentSession = {
  subjectTitle: string;
  subjectSlug: string;
  total: number;
  correct: number;
};

export type DashboardRewardRow = {
  id: string;
  at: string;
  reason: string;
  xpDelta: number;
  tokenDelta: number;
};

type Props = {
  displayName: string;
  gamification: UserGamificationSummary;
  weekQuestions: number;
  weekAccuracyPct: number | null;
  prevWeekQuestions: number;
  journeyMonths: JourneyMonthBar[];
  recentSessions: DashboardRecentSession[];
  rewardRows: DashboardRewardRow[];
  subjects: DashboardSubjectSummary[];
  primaryCtaHref: string;
  primaryCtaLabel: string;
};

function subjectEmoji(slug: string): string {
  if (slug.includes('maths')) return '📐';
  if (slug.includes('english')) return '📖';
  return '📘';
}

function maxBarValue(months: JourneyMonthBar[]): number {
  const m = Math.max(1, ...months.map((x) => x.count));
  return m;
}

export function StudentDashboardView({
  displayName,
  gamification,
  weekQuestions,
  weekAccuracyPct,
  prevWeekQuestions,
  journeyMonths,
  recentSessions,
  rewardRows,
  subjects,
  primaryCtaHref,
  primaryCtaLabel,
}: Props) {
  const barMax = maxBarValue(journeyMonths);
  const weekTrend =
    prevWeekQuestions === 0
      ? weekQuestions > 0
        ? 'First practice this week — nice start.'
        : 'Your practice picks up when you are ready.'
      : weekQuestions >= prevWeekQuestions
        ? 'You are matching or beating last week’s pace.'
        : 'A lighter week — jump back in when you can.';

  return (
    <div className="student-dash">
      <section className="student-dash-hero">
        <div className="student-dash-hero-grid">
          <div className="student-dash-hero-copy">
            <p className="student-dash-eyebrow">Your space</p>
            <h2 className="student-dash-hero-title">Hi, {displayName}</h2>
            <p className="student-dash-hero-lead">
              Everything you need for class, practice, and progress — in one calm view.
            </p>
            <div className="student-dash-hero-actions">
              <Link href={primaryCtaHref} className="anx-btn-primary">
                {primaryCtaLabel}
              </Link>
              <Link href="/student/live" className="anx-btn-secondary">
                Open live room
              </Link>
            </div>
          </div>

          <div className="student-dash-stats-rail">
            <div className="student-dash-stat-card">
              <p className="student-dash-stat-label">Total XP</p>
              <p className="student-dash-stat-value">{gamification.xp.toLocaleString('en-GB')}</p>
              <p className="student-dash-stat-hint">Earned from quizzes, routes, and streaks</p>
            </div>
            <div className="student-dash-stat-card">
              <p className="student-dash-stat-label">Learning tokens</p>
              <p className="student-dash-stat-value">{gamification.tokens}</p>
              <p className="student-dash-stat-hint">From milestones and recoveries</p>
            </div>
            <div className="student-dash-stat-card">
              <p className="student-dash-stat-label">Day streak</p>
              <p className="student-dash-stat-value">{gamification.streakDays} days</p>
              <p className="student-dash-stat-hint">
                {gamification.activeDaysThisWeek} active day{gamification.activeDaysThisWeek === 1 ? '' : 's'} this week
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="student-dash-bento">
        <div className="student-dash-bento-main">
          <DashboardLessonCalendar
            className="student-dash-calendar anx-card overflow-hidden"
            hint="Class timetable, scheduled reviews, and practice due dates."
          />

          <section className="student-dash-panel">
            <div className="student-dash-panel-head">
              <div>
                <p className="student-dash-eyebrow">This week</p>
                <h3 className="student-dash-panel-title">Your momentum</h3>
              </div>
            </div>
            <div className="student-dash-momentum">
              <div>
                <p className="student-dash-metric">{weekQuestions}</p>
                <p className="student-dash-metric-label">Questions practised</p>
              </div>
              <div>
                <p className="student-dash-metric">
                  {weekAccuracyPct === null ? '—' : `${weekAccuracyPct}%`}
                </p>
                <p className="student-dash-metric-label">Accuracy (this week)</p>
              </div>
            </div>
            <p className="student-dash-momentum-note">{weekTrend}</p>
          </section>

          <section className="student-dash-panel">
            <div className="student-dash-panel-head">
              <div>
                <p className="student-dash-eyebrow">Learning journey</p>
                <h3 className="student-dash-panel-title">Practice rhythm</h3>
                <p className="student-dash-panel-sub">Questions you attempted each month</p>
              </div>
            </div>
            <div className="student-dash-chart" role="img" aria-label="Practice count by month">
              {journeyMonths.map((m) => (
                <div key={m.key} className="student-dash-chart-col">
                  <div className="student-dash-chart-track" title={`${m.count} in ${m.label}`}>
                    <div
                      className="student-dash-chart-bar"
                      style={{ height: `${Math.max(8, (m.count / barMax) * 100)}%` }}
                    />
                  </div>
                  <p className="student-dash-chart-label">{m.label}</p>
                  <p className="student-dash-chart-count">{m.count}</p>
                </div>
              ))}
            </div>
          </section>

          {recentSessions.length > 0 && (
            <section className="student-dash-panel">
              <div className="student-dash-panel-head">
                <div>
                  <p className="student-dash-eyebrow">Recent</p>
                  <h3 className="student-dash-panel-title">Latest sessions</h3>
                </div>
              </div>
              <ul className="student-dash-list">
                {recentSessions.map((rs) => {
                  const pct = rs.total > 0 ? Math.round((rs.correct / rs.total) * 100) : 0;
                  const strong = pct >= 80;
                  return (
                    <li key={rs.subjectSlug}>
                      <Link href={`/learn/${rs.subjectSlug}`} className="student-dash-list-row">
                        <span className="student-dash-list-icon" aria-hidden>
                          {subjectEmoji(rs.subjectSlug)}
                        </span>
                        <div className="student-dash-list-body">
                          <p className="student-dash-list-title">{rs.subjectTitle}</p>
                          <p className="student-dash-list-meta">
                            {rs.total} question{rs.total === 1 ? '' : 's'} · {pct}% correct
                          </p>
                        </div>
                        <span className={strong ? 'student-dash-pill student-dash-pill-success' : 'student-dash-pill'}>
                          {strong ? 'Strong' : 'Building'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="student-dash-bento-side">
          <section className="student-dash-side-card student-dash-live">
            <p className="student-dash-eyebrow">Live lesson</p>
            <h3 className="student-dash-side-title">Join your class</h3>
            <p className="student-dash-side-text">Enter the six-character code from your teacher.</p>
            <JoinSessionInput />
            <Link href="/student/live" className="student-dash-text-link">
              Go to live room without a code →
            </Link>
          </section>

          <section className="student-dash-side-card">
            <p className="student-dash-eyebrow">Self study</p>
            <h3 className="student-dash-side-title">Learn at your pace</h3>
            <p className="student-dash-side-text">Pick up where adaptive practice left off for any subject.</p>
            <div className="student-dash-chip-stack">
              {subjects.length === 0 ? (
                <p className="student-dash-side-text">Subjects will appear here when your school adds them.</p>
              ) : (
                subjects.map((s) => (
                  <Link key={s.id} href={s.nextHref} className="student-dash-subject-chip">
                    <span className="text-lg" aria-hidden>
                      {s.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[color:var(--anx-text)]">{s.title}</span>
                      <span className="block truncate text-xs text-[color:var(--anx-text-muted)]">
                        {s.onboardingComplete ? `${s.averageMastery}% path progress` : 'Start with diagnostic'}
                      </span>
                    </span>
                    <span className="shrink-0 text-[color:var(--anx-primary)]">→</span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="student-dash-side-card student-dash-rewards">
            <div className="student-dash-panel-head student-dash-panel-head-tight">
              <div>
                <p className="student-dash-eyebrow">Rewards</p>
                <h3 className="student-dash-side-title">What you have collected</h3>
              </div>
            </div>
            {rewardRows.length === 0 ? (
              <p className="student-dash-side-text">
                Complete practice and streaks to fill this ledger — your first rewards will show up here.
              </p>
            ) : (
              <ul className="student-dash-reward-list">
                {rewardRows.map((r) => {
                  const when = new Intl.DateTimeFormat('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(r.at));
                  return (
                    <li key={r.id} className="student-dash-reward-row">
                      <div className="min-w-0 flex-1">
                        <p className="student-dash-reward-reason">{r.reason}</p>
                        <p className="student-dash-reward-when">{when}</p>
                      </div>
                      <div className="student-dash-reward-deltas">
                        {r.xpDelta !== 0 ? <span className="student-dash-reward-xp">+{r.xpDelta} XP</span> : null}
                        {r.tokenDelta !== 0 ? <span className="student-dash-reward-tok">+{r.tokenDelta} tokens</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {subjects.some((s) => s.onboardingComplete && s.nextSkillName) && (
        <section className="student-dash-panel student-dash-next-strip">
          <p className="student-dash-eyebrow">Next up</p>
          <h3 className="student-dash-panel-title">Continue your path</h3>
          <div className="student-dash-next-grid">
            {subjects
              .filter((s) => s.onboardingComplete && s.nextSkillName)
              .map((s) => (
                <Link key={s.id} href={s.nextHref} className="student-dash-next-card">
                  <span className="student-dash-next-emoji" aria-hidden>
                    {s.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="student-dash-next-subject">{s.title}</p>
                    <p className="student-dash-next-skill">{s.nextSkillName}</p>
                    <div className="student-dash-next-tags">
                      <span className="student-dash-mini-pill">{s.nextSkillStarted ? 'In progress' : 'New'}</span>
                      <span className="student-dash-mini-pill">{s.nextSkillIsDue ? 'Due now' : 'Scheduled'}</span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
