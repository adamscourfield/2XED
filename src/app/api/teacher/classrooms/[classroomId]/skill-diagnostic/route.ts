import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

interface Props {
  params: Promise<{ classroomId: string }>;
}

export type SkillRecommendation = 'recap_needed' | 'in_progress' | 'mastered' | 'not_started';

export type SkillDiagnosticRow = {
  skillId: string;
  code: string;
  name: string;
  strand: string;
  sortOrder: number;
  totalStudents: number;
  studentsWithData: number;
  atRisk: number;
  developing: number;
  durable: number;
  avgMastery: number | null;
  wrongAttemptsLast60Days: number;
  daysSinceLastAttempt: number | null;
  recommendation: SkillRecommendation;
};

const WRONG_HISTORY_DAYS = 60;

function computeRecommendation(params: {
  totalStudents: number;
  studentsWithData: number;
  atRisk: number;
  developing: number;
  durable: number;
  avgMastery: number | null;
}): SkillRecommendation {
  const { totalStudents, studentsWithData, atRisk, avgMastery } = params;

  if (totalStudents === 0 || studentsWithData === 0) return 'not_started';

  const m = avgMastery ?? 0;
  const atRiskRate = studentsWithData > 0 ? atRisk / studentsWithData : 0;

  if (m >= 0.72 && atRiskRate < 0.25) return 'mastered';
  if (atRiskRate > 0.4 || m < 0.45) return 'recap_needed';
  return 'in_progress';
}

/**
 * GET /api/teacher/classrooms/[classroomId]/skill-diagnostic?subjectId=
 *
 * Returns per-skill mastery distribution for all students enrolled in the
 * classroom, along with a computed recommendation for lesson planning.
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

  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });
  }

  // Verify teacher owns this classroom
  const access = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { classrooms: { where: { classroomId }, select: { classroomId: true } } },
  });
  if (!access?.classrooms.length) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  }

  // Get enrolled students
  const enrollments = await prisma.classroomEnrollment.findMany({
    where: { classroomId },
    select: { studentUserId: true },
  });
  const studentIds = enrollments.map((e) => e.studentUserId);
  const totalStudents = studentIds.length;

  // Get all skills for the subject (ordered for display)
  const skills = await prisma.skill.findMany({
    where: { subjectId },
    select: { id: true, code: true, name: true, strand: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (skills.length === 0) {
    return NextResponse.json({ skills: [] });
  }

  const skillIds = skills.map((s) => s.id);

  // Fetch all StudentSkillState records for enrolled students × subject skills
  const states =
    studentIds.length > 0
      ? await prisma.studentSkillState.findMany({
          where: {
            userId: { in: studentIds },
            skillId: { in: skillIds },
          },
          select: {
            skillId: true,
            masteryProbability: true,
            durabilityBand: true,
            lastAttemptAt: true,
            evidenceCount: true,
          },
        })
      : [];

  // Aggregate by skill
  type Agg = {
    atRisk: number;
    developing: number;
    durable: number;
    masterySum: number;
    studentsWithData: number;
    lastAttemptAt: Date | null;
  };

  const aggBySkill = new Map<string, Agg>();
  for (const skill of skills) {
    aggBySkill.set(skill.id, {
      atRisk: 0,
      developing: 0,
      durable: 0,
      masterySum: 0,
      studentsWithData: 0,
      lastAttemptAt: null,
    });
  }

  for (const s of states) {
    const agg = aggBySkill.get(s.skillId);
    if (!agg) continue;

    // Only count students who have meaningful evidence
    if (s.evidenceCount > 0) {
      agg.studentsWithData += 1;
      agg.masterySum += s.masteryProbability;
      if (s.durabilityBand === 'AT_RISK') agg.atRisk += 1;
      else if (s.durabilityBand === 'DEVELOPING') agg.developing += 1;
      else if (s.durabilityBand === 'DURABLE') agg.durable += 1;
    }

    if (s.lastAttemptAt) {
      if (!agg.lastAttemptAt || s.lastAttemptAt > agg.lastAttemptAt) {
        agg.lastAttemptAt = s.lastAttemptAt;
      }
    }
  }

  // Wrong attempts in last 60 days — grouped by skillId
  const since = new Date();
  since.setDate(since.getDate() - WRONG_HISTORY_DAYS);

  const wrongBySkill = new Map<string, number>();
  if (studentIds.length > 0) {
    const wrongRows = await prisma.questionAttempt.groupBy({
      by: ['skillId'],
      where: {
        userId: { in: studentIds },
        skillId: { in: skillIds },
        correct: false,
        occurredAt: { gte: since },
      },
      _count: { _all: true },
    });
    for (const row of wrongRows) {
      wrongBySkill.set(row.skillId, row._count._all);
    }
  }

  // Build response
  const now = Date.now();
  const result: SkillDiagnosticRow[] = skills.map((skill) => {
    const agg = aggBySkill.get(skill.id)!;
    const avgMastery =
      agg.studentsWithData > 0 ? agg.masterySum / agg.studentsWithData : null;
    const daysSinceLastAttempt = agg.lastAttemptAt
      ? Math.floor((now - agg.lastAttemptAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      skillId: skill.id,
      code: skill.code,
      name: skill.name,
      strand: skill.strand ?? 'General',
      sortOrder: skill.sortOrder ?? 0,
      totalStudents,
      studentsWithData: agg.studentsWithData,
      atRisk: agg.atRisk,
      developing: agg.developing,
      durable: agg.durable,
      avgMastery,
      wrongAttemptsLast60Days: wrongBySkill.get(skill.id) ?? 0,
      daysSinceLastAttempt,
      recommendation: computeRecommendation({
        totalStudents,
        studentsWithData: agg.studentsWithData,
        atRisk: agg.atRisk,
        developing: agg.developing,
        durable: agg.durable,
        avgMastery,
      }),
    };
  });

  return NextResponse.json({ skills: result, totalStudents });
}
