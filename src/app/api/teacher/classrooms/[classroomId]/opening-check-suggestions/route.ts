import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

interface Props {
  params: Promise<{ classroomId: string }>;
}

/**
 * GET .../opening-check-suggestions?subjectId=&skillIds=a,b
 * One suggested recap item per student (weakest mastery among selected skills).
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
  const byUser = new Map<string, typeof states>();
  for (const s of states) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  const itemBySkill = new Map<string, { id: string; question: string }>();
  for (const sid of skillIds) {
    const link = await prisma.itemSkill.findFirst({
      where: { skillId: sid, item: { OR: [{ subjectId }, { subjectId: null }] } },
      select: { item: { select: { id: true, question: true } } },
    });
    if (link) itemBySkill.set(sid, link.item);
  }

  const students = enrollments.map((e) => {
    const rows = byUser.get(e.studentUserId) ?? [];
    let weakest: (typeof rows)[0] | null = null;
    for (const r of rows) {
      if (!weakest || r.masteryProbability < weakest.masteryProbability) weakest = r;
    }
    const pickSkill = weakest?.skillId ?? skillIds[0];
    const item = itemBySkill.get(pickSkill);
    return {
      studentUserId: e.studentUserId,
      name: e.student.name,
      email: e.student.email,
      suggested: item ? [{ skillId: pickSkill, itemId: item.id, questionPreview: item.question.slice(0, 120) }] : [],
    };
  });

  return NextResponse.json({ students });
}
