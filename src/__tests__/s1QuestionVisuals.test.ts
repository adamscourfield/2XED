import { describe, expect, it } from 'vitest';
import { inferS1ProbabilityVisuals } from '@/features/learn/s1QuestionVisuals';

describe('inferS1ProbabilityVisuals', () => {
  it('S1.5 two dice → sample space grid of sums', () => {
    const q = 'Two fair dice are rolled. What is the probability of a sum of 7?';
    const v = inferS1ProbabilityVisuals(q, 'S1.5');
    expect(v[0]?.type).toBe('sample-space-grid');
    if (v[0]?.type === 'sample-space-grid') {
      expect(v[0].rowLabels).toHaveLength(6);
      expect(v[0].columnLabels).toHaveLength(6);
      expect(v[0].cells[0][0]).toBe('2');
      expect(v[0].cells[5][5]).toBe('12');
    }
  });

  it('S1.5 coin and die → ordered-pair grid', () => {
    const q = 'A coin is flipped and a die is rolled. What is the probability of getting heads and a 4?';
    const v = inferS1ProbabilityVisuals(q, 'S1.5');
    expect(v[0]?.type).toBe('sample-space-grid');
    if (v[0]?.type === 'sample-space-grid') {
      expect(v[0].cells[0][3]).toBe('(H,4)');
    }
  });

  it('S1.7 set A and B → Venn with regions', () => {
    const q = 'A = {1,2,3,4}, B = {3,4,5,6}. What goes in the intersection of a Venn diagram for A and B?';
    const v = inferS1ProbabilityVisuals(q, 'S1.7');
    const venn = v.find((x) => x.type === 'venn-two-set');
    expect(venn?.type).toBe('venn-two-set');
    if (venn?.type === 'venn-two-set') {
      expect(venn.intersection.sort()).toEqual(['3', '4']);
      expect(venn.aOnly.sort()).toEqual(['1', '2']);
      expect(venn.bOnly.sort()).toEqual(['5', '6']);
    }
  });

  it('S1.11 region counts → Venn with numeric counts', () => {
    const q = 'A Venn diagram has A only = 5, A ∩ B = 3, B only = 4, outside = 8. What is n(ξ)?';
    const v = inferS1ProbabilityVisuals(q, 'S1.11');
    const venn = v.find((x) => x.type === 'venn-two-set');
    expect(venn?.type).toBe('venn-two-set');
    if (venn?.type === 'venn-two-set') {
      expect(venn.counts).toEqual({ aOnly: 5, intersection: 3, bOnly: 4, outside: 8 });
    }
  });

  it('non-S1 skill → no probability visuals', () => {
    expect(inferS1ProbabilityVisuals('Two fair dice are rolled.', 'N3.1')).toEqual([]);
  });
});
