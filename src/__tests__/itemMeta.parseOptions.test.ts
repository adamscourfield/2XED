import { describe, expect, it } from 'vitest';
import { parseItemOptions } from '@/features/items/itemMeta';

describe('parseItemOptions malformed/missing options handling', () => {
  it('returns safe empty choices + default meta when options are missing', () => {
    const parsed = parseItemOptions(undefined);
    expect(parsed.choices).toEqual([]);
    expect(parsed.meta.questionRole).toBe('practice');
    expect(parsed.meta.strictnessLevel).toBe('normalized');
  });

  it('returns safe empty choices + default meta when options are malformed object', () => {
    const parsed = parseItemOptions({ broken: true });
    expect(parsed.choices).toEqual([]);
    expect(parsed.meta.questionRole).toBe('practice');
    expect(parsed.meta.route).toBeNull();
  });

  it('filters invalid choices and deduplicates safely', () => {
    const parsed = parseItemOptions({ choices: ['A', 'a', ' ', 'B', 42 as unknown as string] });
    expect(parsed.choices).toEqual(['A', 'B']);
  });
});
