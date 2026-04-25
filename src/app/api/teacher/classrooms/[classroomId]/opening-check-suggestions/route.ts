import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import {
  fetchItemsForDisplay,
  getStudentWrongCountsFromLiveSession,
  getStudentWrongItemsFromLiveSession,
  getWrongAttemptsGroupedByUserSkillItem,
} from '@/lib/live/opening-check-recommendations';

interface Props {
  params: Promise<{ classroomId: string }>;
}

const WRONG_HISTORY_DAYS = 60;

function scoreSkill(params: {
  wrongLive: number;
  wrongPractice: number;
  mastery: number | null;
}): number {
  const m = params.mastery ?? 0.35;
  return params.wrongLive * 4 + params.wrongPractice * 2 + (1 - m);
}

/**
 * GET .../opening-check-suggestions?subjectId=&skillIds=a,b&lastSessionId=
 *
 * One suggested opening-check item per student, using (in order):
 * - Wrong answers in the selected last live session (this class)
 * - Recent wrong QuestionAttempts in this class (batched)
 * - Weakest mastery among lesson skills (fallback)
 */
export async function GET(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const userId = (session.user as { id: string }).id;
  const { classroomId } = await params;

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  const skillIdsParam = searchParams.get('skillIds');
  const lastSessionId = searchParams.get('lastSessionId')?.trim() || '';

  if (!subjectId || !skillIdsParam) {
    return NextResponse.json({ error: 'subjectId and skillIds required' }, { status: 400 });
  }
  const skillIds = skillIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (skillIds.length === 0) {
    return NextResponse.json({ error: 'skillIds required' }, { status: 400 });
  }

  const access = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { classrooms: { where: { classroomId }, select: { classroomId: true } } },
  });
  if (!access?.classrooms.length) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  }

  const enrollments = await prisma.classroomEnrollment.findMany({
    where: { classroomId },
    select: {
      studentUserId: true,
      student: { select: { id: true, name: true, email: true } },
    },
  });

  const studentIds = enrollments.map((e) => e.studentUserId);
  if (studentIds.length === 0) {
    return NextResponse.json({ students: [] });
  }

  const states = await prisma.studentSkillState.findMany({
    where: { userId: { in: studentIds }, skillId: { in: skillIds } },
    select: { userId: true, skillId: true, masteryProbability: true },
  });
  const masteryByUserSkill = new Map<string, number>();
  for (const s of states) {
    masteryByUserSkill.set(`${s.userId}:${s.skillId}`, s.masteryProbability);
  }

  const since = new Date();
  since.setDate(since.getDate() - WRONG_HISTORY_DAYS);

  const wrongPracticeByUser = await getWrongAttemptsGroupedByUserSkillItem({
    userIds: studentIds,
    skillIds,
    since,
    takePerSkillPerUser: 5,
  });

  let liveWrongByUser: Awaited<ReturnType<typeof getStudentWrongCountsFromLiveSession>> = new Map();
  let liveWrongItemsByUser = new Map<string, Array<{ itemId: string; skillId: string }>>();
  if (lastSessionId) {
    liveWrongByUser = await getStudentWrongCountsFromLiveSession({
      liveSessionId: lastSessionId,
      classroomId,
      teacherUserId: userId,
    });
    liveWrongItemsByUser = await getStudentWrongItemsFromLiveSession({
      liveSessionId: lastSessionId,
      classroomId,
      teacherUserId: userId,
      skillIds,
      takePerStudent: 8,
    });
  }

  const students = enrollments.map((e) => {
    const uid = e.studentUserId;
    const liveBySkill = liveWrongByUser.get(uid);
    let bestSkill = skillIds[0];
    let bestScore = -Infinity;
    for (const sid of skillIds) {
      const wrongLive = liveBySkill?.get(sid) ?? 0;
      const wrongRows = wrongPracticeByUser.get(uid)?.get(sid) ?? [];
      const wrongPractice = wrongRows.reduce((a, r) => a + r.n, 0);
      const mastery = masteryByUserSkill.get(`${uid}:${sid}`) ?? null;
      const sc = scoreSkill({ wrongLive, wrongPractice, mastery });
      if (sc > bestScore) {
        bestScore = sc;
        bestSkill = sid;
      }
    }

    const practiceRows = wrongPracticeByUser.get(uid)?.get(bestSkill) ?? [];
    const liveItemsForStudent = liveWrongItemsByUser.get(uid) ?? [];
    const liveItemForSkill = liveItemsForStudent.find((x) => x.skillId === bestSkill);

    let pickItemId: string | null = null;
    let reason: 'last_live_session_item' | 'wrong_practice' | 'mastery_fallback' = 'mastery_fallback';

    if (liveItemForSkill) {
      pickItemId = liveItemForSkill.itemId;
      reason = 'last_live_session_item';
    } else if (practiceRows.length > 0) {
      pickItemId = practiceRows[0].itemId;
      reason = 'wrong_practice';
    }

    return {
      studentUserId: uid,
      name: e.student.name,
      email: e.student.email,
      pickSkill: bestSkill,
      pickItemId,
      reason,
      signals: {
        wrongInLastLiveSessionBySkill: liveBySkill ? Object.fromEntries(liveBySkill) : {},
        recentWrongAttemptsBySkill: Object.fromEntries(
          skillIds.map((sid) => [sid, (wrongPracticeByUser.get(uid)?.get(sid) ?? []).reduce((a, r) => a + r.n, 0)]),
        ),
        masteryBySkill: Object.fromEntries(
          skillIds.map((sid) => [sid, masteryByUserSkill.get(`${uid}:${sid}`) ?? null]),
        ),
      },
    };
  });

  const itemIds = [...new Set(students.map((s) => s.pickItemId).filter(Boolean) as string[])];
  const display = await fetchItemsForDisplay(itemIds, subjectId);

  const itemBySkill = new Map<string, { id: string; question: string }>();
  for (const sid of skillIds) {
    const link = await prisma.itemSkill.findFirst({
      where: { skillId: sid, item: { OR: [{ subjectId }, { subjectId: null }] } },
      select: { item: { select: { id: true, question: true } } },
    });
    if (link) itemBySkill.set(sid, link.item);
  }

  const body = students.map((s) => {
    const skillId = s.pickSkill;
    let itemId = s.pickItemId;
    let questionPreview = '';

    if (itemId) {
      const row = display.get(itemId);
      if (row?.skillIds.includes(skillId)) {
        questionPreview = row.question.slice(0, 120);
      } else {
        itemId = null;
      }
    }

    if (!itemId) {
      const fallback = itemBySkill.get(skillId);
      if (fallback) {
        itemId = fallback.id;
        questionPreview = fallback.question.slice(0, 120);
      }
    }

    return {
      studentUserId: s.studentUserId,
      name: s.name,
      email: s.email,
      suggested: itemId ? [{ skillId, itemId, questionPreview }] : [],
      recommendationReason: s.reason,
      signals: s.signals,
    };
  });

  return NextResponse.json({ students: body });
}
