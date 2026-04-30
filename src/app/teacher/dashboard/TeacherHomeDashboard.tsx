import Link from 'next/link';
import { TeacherHomeClassSelector } from '@/app/teacher/dashboard/TeacherHomeClassSelector';
import { StaffAnalyticsRetryBanner } from '@/components/staff/StaffAnalyticsRetryBanner';
import type { loadTeacherDashboardData } from '@/app/teacher/dashboard/teacherDashboardData';

type DashboardData = Awaited<ReturnType<typeof loadTeacherDashboardData>>;

type Props = {
  data: Exclude<DashboardData, { teacherProfile: null }>;
  displayName: string;
  greeting: string;
  userRole: string;
};

export function formatSessionTime(d: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const t = d.getTime();
  if (t >= startOfToday.getTime()) {
    return `Today, ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  if (t >= startOfYesterday.getTime()) {
    return `Yesterday, ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

function sessionStatusLabel(status: string): { label: string; live: boolean; completed: boolean } {
  if (status === 'ACTIVE' || status === 'LOBBY') return { label: 'Live', live: true, completed: false };
  if (status === 'COMPLETED') return { label: 'Completed', live: false, completed: true };
  return { label: status, live: false, completed: false };
}

function BadgeCheckIcon() {
  return (
    <svg className="td-home-badge-check" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function lessonIconSymbol(skillCode: string | null | undefined, subjectTitle: string): string {
  const code = skillCode?.trim();
  if (code) return code.slice(0, 2).toUpperCase();
  const t = subjectTitle.toLowerCase();
  if (t.includes('percent') || t.includes('%')) return '%';
  if (t.includes('algebra') || t.includes('equation')) return 'x';
  return subjectTitle.trim().charAt(0).toUpperCase() || '?';
}

export function iconHue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h + seed.charCodeAt(i) * (i + 1)) % 360;
  return `hsl(${h} 62% 46%)`;
}

export function classCodeLabel(externalClassId: string, subjectSlug: string | null): string {
  if (subjectSlug && subjectSlug.length <= 5) return subjectSlug.toUpperCase();
  if (externalClassId.length <= 6) return externalClassId.toUpperCase();
  return externalClassId.slice(-4).toUpperCase();
}

const QUICK_LINKS = [
  { href: '/teacher/question-bank', label: 'Question bank', icon: 'bookOpen' as const },
  { href: '/teacher/reports', label: 'Reports', icon: 'chart' as const },
  { href: '/teacher/resources', label: 'Resources', icon: 'folder' as const },
];

const LESSON_TILE_BG = '#5850ec';
const CLASS_ORB_BG = '#5850ec';

function QuickIcon({ kind }: { kind: 'bookOpen' | 'chart' | 'folder' }) {
  const stroke = 'currentColor';
  if (kind === 'bookOpen') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 6.5v11M12 6.5c-1.2-.67-2.75-1-4.5-1-1.4 0-2.6.22-3.5.6V18c.9-.38 2.1-.6 3.5-.6 1.75 0 3.3.33 4.5 1M12 6.5c1.2-.67 2.75-1 4.5-1 1.4 0 2.6.22 3.5.6V18c-.9-.38-2.1-.6-3.5-.6-1.75 0-3.3.33-4.5 1"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'chart') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 20V4M4 20h16M8 16V12M12 16V8M16 16v-5" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V6Z"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TeacherHomeDashboard({ data, displayName, greeting, userRole }: Props) {
  const { teacherProfile, recentSessions, analyticsLoadFailed } = data;
  const classes = teacherProfile.classrooms.map((tc) => {
    const c = tc.classroom;
    return {
      id: c.id,
      name: c.name,
      code: classCodeLabel(c.externalClassId, c.subjectSlug),
      studentCount: c.enrollments.length,
      hue: iconHue(c.id),
    };
  });

  const recentForList = recentSessions.slice(0, 5);
  const recentIdsForList = new Set(recentForList.map((s) => s.id));
  const continueSessions = recentSessions.filter((s) => !recentIdsForList.has(s.id)).slice(0, 3);

  return (
    <div className="td-home">
      <header className="td-home-header">
        <div className="td-home-header-copy">
          <h1 className="td-home-greeting">
            {greeting}, {displayName}{' '}
            <span className="td-home-wave" aria-hidden>
              👋
            </span>
          </h1>
          <p className="td-home-tagline">Ready to make today count?</p>
        </div>
        <div className="td-home-header-controls">
          <TeacherHomeClassSelector classes={classes} />
        </div>
      </header>

      {analyticsLoadFailed ? (
        <div className="td-home-section-alert px-4 sm:px-6">
          <StaffAnalyticsRetryBanner message="Class analytics did not load — shortcuts below still work." />
        </div>
      ) : null}

      <section className="td-home-action-row" aria-label="Quick actions">
        <div className="td-home-action-card td-home-action-card--lesson">
          <div className="td-home-action-card-deco td-home-action-card-deco--waves" aria-hidden />
          <div className="td-home-action-icon td-home-action-icon--tile" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="td-home-action-title">Start a new lesson</h2>
          <p className="td-home-action-desc">Launch a live session and invite your class with a join code.</p>
          <Link href="/teacher/live/new" className="td-home-btn td-home-btn--primary">
            Start lesson
            <span className="td-home-btn-arrow" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </div>
        <div className="td-home-action-card td-home-action-card--ai">
          <div className="td-home-action-card-deco td-home-action-card-deco--sparkle" aria-hidden />
          <div className="td-home-action-icon td-home-action-icon--tile" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 4l1.09 2.82L19 8l-2.91 1.18L15 12l-1.09-2.82L11 8l2.91-1.18L15 4Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M5 19l2-1 1-2 1 2 2 1-2 1-1 2-1-2-2-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="td-home-action-title">Let Ember build for you</h2>
          <p className="td-home-action-desc">
            Draft questions with AI, then start a live session when you are ready.
          </p>
          <Link href="/teacher/question-bank/generate" className="td-home-btn td-home-btn--outline">
            Generate with AI
            <span className="td-home-btn-wand" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 4l1.09 2.82L19 8l-2.91 1.18L15 12l-1.09-2.82L11 8l2.91-1.18L15 4Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        </div>
      </section>

      <div className="td-home-grid">
        <section className="td-home-card td-home-recent td-home-grid-recent">
          <div className="td-home-card-head">
            <h2 className="td-home-card-title">Recent lessons</h2>
            <Link href="/teacher/lessons" className="td-home-link-more">
              View all lessons
              <span aria-hidden> →</span>
            </Link>
          </div>
          {recentForList.length === 0 ? (
            <p className="td-home-empty">No lessons yet. Start your first live session above.</p>
          ) : (
            <ul className="td-home-lesson-list">
              {recentForList.map((ls) => {
                const cls = ls.classroom;
                const meta = cls ? `${cls.name} • ${classCodeLabel(cls.externalClassId, cls.subjectSlug)}` : ls.subject.title;
                const title = ls.skill?.name ?? ls.subject.title;
                const sym = lessonIconSymbol(ls.skill?.code, ls.subject.title);
                const st = sessionStatusLabel(ls.status);
                return (
                  <li key={ls.id} className="td-home-lesson-row">
                    <div className="td-home-lesson-icon" style={{ background: LESSON_TILE_BG }} aria-hidden>
                      <span>{sym}</span>
                    </div>
                    <div className="td-home-lesson-main">
                      <p className="td-home-lesson-title">{title}</p>
                      <p className="td-home-lesson-meta">{meta}</p>
                    </div>
                    <div className="td-home-lesson-side">
                      <span
                        className={
                          st.live
                            ? 'td-home-badge td-home-badge--live'
                            : st.completed
                              ? 'td-home-badge td-home-badge--completed'
                              : 'td-home-badge td-home-badge--neutral'
                        }
                      >
                        {st.live ? <span className="td-home-dot" aria-hidden /> : null}
                        {st.completed ? <BadgeCheckIcon /> : null}
                        {st.label}
                      </span>
                      <span className="td-home-lesson-time">{formatSessionTime(ls.createdAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="td-home-card td-home-grid-classes">
          <div className="td-home-card-head">
            <h2 className="td-home-card-title">Your classes</h2>
            <Link href="/teacher/timetable" className="td-home-link-muted">
              Manage classes
            </Link>
          </div>
          {classes.length === 0 ? (
            <p className="td-home-empty">No classes linked yet.</p>
          ) : (
            <>
              <ul className="td-home-class-list">
                {classes.slice(0, 5).map((c) => (
                  <li key={c.id} className="td-home-class-row">
                    <span className="td-home-class-orb" style={{ background: CLASS_ORB_BG }} aria-hidden>
                      {c.code.slice(0, 3)}
                    </span>
                    <div className="td-home-class-text">
                      <p className="td-home-class-name">{c.name}</p>
                      <p className="td-home-class-count">{c.studentCount} student{c.studentCount !== 1 ? 's' : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/teacher/dashboard/classes" className="td-home-footer-link">
                View all classes
                <span aria-hidden> →</span>
              </Link>
            </>
          )}
        </section>

        <section className="td-home-continue td-home-card td-home-grid-continue" aria-label="Continue working">
          <div className="td-home-card-head">
            <h2 className="td-home-card-title">Continue where you left off</h2>
            <Link href="/teacher/dashboard/classes" className="td-home-link-more">
              View all
              <span aria-hidden> →</span>
            </Link>
          </div>
          <div className="td-home-continue-row">
            {continueSessions.map((ls) => {
              const title = ls.skill?.name ?? ls.subject.title;
              const mins = Math.max(0, Math.round((Date.now() - ls.updatedAt.getTime()) / 60000));
              const edited = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
              return (
                <Link key={ls.id} href={`/teacher/live/${ls.id}`} className="td-home-mini-card">
                  <span className="td-home-mini-label">Live lesson</span>
                  <p className="td-home-mini-title">{title}</p>
                  <p className="td-home-mini-foot">Edited {edited}</p>
                </Link>
              );
            })}
            <Link href="/teacher/live/new" className="td-home-mini-card td-home-mini-card--new">
              <span className="td-home-mini-plus" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
                </svg>
              </span>
              <p className="td-home-mini-title">New from blank</p>
              <p className="td-home-mini-foot">Start a fresh session</p>
            </Link>
          </div>
        </section>

        <section className="td-home-card td-home-grid-quick">
          <h2 className="td-home-card-title td-home-card-title--solo">Quick access</h2>
          <ul className="td-home-quick-list">
            {QUICK_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="td-home-quick-row">
                  <span className="td-home-quick-icon">
                    <QuickIcon kind={item.icon} />
                  </span>
                  <span className="td-home-quick-label">{item.label}</span>
                  <span className="td-home-quick-chevron" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {userRole === 'ADMIN' || userRole === 'LEADERSHIP' ? (
        <p className="td-home-admin-hint">
          <Link href="/teacher/leadership" className="td-home-link-more">
            School overview (leadership)
          </Link>
        </p>
      ) : null}
    </div>
  );
}
