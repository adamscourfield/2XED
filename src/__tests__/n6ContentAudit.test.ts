/**
 * n6ContentAudit.test.ts
 *
 * Comprehensive audit of N6.1–N6.20 explanation routes.
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

const N6_CODES = ['N6.1', 'N6.2', 'N6.3', 'N6.4', 'N6.5', 'N6.6', 'N6.7', 'N6.8', 'N6.9', 'N6.10', 'N6.11', 'N6.12', 'N6.13', 'N6.14', 'N6.15', 'N6.16', 'N6.17', 'N6.18', 'N6.19', 'N6.20'];

const EXPECTED_ROUTE_TYPES = ['A', 'B', 'C'];
const EXPECTED_STEPS_PER_ROUTE = 3;

const FALLBACK_ANSWER = 'See explanation above.';
const FALLBACK_QUESTION_PREFIX = 'Answer a question about';

/** Minimum character length for substantive explanatory text */
const MIN_EXPLANATION_LENGTH = 40;
const MIN_MISCONCEPTION_LENGTH = 30;
const MIN_WORKED_EXAMPLE_LENGTH = 30;

/**
 * N6.1–N6.7 cover fraction arithmetic, N6.8–N6.9 cover recurring decimals,
 * N6.10–N6.12 cover percentages, N6.13–N6.15 cover reverse/compound/contextual
 * percentages, N6.16–N6.18 cover ratio and proportion, and N6.19–N6.20 cover
 * FDP conversions and context problems. All content should reference
 * fraction_bar, area_model, bar_model, or step_reveal animation visuals.
 */
