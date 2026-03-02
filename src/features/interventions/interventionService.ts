import { prisma } from '@/db/prisma';
import { emitEvent } from '@/features/telemetry/eventService';

export async function checkAndFlagInterventions(
  userId: string,
  skillId: string,
  subjectId: string
): Promise<void> {
  // Check if student is stuck: >= 20 attempts in last 7 days, mastery < 0.60, confirmedCount == 0
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [mastery, recentAttempts] = await Promise.all([
    prisma.skillMastery.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { mastery: true, confirmedCount: true },
    }),
    prisma.attempt.count({
      where: {
        userId,
        item: { skills: { some: { skillId } } },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  if (
    recentAttempts >= 20 &&
    mastery &&
    mastery.mastery < 0.6 &&
    mastery.confirmedCount === 0
  ) {
    // Idempotent: check if flag already created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.interventionFlag.findFirst({
      where: {
        userId,
        skillId,
        createdAt: { gte: today },
        isResolved: false,
      },
    });

    if (!existing) {
      await prisma.interventionFlag.upsert({
        where: { userId_skillId: { userId, skillId } },
        update: { lastSeenAt: new Date(), isResolved: false },
        create: {
          userId,
          subjectId,
          skillId,
          reason: 'High attempt volume, low mastery',
          isResolved: false,
        },
      });

      await emitEvent({
        name: 'intervention_recommended',
        actorUserId: userId,
        studentUserId: userId,
        subjectId,
        skillId,
        payload: {
          skillId,
          reason: 'High attempt volume, low mastery',
          recentAttempts,
          mastery: mastery.mastery,
        },
      });
    }
  }
}
