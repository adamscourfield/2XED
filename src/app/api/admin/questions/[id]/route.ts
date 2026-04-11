import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { z } from 'zod';

// Satisfy the linter – PrismaClient import ensures Prisma namespace is resolved.
void (PrismaClient);

function adminOnly(session: { user?: unknown } | null) {
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role: string }).role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

// ── GET /api/admin/questions/[id] ─────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const guard = adminOnly(session);
  if (guard) return guard;

  const item = await prisma.item.findUnique({
    where: { id: params.id },
    include: {
      skills: {
        include: { skill: { select: { id: true, code: true, name: true, strand: true } } },
      },
    },
  });

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

// ── PATCH /api/admin/questions/[id] ───────────────────────────────────────────
const UpdateSchema = z.object({
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const guard = adminOnly(session);
  if (guard) return guard;

  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { stem, type, answer, choices, acceptedAnswers, tolerance, numberLine, skillIds, misconceptions } = parsed.data;

  // Preserve existing ref from question text (e.g. [CMS-xxx] or [Slide-xxx])
  const existingRef = item.question.match(/^\[([^\]]+)\]/)?.[1] ?? `CMS-${Date.now().toString(36).toUpperCase()}`;
  const questionText = `[${existingRef}] ${stem}`;

  const misconceptionMap = misconceptions && misconceptions.length > 0
    ? misconceptions.reduce<Record<string, string>>((acc, m) => {
        acc[m.type] = m.diagnostic_signal ?? '';
        return acc;
      }, {})
    : null;

  const existingOptions = (item.options && typeof item.options === 'object') ? item.options as Record<string, unknown> : {};
  const options = {
    ...existingOptions,
    choices,
    acceptedAnswers,
    ...(numberLine ? { numberLine: { ...numberLine, tolerance: numberLine.tolerance ?? tolerance ?? 0 } } : { numberLine: undefined }),
    meta: {
      ...(existingOptions.meta && typeof existingOptions.meta === 'object' ? existingOptions.meta : {}),
      quality_status: 'DRAFT',
    },
  };

  await prisma.item.update({
    where: { id: params.id },
    data: {
      type,
      question: questionText,
      answer,
      options,
      misconceptionMap: misconceptionMap ?? Prisma.DbNull,
    },
  });

  // Replace skill links
  await prisma.itemSkill.deleteMany({ where: { itemId: params.id } });
  if (skillIds.length > 0) {
    await prisma.itemSkill.createMany({
      data: skillIds.map((skillId) => ({ itemId: params.id, skillId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ id: params.id });
}

// ── DELETE /api/admin/questions/[id] ──────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const guard = adminOnly(session);
  if (guard) return guard;

  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.itemSkill.deleteMany({ where: { itemId: params.id } });
  await prisma.item.update({
    where: { id: params.id },
    data: {
      subjectId: null,
      question: item.question.startsWith('[ARCHIVED]')
        ? item.question
        : `[ARCHIVED] ${item.question}`,
    },
  });

  return NextResponse.json({ archived: true });
}
