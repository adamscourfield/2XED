import { describe, expect, it } from 'vitest';
import { nextFallbackRoute, selectN11Route } from '@/features/diagnostic/n11RouteLogic';

describe('N1.1 route logic', () => {
  it('routes m1/m2 to C', () => {
    expect(selectN11Route({ misconceptionTags: ['m1'] })).toBe('C');
    expect(selectN11Route({ misconceptionTags: ['m2'] })).toBe('C');
  });

  it('routes m3/m4 to B', () => {
    expect(selectN11Route({ misconceptionTags: ['m3'] })).toBe('B');
    expect(selectN11Route({ misconceptionTags: ['m4'] })).toBe('B');
  });

  it('routes mixed signals to A', () => {
    expect(selectN11Route({ misconceptionTags: ['m1', 'm3'] })).toBe('A');
  });

  it('routes unclear signals to A', () => {
    expect(selectN11Route({ misconceptionTags: [] })).toBe('A');
    expect(selectN11Route({ misconceptionTags: ['unknown'] })).toBe('A');
  });

  it('uses fallback chain A -> B -> C -> intervention', () => {
    expect(nextFallbackRoute('A')).toBe('B');
    expect(nextFallbackRoute('B')).toBe('C');
    expect(nextFallbackRoute('C')).toBe('INTERVENTION');
  });
});
