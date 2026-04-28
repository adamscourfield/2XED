import { prisma } from '@/db/prisma';
import { emitEvent } from '@/features/telemetry/eventService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DiagnosticAttempt = {
  itemId: string;
  questionRole: 'anchor' | 'misconception_check' | 'prerequisite_probe' | 'transfer';
  correct: boolean;
  hintsUsed: number;
  supportLevel: 'INDEPENDENT' | 'LIGHT_PROMPT' | 'WORKED_EXAMPLE' | 'SCAFFOLDED' | 'FULL_EXPLANATION';
  responseTimeMs: number;
};

export type LaneAssignmentResult = {
  lane: 'LANE_1' | 'LANE_2' | 'LANE_3';
  reason: 'SHADOW_CHECK_FAILED' | 'ANCHOR_FAILED' | 'MISCONCEPTION_FAILED' | 'SCAFFOLDED_CORRECT' | 'MANUAL_TEACHER';
  isUnexpectedFailure: boolean;
  recommendedExplanationId: string | null;
};

export type EscalationResult = {
  newLane: 'LANE_3';
  nextExplanationId: string | null;
  holdingAtFinalCheck: boolean;
};

export type HandbackResult = {
  newLane: 'LANE_2';
  shadowCheckItemId: string;
  studentUserId: string;
};

