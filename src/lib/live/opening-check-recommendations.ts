import { prisma } from '@/db/prisma';

const WRONG_HISTORY_DAYS = 60;

export type LastSessionItemStat = {
  itemId: string;
  skillId: string;
  attemptCount: number;
  wrongCount: number;
  classWrongRate: number;
};

/**
 * Class-level performance on items from a completed live session (students currently enrolled in the classroom).
 */
export async function getLastLiveSessionItemStats(params: {
  liveSessionId: string;
  classroomId: string;
  teacherUserId: string;
}): Promise<LastSessionItemStat[]> {
  const { liveSessionId, classroomId, teacherUserId } = params;

  const sess = await prisma.liveSession.findFirst({
    where: { id: liveSessionId, teacherUserId, classroomId, status: 'COMPLETED' },
    select: { id: true },
  });
  if (!sess) return [];

  const enrollments = await prisma.classroomEnrollment.findMany({
    where: { classroomId },
    select: { studentUserId: true },
  });
  const studentIds = enrollments.map((e) => e.studentUserId);
  if (studentIds.length === 0) return [];

  const attempts = await prisma.liveAttempt.findMany({
    where: { liveSessionId, studentUserId: { in: studentIds } },
    select: { itemId: true, skillId: true, correct: true },
  });
  if (attempts.length === 0) return [];

  type Agg = { itemId: string; skillId: string; n: number; wrong: number };
  const byItem = new Map<string, Agg>();
  for (const a of attempts) {
    const cur = byItem.get(a.itemId) ?? { itemId: a.itemId, skillId: a.skillId, n: 0, wrong: 0 };
    cur.n += 1;
    if (!a.correct) cur.wrong += 1;
    cur.skillId = a.skillId;
    byItem.set(a.itemId, cur);
  }

  return [...byItem.values()]
    .map((v) => ({
      itemId: v.itemId,
      skillId: v.skillId,
      attemptCount: v.n,
      wrongCount: v.wrong,
      classWrongRate: v.n > 0 ? v.wrong / v.n : 0,
    }))
    .filter((v) => v.attemptCount >= 2 || v.wrongCount > 0)
    .sort((a, b) => b.classWrongRate - a.classWrongRate || b.wrongCount - a.wrongCount);
}

export type WrongHotspot = {
  itemId: string;
  skillId: string;
  wrongAttempts: number;
};

/**
 * Items students in this class got wrong often (QuestionAttempt), scoped to skills / subject.
 */
export async function getClassWrongHotspots(params: {
  classroomId: string;
  subjectId: string;
  skillIds: string[];
  take: number;
}): Promise<WrongHotspot[]> {
  const { classroomId, subjectId, skillIds, take } = params;
  if (skillIds.length === 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - WRONG_HISTORY_DAYS);

  const enrollments = await prisma.classroomEnrollment.findMany({
    where: { classroomId },
    select: { studentUserId: true },
  });
  const studentIds = enrollments.map((e) => e.studentUserId);
  if (studentIds.length === 0) return [];

  const rows = await prisma.questionAttempt.groupBy({
    by: ['itemId', 'skillId'],
    where: {
      userId: { in: studentIds },
      skillId: { in: skillIds },
      correct: false,
      occurredAt: { gte: since },
    },
    _count: { _all: true },
    orderBy: { _count: { itemId: 'desc' } },
    take: Math.max(take * 4, 40),
  });

  if (rows.length === 0) return [];

  const itemIds = [...new Set(rows.map((r) => r.itemId))];
  const items = await prisma.item.findMany({
    where: {
      id: { in: itemIds },
      OR: [{ subjectId }, { subjectId: null }],
      skills: { some: { skillId: { in: skillIds } } },
    },
    select: { id: true, skills: { select: { skillId: true }, take: 3 } },
  });
  const allowed = new Set(items.map((i) => i.id));

  const out: WrongHotspot[] = [];
  for (const r of rows) {
    if (!allowed.has(r.itemId)) continue;
    out.push({
      itemId: r.itemId,
      skillId: r.skillId,
      wrongAttempts: r._count._all,
    });
    if (out.length >= take) break;
  }
  return out;
}

export type StudentLiveWrongBySkill = Map<string, Map<string, number>>;

