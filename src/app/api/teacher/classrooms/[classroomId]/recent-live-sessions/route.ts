import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';

interface Props {
  params: Promise<{ classroomId: string }>;
}

/** Recent completed live sessions in this classroom (for recap / check planning). */
export async function GET(_req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['TEACHER']);
  if (response) return response;
  const userId = user.id;
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
