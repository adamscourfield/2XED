import Link from 'next/link';
import type { loadTeacherHomeData } from '@/app/teacher/dashboard/teacherDashboardData';

type HomeData = Awaited<ReturnType<typeof loadTeacherHomeData>>;

type Props = {
  data: HomeData;
  displayName: string;
  greeting: string;
};

// Shared utilities kept here for backward compatibility with other pages that import them.
export function classCodeLabel(externalClassId: string, subjectSlug: string | null): string {
  if (subjectSlug && subjectSlug.length <= 5) return subjectSlug.toUpperCase();
  if (externalClassId.length <= 6) return externalClassId.toUpperCase();
  return externalClassId.slice(-4).toUpperCase();
}

export function iconHue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h + seed.charCodeAt(i) * (i + 1)) % 360;
  return `hsl(${h} 62% 46%)`;
}

export function formatSessionTime(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function sessionStatusLabel(status: string) {
  if (status === 'ACTIVE') return { label: 'Live now', tone: 'live' as const };
  if (status === 'LOBBY') return { label: 'In lobby', tone: 'lobby' as const };
  if (status === 'PAUSED') return { label: 'Paused', tone: 'paused' as const };
  return { label: status, tone: 'neutral' as const };
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5E44FF] opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5E44FF]" />
    </span>
  );
}

/** Short badge for session list (e.g. Y7). */
function sessionListBadge(classroom: {
  name: string;
  yearGroup: string | null;
  externalClassId: string;
  subjectSlug: string | null;
} | null): string {
  if (!classroom) return '—';
  const yg = classroom.yearGroup?.trim();
  if (yg) {
    const yearNum = yg.match(/(?:year\s*)?(\d+)/i);
    if (yearNum) return `Y${yearNum[1]}`;
    if (/^y\d+/i.test(yg)) return yg.slice(0, 3).toUpperCase();
    return yg.length <= 4 ? yg.toUpperCase() : yg.slice(0, 3).toUpperCase();
  }
  const first = classroom.name.trim().split(/\s+/)[0];
  if (first && first.length <= 4) return first.toUpperCase();
  return classCodeLabel(classroom.externalClassId, classroom.subjectSlug);
}

function sessionSubtitle(
  classroom: { name: string } | null | undefined,
  subjectTitle: string,
): string {
  if (classroom?.name) {
    return `${classroom.name} — ${subjectTitle}`;
  }
  return subjectTitle;
}

const accent = '#5E44FF';
const accentSoft = '#F3F0FF';
const cardShadow = 'shadow-[0_4px_32px_-10px_rgba(17,24,39,0.08),0_2px_12px_-6px_rgba(94,68,255,0.06)]';

function StatIconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#5E44FF]" aria-hidden>
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M8 7h8M8 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function StatIconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#5E44FF]" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatIconPulse() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#5E44FF]" aria-hidden>
      <path
        d="M4 12h3l2-6 4 12 3-6h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreateLessonMenu() {
  return (
    <details className="relative self-start sm:self-auto">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[14px] bg-[#5E44FF] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_-8px_rgba(94,68,255,0.45)] transition hover:bg-[#5340e8] [&::-webkit-details-marker]:hidden">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
        Create lesson
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90" aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div
        className="absolute right-0 z-30 mt-2 min-w-[13.5rem] rounded-xl border border-[#E8EAEF] bg-white py-1.5 shadow-[0_16px_48px_-12px_rgba(17,24,39,0.18)]"
        role="menu"
        aria-label="Create lesson options"
      >
        <Link
          href="/teacher/lessons/new"
          className="block px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
          role="menuitem"
        >
          Blank lesson
        </Link>
        <Link
          href="/teacher/lessons"
          className="block px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
          role="menuitem"
        >
          Browse lesson library
        </Link>
      </div>
    </details>
  );
}

