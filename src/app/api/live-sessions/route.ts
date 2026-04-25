import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

const phaseSchema = z.object({
  index: z.number().int().nonnegative(),
  skillId: z.string().min(1),
  skillCode: z.string(),
  skillName: z.string(),
  type: z.enum(['PRACTICE', 'EXPLANATION']),
  label: z.string(),
});

const checkSlotSchema = z.object({
  skillId: z.string().min(1),
  itemId: z.string().min(1),
});

const checkPlanSchema = z
  .object({
    shared: z.array(checkSlotSchema).max(20).optional(),
    perStudent: z.record(z.string(), z.array(checkSlotSchema).max(20)).optional(),
  })
  .optional();

const schema = z.object({
  classroomId: z.string().min(1),
  subjectId: z.string().min(1),
  skillId: z.string().min(1).optional(),
  phases: z.array(phaseSchema).optional(),
  checkPlan: checkPlanSchema,
});

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  const { classroomId, subjectId, skillId, phases, checkPlan } = parsed.data;

  // Validate teacher owns the classroom
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: { classrooms: { where: { classroomId } } },
  });

  if (!teacherProfile || teacherProfile.classrooms.length === 0) {
    return NextResponse.json({ error: 'Classroom not found or not authorized' }, { status: 403 });
  }

  // Generate unique join code (retry on collision)
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.liveSession.findUnique({ where: { joinCode } });
    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  const liveSession = await prisma.liveSession.create({
    data: {
      classroomId,
      teacherUserId: userId,
      subjectId,
      skillId: skillId ?? null,
      joinCode,
      status: 'LOBBY',
      phases: phases ?? undefined,
      currentPhaseIndex: 0,
      checkPlan: checkPlan ?? undefined,
    },
  });

  return NextResponse.json(liveSession, { status: 201 });
}
