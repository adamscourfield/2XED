import { prisma } from '@/db/prisma';
import { ensureItemPool } from '@/lib/ai/questionGenerator';
import type {
  LiveItemAudience,
  LiveItemIntent,
  LiveItemSelectionResult,
  LiveSelectableItem,
} from '@/lib/live/liveItemTypes';
import type { LiveItemMetadata } from '@/lib/live/liveItemMetadata';

export interface StudentAssignment {
  studentUserId: string;
  selection: LiveItemSelectionResult;
}

interface BatchSelectParams {
  sessionId: string;
  subjectId: string;
  skillId: string;
  intent: LiveItemIntent;
  /** Ordered list of student IDs to assign items to. */
  studentIds: string[];
  /** Per-student misconception ID to target. Falls back to null if absent. */
  studentMisconceptionIds?: Map<string, string | null>;
}

interface SelectLiveItemParams {
  sessionId: string;
  subjectId: string;
  skillId: string;
  intent: LiveItemIntent;
  audience: LiveItemAudience;
  targetStudentIds?: string[];
  misconceptionId?: string | null;
  excludeItemIds?: string[];
}

interface ScoredItem {
  item: LiveSelectableItem;
  score: number;
  reasons: string[];
}

const MIN_POOL_SIZE = 6;
const GENERATE_COUNT = 5;

function stemLengthBand(question: string): 'short' | 'medium' | 'long' {
  const len = question.trim().length;
  if (len <= 60) return 'short';
  if (len <= 140) return 'medium';
  return 'long';
}

function metadataSuitabilityScore(metadata: LiveItemMetadata | null | undefined): number {
  if (!metadata) return 0;
  if (metadata.liveSuitability === 'HIGH') return 18;
  if (metadata.liveSuitability === 'MEDIUM') return 8;
  return -10;
}

function scoreItem(params: {
  item: LiveSelectableItem;
  intent: LiveItemIntent;
  attemptCount: number;
  misconceptionId?: string | null;
}): ScoredItem {
  const { item, intent, attemptCount, misconceptionId } = params;
  const reasons: string[] = [];
  let score = 0;

  score += 40;
  reasons.push('exact skill match');

  const metadata = item.liveMetadata ?? null;
  const hasTaggedMisconceptions = Boolean(item.misconceptionMap && typeof item.misconceptionMap === 'object');
  const taggedIds = metadata?.misconceptionTargets?.length
    ? metadata.misconceptionTargets
    : hasTaggedMisconceptions
      ? Array.from(new Set(Object.values(item.misconceptionMap as Record<string, string | null>).filter(Boolean)))
      : [];

  score -= attemptCount * 8;
  if (attemptCount === 0) {
    score += 16;
    reasons.push('unseen by target group');
  } else {
    reasons.push(`seen ${attemptCount} time${attemptCount === 1 ? '' : 's'} by target group`);
  }

  const lengthBand = stemLengthBand(item.question);
  score += metadataSuitabilityScore(metadata);
  if (metadata?.liveSuitability) reasons.push(`live suitability ${metadata.liveSuitability.toLowerCase()}`);

  if (intent === 'CHECK') {
    if (metadata?.itemPurpose === 'CHECK') {
      score += 22;
      reasons.push('metadata marks item as check-ready');
    } else if (lengthBand === 'short') {
      score += 18;
      reasons.push('short live-friendly check stem');
    } else if (lengthBand === 'medium') {
      score += 10;
      reasons.push('acceptable live check length');
    } else {
      score -= 6;
      reasons.push('longer stem for whole-class check');
    }
  }

  if (intent === 'PRACTICE_EASIER') {
    if (metadata?.difficultyBand === 'EASIER') {
      score += 24;
      reasons.push('metadata marks item as easier');
    } else if (lengthBand === 'short') {
      score += 20;
      reasons.push('shorter stem used as easier proxy');
    } else if (lengthBand === 'medium') {
      score += 8;
      reasons.push('moderate complexity');
    } else {
      score -= 10;
      reasons.push('longer stem penalised for easier practice');
    }
  }

  if (intent === 'PRACTICE_CHALLENGE') {
    if (metadata?.difficultyBand === 'CHALLENGE' || metadata?.itemPurpose === 'CHALLENGE') {
      score += 24;
      reasons.push('metadata marks item as challenge');
    } else if (lengthBand === 'long') {
      score += 18;
      reasons.push('longer stem used as challenge proxy');
    } else if (lengthBand === 'medium') {
      score += 8;
      reasons.push('moderate challenge candidate');
    } else {
      score -= 8;
      reasons.push('short stem penalised for challenge');
    }
  }

  if (intent === 'PRACTICE_SIMILAR') {
    if (metadata?.itemPurpose === 'PRACTICE') {
      score += 14;
      reasons.push('metadata marks item as standard practice');
    } else {
      score += 10;
      reasons.push('same-skill practice candidate');
    }
  }

  if (intent === 'PRACTICE_MISCONCEPTION') {
    if (misconceptionId && taggedIds.includes(misconceptionId)) {
      score += 28;
      reasons.push('targets requested misconception');
    } else if (metadata?.itemPurpose === 'RETEACH') {
      score += 16;
      reasons.push('metadata marks item as reteach');
    } else if (hasTaggedMisconceptions) {
      score += 14;
      reasons.push('has misconception-tagged distractors');
    } else {
      score -= 12;
      reasons.push('no misconception tagging available');
    }
  } else if (hasTaggedMisconceptions) {
    score += 4;
    reasons.push('has misconception-tagged distractors');
  }

  // MCQ speeds up live dispatch, but for challenge/misconception work extended
  // responses are pedagogically preferable — suppress the bonus there.
  if (item.type === 'MCQ' && intent !== 'PRACTICE_CHALLENGE') {
    score += 8;
    reasons.push('MCQ is fast for live dispatch');
  }

  return { item, score, reasons };
}

