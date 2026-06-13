import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { RUBRIC_CORRECT_THRESHOLD } from '@/lib/live/markingConstants';

interface Props {
  params: Promise<{ sessionId: string }>;
}

interface StoredMarkingResult {
  score?: number;
}

function getAttemptOutcome(attempt: { correct: boolean; markingResult: unknown }): 'correct' | 'partial' | 'incorrect' {
  const marking = (attempt.markingResult as StoredMarkingResult | null) ?? null;
  if (marking && typeof marking.score === 'number') {
    if (marking.score >= RUBRIC_CORRECT_THRESHOLD) return 'correct';
    if (marking.score > 0) return 'partial';
    return 'incorrect';
  }
  return attempt.correct ? 'correct' : 'incorrect';
}

/**
 * GET /api/live-sessions/[sessionId]/my-summary
 *
 * Student-scoped post-lesson review. Returns only the requesting student's
 * own performance: attempt totals, per-skill breakdown, lane journey, and
 * focus areas derived from misconceptions hit during the session.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const userId = user.id;
  const { sessionId } = await params;

  const [participant, liveSession] = await Promise.all([
    prisma.liveParticipant.findUnique({
      where: {
        liveSessionId_studentUserId: { liveSessionId: sessionId, studentUserId: userId },
      },
      select: { currentLane: true },
    }),
    prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        skill: { select: { id: true, code: true, name: true } },
        subject: { select: { title: true } },
      },
    }),
  ]);

  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const [attempts, transitions] = await Promise.all([
    prisma.liveAttempt.findMany({
      where: { liveSessionId: sessionId, studentUserId: userId },
      select: {
        skillId: true,
        correct: true,
        markingResult: true,
        misconceptionId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.laneTransition.findMany({
      where: { liveSessionId: sessionId, studentUserId: userId },
      select: { fromLane: true, toLane: true, transitionType: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  let correctCount = 0;
  let partialCount = 0;
  const skillAgg = new Map<string, { total: number; correct: number; partial: number }>();
  const misconceptionIds = new Set<string>();

  for (const attempt of attempts) {
    const outcome = getAttemptOutcome(attempt);
    if (outcome === 'correct') correctCount++;
    if (outcome === 'partial') partialCount++;
    const entry = skillAgg.get(attempt.skillId) ?? { total: 0, correct: 0, partial: 0 };
    entry.total++;
    if (outcome === 'correct') entry.correct++;
    if (outcome === 'partial') entry.partial++;
    skillAgg.set(attempt.skillId, entry);
    if (outcome !== 'correct' && attempt.misconceptionId) {
      misconceptionIds.add(attempt.misconceptionId);
    }
  }

  const skillIds = [...skillAgg.keys()];
  const skills =
    skillIds.length > 0
      ? await prisma.skill.findMany({
          where: { id: { in: skillIds } },
          select: { id: true, code: true, name: true, misconceptions: true },
        })
      : [];

  type McEntry = { id: string; label: string; description: string };
  const mcLabelMap = new Map<string, { label: string; description: string }>();
  for (const skill of skills) {
    if (!skill.misconceptions) continue;
    for (const entry of skill.misconceptions as unknown as McEntry[]) {
      if (entry.id && !mcLabelMap.has(entry.id)) {
        mcLabelMap.set(entry.id, { label: entry.label, description: entry.description });
      }
    }
  }

  const skillMetaMap = new Map(skills.map((s) => [s.id, { code: s.code, name: s.name }]));

  const skillBreakdown = [...skillAgg.entries()].map(([skillId, agg]) => ({
    skillId,
    skillCode: skillMetaMap.get(skillId)?.code ?? null,
    skillName: skillMetaMap.get(skillId)?.name ?? null,
    total: agg.total,
    correct: agg.correct,
    partial: agg.partial,
  }));

  // Focus areas: misconceptions hit, plus skills under 60% accuracy.
  const focusAreas: Array<{ kind: 'misconception' | 'skill'; label: string; description: string }> = [];
  for (const id of misconceptionIds) {
    const meta = mcLabelMap.get(id);
    if (meta) focusAreas.push({ kind: 'misconception', label: meta.label, description: meta.description });
  }
  for (const entry of skillBreakdown) {
    if (entry.total >= 2 && entry.correct / entry.total < 0.6 && entry.skillName) {
      focusAreas.push({
        kind: 'skill',
        label: entry.skillName,
        description: `You answered ${entry.correct} of ${entry.total} correctly — more practice will help this stick.`,
      });
    }
  }

  const strengths = skillBreakdown
    .filter((entry) => entry.total >= 2 && entry.correct / entry.total >= 0.8 && entry.skillName)
    .map((entry) => entry.skillName as string);

  return NextResponse.json({
    sessionId: liveSession.id,
    status: liveSession.status,
    skill: liveSession.skill,
    subject: { title: liveSession.subject.title },
    finalLane: participant.currentLane,
    attemptCount: attempts.length,
    correctCount,
    partialCount,
    laneJourney: transitions,
    skillBreakdown,
    focusAreas: focusAreas.slice(0, 4),
    strengths: strengths.slice(0, 4),
  });
}
