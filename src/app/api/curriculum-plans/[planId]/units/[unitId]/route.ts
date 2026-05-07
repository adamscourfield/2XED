import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  aims: z.string().max(1000).nullable().optional(),
  successMeasures: z.string().max(1000).nullable().optional(),
  dateStart: z.string().datetime({ offset: true }).nullable().optional(),
  dateEnd: z.string().datetime({ offset: true }).nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  skillIds: z.array(z.string()).max(20).optional(),
});

async function resolveUnit(unitId: string, planId: string, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any).curriculumUnit;
  if (!model) return null;
  const unit = await model.findUnique({
    where: { id: unitId },
    include: { plan: { select: { teacherUserId: true } } },
  });
  if (!unit || unit.planId !== planId || unit.plan.teacherUserId !== userId) return null;
  return unit;
}

// ── PATCH /api/curriculum-plans/[planId]/units/[unitId] ──────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { planId: string; unitId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const unit = await resolveUnit(params.unitId, params.planId, user.id);
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unitModel = (prisma as any).curriculumUnit;
  const { skillIds, dateStart, dateEnd, ...rest } = parsed.data;

  // Build update data
  const data: Record<string, unknown> = { ...rest };
  if (dateStart !== undefined) data.dateStart = dateStart ? new Date(dateStart) : null;
  if (dateEnd !== undefined) data.dateEnd = dateEnd ? new Date(dateEnd) : null;

  // If skillIds supplied, replace the entire skill set
  if (skillIds !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).curriculumUnitSkill.deleteMany({ where: { unitId: params.unitId } });
    data.skills = {
      create: skillIds.map((skillId) => ({ skillId })),
    };
  }

  const updated = await unitModel.update({
    where: { id: params.unitId },
    data,
    include: {
      skills: { include: { skill: { select: { code: true, name: true } } } },
      lessons: { select: { id: true, title: true, topic: true, isPublished: true } },
    },
  });

  return NextResponse.json(updated);
}

// ── DELETE /api/curriculum-plans/[planId]/units/[unitId] ─────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { planId: string; unitId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const unit = await resolveUnit(params.unitId, params.planId, user.id);
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).curriculumUnit.delete({ where: { id: params.unitId } });
  return new NextResponse(null, { status: 204 });
}
