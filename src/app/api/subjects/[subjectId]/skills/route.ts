import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const skills = await prisma.skill.findMany({
    where: { subjectId: params.subjectId },
    orderBy: [{ strand: 'asc' }, { sortOrder: 'asc' }],
    select: { id: true, code: true, name: true, strand: true, sortOrder: true },
  });

  return NextResponse.json({ skills });
}
