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

function formatTime(d: Date): string {
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
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

export function TeacherHomeDashboard({ data, displayName, greeting }: Props) {
  const { activeSessions, recentSessions, lessonCount, sessionsThisTerm } = data;

  return (
    <div className="space-y-8 py-8">
      {/* Greeting */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
          {greeting}, {displayName} 👋
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Ready to make today count?</p>
      </header>

      {/* Active sessions banner */}
      {activeSessions.length > 0 && (
        <section aria-label="Active sessions">
          <div className="space-y-2">
            {activeSessions.map((s) => {
              const st = sessionStatusLabel(s.status);
              const title = s.skill?.name ?? s.subject.title;
              return (
                <Link
                  key={s.id}
                  href={`/teacher/live/${s.id}`}
                  className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 transition hover:bg-red-100"
                >
                  <LiveDot />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#111827]">{title}</p>
                    {s.classroom && (
                      <p className="text-xs text-[#6b7280]">{s.classroom.name}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      st.tone === 'live'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {st.label}
                  </span>
                  <span className="shrink-0 text-[#9ca3af]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Stats row */}
      <section aria-label="Summary stats" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Lessons</p>
          <p className="mt-1 text-3xl font-bold text-[#111827]">{lessonCount}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">in your library</p>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Sessions</p>
          <p className="mt-1 text-3xl font-bold text-[#111827]">{sessionsThisTerm}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">this term</p>
        </div>
        {activeSessions.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Live now</p>
            <p className="mt-1 text-3xl font-bold text-red-600">{activeSessions.length}</p>
            <p className="mt-0.5 text-xs text-red-500">active session{activeSessions.length !== 1 ? 's' : ''}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Status</p>
            <p className="mt-1 text-base font-semibold text-[#6b7280]">No active sessions</p>
            <Link href="/teacher/lessons" className="mt-1 block text-xs font-semibold text-[#5850ec] hover:underline">
              Go to lessons →
            </Link>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/teacher/lessons/new"
          className="group flex items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm transition hover:border-[#5850ec]/40 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5850ec] text-white shadow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[#111827]">Build a lesson</p>
            <p className="mt-0.5 text-xs text-[#6b7280]">Create blocks, add questions, go live</p>
          </div>
          <span className="ml-auto shrink-0 text-[#9ca3af] transition group-hover:text-[#5850ec]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>

        <Link
          href="/teacher/curriculum"
          className="group flex items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm transition hover:border-[#5850ec]/40 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#5850ec] ring-1 ring-inset ring-[#e9e5ff]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[#111827]">Plan your curriculum</p>
            <p className="mt-0.5 text-xs text-[#6b7280]">Map topics, set aims, get AI feedback</p>
          </div>
          <span className="ml-auto shrink-0 text-[#9ca3af] transition group-hover:text-[#5850ec]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </section>

      {/* Recent sessions */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">Recent sessions</h2>
          <Link href="/teacher/live" className="text-xs font-semibold text-[#5850ec] hover:underline">
            View all
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e5e7eb] px-6 py-10 text-center">
            <p className="text-sm font-medium text-[#374151]">No sessions yet</p>
            <p className="mt-1 text-sm text-[#6b7280]">
              Build a lesson and go live to see sessions here.
            </p>
            <Link
              href="/teacher/lessons/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#5850ec] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Build your first lesson
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentSessions.map((s) => {
              const title = s.skill?.name ?? s.subject.title;
              const sym = s.skill?.code?.slice(0, 2).toUpperCase() ?? s.subject.title.charAt(0).toUpperCase();
              const st = sessionStatusLabel(s.status);
              return (
                <li key={s.id}>
                  <Link
                    href={`/teacher/live/${s.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 transition hover:border-[#d1d5db] hover:shadow-sm"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: '#5850ec' }}
                      aria-hidden
                    >
                      {sym}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827]">{title}</p>
                      <p className="mt-0.5 text-xs text-[#6b7280]">
                        {s.classroom?.name ?? s.subject.title}
                        {s._count.participants > 0
                          ? ` · ${s._count.participants} student${s._count.participants !== 1 ? 's' : ''}`
                          : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {s.status === 'ACTIVE' || s.status === 'LOBBY' || s.status === 'PAUSED' ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          {st.label}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9ca3af]">{formatTime(s.createdAt)}</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
