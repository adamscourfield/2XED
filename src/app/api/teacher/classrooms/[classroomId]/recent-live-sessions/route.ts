import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

interface Props {
  params: Promise<{ classroomId: string }>;
}

/** Recent completed live sessions in this classroom (for recap / check planning). */
export async function GET(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const userId = (session.user as { id: string }).id;
  const { classroomId } = await params;

  const access = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { classrooms: { where: { classroomId }, select: { classroomId: true } } },
  });
  if (!access?.classrooms.length) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  }

  const rows = await prisma.liveSession.findMany({
    where: { classroomId, teacherUserId: userId, status: 'COMPLETED' },
    orderBy: { endedAt: 'desc' },
    take: 12,
    select: {
      id: true,
      endedAt: true,
      createdAt: true,
      subject: { select: { title: true } },
      skill: { select: { code: true, name: true } },
    },
  });

  return NextResponse.json({
    sessions: rows.map((r) => ({
      id: r.id,
      label: `${r.subject.title}${r.skill ? ` — ${r.skill.code}` : ''} · ${(r.endedAt ?? r.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}`,
    })),
  });
}
