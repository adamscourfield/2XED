import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser, STAFF_ROLES } from '@/lib/api/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const { user, response } = await requireApiUser(STAFF_ROLES);
  if (response) return response;

  const skills = await prisma.skill.findMany({
    where: { subjectId },
    orderBy: [{ strand: 'asc' }, { sortOrder: 'asc' }],
    select: { id: true, code: true, name: true, strand: true, sortOrder: true },
  });

  return NextResponse.json({ skills });
}
