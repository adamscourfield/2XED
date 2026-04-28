import type { LiveItemMetadata } from '@/lib/live/liveItemMetadata';

export type LiveItemIntent = 'CHECK' | 'PRACTICE_EASIER' | 'PRACTICE_SIMILAR' | 'PRACTICE_CHALLENGE' | 'PRACTICE_MISCONCEPTION';

export type LiveItemAudience = 'all' | 'lane' | 'individual';

export interface LiveSelectableItem {
  id: string;
  question: string;
  type: string;
  options: unknown;
  misconceptionMap?: unknown;
  liveMetadata?: LiveItemMetadata | null;
  skillId: string;
}

export interface LiveItemRejectedAlternative {
  itemId: string;
  score: number;
  reason: string;
}

export interface LiveItemSelectionResult {
  item: LiveSelectableItem | null;
  score: number;
  selectionReason: string;
  rejectedAlternatives: LiveItemRejectedAlternative[];
  candidateCount: number;
  generated: boolean;
}
