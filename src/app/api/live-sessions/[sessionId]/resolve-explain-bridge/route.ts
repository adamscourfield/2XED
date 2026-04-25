import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import {
  collectSkillIdsFromLiveSession,
  pickSkillIdForExplanationRecommendation,
  resolveExplainBridgeForSkill,
  type ExplainBridgeOption,
} from '@/lib/live/live-session-explanation-bridge';

const bodySchema = z.object({
  option: z.enum(['easier', 'wrong-vs-right', 'misconception', 'comparison']),
  /** When omitted, uses weakest skill in session (from phases + primary + response summary). */
  skillId: z.string().min(1).optional(),
  responseSummary: z
    .array(
      z.object({
        skillId: z.string(),
        answeredCount: z.number().int().nonnegative(),
        correctCount: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { teacherUserId: true, skillId: true, phases: true },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { option, skillId: bodySkillId, responseSummary } = parsed.data;

  let skillId =
    bodySkillId ??
    pickSkillIdForExplanationRecommendation({
      phases: liveSession.phases,
      primarySkillId: liveSession.skillId,
      responseSummary: responseSummary ?? [],
    });

  if (skillId) {
    const allowed = new Set(collectSkillIdsFromLiveSession(liveSession.phases, liveSession.skillId));
    if (!allowed.has(skillId)) {
      skillId = [...allowed][0] ?? null;
    }
  }

  if (!skillId) {
    return NextResponse.json({ ok: false as const, reason: 'no_skill' });
  }

  const payload = await resolveExplainBridgeForSkill(prisma, skillId, option as ExplainBridgeOption);
  if (!payload) {
    return NextResponse.json({ ok: false as const, reason: 'no_route', skillId });
  }

  return NextResponse.json({ ok: true as const, skillId, ...payload });
}
