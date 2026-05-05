import { prisma } from '@/db/prisma';
import type { DelayBucket } from '@prisma/client';
import {
  scoreAttempt,
  type KnowledgeQuestionType,
  type SupportLevel,
  type KnowledgeAttemptInput,
} from './scoreAttempt';
import { updateSkillState, type KnowledgeState } from './updateSkillState';
import { decideNextQuestion, type NextQuestionRecommendation, NEXT_QUESTION_POLICY_VERSION } from './nextQuestionPolicy';
import {
  computeDLE,
  computeInstructionalTimeMs,
  computeKnowledgeStability,
  computeLearningGain,
} from './dle';

export interface RecordKnowledgeAttemptInput {
  userId: string;
  skillId: string;
  itemId: string;
  correct: boolean;
  occurredAt?: Date;
  responseTimeMs?: number;
  hintsUsed?: number;
  explanationId?: string;
  attemptNumber?: number;
  questionDifficulty?: number;
  questionType?: KnowledgeQuestionType;
  supportLevel?: SupportLevel;
  isTransferItem?: boolean;
  isMixedItem?: boolean;
  isReviewItem?: boolean;
}

const DEFAULT_FORGETTING_RATE = 0.12;
const DEFAULT_STATE: KnowledgeState = {
  masteryProbability: 0.35,
  forgettingRate: DEFAULT_FORGETTING_RATE,
  halfLifeDays: Math.log(2) / DEFAULT_FORGETTING_RATE,
  retrievalStrength: 0.3,
  transferAbility: 0.2,
  confidence: 0.1,
  evidenceCount: 0,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastReviewAt: null,
};


export interface DLEMetrics {
  value: number;
  learningGain: number;
  knowledgeStability: number;
  instructionalTimeMs: number;
  durabilityBand: 'AT_RISK' | 'DEVELOPING' | 'DURABLE';
  version: 'v1';
}

export interface KnowledgeAttemptResult {
  recommendation: NextQuestionRecommendation;
  policyVersion: string;
  state: KnowledgeState;
  dle: DLEMetrics;
}

