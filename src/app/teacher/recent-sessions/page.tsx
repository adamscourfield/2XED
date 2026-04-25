import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';

export default async function TeacherRecentSessionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const sessions = await prisma.liveSession.findMany({
    where: { teacherUserId: user.id },
    include: {
      subject: { select: { title: true } },
      skill: { select: { name: true, code: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  return (
    <LearningPageShell
      title="Recent sessions"
      subtitle="Your live lessons, newest first"
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      actions={
        <Link href="/teacher/live/new" className="anx-btn-primary text-sm no-underline">
          New lesson
        </Link>
      }
    >
      {sessions.length === 0 ? (
        <p className="text-sm text-[color:var(--anx-text-muted)]">No sessions yet.</p>
      ) : (
        <ul className="flex list-none flex-col gap-2 p-0">
          {sessions.map((ls) => {
            const isLive = ls.status === 'ACTIVE' || ls.status === 'LOBBY';
            return (
              <li key={ls.id} className="staff-dash-live-row">
                <div className="staff-dash-live-row-main">
                  {isLive ? <span className="anx-live-dot shrink-0" /> : <span className="w-2 shrink-0" aria-hidden />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[color:var(--anx-text)]">
                      {ls.subject.title}
                      {ls.skill ? ` — ${ls.skill.code}: ${ls.skill.name}` : ''}
                    </p>
                    <p className="text-xs text-[color:var(--anx-text-muted)]">
                      <span className="font-mono font-semibold">{ls.joinCode}</span> · {ls._count.participants} student
                      {ls._count.participants !== 1 ? 's' : ''} · {ls.createdAt.toLocaleString('en-GB')}
                    </p>
                  </div>
                </div>
                <div className="staff-dash-live-actions">
                  <span className="anx-badge anx-badge-blue">{ls.status}</span>
                  {(isLive || ls.status === 'PAUSED') && (
                    <Link href={`/teacher/live/${ls.id}`} className="anx-btn-secondary px-3 py-1.5 text-xs no-underline">
                      Open
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </LearningPageShell>
  );
}
