import { prisma } from '@/db/prisma';
import { parseOpeningCheckQueue } from '@/lib/live/live-check-plan';

export interface StudentLiveItem {
  id: string;
  question: string;
  type: string;
  options: unknown;
  skillId?: string;
}

export interface StudentStatePayload {
  status: string;
  currentPhaseIndex: number;
  currentContent: Record<string, unknown> | null;
  studentLane: string;
  pendingRecheckItem: StudentLiveItem | null;
}

export type StudentStateResult =
  | { ok: true; payload: StudentStatePayload }
  | { ok: false; status: 403 | 404; error: string };

/**
 * Builds the lightweight per-student live-session snapshot consumed by student
 * devices. Shared by the `student-state` poll endpoint and the `student-stream`
 * SSE endpoint so the two never drift.
 *
 * Returns only what a student needs to react to phase changes and teacher
 * broadcasts: status, phase index, broadcast content (resolved for individual
 * assignments), lane, and any pending recheck / opening-check item.
 */
export async function buildStudentState(
  sessionId: string,
  userId: string,
): Promise<StudentStateResult> {
  const [participant, liveSession] = await Promise.all([
    prisma.liveParticipant.findUnique({
      where: {
        liveSessionId_studentUserId: { liveSessionId: sessionId, studentUserId: userId },
      },
      select: {
        id: true,
        currentLane: true,
        currentExplanationId: true,
        pendingRecheckItemId: true,
        openingCheckQueue: true,
        openingCheckIndex: true,
      },
    }),
    prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
        currentPhaseIndex: true,
        currentContent: true,
        skillId: true,
      },
    }),
  ]);

  if (!participant) return { ok: false, status: 403, error: 'Not a participant' };
  if (!liveSession) return { ok: false, status: 404, error: 'Session not found' };

  let pendingRecheckItem: StudentLiveItem | null = null;

  if (participant.currentLane === 'LANE_2' && participant.pendingRecheckItemId) {
    const nextRecheckItem = await prisma.item.findUnique({
      where: { id: participant.pendingRecheckItemId },
      select: {
        id: true,
        question: true,
        type: true,
        options: true,
        skills: { select: { skillId: true }, take: 1 },
      },
    });

    if (nextRecheckItem) {
      pendingRecheckItem = {
        id: nextRecheckItem.id,
        question: nextRecheckItem.question,
        type: nextRecheckItem.type,
        options: nextRecheckItem.options,
        skillId: nextRecheckItem.skills[0]?.skillId ?? liveSession.skillId ?? undefined,
      };
    }
  }

  let openingCheckItem: StudentLiveItem | null = null;
  if (liveSession.status === 'ACTIVE' && participant.currentLane === 'LANE_1' && !participant.pendingRecheckItemId) {
    const queue = parseOpeningCheckQueue(participant.openingCheckQueue);
    const idx = participant.openingCheckIndex ?? 0;
    const slot = queue[idx];
    if (slot) {
      const answered = await prisma.liveAttempt.findFirst({
        where: { liveSessionId: sessionId, studentUserId: userId, itemId: slot.itemId },
        select: { id: true },
      });
      if (!answered) {
        const row = await prisma.item.findUnique({
          where: { id: slot.itemId },
          select: { id: true, question: true, type: true, options: true },
        });
        if (row) {
          openingCheckItem = {
            id: row.id,
            question: row.question,
            type: row.type,
            options: row.options,
            skillId: slot.skillId,
          };
        }
      }
    }
  }

  let currentContent = liveSession.currentContent as Record<string, unknown> | null;
  if (
    currentContent?.contentType === 'PRACTICE' &&
    currentContent?.audience === 'individual' &&
    currentContent?.individualAssignments &&
    typeof currentContent.individualAssignments === 'object'
  ) {
    const assignment = (currentContent.individualAssignments as Record<string, { item?: unknown }>)[userId] ?? null;
    currentContent = assignment?.item ? { ...currentContent, item: assignment.item } : null;
  }

  return {
    ok: true,
    payload: {
      status: liveSession.status,
      currentPhaseIndex: liveSession.currentPhaseIndex,
      currentContent,
      studentLane: participant.currentLane,
      pendingRecheckItem: pendingRecheckItem ?? openingCheckItem,
    },
  };
}
