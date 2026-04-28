import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { emitEvent } from '@/features/telemetry/eventService';
import { grantFor, type RewardEventName } from './rewardEconomy';

const RAPID_WRONG_WINDOW_MS = 6000;
const RAPID_WRONG_TRIGGER = 3;
const PENALTY_QUESTION_COUNT = 5;

export interface UserGamificationSummary {
  xp: number;
  tokens: number;
  streakDays: number;
  activeDaysThisWeek: number;
  /** Sum of positive XP from the reward ledger since Monday 00:00 (local week aligned with activity metrics). */
  weekXpEarned: number;
}

export interface GuessingSafeguardResult {
  xpMultiplier: number;
  penaltyApplied: boolean;
  penaltyRemaining: number;
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

export interface GuessingSafeguardState {
  rapidWrongStreak: number;
  lastWrongAt: Date | null;
  penaltyRemaining: number;
}

export interface GuessingSafeguardTransition extends GuessingSafeguardState {
  penaltyApplied: boolean;
  xpMultiplier: number;
}

export function computeGuessingSafeguardTransition(
  state: GuessingSafeguardState,
  correct: boolean,
  answeredAt: Date
): GuessingSafeguardTransition {
  let penaltyRemaining = state.penaltyRemaining;
  let penaltyApplied = false;

  if (penaltyRemaining > 0) {
    penaltyApplied = true;
    penaltyRemaining -= 1;
  }

  let rapidWrongStreak = state.rapidWrongStreak;
  let lastWrongAt = state.lastWrongAt;

  if (!correct) {
    const isRapidWrong =
      lastWrongAt != null && answeredAt.getTime() - lastWrongAt.getTime() <= RAPID_WRONG_WINDOW_MS;
    rapidWrongStreak = isRapidWrong ? rapidWrongStreak + 1 : 1;
    lastWrongAt = answeredAt;

    if (rapidWrongStreak >= RAPID_WRONG_TRIGGER) {
      penaltyRemaining = PENALTY_QUESTION_COUNT;
      rapidWrongStreak = 0;
    }
  } else {
    rapidWrongStreak = 0;
  }

  return {
    rapidWrongStreak,
    lastWrongAt,
    penaltyRemaining,
    penaltyApplied,
    xpMultiplier: penaltyApplied ? 0.5 : 1,
  };
}

export async function consumeGuessingSafeguard(
  userId: string,
  correct: boolean,
  answeredAt: Date = new Date()
): Promise<GuessingSafeguardResult> {
  return prisma.$transaction(async (tx) => {
    const state = await tx.guessingSafeguardState.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { rapidWrongStreak: true, lastWrongAt: true, penaltyRemaining: true },
    });

    const transition = computeGuessingSafeguardTransition(state, correct, answeredAt);

    await tx.guessingSafeguardState.update({
      where: { userId },
      data: {
        rapidWrongStreak: transition.rapidWrongStreak,
        lastWrongAt: transition.lastWrongAt,
        penaltyRemaining: transition.penaltyRemaining,
      },
    });

    return {
      xpMultiplier: transition.xpMultiplier,
      penaltyApplied: transition.penaltyApplied,
      penaltyRemaining: transition.penaltyRemaining,
    };
  });
}

export async function grantReward(
  userId: string,
  subjectId: string,
  rewardEvent: RewardEventName,
  context: Record<string, unknown> = {}
): Promise<void> {
  const grant = grantFor(rewardEvent);
  const idempotencyKey = typeof context.rewardKey === 'string' ? context.rewardKey : undefined;
  const xpMultiplier = typeof context.xpMultiplier === 'number' ? context.xpMultiplier : 1;
  const adjustedXp = Math.max(0, Math.floor(grant.xp * xpMultiplier));

  const transactionResult = await prisma.$transaction(async (tx) => {
    if (idempotencyKey) {
      const existing = await tx.rewardTransaction.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        return { duplicated: true as const, balance: null };
      }
    }

    await tx.rewardTransaction.create({
      data: {
        userId,
        subjectId,
        eventName: rewardEvent,
        xpDelta: adjustedXp,
        tokenDelta: grant.tokens,
        reason: grant.reason,
        idempotencyKey,
        metadata: context as Prisma.InputJsonValue,
      },
    });

    const updatedBalance = await tx.studentRewardBalance.upsert({
      where: { userId },
      update: {
        xpTotal: { increment: adjustedXp },
        tokenTotal: { increment: grant.tokens },
      },
      create: {
        userId,
        xpTotal: adjustedXp,
        tokenTotal: grant.tokens,
      },
      select: { xpTotal: true, tokenTotal: true, streakDays: true },
    });

    return { duplicated: false as const, balance: updatedBalance };
  });

  if (transactionResult.duplicated) return;

  await emitEvent({
    name: 'reward_granted',
    actorUserId: userId,
    studentUserId: userId,
    subjectId,
    payload: {
      rewardEvent,
      xp: adjustedXp,
      baseXp: grant.xp,
      xpMultiplier,
      tokens: grant.tokens,
      reason: grant.reason,
      balanceAfter: {
        xpTotal: transactionResult.balance?.xpTotal ?? adjustedXp,
        tokenTotal: transactionResult.balance?.tokenTotal ?? grant.tokens,
      },
      ...context,
    },
  });
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

  const balance = await prisma.studentRewardBalance.findUnique({
    where: { userId },
    select: { streakDays: true },
  });

  const previousStreak = balance?.streakDays ?? 0;
  const nextStreak = hadYesterday ? previousStreak + 1 : 1;

  await prisma.studentRewardBalance.upsert({
    where: { userId },
    update: { streakDays: nextStreak },
    create: { userId, streakDays: nextStreak },
  });

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

  await grantReward(userId, subjectId, 'streak_day_maintained', {
    streakDays: nextStreak,
    rewardKey: `streak:${userId}:${todayStart.toISOString().slice(0, 10)}`,
  });
  return true;
}

export async function getUserGamificationSummary(userId: string): Promise<UserGamificationSummary> {
  const balance = await prisma.studentRewardBalance.findUnique({
    where: { userId },
    select: { xpTotal: true, tokenTotal: true, streakDays: true },
  });

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

  const weekXpAgg = await prisma.rewardTransaction.aggregate({
    where: {
      userId,
      createdAt: { gte: weekStart },
    },
    _sum: { xpDelta: true },
  });

  return {
    xp: balance?.xpTotal ?? 0,
    tokens: balance?.tokenTotal ?? 0,
    streakDays: balance?.streakDays ?? 0,
    activeDaysThisWeek: activeDaySet.size,
    weekXpEarned: Math.max(0, weekXpAgg._sum.xpDelta ?? 0),
  };
}