/** Soft decorative art for the recent-sessions empty state (no external asset). */
function SessionsEmptyIllustration() {
  return (
    <svg
      width="220"
      height="160"
      viewBox="0 0 220 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto max-w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="dash-empty-a" x1="40" y1="20" x2="180" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EDE9FE" />
          <stop offset="1" stopColor="#DDD6FE" />
        </linearGradient>
        <filter id="dash-empty-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="110" cy="148" rx="72" ry="8" fill="#E9E5FF" opacity="0.7" />
      <rect x="58" y="48" width="88" height="64" rx="12" fill="url(#dash-empty-a)" filter="url(#dash-empty-soft)" />
      <rect x="68" y="58" width="68" height="8" rx="3" fill="#C4B5FD" opacity="0.55" />
      <rect x="68" y="72" width="52" height="6" rx="2" fill="#DDD6FE" />
      <rect x="68" y="84" width="60" height="6" rx="2" fill="#E9E5FF" />
      <path
        d="M118 36h38a6 6 0 0 1 6 6v34a6 6 0 0 1-6 6h-38"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinecap="round"
        fill="#F5F3FF"
      />
      <rect x="124" y="44" width="28" height="20" rx="3" fill="#EDE9FE" />
      <circle cx="138" cy="88" r="3" fill="#C4B5FD" />
      <path d="M44 118l8-36 6 2-6 34z" fill="#DDD6FE" />
      <path d="M48 86l-4 32h12l-4-32h-4Z" fill="#C4B5FD" opacity="0.85" />
      <path d="M156 102c0-10 8-18 18-18s18 8 18 18-8 14-18 14-18-4-18-14Z" fill="#EDE9FE" />
      <path d="M168 92v16M160 100h16" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
      <circle cx="52" cy="32" r="3" fill="#DDD6FE" />
      <circle cx="178" cy="40" r="2.5" fill="#E9E5FF" />
      <circle cx="36" cy="56" r="2" fill="#C4B5FD" opacity="0.7" />
    </svg>
  );
}

