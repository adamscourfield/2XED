import { prisma } from '@/db/prisma';

export type NextContentResult = {
  type: 'NEXT_SKILL' | 'STRETCH' | 'SPACED_REVIEW';
  skillId: string;
  itemId: string;
  reason: string;
};

export async function getNextContent(
  studentUserId: string,
  currentSkillId: string,
  subjectId: string
): Promise<NextContentResult | null> {
  // 1. NEXT_SKILL: All prerequisite skills have mastery >= 0.85 AND confirmedCount >= 2
  const dependents = await prisma.skillPrereq.findMany({
    where: { prereqId: currentSkillId },
    select: { skillId: true },
  });

  if (dependents.length > 0) {
    // Check if all prereqs for any dependent skill are met
    for (const dep of dependents) {
      const prereqs = await prisma.skillPrereq.findMany({
        where: { skillId: dep.skillId },
        select: { prereqId: true },
      });

      const prereqStates = await prisma.studentSkillState.findMany({
        where: {
          userId: studentUserId,
          skillId: { in: prereqs.map(p => p.prereqId) },
        },
      });

      const masteries = await prisma.skillMastery.findMany({
        where: {
          userId: studentUserId,
          skillId: { in: prereqs.map(p => p.prereqId) },
        },
      });

      const allPrereqsMet = prereqs.every(p => {
        const state = prereqStates.find(s => s.skillId === p.prereqId);
        const mastery = masteries.find(m => m.skillId === p.prereqId);
        return (
          state &&
          state.masteryProbability >= 0.85 &&
          mastery &&
          mastery.confirmedCount >= 2
        );
      });

      if (allPrereqsMet) {
        // Find an item for the next skill
        const item = await prisma.item.findFirst({
          where: { skills: { some: { skillId: dep.skillId } } },
          select: { id: true },
        });
        if (item) {
          return {
            type: 'NEXT_SKILL',
            skillId: dep.skillId,
            itemId: item.id,
            reason: 'All prerequisites met — advancing to next skill',
          };
        }
      }
    }
  }

  // 2. STRETCH: Current skill mastery is high but transfer_ability < 0.65
  const currentState = await prisma.studentSkillState.findUnique({
    where: { userId_skillId: { userId: studentUserId, skillId: currentSkillId } },
  });

  if (currentState && currentState.masteryProbability >= 0.85 && currentState.transferAbility < 0.65) {
    const stretchItem = await prisma.item.findFirst({
      where: {
        skills: { some: { skillId: currentSkillId } },
      },
      select: { id: true },
    });
    if (stretchItem) {
      return {
        type: 'STRETCH',
        skillId: currentSkillId,
        itemId: stretchItem.id,
        reason: 'High mastery but transfer ability needs strengthening',
      };
    }
  }

  // 3. SPACED_REVIEW: Find the skill with the oldest overdue nextReviewAt
  const overdueReview = await prisma.skillMastery.findFirst({
    where: {
      userId: studentUserId,
      nextReviewAt: { lte: new Date() },
      skill: { subjectId },
    },
    orderBy: { nextReviewAt: 'asc' },
    select: { skillId: true },
  });

  if (overdueReview) {
    const reviewItem = await prisma.item.findFirst({
      where: { skills: { some: { skillId: overdueReview.skillId } } },
      select: { id: true },
    });
    if (reviewItem) {
      return {
        type: 'SPACED_REVIEW',
        skillId: overdueReview.skillId,
        itemId: reviewItem.id,
        reason: 'Overdue spaced review item',
      };
    }
  }

  return null;
}
