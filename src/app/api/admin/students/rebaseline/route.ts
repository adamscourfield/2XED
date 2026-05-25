import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';

const schema = z.object({
  studentEmail: z.string().email(),
  subjectSlug: z.string().min(1),
  reason: z.string().min(3).max(1000),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['ADMIN', 'LEADERSHIP']);
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const [student, subject] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.data.studentEmail }, select: { id: true, role: true, email: true } }),
    prisma.subject.findUnique({
      where: { slug: parsed.data.subjectSlug },
      select: { id: true, skills: { select: { id: true } } },
    }),
  ]);

  if (!student || student.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  const skillIds = subject.skills.map((skill) => skill.id);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const [diagnostic, baseline, skillMasteries, skillStates, reviews] = await Promise.all([
      tx.diagnosticSession.updateMany({
        where: { userId: student.id, subjectId: subject.id, status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
        data: { status: 'ABANDONED', completedAt: now },
      }),
      tx.baselineSession.updateMany({
        where: { userId: student.id, subjectId: subject.id, status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
        data: { status: 'ABANDONED', completedAt: now },
      }),
      tx.skillMastery.deleteMany({ where: { userId: student.id, skillId: { in: skillIds } } }),
      tx.studentSkillState.deleteMany({ where: { userId: student.id, skillId: { in: skillIds } } }),
      tx.skillReview.deleteMany({ where: { userId: student.id, skillId: { in: skillIds }, completedAt: null } }),
    ]);

    await tx.event.create({
      data: {
        name: 'student_rebaseline_requested',
        actorUserId: user.id,
        studentUserId: student.id,
        subjectId: subject.id,
        payload: {
          studentEmail: student.email,
          reason: parsed.data.reason,
          abandonedDiagnosticSessions: diagnostic.count,
          abandonedBaselineSessions: baseline.count,
          clearedSkillMasteries: skillMasteries.count,
          clearedSkillStates: skillStates.count,
          clearedReviews: reviews.count,
        } as Prisma.InputJsonValue,
      },
    });

    return { diagnostic, baseline, skillMasteries, skillStates, reviews };
  });

  return NextResponse.json({
    message: `Re-baseline reset complete for ${student.email}.`,
    abandonedDiagnosticSessions: result.diagnostic.count,
    abandonedBaselineSessions: result.baseline.count,
    clearedSkillMasteries: result.skillMasteries.count,
    clearedSkillStates: result.skillStates.count,
    clearedReviews: result.reviews.count,
  });
}
