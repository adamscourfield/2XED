import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CurriculumPlanSummary {
  id: string;
  title: string;
  subjectId: string;
  subjectTitle: string;
  academicYear: string | null;
  termLabel: string | null;
  unitCount: number;
  lessonCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1).max(200),
  subjectId: z.string().min(1),
  academicYear: z.string().max(20).optional(),
  termLabel: z.string().max(50).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireTeacher(user: { role?: string }) {
  return user.role === 'TEACHER' || user.role === 'ADMIN' || user.role === 'LEADERSHIP';
}

// ── GET /api/curriculum-plans ─────────────────────────────────────────────────

export async function GET() {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (!requireTeacher(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const model = prisma.curriculumPlan;
  if (!model) return NextResponse.json({ plans: [] });

  const plans = await model.findMany({
    where: { teacherUserId: user.id },
    include: {
      subject: { select: { title: true } },
      units: {
        select: {
          id: true,
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' as const },
  });

  const result: CurriculumPlanSummary[] = plans.map(
    (p: {
      id: string;
      title: string;
      subjectId: string;
      academicYear: string | null;
      termLabel: string | null;
      createdAt: Date;
      updatedAt: Date;
      subject: { title: string };
      units: Array<{ id: string; _count: { lessons: number } }>;
    }) => ({
      id: p.id,
      title: p.title,
      subjectId: p.subjectId,
      subjectTitle: p.subject.title,
      academicYear: p.academicYear,
      termLabel: p.termLabel,
      unitCount: p.units.length,
      lessonCount: p.units.reduce((sum: number, u: { _count: { lessons: number } }) => sum + u._count.lessons, 0),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }),
  );

  return NextResponse.json({ plans: result });
}

// ── POST /api/curriculum-plans ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (!requireTeacher(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  const model = prisma.curriculumPlan;
  if (!model) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const plan = await model.create({
    data: {
      title: parsed.data.title,
      subjectId: parsed.data.subjectId,
      teacherUserId: user.id,
      academicYear: parsed.data.academicYear ?? null,
      termLabel: parsed.data.termLabel ?? null,
    },
    include: { subject: { select: { title: true } } },
  });

  return NextResponse.json(plan, { status: 201 });
}
