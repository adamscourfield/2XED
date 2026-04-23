import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { z } from 'zod';
import { emitEvent } from '@/features/telemetry/eventService';

const bodySchema = z.object({
  studentEmail: z.string().trim().email(),
  subjectSlug: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = session.user as { id: string; role: string };
  if (admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { studentEmail, subjectSlug, reason } = parsed.data;

  const [student, subject] = await Promise.all([
    prisma.user.findUnique({ where: { email: studentEmail.toLowerCase() }, select: { id: true, email: true, role: true } }),
    prisma.subject.findUnique({ where: { slug: subjectSlug }, select: { id: true, slug: true, title: true } }),
  ]);

  if (!student) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });
  if (student.role !== 'STUDENT') {
    return NextResponse.json({ error: 'That account is not a student' }, { status: 400 });
  }
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  const { abandonedDiagnosticSessions, clearedSkillMasteries } = await prisma.$transaction(async (tx) => {
    const diag = await tx.diagnosticSession.updateMany({
      where: { userId: student.id, subjectId: subject.id },
      data: { status: 'ABANDONED', completedAt: null },
    });

    const mastery = await tx.skillMastery.deleteMany({
      where: { userId: student.id, skill: { subjectId: subject.id } },
    });

    return {
      abandonedDiagnosticSessions: diag.count,
      clearedSkillMasteries: mastery.count,
    };
  });

  await emitEvent({
    name: 'student_rebaselined',
    actorUserId: admin.id,
    studentUserId: student.id,
    subjectId: subject.id,
    payload: {
      subjectSlug: subject.slug,
      studentEmail: student.email,
      reason,
      abandonedDiagnosticSessions,
      clearedSkillMasteries,
    },
  });

  return NextResponse.json({
    ok: true,
    abandonedDiagnosticSessions,
    clearedSkillMasteries,
    message:
      abandonedDiagnosticSessions === 0 && clearedSkillMasteries === 0
        ? 'No diagnostic sessions or skill masteries were stored for this student in this subject. They can still start onboarding when they sign in.'
        : 'Diagnostic onboarding reset for this student in this subject. They will be prompted to complete the diagnostic again.',
  });
}
