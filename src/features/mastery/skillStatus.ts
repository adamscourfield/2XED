import { MASTERY_IMPROVING_THRESHOLD, isSkillStable } from './masteryService';

export type SkillStatus = 'NOT_YET' | 'DEVELOPING' | 'SECURE';

export function deriveSkillStatus(mastery: number, confirmedCount: number): SkillStatus {
  if (isSkillStable(mastery, confirmedCount)) return 'SECURE';
  if (mastery >= MASTERY_IMPROVING_THRESHOLD) return 'DEVELOPING';
  return 'NOT_YET';
}
