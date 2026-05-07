import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';

/** Design tokens — Live sessions dashboard */
const accent = '#4F46E5';
const accentMuted = '#EEF2FF';
const ink = '#111827';
const muted = '#6B7280';

function formatTime(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function statusInfo(status: string): { label: string; tone: 'live' | 'paused' | 'done' | 'neutral' } {
  if (status === 'ACTIVE') return { label: 'Live', tone: 'live' };
  if (status === 'LOBBY') return { label: 'In lobby', tone: 'live' };
  if (status === 'PAUSED') return { label: 'Paused', tone: 'paused' };
  if (status === 'COMPLETED') return { label: 'Completed', tone: 'done' };
  return { label: status, tone: 'neutral' };
}

function sessionMetaLine(classroomName: string | null | undefined, subjectTitle: string): string {
  if (classroomName?.trim()) {
    return `${classroomName.trim()} • ${subjectTitle}`;
  }
  return subjectTitle;
}

function CalendarEmptyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#4F46E5]">
      <path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default async function TeacherLivePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const sessions = await prisma.liveSession.findMany({
    where: { teacherUserId: user.id },
    include: {
      subject: { select: { title: true } },
      skill: { select: { name: true, code: true } },
      classroom: { select: { name: true, yearGroup: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const active = sessions.filter((s) => s.status === 'ACTIVE' || s.status === 'LOBBY' || s.status === 'PAUSED');
  const past = sessions.filter((s) => s.status !== 'ACTIVE' && s.status !== 'LOBBY' && s.status !== 'PAUSED');

  return (
    <LearningPageShell
      title="Live sessions"
      subtitle="Your active and recent sessions."
      appChrome="teacher"
      titleClassName="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl"
      subtitleClassName="text-sm text-[#6B7280] sm:text-base"
      actions={
        <Link
          href="/teacher/lessons"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:opacity-90"
          style={{ backgroundColor: accent }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          New lesson
        </Link>
      }
    >
      <div className="space-y-10">
        {active.length > 0 && (
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Active now</h2>
            <ul className="space-y-3">
              {active.map((s) => {
                const title = s.skill?.name ?? s.subject.title;
                const sym = s.skill?.code?.slice(0, 2).toUpperCase() ?? s.subject.title.slice(0, 2).toUpperCase();
                const meta = sessionMetaLine(s.classroom?.name, s.subject.title);
                const st = statusInfo(s.status);
                const extra =
                  s._count.participants > 0
                    ? ` · ${s._count.participants} student${s._count.participants !== 1 ? 's' : ''}`
                    : '';
                return (
                  <li key={s.id}>
                    <Link
                      href={`/teacher/live/${s.id}`}
                      className="flex items-center gap-4 rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.04)] transition hover:shadow-[0_2px_8px_rgba(15,23,42,0.12)]"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: accentMuted, color: accent }}
                        aria-hidden
                      >
                        {sym}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold" style={{ color: ink }}>
                          {title}
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: muted }}>
                          {meta}
                          {extra}
                        </p>
                      </div>
                      <span
                        className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ backgroundColor: accentMuted, color: accent }}
                      >
                        {st.label}
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="shrink-0 text-[#9CA3AF]"
                        aria-hidden
                      >
                        <path
                          d="M9 6l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Recent sessions</h2>
          {past.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] px-6 py-16 text-center"
              style={{ backgroundColor: '#F9FAFB' }}
            >
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: accentMuted }}
              >
                <CalendarEmptyIcon />
              </div>
              <p className="text-base font-semibold" style={{ color: ink }}>
                No sessions yet
              </p>
              <p className="mt-2 max-w-sm text-sm" style={{ color: muted }}>
                Build a lesson and go live to see sessions here.
              </p>
              <Link
                href="/teacher/lessons/new"
                className="mt-6 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                style={{ backgroundColor: accent }}
              >
                Build your first lesson
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {past.map((s) => {
                const title = s.skill?.name ?? s.subject.title;
                const sym = s.skill?.code?.slice(0, 2).toUpperCase() ?? s.subject.title.slice(0, 2).toUpperCase();
                const meta = sessionMetaLine(s.classroom?.name, s.subject.title);
                const st = statusInfo(s.status);
                const extra =
                  s._count.participants > 0
                    ? ` · ${s._count.participants} student${s._count.participants !== 1 ? 's' : ''}`
                    : '';
                return (
                  <li key={s.id}>
                    <Link
                      href={`/teacher/live/${s.id}`}
                      className="flex items-center gap-4 rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.04)] transition hover:shadow-[0_2px_8px_rgba(15,23,42,0.12)]"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: accentMuted, color: accent }}
                        aria-hidden
                      >
                        {sym}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold" style={{ color: ink }}>
                          {title}
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: muted }}>
                          {meta}
                          {extra}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-[#9CA3AF]">{formatTime(s.createdAt)}</p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            st.tone === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F3F4F6] text-[#6B7280]'
                          }`}
                        >
                          {st.label}
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
    </LearningPageShell>
  );
}
