import type { KnowledgeQuestionType, SupportLevel } from './scoreAttempt';
import type { KnowledgeState } from './updateSkillState';

export interface NextQuestionPolicyInput {
  state: KnowledgeState;
  now?: Date;
}

export interface NextQuestionRecommendation {
  questionType: KnowledgeQuestionType;
  supportLevel: SupportLevel;
  isReviewItem: boolean;
  isTransferItem: boolean;
  isMixedItem: boolean;
  rationale: string;
}

export const NEXT_QUESTION_POLICY_VERSION = 'v1';

// Minimum attempts before the policy trusts state signals enough to route into
// TRANSFER or MIXED. Below this count, thresholds are raised so the student
// stays in ROUTINE / RETRIEVAL until there is sufficient evidence.
const MIN_EVIDENCE_FOR_ADVANCED = 5;

export function decideNextQuestion(input: NextQuestionPolicyInput): NextQuestionRecommendation {
  const state = input.state;
  const now = input.now ?? new Date();

  const daysSinceAttempt = state.lastAttemptAt
    ? (now.getTime() - state.lastAttemptAt.getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const reviewDue = daysSinceAttempt >= Math.max(1, state.halfLifeDays * 0.9);

  if (reviewDue && state.evidenceCount > 0) {
    return {
      questionType: 'RETRIEVAL',
      supportLevel: 'INDEPENDENT',
      isReviewItem: true,
      isTransferItem: false,
      isMixedItem: false,
      rationale: 'Review due from estimated forgetting curve',
    };
  }

  // Scale thresholds upward when evidence is sparse so the policy stays
  // conservative until enough signals have been collected.
  const evidenceWeight = Math.min(1, state.evidenceCount / MIN_EVIDENCE_FOR_ADVANCED);
  const masteryThreshold = 0.45 + (1 - evidenceWeight) * 0.15; // 0.60 → 0.45 as evidence grows
  const transferThreshold = 0.45 + (1 - evidenceWeight) * 0.10; // 0.55 → 0.45 as evidence grows

  if (state.masteryProbability < masteryThreshold) {
    return {
      questionType: 'ROUTINE',
      supportLevel: state.confidence < 0.25 ? 'WORKED_EXAMPLE' : 'LIGHT_PROMPT',
      isReviewItem: false,
      isTransferItem: false,
      isMixedItem: false,
      rationale:
        state.evidenceCount < MIN_EVIDENCE_FOR_ADVANCED
          ? 'Insufficient evidence — building baseline before advancing'
          : 'Low mastery: reinforce core routine fluency first',
    };
  }

  if (state.retrievalStrength < 0.5) {
    return {
      questionType: 'RETRIEVAL',
      supportLevel: 'LIGHT_PROMPT',
      isReviewItem: false,
      isTransferItem: false,
      isMixedItem: false,
      rationale: 'Mastery emerging but retrieval is fragile',
    };
  }

  if (state.transferAbility < transferThreshold) {
    return {
      questionType: 'TRANSFER',
      supportLevel: 'INDEPENDENT',
      isReviewItem: false,
      isTransferItem: true,
      isMixedItem: false,
      rationale: 'Retrieval stable: challenge transfer to novel contexts',
    };
  }

  if (state.masteryProbability >= 0.8 && state.retrievalStrength >= 0.75 && state.transferAbility >= 0.7) {
    return {
      questionType: 'MIXED',
      supportLevel: 'INDEPENDENT',
      isReviewItem: false,
      isTransferItem: true,
      isMixedItem: true,
      rationale: 'Strong all-round state: maintain with mixed challenge',
    };
  }

  return {
    questionType: 'APPLICATION',
    supportLevel: 'INDEPENDENT',
    isReviewItem: false,
    isTransferItem: true,
    isMixedItem: false,
    rationale: 'Consolidate by applying the skill in varied forms',
  };
}
