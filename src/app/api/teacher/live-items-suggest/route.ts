import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { fetchSampleItemsBySkillIds } from '@/lib/live/live-check-plan';

/**
 * GET /api/teacher/live-items-suggest?subjectId=&skillIds=a,b&classroomId=&lastSessionId=
 *
 * Returns sample bank items per skill for building a live opening check plan.
 * When lastSessionId is provided (same teacher + classroom), also returns recap
 * skills derived from prerequisites of the last session's phase skills.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  const skillIdsParam = searchParams.get('skillIds');
  const classroomId = searchParams.get('classroomId');
  const lastSessionId = searchParams.get('lastSessionId');

  if (!subjectId || !skillIdsParam) {
    return NextResponse.json({ error: 'subjectId and skillIds are required' }, { status: 400 });
  }

  const skillIds = skillIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (skillIds.length === 0) {
    return NextResponse.json({ error: 'skillIds must list at least one id' }, { status: 400 });
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!teacherProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let recapSkillIds: string[] = [];
  if (lastSessionId && classroomId) {
    const prev = await prisma.liveSession.findFirst({
      where: {
        id: lastSessionId,
        teacherUserId: userId,
        classroomId,
        status: 'COMPLETED',
      },
      select: { phases: true },
    });
    if (prev?.phases) {
      const phases = prev.phases as Array<{ skillId?: string }>;
      const phaseSkillIds = [...new Set(phases.map((p) => p.skillId).filter(Boolean) as string[])];
      if (phaseSkillIds.length > 0) {
        const prereqRows = await prisma.skillPrereq.findMany({
          where: { skillId: { in: phaseSkillIds } },
          select: { prereqId: true },
          distinct: ['prereqId'],
          take: 24,
        });
        recapSkillIds = prereqRows.map((r) => r.prereqId);
      }
    }
  }

  const itemsBySkill = await fetchSampleItemsBySkillIds(skillIds, subjectId, 12);
  let recapItemsBySkill: Awaited<ReturnType<typeof fetchSampleItemsBySkillIds>> = [];
  if (recapSkillIds.length > 0) {
    recapItemsBySkill = await fetchSampleItemsBySkillIds(recapSkillIds, subjectId, 8);
  }

  return NextResponse.json({
    itemsBySkill,
    recapSkillIds,
    recapItemsBySkill,
  });
}