function toSelectionResult(scored: ScoredItem[], generated: boolean): LiveItemSelectionResult {
  const winner = scored[0];
  if (!winner) {
    return {
      item: null,
      score: 0,
      selectionReason: 'No suitable live item found.',
      rejectedAlternatives: [],
      candidateCount: 0,
      generated,
    };
  }

  return {
    item: winner.item,
    score: winner.score,
    selectionReason: winner.reasons.join('; '),
    rejectedAlternatives: scored.slice(1, 4).map((entry) => ({
      itemId: entry.item.id,
      score: entry.score,
      reason: entry.reasons.join('; '),
    })),
    candidateCount: scored.length,
    generated,
  };
}

export async function selectLiveItem(params: SelectLiveItemParams): Promise<LiveItemSelectionResult> {
  const { sessionId, subjectId, skillId, intent, audience, targetStudentIds = [], misconceptionId, excludeItemIds = [] } = params;

  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { id: true, code: true },
  });
  if (!skill) {
    return {
      item: null,
      score: 0,
      selectionReason: 'Skill not found.',
      rejectedAlternatives: [],
      candidateCount: 0,
      generated: false,
    };
  }

  let generated = false;

  const poolCount = await prisma.item.count({
    where: {
      subjectId,
      skills: { some: { skillId } },
    },
  });

  if (poolCount < MIN_POOL_SIZE) {
    try {
      await ensureItemPool({ skillCode: skill.code, skillId: skill.id, minItems: MIN_POOL_SIZE, generateCount: GENERATE_COUNT });
      generated = true;
    } catch {
      // Keep going with current pool if generation fails.
    }
  }

  const items = await prisma.item.findMany({
    where: {
      subjectId,
      skills: { some: { skillId } },
      ...(excludeItemIds.length > 0 ? { id: { notIn: excludeItemIds } } : {}),
    },
    select: {
      id: true,
      question: true,
      type: true,
      options: true,
      misconceptionMap: true,
      liveMetadata: true,
      skills: { where: { skillId }, select: { skillId: true }, take: 1 },
    },
    take: 60,
  });

  const attemptCounts = targetStudentIds.length > 0
    ? await prisma.liveAttempt.groupBy({
        by: ['itemId'],
        where: {
          liveSessionId: sessionId,
          studentUserId: { in: targetStudentIds },
          skillId,
        },
        _count: { itemId: true },
      })
    : [];
  const attemptCountMap = new Map(attemptCounts.map((row) => [row.itemId, row._count.itemId]));

  const scored = items
    .map((item) => {
      const base = scoreItem({
        item: {
          id: item.id,
          question: item.question,
          type: item.type,
          options: item.options,
          misconceptionMap: item.misconceptionMap,
          liveMetadata: item.liveMetadata as LiveItemMetadata | null,
          skillId: item.skills[0]?.skillId ?? skillId,
        },
        intent,
        attemptCount: attemptCountMap.get(item.id) ?? 0,
        misconceptionId,
      });

      if (audience === 'individual' && (attemptCountMap.get(item.id) ?? 0) === 0) {
        base.score += 6;
        base.reasons.push('favoured for individual unseen dispatch');
      } else if (audience === 'all' && stemLengthBand(item.question) === 'short') {
        base.score += 4;
        base.reasons.push('favoured for whole-class pacing');
      }

      return base;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // For challenge intent, prefer longer stems on ties; prefer shorter otherwise.
      return intent === 'PRACTICE_CHALLENGE'
        ? b.item.question.length - a.item.question.length
        : a.item.question.length - b.item.question.length;
    });

  return toSelectionResult(scored, generated);
}

