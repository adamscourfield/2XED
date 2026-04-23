import { describe, expect, it } from 'vitest';
import { inferDataVisualsForItem } from '@/features/learn/inferDataVisuals';
import { resolveItemVisuals } from '@/features/learn/itemVisuals';

describe('inferDataVisualsForItem', () => {
  it('builds a part–whole bar model from a bar-model stem', () => {
    const v = inferDataVisualsForItem(
      'The bar model shows a total of 15 split into 7 and 8. Which addition fact matches it?',
      'N2.1'
    );
    expect(v[0]).toMatchObject({ type: 'part-whole-bar-model', total: 15, parts: [{ value: 7 }, { value: 8 }] });
  });

  it('builds the Milton distance table for N2.14 distance context', () => {
    const v = inferDataVisualsForItem('Which towns are furthest apart in the first distance table?', 'N2.14');
    expect(v[0]?.type).toBe('data-table');
    if (v[0]?.type === 'data-table') {
      expect(v[0].columnHeaders[1]).toBe('Milton');
      expect(v[0].rows.length).toBe(5);
    }
  });

  it('does not attach a distance table to pure clock conversion N2.14 stems', () => {
    const v = inferDataVisualsForItem('Convert 1 hour 27 minutes into minutes.', 'N2.14');
    expect(v.filter((x) => x.type === 'data-table')).toHaveLength(0);
  });

  it('builds a frequency tree for the snow survey slide stem', () => {
    const stem =
      'A frequency tree shows 180 people surveyed about snow. 30 were late when it snowed. 22 were late when it did not snow. 31 were on time when it did not snow. How many people were surveyed on days when it did not snow?';
    const v = inferDataVisualsForItem(stem, 'N2.15');
    expect(v[0]?.type).toBe('frequency-tree');
  });
});

describe('resolveItemVisuals with data diagrams', () => {
  it('prepends bar model before shape when both apply', () => {
    const visuals = resolveItemVisuals(
      { question: 'The bar model shows a total of 12 split into 6 and 6. Which addition fact matches it?', options: {} },
      'N2.1'
    );
    expect(visuals[0]?.type).toBe('part-whole-bar-model');
  });
});
