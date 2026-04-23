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

  it('builds an equal-parts bar model for N3.1 bar-model stems', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'A bar model shows a total of 20 split into 4 equal parts of 5. Write both multiplication facts.',
        options: {},
      },
      'N3.1'
    );

    expect(visuals[0]).toMatchObject({
      type: 'bar-model',
      total: 20,
      segments: [
        { value: 5, label: '5' },
        { value: 5, label: '5' },
        { value: 5, label: '5' },
        { value: 5, label: '5' },
      ],
    });
    expect(validateMathsVisual(visuals[0])).toEqual([]);
  });

  it('builds a bar model for N3.1 “groups of … making …” stems', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'A bar model shows 2 groups of 3 making 6. Write one multiplication fact.',
        options: {},
      },
      'N3.1'
    );

    expect(visuals[0]).toMatchObject({
      type: 'bar-model',
      total: 6,
      segments: [{ value: 3 }, { value: 3 }],
    });
    expect(validateMathsVisual(visuals[0])).toEqual([]);
  });

  it('builds a bar model for equal-sharing division stems', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'A total of 12 is shared into 4 equal groups. Write one division fact.',
        options: {},
      },
      'N3.1'
    );

    expect(visuals[0]).toMatchObject({
      type: 'bar-model',
      total: 12,
      segments: [{ value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }],
    });
  });

  it('builds a bar model for “shared into groups of” stems', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'A total of 18 is shared into groups of 6. Write one division fact.',
        options: {},
      },
      'N3.1'
    );

    expect(visuals[0]).toMatchObject({
      type: 'bar-model',
      total: 18,
      segments: [{ value: 6 }, { value: 6 }, { value: 6 }],
    });
  });

  it('matches “If a bar model shows …” wording', () => {
    const visuals = resolveItemVisuals(
      {
        question: 'If a bar model shows 63 as 9 equal parts of 7, write one division fact.',
        options: {},
      },
      'N3.1'
    );

    expect(visuals[0]).toMatchObject({
      type: 'bar-model',
      total: 63,
      segments: expect.arrayContaining([{ value: 7, label: '7' }]),
    });
    expect((visuals[0] as { segments: unknown[] }).segments).toHaveLength(9);
  });

  it('builds a bar model for N3.1 number-family missing-calculation stems', () => {
    const visuals = resolveItemVisuals(
      {
        question:
          'Which calculation is missing from this number family? 5 × 6 = 30, 6 × 5 = 30, 30 ÷ 5 = 6, ?',
        options: {},
      },
      'N3.1'
    );

    expect(visuals[0]).toMatchObject({
      type: 'bar-model',
      total: 30,
      segments: expect.arrayContaining([{ value: 6, label: '6' }]),
    });
    expect((visuals[0] as { segments: unknown[] }).segments).toHaveLength(5);
  });
});
