import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { getItemContent } from '@/features/learn/itemContent';
import { gradeAttempt } from '@/features/learn/gradeAttempt';
import {
  initPayload,
  shouldStopEarly,
  updatePayloadAfterAttempt,
  type DiagnosticPayload,
} from '@/features/diagnostic/diagnosticService';

const schema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  skillId: z.string().min(1),
  subjectId: z.string().min(1),
  skillCode: z.string().min(1),
  strand: z.string(),
  answer: z.string().min(1),
});

function parseDiagnosticPayload(payload: unknown): DiagnosticPayload {
  if (!payload || typeof payload !== 'object') return initPayload();
  const value = payload as Partial<DiagnosticPayload>;
  return {
    estimates: value.estimates ?? {},
    strandCounts: value.strandCounts ?? {},
    skillSignals: value.skillSignals ?? {},
    routeRecommendations: value.routeRecommendations ?? {},
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subjectSlug: string }> },
) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const { subjectSlug } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug }, select: { id: true } });
  if (!subject || subject.id !== parsed.data.subjectId) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  const session = await prisma.diagnosticSession.findFirst({
    where: {
      id: parsed.data.sessionId,
      userId: user.id,
      subjectId: parsed.data.subjectId,
      status: 'IN_PROGRESS',
    },
    select: {
      id: true,
      payload: true,
      itemsSeen: true,
      minItems: true,
      maxItems: true,
      confidenceTarget: true,
    },
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const [skill, item] = await Promise.all([
    prisma.skill.findFirst({
      where: { id: parsed.data.skillId, subjectId: parsed.data.subjectId },
      select: { id: true, code: true, strand: true },
    }),
    prisma.item.findFirst({
      where: {
        id: parsed.data.itemId,
        skills: { some: { skillId: parsed.data.skillId } },
      },
    }),
  ]);
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const itemContent = getItemContent(item);
  const correct = gradeAttempt(itemContent.acceptedAnswers, parsed.data.answer, itemContent.numberLine?.tolerance);
  const payload = updatePayloadAfterAttempt(
    parseDiagnosticPayload(session.payload),
    skill.code,
    skill.strand,
    correct,
  );
  const itemsSeen = session.itemsSeen + 1;
  const shouldComplete = shouldStopEarly(payload, itemsSeen, session.minItems, session.maxItems, session.confidenceTarget);

  await prisma.$transaction([
    prisma.attempt.create({
      data: {
        userId: user.id,
        itemId: parsed.data.itemId,
        answer: parsed.data.answer,
        correct,
        sessionId: session.id,
        mode: 'DIAGNOSTIC',
      },
    }),
    prisma.diagnosticSession.update({
      where: { id: session.id },
      data: {
        itemsSeen,
        payload: payload as unknown as Prisma.InputJsonValue,
        ...(shouldComplete ? { status: 'COMPLETED' as const, completedAt: new Date() } : {}),
      },
    }),
  ]);

  return NextResponse.json({ correct, done: shouldComplete, itemsSeen, maxItems: session.maxItems });
}
