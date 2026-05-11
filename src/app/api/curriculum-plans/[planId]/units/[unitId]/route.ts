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

async function resolveUnit(unitId: string, planId: string, userId: string, role: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any).curriculumUnit;
  if (!model) return null;
  const unit = await model.findUnique({
    where: { id: unitId },
    include: { plan: { select: { teacherUserId: true } } },
  });
  if (!unit || unit.planId !== planId) return null;
  if (unit.plan.teacherUserId !== userId && role !== 'ADMIN') return null;
  return unit;
}

const UNIT_INCLUDE = {
  skills: { include: { skill: { select: { code: true, name: true } } } },
  lessons: { select: { id: true, title: true, topic: true, isPublished: true } },
} as const;

// ── PATCH /api/curriculum-plans/[planId]/units/[unitId] ──────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; unitId: string }> },
) {
  const { planId, unitId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const unit = await resolveUnit(unitId, planId, user.id, user.role ?? '');
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  // L1: date ordering validation
  const effectiveDateStart = parsed.data.dateStart !== undefined ? parsed.data.dateStart : unit.dateStart;
  const effectiveDateEnd = parsed.data.dateEnd !== undefined ? parsed.data.dateEnd : unit.dateEnd;
  if (effectiveDateStart && effectiveDateEnd) {
    if (new Date(effectiveDateStart) >= new Date(effectiveDateEnd)) {
      return NextResponse.json({ error: 'dateStart must be before dateEnd' }, { status: 400 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unitModel = (prisma as any).curriculumUnit;
  const { skillIds, dateStart, dateEnd, ...rest } = parsed.data;

  // Build core update data
  const data: Record<string, unknown> = { ...rest };
  if (dateStart !== undefined) data.dateStart = dateStart ? new Date(dateStart) : null;
  if (dateEnd !== undefined) data.dateEnd = dateEnd ? new Date(dateEnd) : null;

  // C1: wrap skill replacement in a transaction to prevent partial-update corruption
  if (skillIds !== undefined) {
    const [, updated] = await (prisma as any).$transaction([
      (prisma as any).curriculumUnitSkill.deleteMany({ where: { unitId } }),
      unitModel.update({
        where: { id: unitId },
        data: { ...data, skills: { create: skillIds.map((skillId: string) => ({ skillId })) } },
        include: UNIT_INCLUDE,
      }),
    ]);
    return NextResponse.json(updated);
  }

  const updated = await unitModel.update({
    where: { id: unitId },
    data,
    include: UNIT_INCLUDE,
  });

  return NextResponse.json(updated);
}

// ── DELETE /api/curriculum-plans/[planId]/units/[unitId] ─────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string; unitId: string }> },
) {
  const { planId, unitId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const unit = await resolveUnit(unitId, planId, user.id, user.role ?? '');
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).curriculumUnit.delete({ where: { id: unitId } });
  return new NextResponse(null, { status: 204 });
}
