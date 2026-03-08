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

type RewardRow = { xp: number; tokens: number; reason: string };

type RewardTable = Record<RewardEventName, RewardRow>;

const DEFAULT_REWARD_TABLE: RewardTable = {
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

function readRewardConfigOverride(): Partial<RewardTable> | null {
  const raw = process.env.REWARD_TABLE_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RewardTable>;
    return parsed;
  } catch {
    return null;
  }
}

function buildRewardTable(): RewardTable {
  const override = readRewardConfigOverride();
  if (!override) return DEFAULT_REWARD_TABLE;

  const merged = { ...DEFAULT_REWARD_TABLE };
  for (const key of Object.keys(DEFAULT_REWARD_TABLE) as RewardEventName[]) {
    const maybe = override[key];
    if (!maybe) continue;
    if (typeof maybe.xp !== 'number' || typeof maybe.tokens !== 'number' || typeof maybe.reason !== 'string') {
      continue;
    }
    merged[key] = maybe;
  }
  return merged;
}

export const REWARD_TABLE = buildRewardTable();

export function grantFor(event: RewardEventName): RewardGrant {
  const row = REWARD_TABLE[event];
  return { event, xp: row.xp, tokens: row.tokens, reason: row.reason };
}
