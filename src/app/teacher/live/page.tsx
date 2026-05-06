import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';

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
      actions={
        <Link
          href="/teacher/lessons"
          className="inline-flex items-center gap-2 rounded-lg bg-[#5850ec] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          New lesson
        </Link>
      }
    >
      <div className="space-y-8">
        {active.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Active now</h2>
            <ul className="space-y-2">
              {active.map((s) => {
                const title = s.skill?.name ?? s.subject.title;
                const sym = s.skill?.code?.slice(0, 2).toUpperCase() ?? s.subject.title.charAt(0).toUpperCase();
                const st = statusInfo(s.status);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/teacher/live/${s.id}`}
                      className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 transition hover:bg-red-100"
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
                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        {st.label}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#9ca3af]" aria-hidden>
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
            {active.length > 0 ? 'Recent sessions' : 'Sessions'}
          </h2>
          {past.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e5e7eb] px-6 py-12 text-center">
              <p className="text-sm font-medium text-[#374151]">No sessions yet</p>
              <p className="mt-1 text-sm text-[#6b7280]">Build a lesson and go live to see sessions here.</p>
              <Link
                href="/teacher/lessons/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#5850ec] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca]"
              >
                Build your first lesson
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {past.map((s) => {
                const title = s.skill?.name ?? s.subject.title;
                const sym = s.skill?.code?.slice(0, 2).toUpperCase() ?? s.subject.title.charAt(0).toUpperCase();
                const st = statusInfo(s.status);
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
                        <p className="text-xs text-[#9ca3af]">{formatTime(s.createdAt)}</p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            st.tone === 'done'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-[#f3f4f6] text-[#6b7280]'
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
