import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('grantFor (default reward table)', () => {
  it('returns correct xp and tokens for skill_to_secure', async () => {
    const { grantFor } = await import('@/features/gamification/rewardEconomy');
    const grant = grantFor('skill_to_secure');
    expect(grant.event).toBe('skill_to_secure');
    expect(grant.xp).toBe(60);
    expect(grant.tokens).toBe(2);
    expect(grant.reason).toBeTruthy();
  });

  it('returns correct values for weekly_target_hit', async () => {
    const { grantFor } = await import('@/features/gamification/rewardEconomy');
    const grant = grantFor('weekly_target_hit');
    expect(grant.xp).toBe(80);
    expect(grant.tokens).toBe(3);
  });

  it('returns correct values for diagnostic_item_incorrect', async () => {
    const { grantFor } = await import('@/features/gamification/rewardEconomy');
    const grant = grantFor('diagnostic_item_incorrect');
    expect(grant.xp).toBe(2);
    expect(grant.tokens).toBe(0);
  });

  it('returns correct values for skill_to_developing', async () => {
    const { grantFor } = await import('@/features/gamification/rewardEconomy');
    const grant = grantFor('skill_to_developing');
    expect(grant.xp).toBe(30);
    expect(grant.tokens).toBe(1);
  });
});

describe('buildRewardTable with env overrides', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses all defaults when no env var set', async () => {
    vi.stubEnv('REWARD_TABLE_JSON', '');
    const { REWARD_TABLE } = await import('@/features/gamification/rewardEconomy');
    expect(REWARD_TABLE.skill_to_secure.xp).toBe(60);
    expect(REWARD_TABLE.skill_to_secure.tokens).toBe(2);
    expect(REWARD_TABLE.route_completed.xp).toBe(20);
    vi.unstubAllEnvs();
  });

  it('applies a valid partial override', async () => {
    vi.stubEnv('REWARD_TABLE_JSON', JSON.stringify({ skill_to_secure: { xp: 100, tokens: 5, reason: 'custom' } }));
    const { REWARD_TABLE } = await import('@/features/gamification/rewardEconomy');
    expect(REWARD_TABLE.skill_to_secure.xp).toBe(100);
    expect(REWARD_TABLE.skill_to_secure.tokens).toBe(5);
    // Other keys unchanged
    expect(REWARD_TABLE.route_completed.xp).toBe(20);
    vi.unstubAllEnvs();
  });

  it('ignores an override entry with wrong type (xp as string)', async () => {
    vi.stubEnv('REWARD_TABLE_JSON', JSON.stringify({ skill_to_secure: { xp: 'lots', tokens: 5, reason: 'bad' } }));
    const { REWARD_TABLE } = await import('@/features/gamification/rewardEconomy');
    expect(REWARD_TABLE.skill_to_secure.xp).toBe(60);
    vi.unstubAllEnvs();
  });

  it('falls back to all defaults when JSON is malformed', async () => {
    vi.stubEnv('REWARD_TABLE_JSON', 'not-valid-json{{{');
    const { REWARD_TABLE } = await import('@/features/gamification/rewardEconomy');
    expect(REWARD_TABLE.skill_to_secure.xp).toBe(60);
    expect(REWARD_TABLE.weekly_target_hit.xp).toBe(80);
    vi.unstubAllEnvs();
  });

  it('ignores an unrecognized key in the override', async () => {
    vi.stubEnv('REWARD_TABLE_JSON', JSON.stringify({ unknown_event: { xp: 999, tokens: 99, reason: 'x' } }));
    const { REWARD_TABLE } = await import('@/features/gamification/rewardEconomy');
    // Known keys unchanged
    expect(REWARD_TABLE.skill_to_secure.xp).toBe(60);
    vi.unstubAllEnvs();
  });
});
