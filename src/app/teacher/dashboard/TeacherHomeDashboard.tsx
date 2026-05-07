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
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a855f7] opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7c3aed]" />
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

function StatIconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        stroke="#5850ec"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
        stroke="#5850ec"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M8 7h8M8 11h6" stroke="#5850ec" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function StatIconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke="#5850ec"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="9" cy="7" r="4" stroke="#5850ec" strokeWidth="1.75" />
      <path
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="#5850ec"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatIconPulse() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h3l2-6 4 12 3-6h4"
        stroke="#5850ec"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const cardShadow = 'shadow-[0_4px_28px_-8px_rgba(17,24,39,0.08),0_2px_8px_-4px_rgba(88,80,236,0.06)]';

export function TeacherHomeDashboard({ data, displayName, greeting }: Props) {
  const { activeSessions, recentSessions, lessonCount, sessionsThisTerm } = data;

  return (
    <div className="relative -mx-4 overflow-hidden px-4 pb-10 pt-6 sm:-mx-6 sm:px-6 sm:pb-12 sm:pt-8">
      <div
        className="pointer-events-none absolute -right-24 -top-32 h-[min(28rem,70vw)] w-[min(28rem,70vw)] rounded-full bg-gradient-to-br from-[#ede9fe] via-[#f5f3ff] to-transparent opacity-90 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[10%] top-0 h-64 w-64 rounded-full bg-[#c4b5fd]/25 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            {greeting}, {displayName} 👋
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">Ready to make today count?</p>
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
                    className="flex items-center gap-4 rounded-2xl border border-[#ddd6fe] bg-white/90 px-5 py-4 transition hover:border-[#c4b5fd] hover:shadow-md"
                    style={{ boxShadow: '0 2px 16px -4px rgba(88, 80, 236, 0.12)' }}
                  >
                    <LiveDot />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827]">{title}</p>
                      {s.classroom && <p className="mt-0.5 text-xs text-[#6b7280]">{s.classroom.name}</p>}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        st.tone === 'live'
                          ? 'bg-[#f5f3ff] text-[#5b21b6]'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {st.label}
                    </span>
                    <span className="shrink-0 text-[#a78bfa]">
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

        <section aria-label="Summary stats" className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            className={`flex gap-4 rounded-2xl border border-white/80 bg-white p-6 ${cardShadow}`}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f5f3ff] ring-1 ring-inset ring-[#ede9fe]">
              <StatIconBook />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tabular-nums tracking-tight text-[#111827]">{lessonCount}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Lessons</p>
              <p className="mt-0.5 text-xs text-[#6b7280]">in your library</p>
            </div>
          </div>

          <div
            className={`flex gap-4 rounded-2xl border border-white/80 bg-white p-6 ${cardShadow}`}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f5f3ff] ring-1 ring-inset ring-[#ede9fe]">
              <StatIconPeople />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tabular-nums tracking-tight text-[#111827]">{sessionsThisTerm}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Sessions</p>
              <p className="mt-0.5 text-xs text-[#6b7280]">this term</p>
            </div>
          </div>

          <div
            className={`flex gap-4 rounded-2xl border border-white/80 bg-white p-6 ${cardShadow}`}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f5f3ff] ring-1 ring-inset ring-[#ede9fe]">
              <StatIconPulse />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Status</p>
              {activeSessions.length > 0 ? (
                <>
                  <p className="mt-1 text-lg font-bold text-[#111827]">
                    {activeSessions.length} live
                  </p>
                  <Link
                    href={`/teacher/live/${activeSessions[0].id}`}
                    className="mt-1 inline-block text-xs font-semibold text-[#5850ec] hover:underline"
                  >
                    Open session →
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-1 text-base font-semibold leading-snug text-[#6b7280]">No active sessions</p>
                  <Link href="/teacher/lessons" className="mt-1 inline-block text-xs font-semibold text-[#5850ec] hover:underline">
                    Go to lessons →
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section aria-label="Quick actions" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Link
            href="/teacher/lessons/new"
            className={`group flex items-center gap-5 rounded-2xl border border-white/80 bg-white p-6 transition hover:border-[#e9e5ff] ${cardShadow}`}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#5850ec] text-white shadow-[0_8px_24px_-6px_rgba(88,80,236,0.55)] ring-4 ring-[#ede9fe]/80">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-[#111827]">Build a lesson</p>
              <p className="mt-1 text-sm leading-relaxed text-[#6b7280]">Create blocks, add questions, go live.</p>
            </div>
            <span className="shrink-0 text-[#c4b5fd] transition group-hover:text-[#5850ec]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>

          <Link
            href="/teacher/curriculum"
            className={`group flex items-center gap-5 rounded-2xl border border-white/80 bg-white p-6 transition hover:border-[#e9e5ff] ${cardShadow}`}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f5f3ff] text-[#5850ec] ring-1 ring-inset ring-[#e9e5ff]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              <p className="mt-1 text-sm leading-relaxed text-[#6b7280]">Map topics, set aims, get AI feedback.</p>
            </div>
            <span className="shrink-0 text-[#c4b5fd] transition group-hover:text-[#5850ec]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#111827]">Recent sessions</h2>
            <Link href="/teacher/live" className="text-sm font-semibold text-[#5850ec] hover:underline">
              View all
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div
              className={`rounded-2xl border border-dashed border-[#e9e5ff] bg-white/70 px-8 py-14 text-center ${cardShadow}`}
            >
              <p className="text-sm font-semibold text-[#374151]">No sessions yet</p>
              <p className="mt-2 text-sm text-[#6b7280]">Build a lesson and go live to see sessions here.</p>
              <Link
                href="/teacher/lessons/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5850ec] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(88,80,236,0.5)] transition hover:bg-[#4c46d6]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Build your first lesson
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentSessions.map((s) => {
                const title = s.skill?.name ?? s.subject.title;
                const badge = sessionListBadge(s.classroom ?? null);
                const st = sessionStatusLabel(s.status);
                const sub = sessionSubtitle(s.classroom ?? undefined, s.subject.title);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/teacher/live/${s.id}`}
                      className={`group flex items-center gap-4 rounded-2xl border border-white/80 bg-white px-5 py-4 transition hover:border-[#e9e5ff] sm:gap-5 ${cardShadow}`}
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-inner ring-2 ring-[#ede9fe]"
                        style={{ background: 'linear-gradient(145deg, #5850ec 0%, #7c3aed 100%)' }}
                        aria-hidden
                      >
                        {badge}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-[#111827]">{title}</p>
                        <p className="mt-1 text-sm text-[#6b7280]">{sub}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {s.status === 'ACTIVE' || s.status === 'LOBBY' || s.status === 'PAUSED' ? (
                          <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-xs font-semibold text-[#5b21b6]">
                            {st.label}
                          </span>
                        ) : (
                          <span className="text-sm tabular-nums text-[#9ca3af]">{formatSessionTime(s.createdAt)}</span>
                        )}
                        <span className="text-[#c4b5fd] transition group-hover:text-[#5850ec]">
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
        </section>
      </div>
    </div>
  );
}
