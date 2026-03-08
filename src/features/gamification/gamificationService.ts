import { prisma } from '@/db/prisma';
import { emitEvent } from '@/features/telemetry/eventService';
import { grantFor, type RewardEventName } from './rewardEconomy';

export interface UserGamificationSummary {
  xp: number;
  tokens: number;
  streakDays: number;
  activeDaysThisWeek: number;
}

export async function grantReward(
  userId: string,
  subjectId: string,
  rewardEvent: RewardEventName,
  context: Record<string, unknown> = {}
): Promise<void> {
  const grant = grantFor(rewardEvent);

  await emitEvent({
    name: 'reward_granted',
    actorUserId: userId,
    studentUserId: userId,
    subjectId,
    payload: {
      rewardEvent,
      xp: grant.xp,
      tokens: grant.tokens,
      reason: grant.reason,
      ...context,
    },
  });
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

export async function maybeGrantDailyStreak(
  userId: string,
  subjectId: string,
  now: Date = new Date()
): Promise<boolean> {
  const todayStart = startOfDay(now);

  const todayAlready = await prisma.event.findFirst({
    where: {
      name: 'streak_extended',
      studentUserId: userId,
      createdAt: { gte: todayStart },
    },
    select: { id: true },
  });

  if (todayAlready) return false;

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const hadYesterday = await prisma.event.findFirst({
    where: {
      name: 'streak_extended',
      studentUserId: userId,
      createdAt: { gte: yesterdayStart, lt: todayStart },
    },
    select: { id: true },
  });

  const summary = await getUserGamificationSummary(userId);
  const nextStreak = hadYesterday ? summary.streakDays + 1 : 1;

  await emitEvent({
    name: 'streak_extended',
    actorUserId: userId,
    studentUserId: userId,
    subjectId,
    payload: {
      streakDays: nextStreak,
      date: todayStart.toISOString().slice(0, 10),
    },
  });

  await grantReward(userId, subjectId, 'streak_day_maintained', { streakDays: nextStreak });
  return true;
}

export async function getUserGamificationSummary(userId: string): Promise<UserGamificationSummary> {
  const rewardEvents = await prisma.event.findMany({
    where: { name: 'reward_granted', studentUserId: userId },
    select: { payload: true },
  });

  let xp = 0;
  let tokens = 0;
  for (const event of rewardEvents) {
    const payload = event.payload as { xp?: number; tokens?: number };
    xp += payload?.xp ?? 0;
    tokens += payload?.tokens ?? 0;
  }

  const streakEvents = await prisma.event.findMany({
    where: { name: 'streak_extended', studentUserId: userId },
    select: { payload: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const latestStreak = streakEvents[0]?.payload as { streakDays?: number } | undefined;
  const streakDays = latestStreak?.streakDays ?? 0;

  const weekStart = startOfWeek(new Date());
  const weeklyEvents = await prisma.event.findMany({
    where: {
      name: 'question_answered',
      studentUserId: userId,
      createdAt: { gte: weekStart },
    },
    select: { createdAt: true },
  });

  const activeDaySet = new Set(weeklyEvents.map((e) => e.createdAt.toISOString().slice(0, 10)));

  return {
    xp,
    tokens,
    streakDays,
    activeDaysThisWeek: activeDaySet.size,
  };
}
