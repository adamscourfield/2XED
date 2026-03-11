import { describe, expect, it } from 'vitest';
import { buildUnit1VisualBackfill } from '@/features/learn/unit1VisualBackfill';

describe('buildUnit1VisualBackfill', () => {
  it('generates a stored arithmetic visual for formal-method questions', () => {
    const result = buildUnit1VisualBackfill({
      question: 'Calculate 83 - 52 using column subtraction.',
      answer: '31',
      type: 'SHORT_NUMERIC',
      options: {},
      primarySkillCode: 'N2.6',
    });

    expect(result.status).toBe('generated');
    expect(result.visuals[0]).toMatchObject({
      type: 'arithmetic-layout',
      layout: 'column-subtraction',
    });
  });

  it('marks unresolved shape questions for manual review when no shape can be derived', () => {
    const result = buildUnit1VisualBackfill({
      question: 'Find the perimeter of the shape shown.',
      answer: '24 cm',
      type: 'SHORT_NUMERIC',
      options: {},
      primarySkillCode: 'N2.9',
    });

    expect(result.status).toBe('manual_review');
  });

  it('does not require a stored visual for non-visual word/figure conversion prompts', () => {
    const result = buildUnit1VisualBackfill({
      question: 'Write 293 in words.',
      answer: 'two hundred and ninety-three',
      type: 'SHORT_TEXT',
      options: {},
      primarySkillCode: 'N1.2',
    });

    expect(result.status).toBe('not_needed');
  });

  it('accepts exact arithmetic layouts even when the skill code is broader than the method itself', () => {
    const result = buildUnit1VisualBackfill({
      question: 'Calculate 45 + 32 using column addition.',
      answer: '77',
      type: 'SHORT_NUMERIC',
      options: {},
      primarySkillCode: 'N1.1',
    });

    expect(result.status).toBe('generated');
    expect(result.visuals[0]).toMatchObject({
      type: 'arithmetic-layout',
    });
  });
});