export async function recordKnowledgeAttempt(input: RecordKnowledgeAttemptInput): Promise<KnowledgeAttemptResult> {
  const prismaAny = prisma as unknown as Record<string, unknown>;
  const fallbackRecommendation = decideNextQuestion({ state: DEFAULT_STATE });
  if (!('studentSkillState' in prismaAny) || !('questionAttempt' in prismaAny) || !('skillReview' in prismaAny)) {
    const instructionalTimeMs = computeInstructionalTimeMs(input);
    const learningGain = 0;
    const knowledgeStability = computeKnowledgeStability(DEFAULT_STATE);
    const dle = computeDLE({ learningGain, knowledgeStability, instructionalTimeMs });

    return {
      recommendation: fallbackRecommendation,
      policyVersion: NEXT_QUESTION_POLICY_VERSION,
      state: DEFAULT_STATE,
      dle,
    };
  }

  const occurredAt = input.occurredAt ?? new Date();

  const scoreInput: KnowledgeAttemptInput = {
    correct: input.correct,
    responseTimeMs: input.responseTimeMs ?? 12000,
    hintsUsed: input.hintsUsed ?? 0,
    supportLevel: input.supportLevel ?? 'INDEPENDENT',
    questionType: input.questionType ?? 'ROUTINE',
    isTransferItem: input.isTransferItem ?? false,
    isMixedItem: input.isMixedItem ?? false,
    isReviewItem: input.isReviewItem ?? false,
  };

  const instructionalTimeMs = computeInstructionalTimeMs(input);
  const contextType = input.isTransferItem ? 'TRANSFER' : input.isMixedItem ? 'MIXED' : 'ROUTINE';

  // State read is inside the transaction to reduce the window for concurrent
  // updates on the same (userId, skillId) from racing each other.
  let state: KnowledgeState = DEFAULT_STATE;
  let nextState: KnowledgeState = DEFAULT_STATE;
  let learningGain = 0;
  let knowledgeStability = 0;
  let dle = computeDLE({ learningGain: 0, knowledgeStability: 0, instructionalTimeMs });
  let durabilityBand = dle.durabilityBand;
  let daysSinceLastAttempt = 0;
  let delayBucket: DelayBucket = 'IMMEDIATE';
  let nextReviewAt = new Date(occurredAt.getTime() + Math.max(1, DEFAULT_STATE.halfLifeDays * 0.9) * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const existingState = await tx.studentSkillState.findUnique({
      where: { userId_skillId: { userId: input.userId, skillId: input.skillId } },
    });

    state = existingState
      ? {
          masteryProbability: existingState.masteryProbability,
          forgettingRate: existingState.forgettingRate,
          halfLifeDays: existingState.halfLifeDays,
          retrievalStrength: existingState.retrievalStrength,
          transferAbility: existingState.transferAbility,
          confidence: existingState.confidence,
          evidenceCount: existingState.evidenceCount,
          lastAttemptAt: existingState.lastAttemptAt,
          lastSuccessAt: existingState.lastSuccessAt,
          lastReviewAt: existingState.lastReviewAt,
        }
      : DEFAULT_STATE;

    const evidence = scoreAttempt(scoreInput);
    nextState = updateSkillState({
      state,
      evidence,
      attempt: {
        timestamp: occurredAt,
        correct: input.correct,
        isTransferItem: input.isTransferItem ?? false,
        isReviewItem: input.isReviewItem ?? false,
        expectedRetention: state.retrievalStrength,
        observedRetention: input.correct ? 1 : 0,
      },
    });

    learningGain = computeLearningGain(state, nextState);
    knowledgeStability = computeKnowledgeStability(nextState);
    dle = computeDLE({ learningGain, knowledgeStability, instructionalTimeMs });
    durabilityBand = dle.durabilityBand;

    daysSinceLastAttempt = state.lastAttemptAt
      ? (occurredAt.getTime() - state.lastAttemptAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    delayBucket = daysSinceLastAttempt >= 7 ? 'D7_PLUS' : daysSinceLastAttempt >= 3 ? 'D3' : daysSinceLastAttempt >= 1 ? 'D1' : input.isReviewItem ? 'SAME_DAY' : 'IMMEDIATE';
    nextReviewAt = new Date(occurredAt.getTime() + Math.max(1, nextState.halfLifeDays * 0.9) * 24 * 60 * 60 * 1000);

    await tx.questionAttempt.create({
      data: {
        userId: input.userId,
        skillId: input.skillId,
        itemId: input.itemId,
        occurredAt,
        correct: input.correct,
        responseTimeMs: scoreInput.responseTimeMs,
        hintsUsed: scoreInput.hintsUsed,
        explanationId: input.explanationId,
        attemptNumber: input.attemptNumber ?? 1,
        questionDifficulty: input.questionDifficulty ?? 0.5,
        questionType: scoreInput.questionType,
        contextType,
        delayBucket,
        instructionalTimeMs,
        isTransferItem: scoreInput.isTransferItem,
        isMixedItem: scoreInput.isMixedItem,
        isReviewItem: scoreInput.isReviewItem,
        supportLevel: scoreInput.supportLevel,
      },
    });

    await tx.studentSkillState.upsert({
      where: {
        userId_skillId: {
          userId: input.userId,
          skillId: input.skillId,
        },
      },
      update: {
        masteryProbability: nextState.masteryProbability,
        forgettingRate: nextState.forgettingRate,
        halfLifeDays: nextState.halfLifeDays,
        retrievalStrength: nextState.retrievalStrength,
        transferAbility: nextState.transferAbility,
        confidence: nextState.confidence,
        latestDle: dle.value,
        latestLearningGain: learningGain,
        latestKnowledgeStability: knowledgeStability,
        latestInstructionalTimeMs: instructionalTimeMs,
        durabilityBand,
        evidenceCount: nextState.evidenceCount,
        lastAttemptAt: nextState.lastAttemptAt,
        lastSuccessAt: nextState.lastSuccessAt,
        lastReviewAt: nextState.lastReviewAt,
      },
      create: {
        userId: input.userId,
        skillId: input.skillId,
        masteryProbability: nextState.masteryProbability,
        forgettingRate: nextState.forgettingRate,
        halfLifeDays: nextState.halfLifeDays,
        retrievalStrength: nextState.retrievalStrength,
        transferAbility: nextState.transferAbility,
        confidence: nextState.confidence,
        latestDle: dle.value,
        latestLearningGain: learningGain,
        latestKnowledgeStability: knowledgeStability,
        latestInstructionalTimeMs: instructionalTimeMs,
        durabilityBand,
        evidenceCount: nextState.evidenceCount,
        lastAttemptAt: nextState.lastAttemptAt,
        lastSuccessAt: nextState.lastSuccessAt,
        lastReviewAt: nextState.lastReviewAt,
      },
    });

    if (scoreInput.isReviewItem) {
      const pendingReview = await tx.skillReview.findFirst({
        where: {
          userId: input.userId,
          skillId: input.skillId,
          completedAt: null,
          scheduledFor: {
            lte: occurredAt,
          },
        },
        orderBy: { scheduledFor: 'asc' },
      });

      if (pendingReview) {
        await tx.skillReview.update({
          where: { id: pendingReview.id },
          data: {
            completedAt: occurredAt,
            successScore: evidence.retrievalSignal,
            daysSinceLastExposure: state.lastAttemptAt
              ? (occurredAt.getTime() - state.lastAttemptAt.getTime()) / (1000 * 60 * 60 * 24)
              : null,
          },
        });
      }

      await tx.skillReview.create({
        data: {
          userId: input.userId,
          skillId: input.skillId,
          scheduledFor: nextReviewAt,
        },
      });
    }
  });

  return {
    recommendation: decideNextQuestion({ state: nextState, now: occurredAt }),
    policyVersion: NEXT_QUESTION_POLICY_VERSION,
    state: nextState,
    dle,
  };
}
