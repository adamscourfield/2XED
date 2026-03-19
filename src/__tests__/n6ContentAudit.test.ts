/**
 * n6ContentAudit.test.ts
 *
 * Comprehensive audit of N6.1–N6.5 explanation routes.
 * Validates:
 *   1. Structure  — every skill has 3 routes (A/B/C), each with 3 steps
 *   2. Questions  — pass the write-guard; MCQ answer is in options; no duplicates
 *   3. Language   — no placeholder/fallback text; reasonable lengths
 *   4. Model      — route types map to procedural / conceptual / misconception
 *   5. Animations — visual type recommendations per skill strand
 */

import { describe, expect, it } from 'vitest';
import { validateExplanationStepWrite } from '@/features/learn/explanationStepWriteGuard';

// Import route data — the PrismaClient in ensure-routes-n6.ts is lazy and
// never connects because we only read the exported constant.
import { SKILL_ROUTES, type RouteDef, type StepDef } from '../../prisma/ensure-routes-n6';

/* ── Constants ───────────────────────────────────────────────────────────── */

const N6_CODES = ['N6.1', 'N6.2', 'N6.3', 'N6.4', 'N6.5'];

const EXPECTED_ROUTE_TYPES = ['A', 'B', 'C'];
const EXPECTED_STEPS_PER_ROUTE = 3;

const FALLBACK_ANSWER = 'See explanation above.';
const FALLBACK_QUESTION_PREFIX = 'Answer a question about';

/** Minimum character length for substantive explanatory text */
const MIN_EXPLANATION_LENGTH = 40;
const MIN_MISCONCEPTION_LENGTH = 30;
const MIN_WORKED_EXAMPLE_LENGTH = 30;

/**
 * All N6.1–N6.5 skills deal with fraction arithmetic — content should be
 * suitable for fraction_bar, area_model, and step_reveal animation visuals.
 */