export function TeacherHomeDashboard({ data, displayName, greeting }: Props) {
  const { activeSessions, recentSessions, lessonCount, sessionsToday } = data;

  return (
    <div className="relative -mx-4 overflow-hidden px-4 pb-12 pt-6 sm:-mx-6 sm:px-6 sm:pb-14 sm:pt-8">
      <div
        className="pointer-events-none absolute -right-20 -top-36 h-[min(32rem,85vw)] w-[min(32rem,85vw)] rounded-full bg-gradient-to-br from-[#E0E7FF] via-[#EDE9FE] to-transparent opacity-95 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[8%] top-4 h-72 w-72 rounded-full bg-[#C7D2FE]/35 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <h1
              className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[#111827] sm:text-[2.125rem] sm:leading-tight"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, "Times New Roman", serif' }}
            >
              {greeting}, {displayName} 👋
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-[#6B7280] sm:text-base">
              Here&apos;s what&apos;s happening in your teaching space.
            </p>
          </div>
          <CreateLessonMenu />
        </header>

        {activeSessions.length > 0 && (
          <section aria-label="Active sessions">
            <div className="space-y-3">
              {activeSessions.map((s) => {
                const st = sessionStatusLabel(s.status);
                const title = s.skill?.name ?? s.subject.title;
                return (
                  <Link
                    key={s.id}
                    href={`/teacher/live/${s.id}`}
                    className={`flex items-center gap-4 rounded-2xl border border-[#EDE9FE] bg-white px-5 py-4 transition hover:border-[#DDD6FE] hover:shadow-md ${cardShadow}`}
                  >
                    <LiveDot />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827]">{title}</p>
                      {s.classroom && <p className="mt-0.5 text-xs text-[#6B7280]">{s.classroom.name}</p>}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        st.tone === 'live' ? 'bg-[#F3F0FF] text-[#5E44FF]' : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {st.label}
                    </span>
                    <span className="shrink-0 text-[#A78BFA]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M9 6l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section aria-label="Summary stats">
          <div
            className={`grid grid-cols-1 divide-y divide-[#EEF0F4] rounded-2xl border border-white/90 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0 ${cardShadow}`}
          >
            <div className="flex gap-4 p-6 sm:p-8">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-[#EDE9FE]"
                style={{ backgroundColor: accentSoft }}
              >
                <StatIconBook />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-tight text-[#111827] sm:text-xl">
                  {lessonCount} Lesson{lessonCount === 1 ? '' : 's'} built
                </p>
                <p className="mt-1.5 text-sm text-[#6B7280]">
                  {lessonCount === 0 ? 'Start building your first lesson.' : 'In your lesson library.'}
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 sm:p-8">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-[#EDE9FE]"
                style={{ backgroundColor: accentSoft }}
              >
                <StatIconPeople />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-tight text-[#111827] sm:text-xl">
                  {sessionsToday} Live session{sessionsToday === 1 ? '' : 's'}
                </p>
                <p className="mt-1.5 text-sm text-[#6B7280]">
                  {sessionsToday === 0 ? 'No sessions yet today.' : 'Sessions started today.'}
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 sm:p-8">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-[#EDE9FE]"
                style={{ backgroundColor: accentSoft }}
              >
                <StatIconPulse />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Status</p>
                {activeSessions.length > 0 ? (
                  <>
                    <p className="mt-1 text-lg font-bold text-[#111827]">{activeSessions.length} live</p>
                    <Link
                      href={`/teacher/live/${activeSessions[0].id}`}
                      className="mt-1 inline-block text-xs font-semibold hover:underline"
                      style={{ color: accent }}
                    >
                      Open session →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-lg font-bold text-[#22C55E]">Ready to teach</p>
                    <p className="mt-0.5 text-sm text-[#6B7280]">All systems go.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Quick actions" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Link
            href="/teacher/lessons/new"
            className={`group flex items-center gap-5 rounded-2xl border border-white/90 bg-white p-6 transition hover:border-[#E9E5FF] ${cardShadow}`}
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#5E44FF] text-white shadow-[0_12px_32px_-10px_rgba(94,68,255,0.55)] ring-4 ring-[#F3F0FF]/90">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-[#111827]">Build a lesson</p>
              <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">
                Create blocks, add questions, and go live with your class.
              </p>
            </div>
            <span className="shrink-0 text-[#C4B5FD] transition group-hover:text-[#5E44FF]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>

          <Link
            href="/teacher/curriculum"
            className={`group flex items-center gap-5 rounded-2xl border border-white/90 bg-white p-6 transition hover:border-[#E9E5FF] ${cardShadow}`}
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#5E44FF] ring-1 ring-inset ring-[#E9E5FF]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2L2 7l10 5 10-5-10-5Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-[#111827]">Plan your curriculum</p>
              <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">
                Map topics, set aims, and get structured AI feedback.
              </p>
            </div>
            <span className="shrink-0 text-[#C4B5FD] transition group-hover:text-[#5E44FF]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </section>

        <section aria-labelledby="recent-sessions-heading">
          <div className={`overflow-hidden rounded-2xl border border-white/90 bg-white ${cardShadow}`}>
            <div className="flex items-center justify-between gap-4 border-b border-[#F3F4F6] px-6 py-4 sm:px-8">
              <h2 id="recent-sessions-heading" className="text-lg font-bold text-[#111827]">
                Recent sessions
              </h2>
              <Link href="/teacher/live" className="text-sm font-semibold hover:underline" style={{ color: accent }}>
                View all
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="px-6 py-12 text-center sm:px-10 sm:py-14">
                <SessionsEmptyIllustration />
                <p className="mt-8 text-base font-semibold text-[#374151]">No sessions yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6B7280]">
                  Once you go live, your sessions will appear here.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/teacher/lessons/new"
                    className="inline-flex items-center gap-2 rounded-[14px] bg-[#5E44FF] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_-8px_rgba(94,68,255,0.45)] transition hover:bg-[#5340e8]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    Build your first lesson
                  </Link>
                  <Link
                    href="/teacher/lessons"
                    className="inline-flex items-center justify-center rounded-[14px] border-2 border-[#5E44FF] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#5E44FF] transition hover:bg-[#F3F0FF]"
                  >
                    Explore examples
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-[#F3F4F6]">
                {recentSessions.map((s) => {
                  const title = s.skill?.name ?? s.subject.title;
                  const badge = sessionListBadge(s.classroom ?? null);
                  const st = sessionStatusLabel(s.status);
                  const sub = sessionSubtitle(s.classroom ?? undefined, s.subject.title);
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/teacher/live/${s.id}`}
                        className="group flex items-center gap-4 px-5 py-4 transition hover:bg-[#FAFAFC] sm:gap-5 sm:px-8"
                      >
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-inner ring-2 ring-[#EDE9FE]"
                          style={{ background: `linear-gradient(145deg, ${accent} 0%, #7c3aed 100%)` }}
                          aria-hidden
                        >
                          {badge}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug text-[#111827]">{title}</p>
                          <p className="mt-1 text-sm text-[#6B7280]">{sub}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {s.status === 'ACTIVE' || s.status === 'LOBBY' || s.status === 'PAUSED' ? (
                            <span className="rounded-full bg-[#F3F0FF] px-3 py-1 text-xs font-semibold text-[#5E44FF]">
                              {st.label}
                            </span>
                          ) : (
                            <span className="text-sm tabular-nums text-[#9CA3AF]">{formatSessionTime(s.createdAt)}</span>
                          )}
                          <span className="text-[#C4B5FD] transition group-hover:text-[#5E44FF]">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M9 6l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
