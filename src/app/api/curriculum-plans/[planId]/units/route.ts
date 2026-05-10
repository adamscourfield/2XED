import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  aims: z.string().max(1000).optional(),
  successMeasures: z.string().max(1000).optional(),
  dateStart: z.string().datetime({ offset: true }).optional(),
  dateEnd: z.string().datetime({ offset: true }).optional(),
  skillIds: z.array(z.string()).max(20).optional(),
});

async function verifyOwner(planId: string, userId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any).curriculumPlan;
  if (!model) return false;
  const plan = await model.findUnique({ where: { id: planId }, select: { teacherUserId: true } });
  return plan?.teacherUserId === userId;
}

// ── POST /api/curriculum-plans/[planId]/units ─────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { planId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const owned = await verifyOwner(params.planId, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  if (parsed.data.dateStart && parsed.data.dateEnd) {
    if (new Date(parsed.data.dateStart) >= new Date(parsed.data.dateEnd)) {
      return NextResponse.json({ error: 'dateStart must be before dateEnd' }, { status: 400 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unitModel = (prisma as any).curriculumUnit;
  if (!unitModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  // Calculate next sortOrder
  const maxUnit = await unitModel.findFirst({
    where: { planId: params.planId },
    orderBy: { sortOrder: 'desc' as const },
    select: { sortOrder: true },
  });
  const nextSort = (maxUnit?.sortOrder ?? -1) + 1;

  const { skillIds, dateStart, dateEnd, ...rest } = parsed.data;

  const unit = await unitModel.create({
    data: {
      ...rest,
      planId: params.planId,
      sortOrder: nextSort,
      dateStart: dateStart ? new Date(dateStart) : null,
      dateEnd: dateEnd ? new Date(dateEnd) : null,
      ...(skillIds && skillIds.length > 0
        ? {
            skills: {
              create: skillIds.map((skillId) => ({ skillId })),
            },
          }
        : {}),
    },
    include: {
      skills: { include: { skill: { select: { code: true, name: true } } } },
      lessons: { select: { id: true, title: true, topic: true, isPublished: true } },
    },
  });

  return NextResponse.json(unit, { status: 201 });
}
