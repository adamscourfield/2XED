import { describe, expect, it } from 'vitest';
import { validateMathsVisual } from '@/lib/maths/visuals/guards';
import { resolveItemVisuals } from '@/features/learn/itemVisuals';

describe('resolveItemVisuals', () => {
  it('prefers explicit structured visuals from item options when present', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'Find the perimeter of this shape.',
        options: {
          visuals: [
            {
              type: 'shape',
              shape: 'rectangle',
              altText: 'Rectangle',
              vertices: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
              ],
            },
          ],
        },
      },
      'N2.11'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'shape',
      shape: 'rectangle',
      altText: 'Rectangle',
    });
  });

  it('builds a rectangle visual when a rectangle question has no stored spec', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'Find the perimeter of a rectangle with length 9 cm and width 4 cm.',
        options: {},
      },
      'N2.11'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'shape',
      shape: 'rectangle',
    });
    expect(validateMathsVisual(visuals[0])).toEqual([]);
  });

  it('builds a number line visual for number-line skills', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'Place -4, -1, 2 and 5 on the number line.',
        options: {},
      },
      'N1.13'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'number-line',
      min: -6,
      max: 7,
    });
  });

  it('builds a midpoint segment for N1.9 midpoint prompts', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'Calculate the midpoint of 20 and 30.',
        options: {},
      },
      'N1.9'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'number-line',
      markers: expect.arrayContaining([
        { value: 20, label: '20', kind: 'point' },
        { value: 30, label: '30', kind: 'point' },
        { value: 25, label: 'mid', kind: 'target' },
      ]),
    });
  });

  it('builds tick marks for missing-value-on-the-number-line sequences', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'What is the missing value on the number line? 10, 20, ___, 40, 50',
        options: {},
      },
      'N1.9'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'number-line',
      markers: expect.arrayContaining([
        expect.objectContaining({ value: 10 }),
        expect.objectContaining({ value: 20 }),
        expect.objectContaining({ value: 40 }),
        expect.objectContaining({ value: 50 }),
      ]),
    });
  });

  it('places P and Q for negative interval word problems', () => {
    const visuals = resolveItemVisuals(
      {
        question:
          'The difference between P and Q is 24 on a negative number line. If Q is at -12 and P is to the left of Q, what is P?',
        options: {},
      },
      'N1.13'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'number-line',
      markers: expect.arrayContaining([
        { value: -36, label: 'P', kind: 'point' },
        { value: -12, label: 'Q', kind: 'point' },
      ]),
    });
  });

  it('does not invent a number line for N1.10 rounding-only stems', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'Round 73 to the nearest 10.',
        options: {},
      },
      'N1.10'
    );

    expect(visuals).toHaveLength(0);
  });

  it('builds a jump number line for starts-at-and-jumps prompts', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'What addition is being shown if a number line starts at 10 and jumps on 6?',
        options: {},
      },
      'N2.1'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'number-line',
      markers: [{ value: 10 }, { value: 16 }],
      jumps: [{ from: 10, to: 16, label: '+6' }],
    });
  });

  it('builds irregular polygons as irregular shapes, not regular ones', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'Find the perimeter of an irregular polygon with side lengths 5 cm, 8 cm, 3 cm and 6 cm.',
        options: {},
      },
      'N2.9'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'shape',
      shape: 'irregular-polygon',
    });
    expect(visuals[0]).toMatchObject({
      vertices: expect.arrayContaining([
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      ]),
    });
    if (visuals[0].type === 'shape') {
      expect(visuals[0].vertices).toHaveLength(4);
      expect(visuals[0].edges).toHaveLength(4);
      expect(visuals[0].meta?.polygonSides).toBe(4);
    }
  });

  it('builds a column arithmetic visual for formal methods questions', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'Calculate 0.53 + 5.27 using column addition.',
        options: {},
      },
      'N2.5'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'arithmetic-layout',
      layout: 'column-addition',
      align: 'decimal',
    });
  });

  it('builds a compound-shape spec for compound perimeter items', () => {
    const visuals = resolveItemVisuals(
      {
        question:
          'A compound shape is made by joining two rectangles. The outside side lengths are 6 cm, 4 cm, 2 cm, 3 cm, 8 cm and 7 cm. What is its perimeter?',
        options: {},
      },
      'N2.13'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'shape',
      shape: 'compound-l-shape',
    });
  });

  it('renders regular 4-sided naming prompts as squares', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'A pupil says a regular 4-sided shape is called a rectangle. What is the correct name?',
        options: {},
      },
      'N2.10'
    );

    expect(visuals).toHaveLength(1);
    expect(visuals[0]).toMatchObject({
      type: 'shape',
      shape: 'square',
    });
  });

  describe('N4.1 fraction reading (question bank)', () => {
    it('builds a part–whole fraction bar from equal-parts stems', () => {
      const visuals = resolveItemVisuals(
        {
          question: 'A rectangle is divided into 10 equal parts. 7 parts are shaded. What fraction is shaded?',
          options: ['7/3', '10/7', '3/10', '7/10'],
        },
        'N4.1'
      );

      expect(visuals).toHaveLength(1);
      expect(visuals[0]).toMatchObject({ type: 'fraction-bar' });
      if (visuals[0].type === 'fraction-bar') {
        expect(visuals[0].bars[0]?.segments).toHaveLength(10);
        expect(visuals[0].bars[0]?.segments.filter((s) => s.shaded)).toHaveLength(7);
      }
      expect(validateMathsVisual(visuals[0])).toEqual([]);
    });

    it('builds a 0–1 number line with the nth mark after 0', () => {
      const visuals = resolveItemVisuals(
        {
          question:
            'A number line from 0 to 1 is split into 5 equal parts. A point is at the second mark after 0. What fraction does the point show?',
          options: ['1/5', '3/5', '2/5', '4/5'],
        },
        'N4.1'
      );

      expect(visuals).toHaveLength(1);
      expect(visuals[0]).toMatchObject({
        type: 'number-line',
        min: 0,
        max: 1,
        markers: [{ value: 0.4, label: '2/5', kind: 'target' }],
      });
      expect(validateMathsVisual(visuals[0])).toEqual([]);
    });

    it('does not invent a bogus fraction bar for “greater than 1/2” stems', () => {
      const visuals = resolveItemVisuals(
        {
          question: 'Which fraction is greater than 1/2?',
          options: ['1/4', '1/3', '3/8', '5/8'],
        },
        'N4.1'
      );

      expect(visuals).toHaveLength(0);
    });

    it('plots MCQ fractions on a unit interval for closest-to prompts', () => {
      const visuals = resolveItemVisuals(
        {
          question: 'Which of these fractions is closest to 0 on a number line between 0 and 1?',
          options: ['3/4', '1/2', '1/10', '2/3'],
        },
        'N4.1'
      );

      expect(visuals).toHaveLength(1);
      expect(visuals[0]).toMatchObject({ type: 'number-line', min: 0, max: 1 });
      if (visuals[0].type === 'number-line') {
        const target = visuals[0].markers.find((m) => m.kind === 'target');
        expect(target?.label).toBe('1/10');
      }
      expect(validateMathsVisual(visuals[0])).toEqual([]);
    });
  });
});
