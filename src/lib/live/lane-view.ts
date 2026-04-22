import { prisma } from '@/db/prisma';
import type { LaneViewResponse, LaneStudent } from '@/lib/validators/live-session';

export async function getLaneView(sessionId: string): Promise<LaneViewResponse> {
  // Fetch all participants for the session
  const participants = await prisma.liveParticipant.findMany({
    where: { liveSessionId: sessionId },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { skillId: true },
  });

  // Group by lane
  const lane1Students: LaneStudent[] = [];
  const lane2Students: LaneStudent[] = [];
  const lane3Students: LaneStudent[] = [];
  let unassigned = 0;

  // Batch fetch skill states for all participants at once (performance)
  const participantUserIds = participants.map(p => p.studentUserId);
  const skillStates = session?.skillId
    ? await prisma.studentSkillState.findMany({
        where: {
          userId: { in: participantUserIds },
          skillId: session.skillId,
        },
        select: { userId: true, masteryProbability: true },
      })
    : [];

  const skillStateMap = new Map(skillStates.map(s => [s.userId, s.masteryProbability]));

  // Batch fetch explanation routes for current explanation IDs
  const explanationIds = participants
    .map(p => p.currentExplanationId)
    .filter((id): id is string => id !== null);
  const explanationRoutes = explanationIds.length > 0
    ? await prisma.explanationRoute.findMany({
        where: { id: { in: explanationIds } },
        select: { id: true, routeType: true },
      })
    : [];
  const routeTypeMap = new Map(explanationRoutes.map(r => [r.id, r.routeType]));

  const now = Date.now();

  for (const p of participants) {
    if (!p.laneAssignedAt) {
      unassigned++;
      continue;
    }

    const student: LaneStudent = {
      participantId: p.id,
      studentUserId: p.studentUserId,
      studentName: p.student.name ?? 'Unknown',
      masteryProbability: skillStateMap.get(p.studentUserId) ?? 0,
      currentExplanationRouteType: p.currentExplanationId
        ? routeTypeMap.get(p.currentExplanationId) ?? null
        : null,
      escalationReason: p.escalationReason as LaneStudent['escalationReason'],
      isUnexpectedFailure: p.isUnexpectedFailure,
      waitingMinutes: p.laneAssignedAt
        ? Math.round((now - p.laneAssignedAt.getTime()) / 60000)
        : 0,
      holdingAtFinalCheck: p.holdingAtFinalCheck,
    };

    switch (p.currentLane) {
      case 'LANE_1':
        lane1Students.push(student);
        break;
      case 'LANE_2':
        lane2Students.push(student);
        break;
      case 'LANE_3':
        lane3Students.push(student);
        break;
    }
  }

  // Sort Lane 3 students by masteryProbability ASC
  lane3Students.sort((a, b) => a.masteryProbability - b.masteryProbability);

  const totalParticipants = participants.length;
  const lane3Count = lane3Students.length;

  // Reteach alert logic
  const assigned = participants.filter(p => p.laneAssignedAt !== null);
  const assignedTotal = assigned.length;
  const allExpected = lane3Students.every(s => !s.isUnexpectedFailure);
  const threshold = allExpected ? 0.50 : 0.35;
  const reteachAlert = assignedTotal > 0 && lane3Count / assignedTotal >= threshold;

  // Build reteach message
  let reteachMessage: string | null = null;
  if (reteachAlert) {
    reteachMessage = `${lane3Count} students need support — consider stopping and reteaching the whole class`;
  } else if (lane3Count > 0) {
    const top3Names = lane3Students
      .slice(0, 3)
      .map(s => s.studentName)
      .join(', ');
    reteachMessage = `${lane3Count} students need you — circulate to: ${top3Names}`;
  } else {
    reteachMessage = 'All students on track';
  }

  return {
    lane1: { count: lane1Students.length, students: lane1Students },
    lane2: { count: lane2Students.length, students: lane2Students },
    lane3: {
      count: lane3Count,
      students: lane3Students,
      reteachAlert,
      reteachMessage,
    },
    totalParticipants,
    unassigned,
  };
}
