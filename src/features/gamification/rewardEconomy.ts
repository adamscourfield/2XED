export type RewardEventName =
  | 'diagnostic_item_correct'
  | 'diagnostic_item_incorrect'
  | 'shadow_item_correct'
  | 'route_completed'
  | 'skill_to_developing'
  | 'skill_to_secure'
  | 'retry_recovery'
  | 'streak_day_maintained'
  | 'weekly_target_hit';

export interface RewardGrant {
  event: RewardEventName;
  xp: number;
  tokens: number;
  reason: string;
}

export const REWARD_TABLE: Record<RewardEventName, { xp: number; tokens: number; reason: string }> = {
  diagnostic_item_correct: { xp: 5, tokens: 0, reason: 'Diagnostic item correct' },
  diagnostic_item_incorrect: { xp: 2, tokens: 0, reason: 'Diagnostic item attempted' },
  shadow_item_correct: { xp: 8, tokens: 0, reason: 'Shadow item correct' },
  route_completed: { xp: 20, tokens: 0, reason: 'Route completed' },
  skill_to_developing: { xp: 30, tokens: 1, reason: 'Skill moved to Developing' },
  skill_to_secure: { xp: 60, tokens: 2, reason: 'Skill moved to Secure' },
  retry_recovery: { xp: 25, tokens: 1, reason: 'Recovery after failed attempt' },
  streak_day_maintained: { xp: 15, tokens: 0, reason: 'Daily streak maintained' },
  weekly_target_hit: { xp: 80, tokens: 3, reason: 'Weekly target achieved' },
};

export function grantFor(event: RewardEventName): RewardGrant {
  const row = REWARD_TABLE[event];
  return { event, xp: row.xp, tokens: row.tokens, reason: row.reason };
}
