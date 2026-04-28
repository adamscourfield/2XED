import type { Prisma } from '@prisma/client';
import { inferItemPurpose } from '@/features/items/itemPurpose';
import { parseItemOptions } from '@/features/items/itemMeta';

export type LiveDifficultyBand = 'EASIER' | 'CORE' | 'CHALLENGE';
export type LiveItemPurposeTag = 'CHECK' | 'PRACTICE' | 'RETEACH' | 'CHALLENGE';
export type LiveSuitability = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LiveItemMetadata {
  version: 1;
  difficultyBand: LiveDifficultyBand;
  itemPurpose: LiveItemPurposeTag;
  liveSuitability: LiveSuitability;
  misconceptionTargets: string[];
  source?: 'AUTHORED' | 'AI_GENERATED' | 'BACKFILLED';
}

function dedupe(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function inferDifficultyBand(question: string, choiceCount: number, itemPurpose: LiveItemPurposeTag): LiveDifficultyBand {
  const len = question.trim().length;
  if (itemPurpose === 'CHALLENGE') return 'CHALLENGE';
  if (itemPurpose === 'RETEACH') return 'EASIER';
  if (len <= 60 && choiceCount <= 4) return 'EASIER';
  if (len >= 140 || choiceCount > 4) return 'CHALLENGE';
  return 'CORE';
}

function inferLivePurpose(input: { question: string; type?: string | null; options: unknown; answer: string }): LiveItemPurposeTag {
  const inferred = inferItemPurpose(input);
  if (inferred.purpose === 'RETEACH_SHADOW') return inferred.route === 'C' ? 'RETEACH' : 'PRACTICE';
  if (inferred.purpose === 'ONBOARDING') return 'CHECK';
  return 'PRACTICE';
}

function inferLiveSuitability(question: string, type: string | null | undefined, choiceCount: number): LiveSuitability {
  const len = question.trim().length;
  if ((type === 'MCQ' || type === 'TRUE_FALSE') && len <= 120 && choiceCount > 0 && choiceCount <= 4) return 'HIGH';
  if (len <= 180) return 'MEDIUM';
  return 'LOW';
}

export function extractMisconceptionTargets(misconceptionMap: unknown): string[] {
  if (!misconceptionMap || typeof misconceptionMap !== 'object') return [];
  return dedupe(Object.values(misconceptionMap as Record<string, string | null>));
}

export function inferLiveItemMetadata(input: {
  question: string;
  type?: string | null;
  options: unknown;
  answer: string;
  misconceptionMap?: unknown;
  source?: LiveItemMetadata['source'];
}): LiveItemMetadata {
  const parsed = parseItemOptions(input.options);
  const itemPurpose = inferLivePurpose(input);
  const difficultyBand = inferDifficultyBand(input.question, parsed.choices.length, itemPurpose);
  const liveSuitability = inferLiveSuitability(input.question, input.type, parsed.choices.length);

  return {
    version: 1,
    difficultyBand,
    itemPurpose,
    liveSuitability,
    misconceptionTargets: extractMisconceptionTargets(input.misconceptionMap),
    source: input.source,
  };
}

export function toPrismaJson(metadata: LiveItemMetadata): Prisma.InputJsonValue {
  return metadata as unknown as Prisma.InputJsonValue;
}
