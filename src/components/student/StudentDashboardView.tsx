import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { UserGamificationSummary } from '@/features/gamification/gamificationService';
import { StudentComingUpWidget } from '@/components/student/StudentComingUpWidget';

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

export type StudentLivePromo = {
  topicTitle: string;
  teacherLine: string;
  classLine: string;
};

function tileAccent(i: number): { bg: string; icon: string } {
  const accents = [
    { bg: 'rgba(99, 102, 241, 0.18)', icon: '#4f46e5' },
    { bg: 'rgba(249, 115, 22, 0.15)', icon: '#ea580c' },
    { bg: 'rgba(34, 197, 94, 0.15)', icon: '#16a34a' },
    { bg: 'rgba(59, 130, 246, 0.15)', icon: '#2563eb' },
  ];
  return accents[i % accents.length];
}

type Props = {
  displayName: string;
  gamification: UserGamificationSummary;
  subjects: DashboardSubjectSummary[];
  /** Active live session the student has joined (lobby or active). */
  livePromo: StudentLivePromo | null;
  /** Question-answered events this week (for achievement copy). */
  weekActivityCount: number;
  /** First subject slug for timetable link */
  primarySubjectSlug: string | null;
};

export function StudentDashboardView({
  displayName,
  gamification,
  subjects,
  livePromo,
  weekActivityCount,
  primarySubjectSlug,
}: Props) {
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const continueSubjects = subjects.filter((s) => s.onboardingComplete && s.nextSkillName).slice(0, 4);
  /** Ring shows practice-day coverage this week (Mon–Sun), aligned with activity metrics. */
  const practiceDaysRingDeg = Math.min(
    360,
    Math.round((Math.min(7, gamification.activeDaysThisWeek) / 7) * 360)
  );
  const donutStyle: CSSProperties = {
    background: `conic-gradient(var(--anx-primary) ${practiceDaysRingDeg}deg, var(--anx-surface-container-high) 0)`,
  };

  const timetableHref = primarySubjectSlug ? `/learn/${primarySubjectSlug}` : '/dashboard';

  return (
    <div className="stu-dash">
      <header className="stu-dash-welcome">
        <h1 className="stu-dash-welcome-title">
          Hi {firstName}{' '}
          <span aria-hidden>👋</span>
        </h1>
        <p className="stu-dash-welcome-sub">Let&apos;s keep learning and growing.</p>
      </header>

      <div className="stu-dash-grid">
        <div className="stu-dash-main">
          <section className="stu-dash-live-card" aria-label="Live lesson">
            <div className="stu-dash-live-inner">
              <div className="stu-dash-live-copy">
                <div className="stu-dash-live-icon-wrap" aria-hidden>
                  <div className="stu-dash-live-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M8 22h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="stu-dash-live-badge">LIVE</span>
                </div>
                {livePromo ? (
                  <>
                    <p className="stu-dash-live-eyebrow">You have a live lesson</p>
                    <h2 className="stu-dash-live-topic">{livePromo.topicTitle}</h2>
                    <p className="stu-dash-live-meta">
                      {livePromo.teacherLine} · {livePromo.classLine}
                    </p>
                    <Link href="/student/live" className="stu-dash-btn-primary">
                      Join lesson
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="stu-dash-live-eyebrow">No live class right now</p>
                    <h2 className="stu-dash-live-topic">Join when your teacher shares a code</h2>
                    <p className="stu-dash-live-meta">Have a join code ready from your teacher.</p>
                    <Link href="/student/live" className="stu-dash-btn-primary">
                      Open live room
                    </Link>
                  </>
                )}
              </div>
              <div className="stu-dash-live-art" aria-hidden>
                <div className="stu-dash-tablet">
                  <span className="stu-dash-tablet-eq">2x + 3 = 11</span>
                </div>
              </div>
            </div>
          </section>

          <section className="stu-dash-section">
            <div className="stu-dash-section-head">
              <h2 className="stu-dash-section-title">Continue learning</h2>
              <Link href={timetableHref} className="stu-dash-link-all">
                View all
              </Link>
            </div>
            {continueSubjects.length === 0 ? (
              <p className="stu-dash-muted m-0 text-sm">
                {subjects.length === 0
                  ? 'Subjects will appear when your school adds them.'
                  : 'Complete your diagnostic on a subject to unlock practice cards here.'}
              </p>
            ) : (
              <div className="stu-dash-continue-row">
                {continueSubjects.map((s, i) => {
                  const accent = tileAccent(i);
                  const pct = Math.min(100, Math.max(8, s.averageMastery));
                  return (
                    <Link key={s.id} href={s.nextHref} className="stu-dash-tile">
                      <span className="stu-dash-tile-icon" style={{ background: accent.bg, color: accent.icon }}>
                        {s.emoji}
                      </span>
                      <span className="stu-dash-tile-type">{s.title}</span>
                      <span className="stu-dash-tile-title">{s.nextSkillName}</span>
                      <span className="stu-dash-tile-bar-track">
                        <span className="stu-dash-tile-bar-fill" style={{ width: `${pct}%` }} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="stu-dash-achievement">
            <div className="stu-dash-achievement-icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6L12 2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  fill="rgba(99,102,241,0.12)"
                />
              </svg>
            </div>
            <div className="stu-dash-achievement-copy">
              <p className="stu-dash-achievement-title">Great work!</p>
              <p className="stu-dash-achievement-sub">
                You completed {weekActivityCount} activit{weekActivityCount === 1 ? 'y' : 'ies'} this week.
              </p>
            </div>
            <div className="stu-dash-achievement-xp" title="XP earned from rewards this week">
              +{gamification.weekXpEarned.toLocaleString('en-GB')} XP
            </div>
          </section>
        </div>

        <aside className="stu-dash-aside">
          <StudentComingUpWidget />
          <section className="stu-dash-card stu-dash-xp-card">
            <h2 className="stu-dash-card-title">Your XP</h2>
            <div className="stu-dash-xp-row">
              <div className="stu-dash-donut" style={donutStyle}>
                <div className="stu-dash-donut-inner">
                  <span className="stu-dash-donut-value">{gamification.xp.toLocaleString('en-GB')}</span>
                  <span className="stu-dash-donut-label">XP</span>
                </div>
              </div>
              <div className="stu-dash-xp-copy">
                <p className="stu-dash-xp-lead">Keep it up!</p>
                <p className="stu-dash-muted m-0 text-sm">
                  You&apos;re on a {gamification.streakDays} day streak.
                </p>
                <p className="stu-dash-muted m-0 mt-1 text-xs">
                  This week: {gamification.activeDaysThisWeek} day{gamification.activeDaysThisWeek !== 1 ? 's' : ''} with
                  practice (out of 7)
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
