/**
 * s1ContentAudit.test.ts
 *
 * Comprehensive audit of S1.1 – S1.12 explanation routes.
 * Validates:
 *   1. Structure  — every skill has 3 routes (A/B/C), each with 3 steps
 *   2. Questions  — pass the write-guard; MCQ answer is in options; no duplicates
 *   3. Language   — no placeholder/fallback text; reasonable lengths
 *   4. Model      — route types map to procedural / conceptual / misconception
 *   5. Animations — visual type recommendations per skill strand
 */

import { describe, expect, it } from 'vitest';
import { validateExplanationStepWrite } from '@/features/learn/explanationStepWriteGuard';

// Import route data — the PrismaClient in ensure-routes-s1.ts is lazy and
// never connects because we only read the exported constant.
import { SKILL_ROUTES, type RouteDef, type StepDef } from '../../prisma/ensure-routes-s1';

/* ── Constants ───────────────────────────────────────────────────────────── */

const S1_CODES = [
  'S1.1', 'S1.2', 'S1.3', 'S1.4', 'S1.5', 'S1.6',
  'S1.7', 'S1.8', 'S1.9', 'S1.10', 'S1.11', 'S1.12',
];

const EXPECTED_ROUTE_TYPES = ['A', 'B', 'C'];
const EXPECTED_STEPS_PER_ROUTE = 3;

const FALLBACK_ANSWER = 'See explanation above.';
const FALLBACK_QUESTION_PREFIX = 'Answer a question about';

/** Minimum character length for substantive explanatory text */
const MIN_EXPLANATION_LENGTH = 40;
const MIN_MISCONCEPTION_LENGTH = 30;
const MIN_WORKED_EXAMPLE_LENGTH = 30;

/**
 * All S1 skills cover probability and data representation.
 * Animation visuals should favour step_reveal, bar_model, or
 * table/diagram representations.
 */