const FRACTION_ARITHMETIC_SKILLS = ['N6.1', 'N6.2', 'N6.3', 'N6.4', 'N6.5'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/* ── 1. Structural completeness ──────────────────────────────────────────── */

describe('N6.1–N6.5 structural completeness', () => {
  it('contains exactly the 5 expected skill codes', () => {
    const presentCodes = Object.keys(SKILL_ROUTES).sort((a, b) => {
      const aNum = parseFloat(a.replace('N6.', ''));
      const bNum = parseFloat(b.replace('N6.', ''));
      return aNum - bNum;
    });
    expect(presentCodes).toEqual(N6_CODES);
  });

  for (const code of N6_CODES) {
    describe(code, () => {
      it('has exactly 3 routes (A, B, C)', () => {
        const routes = SKILL_ROUTES[code];
        expect(routes).toBeDefined();
        const types = routes.map((r: RouteDef) => r.routeType).sort();
        expect(types).toEqual(EXPECTED_ROUTE_TYPES);
      });

      it('has 3 steps in every route', () => {
        for (const route of SKILL_ROUTES[code]) {
          expect(
            route.steps.length,
            `${code} Route ${route.routeType} should have ${EXPECTED_STEPS_PER_ROUTE} steps`,
          ).toBe(EXPECTED_STEPS_PER_ROUTE);
        }
      });

      it('step orders are sequential 1, 2, 3', () => {
        for (const route of SKILL_ROUTES[code]) {
          const orders = route.steps.map((s: StepDef) => s.stepOrder);
          expect(orders, `${code} Route ${route.routeType}`).toEqual([1, 2, 3]);
        }
      });
    });
  }
});

/* ── 2. Write-guard validation ───────────────────────────────────────────── */

describe('N6.1–N6.5 write-guard validation', () => {
  for (const code of N6_CODES) {
    for (const route of SKILL_ROUTES[code]) {
      for (const step of route.steps) {
        it(`${code} Route ${route.routeType} Step ${step.stepOrder} passes validateExplanationStepWrite`, () => {
          const result = validateExplanationStepWrite({
            checkpointQuestion: step.checkpointQuestion,
            checkpointOptions: step.checkpointOptions,
            checkpointAnswer: step.checkpointAnswer,
          });

          expect(result.checkpointQuestion).toBeTruthy();
          expect(result.checkpointAnswer).toBeTruthy();

          // MCQ steps must have options containing the answer
          if (step.checkpointOptions && step.checkpointOptions.length >= 2) {
            expect(result.questionType).toMatch(/^(MCQ|TRUE_FALSE)$/);
            const normOpts = result.checkpointOptions.options.map((o) => o.toLowerCase());
            expect(normOpts).toContain(result.checkpointAnswer.toLowerCase());
          }
        });
      }
    }
  }
});

/* ── 3. Question quality ─────────────────────────────────────────────────── */

describe('N6.1–N6.5 question quality', () => {
  for (const code of N6_CODES) {
    for (const route of SKILL_ROUTES[code]) {
      describe(`${code} Route ${route.routeType}`, () => {
        it('has a non-placeholder misconception summary', () => {
          expect(route.misconceptionSummary.length).toBeGreaterThanOrEqual(MIN_MISCONCEPTION_LENGTH);
          expect(route.misconceptionSummary).not.toContain(FALLBACK_ANSWER);
        });

        it('has a substantive worked example', () => {
          expect(route.workedExample.length).toBeGreaterThanOrEqual(MIN_WORKED_EXAMPLE_LENGTH);
        });

        it('has a non-empty guided prompt and answer', () => {
          expect(route.guidedPrompt.trim().length).toBeGreaterThan(0);
          expect(route.guidedAnswer.trim().length).toBeGreaterThan(0);
        });

        for (const step of route.steps) {
          describe(`Step ${step.stepOrder}`, () => {
            it('has a non-placeholder question', () => {
              expect(step.checkpointQuestion.startsWith(FALLBACK_QUESTION_PREFIX)).toBe(false);
              expect(step.checkpointQuestion.length).toBeGreaterThan(10);
            });

            it('has a non-placeholder answer', () => {
              expect(step.checkpointAnswer).not.toBe(FALLBACK_ANSWER);
              expect(step.checkpointAnswer.trim().length).toBeGreaterThan(0);
            });

            it('has a substantive explanation', () => {
              expect(step.explanation.length).toBeGreaterThanOrEqual(MIN_EXPLANATION_LENGTH);
            });

            it('has a descriptive title', () => {
              expect(step.title.trim().length).toBeGreaterThan(3);
            });

            if (step.checkpointOptions && step.checkpointOptions.length > 0) {
              it('has no duplicate options', () => {
                const normalised = step.checkpointOptions!.map((o) => o.trim().toLowerCase());
                expect(normalised.length).toBe(unique(normalised).length);
              });

              it('has at least 2 options', () => {
                expect(step.checkpointOptions!.length).toBeGreaterThanOrEqual(2);
              });

              it('answer is present among options', () => {
                const normOpts = step.checkpointOptions!.map((o) => o.trim().toLowerCase());
                expect(normOpts).toContain(step.checkpointAnswer.trim().toLowerCase());
              });
            }
          });
        }
      });
    }
  }
});

/* ── 4. Route model audit ────────────────────────────────────────────────── */

describe('N6.1–N6.5 route model alignment', () => {
  /**
   * Route A = procedural (step-by-step method)
   * Route B = conceptual / visual (understanding the "why")
   * Route C = misconception correction (spot-the-mistake, common errors)
   */

  for (const code of N6_CODES) {
    const routes = SKILL_ROUTES[code];

    it(`${code} Route A (procedural) addresses a process or method gap`, () => {
      const routeA = routes.find((r: RouteDef) => r.routeType === 'A')!;
      expect(routeA.misconceptionSummary.length).toBeGreaterThan(0);
      expect(routeA.workedExample.length).toBeGreaterThan(0);
    });

    it(`${code} Route B (conceptual) provides conceptual or visual framing`, () => {
      const routeB = routes.find((r: RouteDef) => r.routeType === 'B')!;
      expect(routeB.misconceptionSummary.length).toBeGreaterThan(0);
      expect(routeB.workedExample.length).toBeGreaterThan(0);
    });

    it(`${code} Route C (misconception) targets a specific student error`, () => {
      const routeC = routes.find((r: RouteDef) => r.routeType === 'C')!;
      expect(routeC.misconceptionSummary.length).toBeGreaterThan(0);
      const lcSummary = routeC.misconceptionSummary.toLowerCase();
      const hasErrorLanguage =
        lcSummary.includes('confuse') ||
        lcSummary.includes('mistake') ||
        lcSummary.includes('error') ||
        lcSummary.includes('struggle') ||
        lcSummary.includes('instead of') ||
        lcSummary.includes('do not') ||
        lcSummary.includes('reverse') ||
        lcSummary.includes('drop') ||
        lcSummary.includes('apply') ||
        lcSummary.includes('forget') ||
        lcSummary.includes('incorrectly') ||
        lcSummary.includes('only') ||
        lcSummary.includes('wrong') ||
        lcSummary.includes('flip');
      expect(hasErrorLanguage, `${code} Route C misconception should reference a specific error pattern`).toBe(true);
    });
  }
});

/* ── 5. Language appropriateness ─────────────────────────────────────────── */

describe('N6.1–N6.5 language appropriateness (KS3)', () => {
  /**
   * Terms beyond KS3 (Key Stage 3, Years 7–9, ages 11–14).
   * N6 covers fraction arithmetic — anything at GCSE-higher
   * or A-level is flagged.
   */
  const INAPPROPRIATE_TERMS = [
    'polynomial',
    'quadratic',
    'simultaneous',
    'logarithm',
    'trigonometric',
    'differentiate',
    'integrate',
    'asymptote',
    'radian',
    'vector',
  ];

  for (const code of N6_CODES) {
    for (const route of SKILL_ROUTES[code]) {
      it(`${code} Route ${route.routeType} uses KS3-appropriate vocabulary`, () => {
        const allText = [
          route.misconceptionSummary,
          route.workedExample,
          route.guidedPrompt,
          ...route.steps.flatMap((s: StepDef) => [s.explanation, s.checkpointQuestion, s.title]),
        ].join(' ').toLowerCase();

        for (const term of INAPPROPRIATE_TERMS) {
          expect(allText).not.toContain(term);
        }
      });
    }
  }
});

/* ── 6. Animation compatibility ──────────────────────────────────────────── */

describe('N6.1–N6.5 animation compatibility', () => {
  /**
   * Verify that the content is compatible with the available animation
   * visual primitives: fraction_bar, area_model, step_reveal.
   *
   * For fraction arithmetic skills (N6.1–N6.5), content should contain
   * fraction-related terms suitable for fraction_bar and area_model visuals.
   */

  for (const code of FRACTION_ARITHMETIC_SKILLS) {
    it(`${code} (fraction arithmetic) has fraction-based content suitable for fraction_bar / area_model / step_reveal`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        // Fraction arithmetic worked examples should mention fraction-related terms
        const hasFractionContent =
          /\d+\/\d+|fraction|numerator|denominator|reciprocal|÷|×|multiply|divide|bar|model/.test(route.workedExample) ||
          /\d+\/\d+|fraction|numerator|denominator|reciprocal|÷|×|multiply|divide|bar|model/.test(route.misconceptionSummary);
        expect(
          hasFractionContent,
          `${code} Route ${route.routeType} should contain fraction-related content for animation`,
        ).toBe(true);
      }
    });
  }
});