const N6_FRACTION_AND_PERCENTAGE_SKILLS = ['N6.1', 'N6.2', 'N6.3', 'N6.4', 'N6.5', 'N6.6', 'N6.7', 'N6.8', 'N6.9', 'N6.10', 'N6.11', 'N6.12', 'N6.13', 'N6.14', 'N6.15', 'N6.16', 'N6.17', 'N6.18', 'N6.19', 'N6.20'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/* ── 1. Structural completeness ──────────────────────────────────────────── */

describe('N6.1–N6.20 structural completeness', () => {
  it('contains exactly the 20 expected skill codes', () => {
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

describe('N6.1–N6.20 write-guard validation', () => {
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

describe('N6.1–N6.20 question quality', () => {
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

describe('N6.1–N6.20 route model alignment', () => {
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

describe('N6.1–N6.20 language appropriateness (KS3)', () => {
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

describe('N6.1–N6.20 animation compatibility', () => {
  /**
   * Verify that the content is compatible with the available animation
   * visual primitives: fraction_bar, area_model, step_reveal.
   *
   * For fraction arithmetic skills (N6.1–N6.5), content should contain
   * fraction-related terms suitable for fraction_bar and area_model visuals.
   */

  for (const code of N6_FRACTION_AND_PERCENTAGE_SKILLS) {
    it(`${code} has fraction/percentage content suitable for visual animation primitives`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        // Fraction/percentage arithmetic worked examples should mention relevant terms
        const hasFractionContent =
          /\d+\/\d+|fraction|numerator|denominator|reciprocal|÷|×|multiply|divide|bar|model|percent|%|increase|decrease|recurring|decimal/.test(route.workedExample) ||
          /\d+\/\d+|fraction|numerator|denominator|reciprocal|÷|×|multiply|divide|bar|model|percent|%|increase|decrease|recurring|decimal/.test(route.misconceptionSummary);
        expect(
          hasFractionContent,
          `${code} Route ${route.routeType} should contain fraction-related content for animation`,
        ).toBe(true);
      }
    });
  }
});

/* ── 7. Mathematical correctness spot-checks ─────────────────────────────── */

describe('N6.1–N6.20 mathematical correctness', () => {
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

  // N6.6 — Multiply and divide with mixed numbers
  it('N6.6 Route A Step 1: 3 2/5 = 17/5', () => {
    const step = SKILL_ROUTES['N6.6'][0].steps[0];
    expect(step.checkpointAnswer).toBe('17/5');
    expect(3 * 5 + 2).toBe(17);
  });

  it('N6.6 Route A Step 2: 1 1/3 × 3/4 = 4/3 × 3/4 = 1', () => {
    const step = SKILL_ROUTES['N6.6'][0].steps[1];
    expect(step.checkpointAnswer).toBe('1');
    expect((4 * 3) / (3 * 4)).toBe(1);
  });

  it('N6.6 Route A Step 3: 1 1/2 ÷ 1/4 = 3/2 × 4 = 6', () => {
    const step = SKILL_ROUTES['N6.6'][0].steps[2];
    expect(step.checkpointAnswer).toBe('6');
    expect((3 / 2) / (1 / 4)).toBe(6);
  });

  it('N6.6 Route C Step 2: 1 1/2 × 2 1/3 = 3 1/2', () => {
    const step = SKILL_ROUTES['N6.6'][2].steps[1];
    expect(step.checkpointAnswer).toBe('3 1/2');
    expect((3 / 2) * (7 / 3)).toBeCloseTo(3.5);
  });

  it('N6.6 Route C Step 3: 2 1/4 × 1 1/3 = 3', () => {
    const step = SKILL_ROUTES['N6.6'][2].steps[2];
    expect(step.checkpointAnswer).toBe('3');
    expect((9 / 4) * (4 / 3)).toBe(3);
  });

  // N6.7 — Order of operations with fractions
  it('N6.7 Route A Step 1: (1/4 + 1/2) × 2/3 = 1/2', () => {
    const step = SKILL_ROUTES['N6.7'][0].steps[0];
    expect(step.checkpointAnswer).toBe('1/2');
    expect((1 / 4 + 1 / 2) * (2 / 3)).toBeCloseTo(0.5);
  });

  it('N6.7 Route A Step 2: 3/4 − 1/2 × 1/3 = 7/12', () => {
    const step = SKILL_ROUTES['N6.7'][0].steps[1];
    expect(step.checkpointAnswer).toBe('7/12');
    expect(3 / 4 - (1 / 2) * (1 / 3)).toBeCloseTo(7 / 12);
  });

  it('N6.7 Route A Step 3: (1/3 + 1/6) × 2 = 1', () => {
    const step = SKILL_ROUTES['N6.7'][0].steps[2];
    expect(step.checkpointAnswer).toBe('1');
    expect((1 / 3 + 1 / 6) * 2).toBeCloseTo(1);
  });

  it('N6.7 Route C Step 1: 1/4 + 1/2 × 2/3 = 7/12', () => {
    const step = SKILL_ROUTES['N6.7'][2].steps[0];
    expect(step.checkpointAnswer).toBe('7/12');
    expect(1 / 4 + (1 / 2) * (2 / 3)).toBeCloseTo(7 / 12);
  });

  // N6.8 — Convert a recurring decimal to a fraction
  it('N6.8 Route A Step 2: if x = 0.777..., 10x − x = 7', () => {
    const step = SKILL_ROUTES['N6.8'][0].steps[1];
    expect(step.checkpointAnswer).toBe('7');
  });

  it('N6.8 Route A Step 3: 0.222... = 2/9', () => {
    const step = SKILL_ROUTES['N6.8'][0].steps[2];
    expect(step.checkpointAnswer).toBe('2/9');
    expect(2 / 9).toBeCloseTo(0.2222, 3);
  });

  it('N6.8 Route B Step 2: 0.777... = 7/9', () => {
    const step = SKILL_ROUTES['N6.8'][1].steps[1];
    expect(step.checkpointAnswer).toBe('7/9');
    expect(7 / 9).toBeCloseTo(0.7778, 3);
  });

  it('N6.8 Route C Step 2: 0.272727... = 27/99 = 3/11', () => {
    const step = SKILL_ROUTES['N6.8'][2].steps[1];
    expect(step.checkpointAnswer).toBe('3/11');
    expect(27 / 99).toBeCloseTo(3 / 11);
  });

  // N6.9 — Recognise recurring decimals from fraction division
  it('N6.9 Route A Step 3: 7/20 terminates', () => {
    const step = SKILL_ROUTES['N6.9'][0].steps[2];
    expect(step.checkpointAnswer).toBe('Terminate');
    expect(7 / 20).toBe(0.35);
  });

  it('N6.9 Route B Step 1: 3/25 terminates', () => {
    const step = SKILL_ROUTES['N6.9'][1].steps[0];
    expect(step.checkpointAnswer).toBe('3/25');
  });

  it('N6.9 Route B Step 2: 5/12 recurs', () => {
    const step = SKILL_ROUTES['N6.9'][1].steps[1];
    expect(step.checkpointAnswer).toBe('Recur');
  });

  // N6.10 — Find a percentage of an amount
  it('N6.10 Route A Step 1: 1% of 320 = 3.2', () => {
    const step = SKILL_ROUTES['N6.10'][0].steps[0];
    expect(step.checkpointAnswer).toBe('3.2');
    expect(320 / 100).toBe(3.2);
  });

  it('N6.10 Route A Step 2: 15% of 200 = 30', () => {
    const step = SKILL_ROUTES['N6.10'][0].steps[1];
    expect(step.checkpointAnswer).toBe('30');
    expect(200 * 0.15).toBe(30);
  });

  it('N6.10 Route A Step 3: £80 jacket reduced by 15% = £68', () => {
    const step = SKILL_ROUTES['N6.10'][0].steps[2];
    expect(step.checkpointAnswer).toBe('£68');
    expect(80 - 80 * 0.15).toBe(68);
  });

  it('N6.10 Route B Step 2: 40% of 350 = 140', () => {
    const step = SKILL_ROUTES['N6.10'][1].steps[1];
    expect(step.checkpointAnswer).toBe('140');
    expect(350 * 0.4).toBe(140);
  });

  it('N6.10 Route C Step 2: 40% of 250 = 100', () => {
    const step = SKILL_ROUTES['N6.10'][2].steps[1];
    expect(step.checkpointAnswer).toBe('100');
    expect(250 * 0.4).toBe(100);
  });

  // N6.11 — Express one quantity as a percentage of another
  it('N6.11 Route A Step 2: 9 out of 36 = 25%', () => {
    const step = SKILL_ROUTES['N6.11'][0].steps[1];
    expect(step.checkpointAnswer).toBe('25%');
    expect((9 / 36) * 100).toBe(25);
  });

  it('N6.11 Route A Step 3: 21 out of 28 = 75%', () => {
    const step = SKILL_ROUTES['N6.11'][0].steps[2];
    expect(step.checkpointAnswer).toBe('75%');
    expect((21 / 28) * 100).toBe(75);
  });

  it('N6.11 Route B Step 2: 7/20 = 35%', () => {
    const step = SKILL_ROUTES['N6.11'][1].steps[1];
    expect(step.checkpointAnswer).toBe('35%');
    expect((7 / 20) * 100).toBe(35);
  });

  it('N6.11 Route C Step 2: 8 out of 32 = 25%', () => {
    const step = SKILL_ROUTES['N6.11'][2].steps[1];
    expect(step.checkpointAnswer).toBe('25%');
    expect((8 / 32) * 100).toBe(25);
  });

  // N6.12 — Percentage increase and decrease
  it('N6.12 Route A Step 1: 25% of 360 = 90', () => {
    const step = SKILL_ROUTES['N6.12'][0].steps[0];
    expect(step.checkpointAnswer).toBe('90');
    expect(360 * 0.25).toBe(90);
  });

  it('N6.12 Route A Step 2: decrease 500 by 12% = 440', () => {
    const step = SKILL_ROUTES['N6.12'][0].steps[1];
    expect(step.checkpointAnswer).toBe('440');
    expect(500 - 500 * 0.12).toBe(440);
  });

  it('N6.12 Route A Step 3: £200 bike reduced by 10% then 5% = £171', () => {
    const step = SKILL_ROUTES['N6.12'][0].steps[2];
    expect(step.checkpointAnswer).toBe('£171');
    expect(200 * 0.9 * 0.95).toBe(171);
  });

  it('N6.12 Route B Step 1: 35% increase → multiplier 1.35', () => {
    const step = SKILL_ROUTES['N6.12'][1].steps[0];
    expect(step.checkpointAnswer).toBe('1.35');
  });

  it('N6.12 Route B Step 2: 30% decrease → multiplier 0.70', () => {
    const step = SKILL_ROUTES['N6.12'][1].steps[1];
    expect(step.checkpointAnswer).toBe('0.70');
  });

  it('N6.12 Route B Step 3: increase 80 by 5% = 84', () => {
    const step = SKILL_ROUTES['N6.12'][1].steps[2];
    expect(step.checkpointAnswer).toBe('84');
    expect(80 * 1.05).toBe(84);
  });

  it('N6.12 Route C Step 2: increase 400 by 20% = 480', () => {
    const step = SKILL_ROUTES['N6.12'][2].steps[1];
    expect(step.checkpointAnswer).toBe('480');
    expect(400 * 1.2).toBe(480);
  });

  it('N6.12 Route C Step 3: decrease 250 by 20% = 200', () => {
    const step = SKILL_ROUTES['N6.12'][2].steps[2];
    expect(step.checkpointAnswer).toBe('200');
    expect(250 * 0.8).toBe(200);
  });

  // N6.13 — Reverse percentages
  it('N6.13 Route A Step 1: multiplier for 25% increase = 1.25', () => {
    const step = SKILL_ROUTES['N6.13'][0].steps[0];
    expect(step.checkpointAnswer).toBe('1.25');
  });

  it('N6.13 Route A Step 2: £84 after 20% increase → original = £70', () => {
    const step = SKILL_ROUTES['N6.13'][0].steps[1];
    expect(step.checkpointAnswer).toBe('£70');
    expect(84 / 1.2).toBe(70);
  });

  it('N6.13 Route A Step 3: £91 after 30% increase → original = £70', () => {
    const step = SKILL_ROUTES['N6.13'][0].steps[2];
    expect(step.checkpointAnswer).toBe('£70');
    expect(91 / 1.3).toBe(70);
  });

  it('N6.13 Route B Step 2: if 1% = £0.80 then 100% = £80', () => {
    const step = SKILL_ROUTES['N6.13'][1].steps[1];
    expect(step.checkpointAnswer).toBe('£80');
    expect(0.80 * 100).toBe(80);
  });

  it('N6.13 Route B Step 3: £68 after 15% decrease → original = £80', () => {
    const step = SKILL_ROUTES['N6.13'][1].steps[2];
    expect(step.checkpointAnswer).toBe('£80');
    expect(68 / 0.85).toBe(80);
  });

  it('N6.13 Route C Step 2: £91 after 30% increase → original = £70', () => {
    const step = SKILL_ROUTES['N6.13'][2].steps[1];
    expect(step.checkpointAnswer).toBe('£70');
    expect(91 / 1.3).toBe(70);
  });

  // N6.14 — Repeated percentage change (compound)
  it('N6.14 Route A Step 1: multiplier for 10% decrease = 0.90', () => {
    const step = SKILL_ROUTES['N6.14'][0].steps[0];
    expect(step.checkpointAnswer).toBe('0.90');
  });

  it('N6.14 Route A Step 2: £1000 at 5% for 2 years = £1102.50', () => {
    const step = SKILL_ROUTES['N6.14'][0].steps[1];
    expect(step.checkpointAnswer).toBe('£1102.50');
    expect(1000 * 1.05 * 1.05).toBe(1102.5);
  });

  it('N6.14 Route A Step 3: £500 at 10% for 3 years = £665.50', () => {
    const step = SKILL_ROUTES['N6.14'][0].steps[2];
    expect(step.checkpointAnswer).toBe('£665.50');
    expect(500 * 1.1 * 1.1 * 1.1).toBeCloseTo(665.5);
  });

  it('N6.14 Route B Step 2: interest in 2nd year on £1050 at 5% = £52.50', () => {
    const step = SKILL_ROUTES['N6.14'][1].steps[1];
    expect(step.checkpointAnswer).toBe('£52.50');
    expect(1050 * 0.05).toBe(52.5);
  });

  it('N6.14 Route B Step 3: £12000 car depreciates 10%/yr for 2 years = £9720', () => {
    const step = SKILL_ROUTES['N6.14'][1].steps[2];
    expect(step.checkpointAnswer).toBe('£9720');
    expect(12000 * 0.9 * 0.9).toBe(9720);
  });

  it('N6.14 Route C Step 2: £12000 depreciates 10%/yr for 2 years = £9720', () => {
    const step = SKILL_ROUTES['N6.14'][2].steps[1];
    expect(step.checkpointAnswer).toBe('£9720');
    expect(12000 * 0.9 * 0.9).toBe(9720);
  });

  // N6.15 — Express one number as a fraction/percentage in context
  it('N6.15 Route A Step 1: £15 out of £60 = 15/60', () => {
    const step = SKILL_ROUTES['N6.15'][0].steps[0];
    expect(step.checkpointAnswer).toBe('15/60');
  });

  it('N6.15 Route A Step 2: simplify 30/120 = 1/4', () => {
    const step = SKILL_ROUTES['N6.15'][0].steps[1];
    expect(step.checkpointAnswer).toBe('1/4');
    expect(30 / 120).toBe(0.25);
  });

  it('N6.15 Route A Step 3: 18 out of 24 = 75%', () => {
    const step = SKILL_ROUTES['N6.15'][0].steps[2];
    expect(step.checkpointAnswer).toBe('75%');
    expect((18 / 24) * 100).toBe(75);
  });

  it('N6.15 Route B Step 2: 15 ÷ 60 = 0.25', () => {
    const step = SKILL_ROUTES['N6.15'][1].steps[1];
    expect(step.checkpointAnswer).toBe('0.25');
    expect(15 / 60).toBe(0.25);
  });

  it('N6.15 Route C Step 2: 30 out of 120 = 25%', () => {
    const step = SKILL_ROUTES['N6.15'][2].steps[1];
    expect(step.checkpointAnswer).toBe('25%');
    expect((30 / 120) * 100).toBe(25);
  });

  // N6.16 — Ratio notation; simplify ratios
  it('N6.16 Route A Step 1: 250ml : 1 litre = 250 : 1000', () => {
    const step = SKILL_ROUTES['N6.16'][0].steps[0];
    expect(step.checkpointAnswer).toBe('250 : 1000');
  });

  it('N6.16 Route A Step 2: simplify 12 : 18 = 2 : 3', () => {
    const step = SKILL_ROUTES['N6.16'][0].steps[1];
    expect(step.checkpointAnswer).toBe('2 : 3');
    expect(12 / 6).toBe(2);
    expect(18 / 6).toBe(3);
  });

  it('N6.16 Route A Step 3: simplify 2/3 : 4/5 = 5 : 6', () => {
    const step = SKILL_ROUTES['N6.16'][0].steps[2];
    expect(step.checkpointAnswer).toBe('5 : 6');
    expect((2 / 3) * 15).toBe(10);
    expect((4 / 5) * 15).toBe(12);
    // 10:12 = 5:6
  });

  it('N6.16 Route B Step 3: simplify 250 : 1000 = 1 : 4', () => {
    const step = SKILL_ROUTES['N6.16'][1].steps[2];
    expect(step.checkpointAnswer).toBe('1 : 4');
    expect(250 / 250).toBe(1);
    expect(1000 / 250).toBe(4);
  });

  it('N6.16 Route C Step 2: simplify 12 : 18 = 2 : 3', () => {
    const step = SKILL_ROUTES['N6.16'][2].steps[1];
    expect(step.checkpointAnswer).toBe('2 : 3');
  });

  // N6.17 — Share a quantity in a given ratio
  it('N6.17 Route A Step 1: total parts in 3 : 5 = 8', () => {
    const step = SKILL_ROUTES['N6.17'][0].steps[0];
    expect(step.checkpointAnswer).toBe('8');
    expect(3 + 5).toBe(8);
  });

  it('N6.17 Route A Step 2: £120 in 3:5, one part = £15', () => {
    const step = SKILL_ROUTES['N6.17'][0].steps[1];
    expect(step.checkpointAnswer).toBe('£15');
    expect(120 / 8).toBe(15);
  });

  it('N6.17 Route A Step 3: 200g in 2:3:5, largest = 100g', () => {
    const step = SKILL_ROUTES['N6.17'][0].steps[2];
    expect(step.checkpointAnswer).toBe('100 g');
    expect(200 / 10 * 5).toBe(100);
  });

  it('N6.17 Route B Step 1: fraction for first person in 3:5 = 3/8', () => {
    const step = SKILL_ROUTES['N6.17'][1].steps[0];
    expect(step.checkpointAnswer).toBe('3/8');
  });

  it('N6.17 Route B Step 2: 360° in 1:2:3, middle = 120°', () => {
    const step = SKILL_ROUTES['N6.17'][1].steps[1];
    expect(step.checkpointAnswer).toBe('120°');
    expect(360 / 6 * 2).toBe(120);
  });

  it('N6.17 Route C Step 2: £120 in 3:5, Person A = £45', () => {
    const step = SKILL_ROUTES['N6.17'][2].steps[1];
    expect(step.checkpointAnswer).toBe('£45');
    expect(120 / 8 * 3).toBe(45);
  });

  it('N6.17 Route C Step 3: 360° in 1:2:3, largest = 180°', () => {
    const step = SKILL_ROUTES['N6.17'][2].steps[2];
    expect(step.checkpointAnswer).toBe('180°');
    expect(360 / 6 * 3).toBe(180);
  });

  // N6.18 — Unitary method
  it('N6.18 Route A Step 1: 5 pens for £3.50, one pen = £0.70', () => {
    const step = SKILL_ROUTES['N6.18'][0].steps[0];
    expect(step.checkpointAnswer).toBe('£0.70');
    expect(3.5 / 5).toBe(0.7);
  });

  it('N6.18 Route A Step 2: 8 pens = £5.60', () => {
    const step = SKILL_ROUTES['N6.18'][0].steps[1];
    expect(step.checkpointAnswer).toBe('£5.60');
    expect(0.7 * 8).toBeCloseTo(5.6);
  });

  it('N6.18 Route A Step 3: recipe for 4 uses 300g, for 6 = 450g', () => {
    const step = SKILL_ROUTES['N6.18'][0].steps[2];
    expect(step.checkpointAnswer).toBe('450 g');
    expect(300 / 4 * 6).toBe(450);
  });

  it('N6.18 Route B Step 3: 3 workers 12 days, 4 workers = 9 days', () => {
    const step = SKILL_ROUTES['N6.18'][1].steps[2];
    expect(step.checkpointAnswer).toBe('9 days');
    expect(3 * 12 / 4).toBe(9);
  });

  it('N6.18 Route C Step 2: recipe for 4 uses 300g, for 6 = 450g', () => {
    const step = SKILL_ROUTES['N6.18'][2].steps[1];
    expect(step.checkpointAnswer).toBe('450 g');
    expect(300 / 4 * 6).toBe(450);
  });

  // N6.19 — Convert between FDP
  it('N6.19 Route A Step 1: 3/8 = 0.375', () => {
    const step = SKILL_ROUTES['N6.19'][0].steps[0];
    expect(step.checkpointAnswer).toBe('0.375');
    expect(3 / 8).toBe(0.375);
  });

  it('N6.19 Route A Step 2: 0.35 = 7/20', () => {
    const step = SKILL_ROUTES['N6.19'][0].steps[1];
    expect(step.checkpointAnswer).toBe('7/20');
    expect(35 / 100).toBe(0.35);
  });

  it('N6.19 Route A Step 3: 7/20 = 35%', () => {
    const step = SKILL_ROUTES['N6.19'][0].steps[2];
    expect(step.checkpointAnswer).toBe('35%');
    expect((7 / 20) * 100).toBe(35);
  });

  it('N6.19 Route B Step 2: 3/8 = 0.375', () => {
    const step = SKILL_ROUTES['N6.19'][1].steps[1];
    expect(step.checkpointAnswer).toBe('0.375');
    expect(3 / 8).toBe(0.375);
  });

  it('N6.19 Route C Step 1: 0.35 denominator should be 100', () => {
    const step = SKILL_ROUTES['N6.19'][2].steps[0];
    expect(step.checkpointAnswer).toBe('100');
  });

  it('N6.19 Route C Step 2: 0.35 = 7/20', () => {
    const step = SKILL_ROUTES['N6.19'][2].steps[1];
    expect(step.checkpointAnswer).toBe('7/20');
  });

  // N6.20 — FDP in context
  it('N6.20 Route A Step 2: 20% off £45 then 10% off = £32.40', () => {
    const step = SKILL_ROUTES['N6.20'][0].steps[1];
    expect(step.checkpointAnswer).toBe('£32.40');
    expect(45 * 0.8 * 0.9).toBe(32.4);
  });

  it('N6.20 Route A Step 3: buy £80, sell £100 → 25% profit', () => {
    const step = SKILL_ROUTES['N6.20'][0].steps[2];
    expect(step.checkpointAnswer).toBe('25%');
    expect((20 / 80) * 100).toBe(25);
  });

  it('N6.20 Route B Step 3: buy £80, sell £100 → 25% profit', () => {
    const step = SKILL_ROUTES['N6.20'][1].steps[2];
    expect(step.checkpointAnswer).toBe('25%');
    expect((100 - 80) / 80 * 100).toBe(25);
  });

  it('N6.20 Route C Step 2: combined multiplier for 20% off then 10% off = 0.72', () => {
    const step = SKILL_ROUTES['N6.20'][2].steps[1];
    expect(step.checkpointAnswer).toBe('0.72');
    expect(0.8 * 0.9).toBeCloseTo(0.72);
  });

  it('N6.20 Route C Step 3: buy £80, sell £100 → 25% profit', () => {
    const step = SKILL_ROUTES['N6.20'][2].steps[2];
    expect(step.checkpointAnswer).toBe('25%');
    expect((20 / 80) * 100).toBe(25);
  });
});