/**
 * Assigns one item per student in a single pass:
 *   1. Ensures item pool (once)
 *   2. Fetches up to 60 candidate items (once)
 *   3. Fetches all attempt counts for all students in one groupBy query (once)
 *   4. Scores items per student in memory and assigns greedily to avoid duplicates
 *
 * Replaces the N×3 selectLiveItem call loop used in individual practice dispatch.
 */
export async function batchSelectLiveItems(
  params: BatchSelectParams
): Promise<StudentAssignment[]> {
  const { sessionId, subjectId, skillId, intent, studentIds, studentMisconceptionIds } = params;
  if (studentIds.length === 0) return [];

  // 1. Ensure pool
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { id: true, code: true },
  });
  if (!skill) return [];

  let generated = false;
  const poolCount = await prisma.item.count({
    where: { subjectId, skills: { some: { skillId } } },
  });
  if (poolCount < MIN_POOL_SIZE) {
    try {
      await ensureItemPool({ skillCode: skill.code, skillId: skill.id, minItems: MIN_POOL_SIZE, generateCount: GENERATE_COUNT });
      generated = true;
    } catch { /* keep going with current pool */ }
  }

  // 2. Fetch candidate items once
  const rawItems = await prisma.item.findMany({
    where: { subjectId, skills: { some: { skillId } } },
    select: {
      id: true,
      question: true,
      type: true,
      options: true,
      misconceptionMap: true,
      liveMetadata: true,
      skills: { where: { skillId }, select: { skillId: true }, take: 1 },
    },
    take: 60,
  });

  const candidates: LiveSelectableItem[] = rawItems.map((item) => ({
    id: item.id,
    question: item.question,
    type: item.type,
    options: item.options,
    misconceptionMap: item.misconceptionMap,
    liveMetadata: item.liveMetadata as LiveItemMetadata | null,
    skillId: item.skills[0]?.skillId ?? skillId,
  }));

  // 3. Fetch all attempt counts for all students in one query
  const allAttemptRows = await prisma.liveAttempt.groupBy({
    by: ['studentUserId', 'itemId'],
    where: {
      liveSessionId: sessionId,
      studentUserId: { in: studentIds },
      skillId,
    },
    _count: { itemId: true },
  });

  // Build: studentId → Map<itemId, count>
  const studentAttemptMaps = new Map<string, Map<string, number>>();
  for (const row of allAttemptRows) {
    const m = studentAttemptMaps.get(row.studentUserId) ?? new Map<string, number>();
    m.set(row.itemId, row._count.itemId);
    studentAttemptMaps.set(row.studentUserId, m);
  }

  // 4. Greedily assign — each student gets the highest-scoring item not yet taken
  const usedItemIds = new Set<string>();
  const assignments: StudentAssignment[] = [];

  for (const studentUserId of studentIds) {
    const attemptMap = studentAttemptMaps.get(studentUserId) ?? new Map<string, number>();
    const misconceptionId = studentMisconceptionIds?.get(studentUserId) ?? null;

    // Score all candidates for this student
    const scored = candidates
      .map((item) => {
        const base = scoreItem({
          item,
          intent,
          attemptCount: attemptMap.get(item.id) ?? 0,
          misconceptionId,
        });
        // Individual-audience bonus for unseen items
        if ((attemptMap.get(item.id) ?? 0) === 0) {
          base.score += 6;
          base.reasons.push('favoured for individual unseen dispatch');
        }
        return base;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return intent === 'PRACTICE_CHALLENGE'
          ? b.item.question.length - a.item.question.length
          : a.item.question.length - b.item.question.length;
      });

    // Pick highest-scored item not already assigned to another student
    const pick = scored.find((s) => !usedItemIds.has(s.item.id)) ?? scored[0];
    if (!pick) continue;

    usedItemIds.add(pick.item.id);
    assignments.push({
      studentUserId,
      selection: toSelectionResult(scored, generated),
    });
  }

  return assignments;
}