/** Most recent wrong live attempts per student in that session (skill filtered). */
export async function getStudentWrongItemsFromLiveSession(params: {
  liveSessionId: string;
  classroomId: string;
  teacherUserId: string;
  skillIds: string[];
  takePerStudent: number;
}): Promise<Map<string, Array<{ itemId: string; skillId: string }>>> {
  const out = new Map<string, Array<{ itemId: string; skillId: string }>>();
  const { liveSessionId, classroomId, teacherUserId, skillIds, takePerStudent } = params;

  const sess = await prisma.liveSession.findFirst({
    where: { id: liveSessionId, teacherUserId, classroomId, status: 'COMPLETED' },
    select: { id: true },
  });
  if (!sess || skillIds.length === 0) return out;

  const enrollments = await prisma.classroomEnrollment.findMany({
    where: { classroomId },
    select: { studentUserId: true },
  });
  const studentIds = enrollments.map((e) => e.studentUserId);
  if (studentIds.length === 0) return out;

  const attempts = await prisma.liveAttempt.findMany({
    where: {
      liveSessionId,
      correct: false,
      studentUserId: { in: studentIds },
      skillId: { in: skillIds },
    },
    select: { studentUserId: true, itemId: true, skillId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  for (const a of attempts) {
    const list = out.get(a.studentUserId) ?? [];
    if (list.length >= takePerStudent) continue;
    if (list.some((x) => x.itemId === a.itemId)) continue;
    list.push({ itemId: a.itemId, skillId: a.skillId });
    out.set(a.studentUserId, list);
  }
  return out;
}

export async function getStudentWrongCountsFromLiveSession(params: {
  liveSessionId: string;
  classroomId: string;
  teacherUserId: string;
}): Promise<StudentLiveWrongBySkill> {
  const out: StudentLiveWrongBySkill = new Map();
  const { liveSessionId, classroomId, teacherUserId } = params;

  const sess = await prisma.liveSession.findFirst({
    where: { id: liveSessionId, teacherUserId, classroomId, status: 'COMPLETED' },
    select: { id: true },
  });
  if (!sess) return out;

  const enrollments = await prisma.classroomEnrollment.findMany({
    where: { classroomId },
    select: { studentUserId: true },
  });
  const studentIds = new Set(enrollments.map((e) => e.studentUserId));

  const attempts = await prisma.liveAttempt.findMany({
    where: { liveSessionId, correct: false },
    select: { studentUserId: true, skillId: true },
  });

  for (const a of attempts) {
    if (!studentIds.has(a.studentUserId)) continue;
    const bySkill = out.get(a.studentUserId) ?? new Map<string, number>();
    bySkill.set(a.skillId, (bySkill.get(a.skillId) ?? 0) + 1);
    out.set(a.studentUserId, bySkill);
  }
  return out;
}

type WrongItemRow = { itemId: string; skillId: string; n: number };

/** userId → skillId → wrong attempts per item (recent), sorted by count desc per skill */
export async function getWrongAttemptsGroupedByUserSkillItem(params: {
  userIds: string[];
  skillIds: string[];
  since: Date;
  takePerSkillPerUser: number;
}): Promise<Map<string, Map<string, WrongItemRow[]>>> {
  const { userIds, skillIds, since, takePerSkillPerUser } = params;
  const out = new Map<string, Map<string, WrongItemRow[]>>();
  if (userIds.length === 0 || skillIds.length === 0) return out;

  const grouped = await prisma.questionAttempt.groupBy({
    by: ['userId', 'skillId', 'itemId'],
    where: {
      userId: { in: userIds },
      skillId: { in: skillIds },
      correct: false,
      occurredAt: { gte: since },
    },
    _count: { _all: true },
  });

  type Row = { itemId: string; skillId: string; n: number };
  const tmp = new Map<string, Map<string, Row[]>>();
  for (const g of grouped) {
    const uid = g.userId;
    const sid = g.skillId;
    const row: Row = { itemId: g.itemId, skillId: sid, n: g._count._all };
    const bySkill = tmp.get(uid) ?? new Map<string, Row[]>();
    const list = bySkill.get(sid) ?? [];
    list.push(row);
    bySkill.set(sid, list);
    tmp.set(uid, bySkill);
  }

  for (const [uid, bySkill] of tmp) {
    const trimmed = new Map<string, WrongItemRow[]>();
    for (const [sid, rows] of bySkill) {
      rows.sort((a, b) => b.n - a.n);
      trimmed.set(sid, rows.slice(0, takePerSkillPerUser));
    }
    out.set(uid, trimmed);
  }
  return out;
}

export async function fetchItemsForDisplay(
  itemIds: string[],
  subjectId: string,
): Promise<Map<string, { id: string; question: string; type: string; skillIds: string[] }>> {
  if (itemIds.length === 0) return new Map();
  const items = await prisma.item.findMany({
    where: {
      id: { in: itemIds },
      OR: [{ subjectId }, { subjectId: null }],
    },
    select: {
      id: true,
      question: true,
      type: true,
      skills: { select: { skillId: true } },
    },
  });
  return new Map(
    items.map((it) => [
      it.id,
      {
        id: it.id,
        question: it.question,
        type: it.type,
        skillIds: it.skills.map((s) => s.skillId),
      },
    ]),
  );
}
