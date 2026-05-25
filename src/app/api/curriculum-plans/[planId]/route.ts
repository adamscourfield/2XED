import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

export interface CurriculumUnitDetail {
  id: string;
  title: string;
  aims: string | null;
  successMeasures: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  sortOrder: number;
  skills: Array<{ skillId: string; skillCode: string; skillName: string }>;
  lessons: Array<{ id: string; title: string; topic: string; isPublished: boolean }>;
}

export interface CurriculumPlanDetail {
  id: string;
  title: string;
  subjectId: string;
  subjectTitle: string;
  academicYear: string | null;
  termLabel: string | null;
  units: CurriculumUnitDetail[];
  createdAt: string;
  updatedAt: string;
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  academicYear: z.string().max(20).nullable().optional(),
  termLabel: z.string().max(50).nullable().optional(),
});

async function resolvePlan(planId: string, userId: string, role: string) {
  const model = prisma.curriculumPlan;
  if (!model) return null;
  return model.findUnique({
    where: { id: planId },
    include: {
      subject: { select: { title: true } },
      units: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          skills: { include: { skill: { select: { code: true, name: true } } } },
          lessons: {
            select: { id: true, title: true, topic: true, isPublished: true },
            orderBy: { updatedAt: 'desc' as const },
          },
        },
      },
    },
  }).then((p: {
    id: string;
    title: string;
    subjectId: string;
    academicYear: string | null;
    termLabel: string | null;
    teacherUserId: string;
    createdAt: Date;
    updatedAt: Date;
    subject: { title: string };
    units: Array<{
      id: string;
      title: string;
      aims: string | null;
      successMeasures: string | null;
      dateStart: Date | null;
      dateEnd: Date | null;
      sortOrder: number;
      skills: Array<{ skillId: string; skill: { code: string; name: string } }>;
      lessons: Array<{ id: string; title: string; topic: string; isPublished: boolean }>;
    }>;
  } | null) => {
    if (!p || (p.teacherUserId !== userId && role !== 'ADMIN')) return null;
    return p;
  });
}

// ── GET /api/curriculum-plans/[planId] ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const plan = await resolvePlan(planId, user.id, user.role ?? '');
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const detail: CurriculumPlanDetail = {
    id: plan.id,
    title: plan.title,
    subjectId: plan.subjectId,
    subjectTitle: plan.subject.title,
    academicYear: plan.academicYear,
    termLabel: plan.termLabel,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    units: plan.units.map((u: {
      id: string; title: string; aims: string | null; successMeasures: string | null;
      dateStart: Date | null; dateEnd: Date | null; sortOrder: number;
      skills: Array<{ skillId: string; skill: { code: string; name: string } }>;
      lessons: Array<{ id: string; title: string; topic: string; isPublished: boolean }>;
    }) => ({
      id: u.id,
      title: u.title,
      aims: u.aims,
      successMeasures: u.successMeasures,
      dateStart: u.dateStart?.toISOString() ?? null,
      dateEnd: u.dateEnd?.toISOString() ?? null,
      sortOrder: u.sortOrder,
      skills: u.skills.map((s: { skillId: string; skill: { code: string; name: string } }) => ({
        skillId: s.skillId, skillCode: s.skill.code, skillName: s.skill.name,
      })),
      lessons: u.lessons,
    })),
  };

  return NextResponse.json(detail);
}

// ── PATCH /api/curriculum-plans/[planId] ─────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const plan = await resolvePlan(planId, user.id, user.role ?? '');
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  await prisma.curriculumPlan.update({
    where: { id: planId },
    data: parsed.data,
  });

  // Return a clean DTO, not the raw Prisma object
  return NextResponse.json({ id: planId, ...parsed.data });
}

// ── DELETE /api/curriculum-plans/[planId] ────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const plan = await resolvePlan(planId, user.id, user.role ?? '');
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.curriculumPlan.delete({ where: { id: planId } });
  return new NextResponse(null, { status: 204 });
}
