import { describe, expect, it } from 'vitest';
import { getInterventionSuggestions } from '@/features/reteach/studentReteach';

describe('getInterventionSuggestions', () => {
  it('returns prerequisite-oriented actions for repeated failed loops', () => {
    const suggestions = getInterventionSuggestions('repeated_failed_loops');
    expect(suggestions.map((s) => s.code)).toContain('RUN_WORKED_EXAMPLE_1TO1');
    expect(suggestions.map((s) => s.code)).toContain('CHECK_FOUNDATION_PREREQUISITE');
  });

  it('returns scaffold-fading actions for dependence pattern', () => {
    const suggestions = getInterventionSuggestions('high_hint_dependence_without_recovery');
    expect(suggestions.map((s) => s.code)).toContain('REDUCE_SCAFFOLD_GRADUALLY');
  });

  it('returns safe default action for neutral reasons', () => {
    const suggestions = getInterventionSuggestions('recovering_keep_looping');
    expect(suggestions[0]?.code).toBe('ASSIGN_SHORT_RETRIEVAL_SET');
  });
});