function normalizeTags(tags: string[] | null | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function scoreRouteMatch(summary: string, tags: string[]): number {
  const haystack = summary.toLowerCase();
  return tags.reduce((score, tag) => (haystack.includes(tag) ? score + 1 : score), 0);
}

// ─── assignLane ──────────────────────────────────────────────────────────────

export async function assignLane(
  participantId: string,
  sessionId: string,
  diagnosticAttempts: DiagnosticAttempt[]
): Promise<LaneAssignmentResult> {
  const anchorAttempt = diagnosticAttempts.find(a => a.questionRole === 'anchor');
  const miscAttempt = diagnosticAttempts.find(a => a.questionRole === 'misconception_check');

  let lane: LaneAssignmentResult['lane'] = 'LANE_3';
  let reason: LaneAssignmentResult['reason'] = 'ANCHOR_FAILED';

  if (!anchorAttempt) {
    // No anchor attempt — default to Lane 3
    lane = 'LANE_3';
    reason = 'ANCHOR_FAILED';
  } else {
    // LANE 3 conditions (check first — these override everything)
    if (!anchorAttempt.correct) {
      lane = 'LANE_3';
      reason = miscAttempt && !miscAttempt.correct ? 'MISCONCEPTION_FAILED' : 'ANCHOR_FAILED';
    } else if (
      anchorAttempt.correct &&
      (anchorAttempt.supportLevel === 'SCAFFOLDED' || anchorAttempt.supportLevel === 'FULL_EXPLANATION')
    ) {
      lane = 'LANE_3';
      reason = 'SCAFFOLDED_CORRECT';
    }
    // LANE 2 conditions
    else if (
      anchorAttempt.correct &&
      (anchorAttempt.hintsUsed > 0 || (miscAttempt && !miscAttempt.correct))
    ) {
      lane = 'LANE_2';
      reason = miscAttempt && !miscAttempt.correct ? 'MISCONCEPTION_FAILED' : 'ANCHOR_FAILED';
    }
    // LANE 1 (default if all checks pass)
    else if (
      anchorAttempt.correct &&
      anchorAttempt.hintsUsed === 0 &&
      anchorAttempt.supportLevel === 'INDEPENDENT' &&
      (!miscAttempt || miscAttempt.correct)
    ) {
      lane = 'LANE_1';
      reason = 'ANCHOR_FAILED'; // Not actually a failure, just the reason type
    }
  }

  // Step 4 — Check for unexpected failure (Lane 3 only)
  let isUnexpectedFailure = false;
  if (lane === 'LANE_3') {
    const participant = await prisma.liveParticipant.findUnique({
      where: { id: participantId },
      include: { session: { select: { skillId: true } } },
    });
    if (participant?.session.skillId) {
      const skillState = await prisma.studentSkillState.findUnique({
        where: {
          userId_skillId: {
            userId: participant.studentUserId,
            skillId: participant.session.skillId,
          },
        },
      });
      if (skillState) {
        // Get historical average for this strand
        const skill = await prisma.skill.findUnique({
          where: { id: participant.session.skillId },
          select: { strand: true, subjectId: true },
        });
        if (skill) {
          const strandSkills = await prisma.skill.findMany({
            where: { subjectId: skill.subjectId, strand: skill.strand },
            select: { id: true },
          });
          const strandSkillIds = strandSkills.map(s => s.id);
          const historicalStates = await prisma.studentSkillState.findMany({
            where: {
              userId: participant.studentUserId,
              skillId: { in: strandSkillIds },
            },
            select: { masteryProbability: true },
          });
          if (historicalStates.length > 0) {
            const historicalAverage =
              historicalStates.reduce((sum, s) => sum + s.masteryProbability, 0) /
              historicalStates.length;
            isUnexpectedFailure = skillState.masteryProbability < historicalAverage - 0.25;
          }
        }
      }
    }
  }

  // Step 5 — For Lane 2: select recommended explanation
  let recommendedExplanationId: string | null = null;
  if (lane === 'LANE_2') {
    const participant = await prisma.liveParticipant.findUnique({
      where: { id: participantId },
      include: { session: { select: { skillId: true } } },
    });
    if (participant?.session.skillId) {
      recommendedExplanationId = await selectExplanationRoute(
        participant.session.skillId,
        null
      );
    }
  }

  // Update LiveParticipant
  const now = new Date();
  await prisma.liveParticipant.update({
    where: { id: participantId },
    data: {
      currentLane: lane,
      currentExplanationId: recommendedExplanationId,
      escalationReason: lane !== 'LANE_1' ? reason : null,
      isUnexpectedFailure,
      laneAssignedAt: now,
    },
  });

  // Create LaneTransition record
  const participant = await prisma.liveParticipant.findUnique({
    where: { id: participantId },
    select: { studentUserId: true },
  });
  await prisma.laneTransition.create({
    data: {
      liveSessionId: sessionId,
      participantId,
      studentUserId: participant!.studentUserId,
      fromLane: null,
      toLane: lane,
      transitionType: 'ASSIGNED',
      reason: lane !== 'LANE_1' ? reason : null,
    },
  });

  // If Lane 3 assignment: check reteach threshold
  if (lane === 'LANE_3') {
    await checkReteachThreshold(sessionId);
  }

  return { lane, reason, isUnexpectedFailure, recommendedExplanationId };
}

// ─── escalateLane ────────────────────────────────────────────────────────────

export async function escalateLane(
  participantId: string,
  sessionId: string,
  failedExplanationId: string,
  weaknessTags?: string[]
): Promise<EscalationResult> {
  const participant = await prisma.liveParticipant.findUnique({
    where: { id: participantId },
    include: { session: { select: { skillId: true } } },
  });

  if (!participant?.session.skillId) {
    return { newLane: 'LANE_3', nextExplanationId: null, holdingAtFinalCheck: true };
  }

  // Step 1 — Fetch all ExplanationRoutes for this skill (order by defaultPriorityRank ASC)
  const routes = await prisma.explanationRoute.findMany({
    where: { skillId: participant.session.skillId, isActive: true },
    orderBy: { defaultPriorityRank: 'asc' },
    select: { id: true, misconceptionSummary: true },
  });

  // Step 2 — Fetch all explanation attempts for this student in this session
  const transitions = await prisma.laneTransition.findMany({
    where: {
      liveSessionId: sessionId,
      participantId,
    },
    select: { reason: true },
  });

  // Find previously used explanation IDs from participant's history
  const previousExplanations = await prisma.liveParticipant.findUnique({
    where: { id: participantId },
    select: { currentExplanationId: true },
  });

  // Collect all used explanation IDs by checking transitions
  const usedExplanationIds = new Set<string>();
  if (failedExplanationId) usedExplanationIds.add(failedExplanationId);
  if (previousExplanations?.currentExplanationId) {
    usedExplanationIds.add(previousExplanations.currentExplanationId);
  }

  // Step 3 — Find next unused route, prioritising explanations that match the student's weakest rubric criteria.
  const weaknessTagSet = normalizeTags(weaknessTags);
  const rankedRoutes = routes
    .filter((route) => !usedExplanationIds.has(route.id))
    .map((route) => ({
      ...route,
      weaknessScore: scoreRouteMatch(route.misconceptionSummary ?? '', weaknessTagSet),
    }))
    .sort((a, b) => b.weaknessScore - a.weaknessScore);

  const nextRoute = rankedRoutes[0];

  let holdingAtFinalCheck = false;
  let nextExplanationId: string | null = null;

  if (nextRoute) {
    nextExplanationId = nextRoute.id;
  } else {
    holdingAtFinalCheck = true;
  }

  // Step 6 — Update LiveParticipant
  await prisma.liveParticipant.update({
    where: { id: participantId },
    data: {
      currentLane: 'LANE_3',
      currentExplanationId: nextExplanationId,
      escalationReason: 'SHADOW_CHECK_FAILED',
      holdingAtFinalCheck,
    },
  });

  // Step 7 — Create LaneTransition
  await prisma.laneTransition.create({
    data: {
      liveSessionId: sessionId,
      participantId,
      studentUserId: participant.studentUserId,
      fromLane: 'LANE_2',
      toLane: 'LANE_3',
      transitionType: 'ESCALATED',
      reason: 'SHADOW_CHECK_FAILED',
    },
  });

  // Step 8 — Check reteach threshold
  await checkReteachThreshold(sessionId);

  return { newLane: 'LANE_3', nextExplanationId, holdingAtFinalCheck };
}

// ─── handleHandback ──────────────────────────────────────────────────────────

export async function handleHandback(
  participantId: string,
  sessionId: string,
  teacherUserId: string
): Promise<HandbackResult> {
  const participant = await prisma.liveParticipant.findUnique({
    where: { id: participantId },
    include: { session: { select: { skillId: true, subjectId: true } } },
  });

  // Step 1 — Update LiveParticipant
  await prisma.liveParticipant.update({
    where: { id: participantId },
    data: {
      currentLane: 'LANE_2',
      pendingRecheckItemId: null,
      holdingAtFinalCheck: false,
    },
  });

  // Step 2 — Create LaneTransition
  await prisma.laneTransition.create({
    data: {
      liveSessionId: sessionId,
      participantId,
      studentUserId: participant!.studentUserId,
      fromLane: 'LANE_3',
      toLane: 'LANE_2',
      transitionType: 'HANDED_BACK',
      triggeredBy: teacherUserId,
    },
  });

  // Step 3 — Select shadow check item
  const skillId = participant?.session.skillId;
  let shadowCheckItemId = '';

  if (skillId) {
    // Find items for this skill not yet attempted by this student in this session
    const attemptedItems = await prisma.liveAttempt.findMany({
      where: {
        liveSessionId: sessionId,
        studentUserId: participant!.studentUserId,
      },
      select: { itemId: true },
    });
    const attemptedSet = new Set(attemptedItems.map(a => a.itemId));

    const availableItem = await prisma.item.findFirst({
      where: {
        skills: { some: { skillId } },
        id: { notIn: Array.from(attemptedSet) },
      },
      select: { id: true },
    });

    shadowCheckItemId = availableItem?.id ?? '';
  }

  await prisma.liveParticipant.update({
    where: { id: participantId },
    data: {
      pendingRecheckItemId: shadowCheckItemId || null,
    },
  });

  await emitEvent({
    name: 'live_support_recheck_started',
    actorUserId: teacherUserId,
    studentUserId: participant!.studentUserId,
    subjectId: participant?.session.subjectId,
    skillId: skillId ?? undefined,
    itemId: shadowCheckItemId || undefined,
    payload: {
      liveSessionId: sessionId,
      participantId,
      studentUserId: participant!.studentUserId,
      fromLane: 'LANE_3',
      toLane: 'LANE_2',
      shadowCheckItemId: shadowCheckItemId || null,
    },
  });

  return { newLane: 'LANE_2', shadowCheckItemId, studentUserId: participant!.studentUserId };
}

// ─── checkReteachThreshold ───────────────────────────────────────────────────

export async function checkReteachThreshold(sessionId: string): Promise<void> {
  const participants = await prisma.liveParticipant.findMany({
    where: { liveSessionId: sessionId },
    select: {
      currentLane: true,
      isUnexpectedFailure: true,
      laneAssignedAt: true,
    },
  });

  // Only count assigned participants (laneAssignedAt !== null)
  const assigned = participants.filter(p => p.laneAssignedAt !== null);
  const total = assigned.length;
  if (total === 0) return;

  const lane3 = assigned.filter(p => p.currentLane === 'LANE_3');
  const lane3Count = lane3.length;

  // Check if all Lane 3 failures are expected
  const allExpected = lane3.every(p => !p.isUnexpectedFailure);

  // Apply threshold
  const threshold = allExpected ? 0.50 : 0.35;
  const reteachAlert = lane3Count / total >= threshold;

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: { reteachAlert },
  });
}

