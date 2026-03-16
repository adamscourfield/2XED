import { describe, it, expect } from 'vitest';
import { AnimationSchemaValidator } from '@/lib/validators/animation-schema';

describe('AnimationSchemaValidator', () => {
  const validSchema = {
    schemaVersion: '1.0.0',
    skillCode: 'N1.1',
    skillName: 'Place value',
    routeType: 'A' as const,
    routeLabel: 'Route A: Standard misconception',
    misconceptionSummary: 'Student confuses tens and units',
    generatedAt: '2025-01-01T00:00:00Z',
    steps: [
      {
        stepIndex: 0,
        id: 'n1-1-a-step-0',
        visuals: [
          {
            type: 'show_expression' as const,
            expression: '23 = 20 + 3',
            parts: [
              { text: '23', id: 'whole', highlight: 'accent' as const },
              { text: '=', id: 'eq', highlight: null },
              { text: '20 + 3', id: 'expanded', highlight: 'blue' as const },
            ],
          },
        ],
        narration: 'Twenty-three can be split into twenty and three.',
        audioFile: null,
      },
    ],
    misconceptionStrip: {
      text: 'Students confuse tens and units',
      audioNarration: 'Students confuse tens and units',
    },
    loopable: false,
    pauseAtEndMs: 2000,
  };

  it('validates a correct animation schema', () => {
    const result = AnimationSchemaValidator.safeParse(validSchema);
    expect(result.success).toBe(true);
  });

  it('validates schema with multiple step types', () => {
    const multiStepSchema = {
      ...validSchema,
      steps: [
        validSchema.steps[0],
        {
          stepIndex: 1,
          id: 'n1-1-a-step-1',
          visuals: [
            {
              type: 'rule_callout' as const,
              ruleText: 'In a two-digit number, the left digit shows tens',
              subText: 'The right digit shows ones',
            },
          ],
          narration: 'Remember: the left digit is tens, the right digit is ones.',
          audioFile: null,
        },
        {
          stepIndex: 2,
          id: 'n1-1-a-step-2',
          visuals: [
            {
              type: 'result_reveal' as const,
              expression: '23 = 20 + 3',
              label: 'Place value breakdown',
            },
          ],
          narration: 'So twenty-three equals twenty plus three.',
          audioFile: null,
        },
      ],
    };
    const result = AnimationSchemaValidator.safeParse(multiStepSchema);
    expect(result.success).toBe(true);
  });

  it('validates schema with number_line visual', () => {
    const withNumberLine = {
      ...validSchema,
      steps: [
        {
          stepIndex: 0,
          id: 'step-nl',
          visuals: [
            {
              type: 'number_line' as const,
              range: [0, 10] as [number, number],
              highlightStart: 3,
              arrowFrom: 3,
              arrowTo: 7,
            },
          ],
          narration: 'Start at 3 and count forward to 7.',
          audioFile: null,
        },
      ],
    };
    const result = AnimationSchemaValidator.safeParse(withNumberLine);
    expect(result.success).toBe(true);
  });

  it('validates schema with area_model visual', () => {
    const withAreaModel = {
      ...validSchema,
      steps: [
        {
          stepIndex: 0,
          id: 'step-am',
          visuals: [
            {
              type: 'area_model' as const,
              rows: 3,
              cols: 4,
              highlightRows: [0, 1],
              label: '3 × 4 = 12',
            },
          ],
          narration: 'We can see 3 rows of 4.',
          audioFile: null,
        },
      ],
    };
    const result = AnimationSchemaValidator.safeParse(withAreaModel);
    expect(result.success).toBe(true);
  });

  it('validates schema with fraction_bar visual', () => {
    const withFractionBar = {
      ...validSchema,
      steps: [
        {
          stepIndex: 0,
          id: 'step-fb',
          visuals: [
            {
              type: 'fraction_bar' as const,
              numerator: 3,
              denominator: 4,
              showDecimal: true,
              showPercent: true,
            },
          ],
          narration: 'Three quarters as a fraction.',
          audioFile: null,
        },
      ],
    };
    const result = AnimationSchemaValidator.safeParse(withFractionBar);
    expect(result.success).toBe(true);
  });

  it('rejects schema with empty steps', () => {
    const result = AnimationSchemaValidator.safeParse({
      ...validSchema,
      steps: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects schema with invalid routeType', () => {
    const result = AnimationSchemaValidator.safeParse({
      ...validSchema,
      routeType: 'Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects schema missing required fields', () => {
    const result = AnimationSchemaValidator.safeParse({
      schemaVersion: '1.0.0',
      skillCode: 'N1.1',
    });
    expect(result.success).toBe(false);
  });
});