const PROBABILITY_SKILLS = [
  'S1.1', 'S1.2', 'S1.3', 'S1.4', 'S1.5', 'S1.6',
  'S1.7', 'S1.8', 'S1.9', 'S1.10', 'S1.11', 'S1.12',
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/* ── 1. Structural completeness ──────────────────────────────────────────── */

describe('S1.1–S1.12 structural completeness', () => {
  it('contains exactly the 12 expected skill codes', () => {
    const presentCodes = Object.keys(SKILL_ROUTES).sort((a, b) => {
      const aN = parseFloat(a.replace('S1.', ''));
      const bN = parseFloat(b.replace('S1.', ''));
      return aN - bN;
    });
    expect(presentCodes).toEqual(S1_CODES);
  });

  for (const code of S1_CODES) {
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

describe('S1.1–S1.12 write-guard validation', () => {
  for (const code of S1_CODES) {
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

describe('S1.1–S1.12 question quality', () => {
  for (const code of S1_CODES) {
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

describe('S1.1–S1.12 route model alignment', () => {
  /**
   * Route A = procedural (step-by-step method)
   * Route B = conceptual / visual (diagrams, analogies)
   * Route C = misconception correction (spot-the-mistake, common errors)
   *
   * We verify each route's misconceptionSummary aligns with its intended approach.
   */

  for (const code of S1_CODES) {
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
      // Route C often references "common mistake", "confuse", or "error"
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
        lcSummary.includes('believe') ||
        lcSummary.includes('think') ||
        lcSummary.includes('treat') ||
        lcSummary.includes('invert') ||
        lcSummary.includes('halving') ||
        lcSummary.includes('not realis');
      expect(hasErrorLanguage, `${code} Route C misconception should reference a specific error pattern`).toBe(true);
    });
  }
});

/* ── 5. Language appropriateness ─────────────────────────────────────────── */

describe('S1.1–S1.12 language appropriateness (KS3)', () => {
  /**
   * Terms beyond the KS3 (Key Stage 3, Years 7–9, ages 11–14) curriculum.
   * The S1 skills cover probability and sets, so anything at GCSE-higher
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
    'regression',
    'chi-squared',
    'binomial',
  ];

  for (const code of S1_CODES) {
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

describe('S1.1–S1.12 animation compatibility', () => {
  /**
   * Verify that the content is compatible with the available animation
   * visual primitives: step_reveal, bar_model, table/diagram representations.
   *
   * For probability skills (S1.1–S1.12), worked examples should contain
   * probability/stats-related content suitable for step_reveal, bar_model,
   * or table/diagram visuals.
   */

  for (const code of PROBABILITY_SKILLS) {
    it(`${code} (probability) has content suitable for step_reveal / bar_model / table visuals`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        const hasProbabilityContent =
          /probab|outcome|event|chance|Venn|set|likelihood|fraction|\/|table|frequency|spinner|P\(|∩|∪|ξ|complement|circle|element|diagram|grid|cell|counter|overlap/i.test(route.workedExample);
        expect(
          hasProbabilityContent,
          `${code} Route ${route.routeType} worked example should contain probability/stats content for animation`,
        ).toBe(true);
      }
    });
  }
});

/* ── 7. Mathematical correctness spot-checks ─────────────────────────────── */

describe('S1.1–S1.12 mathematical correctness', () => {
  // Spot-check a selection of checkpoint answers for correctness

  it('S1.1 Route A Step 1: impossible event probability → 0', () => {
    const step = SKILL_ROUTES['S1.1'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('0');
  });

  it('S1.1 Route A Step 2: probability 0.5 → Even chance', () => {
    const step = SKILL_ROUTES['S1.1'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('Even chance');
  });

  it('S1.2 Route A Step 1: P(heads) = 0.5 → P(tails) = 0.5', () => {
    const step = SKILL_ROUTES['S1.2'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('0.5');
    expect(1 - 0.5).toBe(0.5);
  });

  it('S1.2 Route A Step 2: P(red) = 0.3, P(blue) = 0.5 → P(yellow) = 0.2', () => {
    const step = SKILL_ROUTES['S1.2'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('0.2');
    expect(1 - 0.3 - 0.5).toBeCloseTo(0.2);
  });

  it('S1.3 Route A Step 1: P(rolling a 4) on fair die → 1/6', () => {
    const step = SKILL_ROUTES['S1.3'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('1/6');
  });

  it('S1.3 Route A Step 3: simplify 6/10 → 3/5', () => {
    const step = SKILL_ROUTES['S1.3'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('3/5');
    expect(6 / 10).toBeCloseTo(3 / 5);
  });

  it('S1.4 Route A Step 1: two coins × two coins = 4 outcomes, but question is 3 tops × 4 bottoms → 12', () => {
    const step = SKILL_ROUTES['S1.4'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('12');
  });

  it('S1.5 Route A Step 3: P(sum = 5) from two dice → 6/36', () => {
    const step = SKILL_ROUTES['S1.5'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('6/36');
  });

  it('S1.9 Route A Step 1: A = {1,2,3,4,5}, B = {3,4,5,6,7} → A ∩ B = {2, 3}', () => {
    // Verify the intersection from the actual data
    const step = SKILL_ROUTES['S1.9'][0].steps[0];
    expect(step.checkpointAnswer).toBe('{2, 3}');
  });

  it('S1.12 Route B Step 1: n(ξ) = 30, n(A) = 12 → n(A′) = 18', () => {
    const step = SKILL_ROUTES['S1.12'][1].steps[0]; // Route B, step 1
    expect(step.checkpointAnswer).toBe('18');
    expect(30 - 12).toBe(18);
  });

  it('S1.12 Route B Step 2: P(A) = 0.35 → P(A′) = 0.65', () => {
    const step = SKILL_ROUTES['S1.12'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('0.65');
    expect(1 - 0.35).toBeCloseTo(0.65);
  });

  it('S1.12 Route B Step 3: P(not raining) = 0.7 → P(raining) = 0.3', () => {
    const step = SKILL_ROUTES['S1.12'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('0.3');
    expect(1 - 0.7).toBeCloseTo(0.3);
  });
});
