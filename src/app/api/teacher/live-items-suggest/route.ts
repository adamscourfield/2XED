import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { fetchSampleItemsBySkillIds } from '@/lib/live/live-check-plan';
import {
  fetchItemsForDisplay,
  getClassWrongHotspots,
  getLastLiveSessionItemStats,
} from '@/lib/live/opening-check-recommendations';

function dedupeItems<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

/**
 * GET /api/teacher/live-items-suggest?subjectId=&skillIds=a,b&classroomId=&lastSessionId=
 *
 * Returns sample bank items per skill for building a live opening check plan.
 * When lastSessionId is provided (same teacher + classroom), also returns recap
 * skills derived from prerequisites of the last session's phase skills.
 *
 * Richer signals (when classroomId is set):
 * - Wrong-answer hotspots from recent QuestionAttempts in this class.
 * - When lastSessionId is set: class-level wrong rate on items from that live session.
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

  const baseItemsBySkill = await fetchSampleItemsBySkillIds(skillIds, subjectId, 12);

  let lastSessionItemStats: Awaited<ReturnType<typeof getLastLiveSessionItemStats>> = [];
  if (lastSessionId && classroomId) {
    lastSessionItemStats = await getLastLiveSessionItemStats({
      liveSessionId: lastSessionId,
      classroomId,
      teacherUserId: userId,
    });
  }

  const wrongHotspots =
    classroomId && skillIds.length > 0
      ? await getClassWrongHotspots({
          classroomId,
          subjectId,
          skillIds,
          take: 24,
        })
      : [];

  const struggleItemIds = lastSessionItemStats
    .filter((s) => skillIds.includes(s.skillId) && (s.wrongCount > 0 || s.classWrongRate >= 0.35))
    .slice(0, 20)
    .map((s) => s.itemId);

  const hotspotItemIds = wrongHotspots.map((h) => h.itemId);
  const displayMap = await fetchItemsForDisplay([...new Set([...struggleItemIds, ...hotspotItemIds])], subjectId);

  const priorityBySkill = new Map<string, Array<{ id: string; question: string; type: string }>>();
  for (const sid of skillIds) priorityBySkill.set(sid, []);

  for (const st of lastSessionItemStats) {
    if (!skillIds.includes(st.skillId)) continue;
    const row = displayMap.get(st.itemId);
    if (!row || !row.skillIds.includes(st.skillId)) continue;
    priorityBySkill.get(st.skillId)?.push({
      id: row.id,
      question: row.question,
      type: row.type,
    });
  }
  for (const h of wrongHotspots) {
    if (!skillIds.includes(h.skillId)) continue;
    const row = displayMap.get(h.itemId);
    if (!row || !row.skillIds.includes(h.skillId)) continue;
    priorityBySkill.get(h.skillId)?.push({
      id: row.id,
      question: row.question,
      type: row.type,
    });
  }

  const itemsBySkill = skillIds.map((skillId) => {
    const base = baseItemsBySkill.find((b) => b.skillId === skillId)?.items ?? [];
    const pri = priorityBySkill.get(skillId) ?? [];
    return {
      skillId,
      items: dedupeItems([...pri, ...base]).slice(0, 24),
    };
  });

  let recapItemsBySkill: Awaited<ReturnType<typeof fetchSampleItemsBySkillIds>> = [];
  if (recapSkillIds.length > 0) {
    recapItemsBySkill = await fetchSampleItemsBySkillIds(recapSkillIds, subjectId, 8);
    if (lastSessionId && classroomId && lastSessionItemStats.length > 0) {
      const recapSet = new Set(recapSkillIds);
      const recapStruggleIds = lastSessionItemStats
        .filter((s) => recapSet.has(s.skillId) && (s.wrongCount > 0 || s.classWrongRate >= 0.25))
        .slice(0, 16)
        .map((s) => s.itemId);
      const recapDisplay = await fetchItemsForDisplay(recapStruggleIds, subjectId);
      const recapPriority = new Map<string, Array<{ id: string; question: string; type: string }>>();
      for (const sid of recapSkillIds) recapPriority.set(sid, []);
      for (const st of lastSessionItemStats) {
        if (!recapSet.has(st.skillId)) continue;
        const row = recapDisplay.get(st.itemId);
        if (!row || !row.skillIds.includes(st.skillId)) continue;
        recapPriority.get(st.skillId)?.push({
          id: row.id,
          question: row.question,
          type: row.type,
        });
      }
      recapItemsBySkill = recapItemsBySkill.map((row) => ({
        skillId: row.skillId,
        items: dedupeItems([...(recapPriority.get(row.skillId) ?? []), ...row.items]).slice(0, 16),
      }));
    }
  }

  return NextResponse.json({
    itemsBySkill,
    recapSkillIds,
    recapItemsBySkill,
    recommendationMeta: {
      lastSessionItemStats: lastSessionItemStats.slice(0, 30),
      wrongHotspotCount: wrongHotspots.length,
    },
  });
}