// ─── selectExplanationRoute (supporting function) ────────────────────────────

async function selectExplanationRoute(
  skillId: string,
  misconceptionTag: string | null,
  weaknessTags?: string[] | null
): Promise<string> {
  const tags = normalizeTags([misconceptionTag ?? '', ...(weaknessTags ?? [])]);

  // Fetch ExplanationPerformance records for this skill, ordered by dle DESC
  const performances = await prisma.explanationPerformance.findMany({
    where: { skillId },
    include: {
      explanation: {
        select: { id: true, routeType: true, misconceptionSummary: true },
      },
    },
    orderBy: { dle: 'desc' },
  });

  if (performances.length > 0) {
    if (tags.length > 0) {
      const ranked = performances
        .map((performance) => ({
          performance,
          matchScore: scoreRouteMatch(performance.explanation.misconceptionSummary ?? '', tags),
        }))
        .sort((a, b) => b.matchScore - a.matchScore);
      if ((ranked[0]?.matchScore ?? 0) > 0) return ranked[0]!.performance.explanationId;
    }
    return performances[0].explanationId;
  }

  // Fall back to routeType 'A'
  const fallback = await prisma.explanationRoute.findFirst({
    where: { skillId, routeType: 'A' },
    select: { id: true },
  });

  if (fallback) return fallback.id;

  // Last resort: any active route for the skill
  const anyRoute = await prisma.explanationRoute.findFirst({
    where: { skillId, isActive: true },
    select: { id: true },
  });

  return anyRoute?.id ?? '';
}