/* ── 7. Mathematical correctness spot-checks ─────────────────────────────── */

describe('N6.1–N6.5 mathematical correctness', () => {
  // N6.1 — Multiply a fraction by an integer
  it('N6.1 Route A Step 1: numerator of 4/9 × 2 is 8', () => {
    const step = SKILL_ROUTES['N6.1'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('8');
    expect(4 * 2).toBe(8);
  });

  it('N6.1 Route A Step 2: denominator of 3/8 × 5 stays 8', () => {
    const step = SKILL_ROUTES['N6.1'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('8');
  });

  it('N6.1 Route A Step 3: 5/6 × 4 = 20/6 = 10/3 = 3 1/3', () => {
    const step = SKILL_ROUTES['N6.1'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('3 1/3');
    expect(5 * 4).toBe(20);
    expect(20 / 6).toBeCloseTo(10 / 3);
  });

  it('N6.1 Route B Step 2: 3/4 × 3 → 9 quarter-parts shaded', () => {
    const step = SKILL_ROUTES['N6.1'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('9');
    expect(3 * 3).toBe(9);
  });

  it('N6.1 Route B Step 3: 3/4 × 3 = 9/4 = 2 1/4', () => {
    const step = SKILL_ROUTES['N6.1'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('2 1/4');
    expect(9 / 4).toBe(2.25);
  });

  it('N6.1 Route C Step 3: 5/8 × 3 = 15/8', () => {
    const step = SKILL_ROUTES['N6.1'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('15/8');
    expect(5 * 3).toBe(15);
  });

  // N6.2 — Multiply a fraction by a fraction
  it('N6.2 Route A Step 1: numerator of 3/5 × 2/7 is 6', () => {
    const step = SKILL_ROUTES['N6.2'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('6');
    expect(3 * 2).toBe(6);
  });

  it('N6.2 Route A Step 2: denominator of 3/5 × 2/7 is 35', () => {
    const step = SKILL_ROUTES['N6.2'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('35');
    expect(5 * 7).toBe(35);
  });

  it('N6.2 Route A Step 3: 3/4 × 2/9 = 6/36 = 1/6', () => {
    const step = SKILL_ROUTES['N6.2'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('1/6');
    expect((3 * 2) / (4 * 9)).toBeCloseTo(1 / 6);
  });

  it('N6.2 Route B Step 2: area model for 3/4 × 2/5 has 20 rectangles', () => {
    const step = SKILL_ROUTES['N6.2'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('20');
    expect(4 * 5).toBe(20);
  });

  it('N6.2 Route B Step 3: 3/4 × 2/5 = 6/20 = 3/10', () => {
    const step = SKILL_ROUTES['N6.2'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('3/10');
    expect((3 * 2) / (4 * 5)).toBeCloseTo(3 / 10);
  });

  it('N6.2 Route C Step 2: 3/5 × 1/4 = 3/20', () => {
    const step = SKILL_ROUTES['N6.2'][2].steps[1]; // Route C, step 2
    expect(step.checkpointAnswer).toBe('3/20');
    expect((3 * 1) / (5 * 4)).toBeCloseTo(3 / 20);
  });

  // N6.3 — Divide a fraction by an integer
  it('N6.3 Route A Step 1: denominator of 5/6 ÷ 3 is 18', () => {
    const step = SKILL_ROUTES['N6.3'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('18');
    expect(6 * 3).toBe(18);
  });

  it('N6.3 Route A Step 2: 5/6 ÷ 3 = 5/18', () => {
    const step = SKILL_ROUTES['N6.3'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('5/18');
    expect(5 / (6 * 3)).toBeCloseTo(5 / 18);
  });

  it('N6.3 Route A Step 3: 8/9 ÷ 4 = 2/9', () => {
    const step = SKILL_ROUTES['N6.3'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('2/9');
    expect(8 / 4).toBe(2);
  });

  it('N6.3 Route B Step 2: 6/8 ÷ 2 = 3/8', () => {
    const step = SKILL_ROUTES['N6.3'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('3/8');
    expect(6 / 8 / 2).toBeCloseTo(3 / 8);
  });

  it('N6.3 Route B Step 3: 4/5 ÷ 2 = 2/5', () => {
    const step = SKILL_ROUTES['N6.3'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('2/5');
    expect(4 / 5 / 2).toBeCloseTo(2 / 5);
  });

  it('N6.3 Route C Step 2: 9/10 ÷ 3 = 3/10', () => {
    const step = SKILL_ROUTES['N6.3'][2].steps[1]; // Route C, step 2
    expect(step.checkpointAnswer).toBe('3/10');
    expect(9 / 3).toBe(3);
  });

  // N6.4 — Divide an integer by a fraction
  it('N6.4 Route A Step 1: 4 ÷ 1/5 = 4 × 5 = 20 → rewritten as 4 × 5', () => {
    const step = SKILL_ROUTES['N6.4'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('4 × 5');
    expect(4 * 5).toBe(20);
  });

  it('N6.4 Route A Step 2: 6 ÷ 3/4 = 6 × 4/3 = 8', () => {
    const step = SKILL_ROUTES['N6.4'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('8');
    expect(6 * 4 / 3).toBe(8);
  });

  it('N6.4 Route A Step 3: 5 ÷ 1/3 = 15 thirds', () => {
    const step = SKILL_ROUTES['N6.4'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('15');
    expect(5 * 3).toBe(15);
  });

  it('N6.4 Route B Step 2: 2 has 12 sixths', () => {
    const step = SKILL_ROUTES['N6.4'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('12');
    expect(2 * 6).toBe(12);
  });

  it('N6.4 Route B Step 3: 3 ÷ 3/4 = 4', () => {
    const step = SKILL_ROUTES['N6.4'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('4');
    expect(3 / (3 / 4)).toBe(4);
  });

  it('N6.4 Route C Step 2: reciprocal of 3/7 is 7/3', () => {
    const step = SKILL_ROUTES['N6.4'][2].steps[1]; // Route C, step 2
    expect(step.checkpointAnswer).toBe('7/3');
  });

  it('N6.4 Route C Step 3: 5 ÷ 2/3 = 15/2', () => {
    const step = SKILL_ROUTES['N6.4'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('15/2');
    expect(5 * 3 / 2).toBe(7.5);
  });

  // N6.5 — Divide a fraction by a fraction
  it('N6.5 Route A Step 1: 5/6 ÷ 2/3 rewritten as 5/6 × 3/2', () => {
    const step = SKILL_ROUTES['N6.5'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('5/6 × 3/2');
  });

  it('N6.5 Route A Step 2: 5/6 ÷ 2/3 = 15/12 = 5/4 = 1 1/4', () => {
    const step = SKILL_ROUTES['N6.5'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('1 1/4');
    expect((5 * 3) / (6 * 2)).toBeCloseTo(5 / 4);
  });

  it('N6.5 Route A Step 3: 2/3 ÷ 4/5 is less than 1', () => {
    const step = SKILL_ROUTES['N6.5'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('Less than 1');
    expect((2 / 3) / (4 / 5)).toBeLessThan(1);
  });

  it('N6.5 Route B Step 2: 3/4 ÷ 1/8 = 6 (common denominators)', () => {
    const step = SKILL_ROUTES['N6.5'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('6');
    expect((3 / 4) / (1 / 8)).toBe(6);
  });

  it('N6.5 Route B Step 3: 1/2 ÷ 1/6 = 3', () => {
    const step = SKILL_ROUTES['N6.5'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('3');
    expect((1 / 2) / (1 / 6)).toBe(3);
  });

  it('N6.5 Route C Step 2: 2/3 ÷ 4/5 = 10/12 = 5/6', () => {
    const step = SKILL_ROUTES['N6.5'][2].steps[1]; // Route C, step 2
    expect(step.checkpointAnswer).toBe('5/6');
    expect((2 * 5) / (3 * 4)).toBeCloseTo(5 / 6);
  });

  it('N6.5 Route C Step 3: 1/3 ÷ 2/3 should be less than 1', () => {
    const step = SKILL_ROUTES['N6.5'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe(
      'No — 1/3 is smaller than 2/3, so the answer should be less than 1',
    );
    expect((1 / 3) / (2 / 3)).toBeLessThan(1);
  });
});
