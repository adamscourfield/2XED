import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { z } from 'zod';

function adminOnly(session: { user?: unknown } | null) {
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role: string }).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

// ── GET /api/admin/questions ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const guard = adminOnly(session);
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const skillCode = searchParams.get('skill') ?? '';
  const type = searchParams.get('type') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 25)));
  const skip = (page - 1) * limit;

  const where = {
    subjectId: { not: null as string | null },
    ...(search ? { question: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(type ? { type } : {}),
    ...(skillCode
      ? { skills: { some: { skill: { code: skillCode } } } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        question: true,
        type: true,
        answer: true,
        options: true,
        misconceptionMap: true,
        createdAt: true,
        skills: {
          select: {
            skill: { select: { id: true, code: true, name: true, strand: true } },
          },
        },
      },
    }),
    prisma.item.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

// ── POST /api/admin/questions ──────────────────────────────────────────────────
const CreateSchema = z.object({
  stem: z.string().min(1),
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_TEXT', 'SHORT_NUMERIC', 'ORDER', 'NUMBER_LINE', 'MULTI_SELECT']),
  answer: z.string().min(1),
  choices: z.array(z.string()).default([]),
  acceptedAnswers: z.array(z.string()).min(1),
  tolerance: z.number().optional(),
  numberLine: z.object({
    min: z.number(),
    max: z.number(),
    step: z.number(),
    task: z.enum(['place', 'read', 'round']),
    markerValue: z.number().optional(),
    labelledValues: z.array(z.number()).optional(),
    tolerance: z.number().optional(),
  }).optional(),
  skillIds: z.array(z.string()),
  misconceptions: z.array(z.object({
    type: z.string(),
    diagnostic_signal: z.string().optional(),
  })).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const guard = adminOnly(session);
  if (guard) return guard;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { stem, type, answer, choices, acceptedAnswers, tolerance, numberLine, skillIds, misconceptions } = parsed.data;

  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 500 });

  const ref = `CMS-${Date.now().toString(36).toUpperCase()}`;
  const questionText = `[${ref}] ${stem}`;

  const misconceptionMap = misconceptions && misconceptions.length > 0
    ? misconceptions.reduce<Record<string, string>>((acc, m) => {
        acc[m.type] = m.diagnostic_signal ?? '';
        return acc;
      }, {})
    : null;

  const options = {
    choices,
    acceptedAnswers,
    ...(numberLine ? { numberLine: { ...numberLine, tolerance: numberLine.tolerance ?? tolerance ?? 0 } } : {}),
    meta: {
      question_role: 'practice',
      mapper: 'CMS',
      quality_status: 'DRAFT',
      source: { question_ref: ref, source_file: 'cms-authored', slide_number: null, tier: null },
    },
  };

  const item = await prisma.item.create({
    data: {
      subjectId: subject.id,
      type,
      question: questionText,
      answer,
      options,
      ...(misconceptionMap ? { misconceptionMap } : {}),
    },
  });

  if (skillIds.length > 0) {
    await prisma.itemSkill.createMany({
      data: skillIds.map((skillId) => ({ itemId: item.id, skillId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ id: item.id }, { status: 201 });
}
