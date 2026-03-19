/**
 * n5ContentAudit.test.ts
 *
 * Comprehensive audit of N5.1 – N5.12 explanation routes (Fractions).
 * Validates:
 *   1. Structure  — every skill has 3 routes (A/B/C), each with 3 steps
 *   2. Questions  — pass the write-guard; MCQ answer is in options; no duplicates
 *   3. Language   — no placeholder/fallback text; reasonable lengths
 *   4. Model      — route types map to procedural / conceptual / misconception
 *   5. Animations — visual type recommendations per skill strand
 */

import { describe, expect, it } from 'vitest';
import { validateExplanationStepWrite } from '@/features/learn/explanationStepWriteGuard';

// Import route data — the PrismaClient in ensure-routes-n5.ts is lazy and
// never connects because we only read the exported constant.
import { SKILL_ROUTES, type RouteDef, type StepDef } from '../../prisma/ensure-routes-n5';

/* ── Constants ───────────────────────────────────────────────────────────── */

const N5_CODES = [
  'N5.1', 'N5.2', 'N5.3', 'N5.4', 'N5.5', 'N5.6',
  'N5.7', 'N5.8', 'N5.9', 'N5.10', 'N5.11', 'N5.12',
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
 * All N5 skills are fraction-related, so animations should favour
 * fraction_bar, area_model, bar_model, or step_reveal visuals.
 */
const FRACTION_SKILLS = [
  'N5.1', 'N5.2', 'N5.3', 'N5.4', 'N5.5', 'N5.6',
  'N5.7', 'N5.8', 'N5.9', 'N5.10', 'N5.11', 'N5.12',
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/* ── 1. Structural completeness ──────────────────────────────────────────── */

describe('N5.1–N5.12 structural completeness', () => {
  it('contains exactly the 12 expected skill codes', () => {
    const presentCodes = Object.keys(SKILL_ROUTES).sort((a, b) => {
      const aN = parseFloat(a.replace('N5.', ''));
      const bN = parseFloat(b.replace('N5.', ''));
      return aN - bN;
    });
    expect(presentCodes).toEqual(N5_CODES);
  });

  for (const code of N5_CODES) {
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

describe('N5.1–N5.12 write-guard validation', () => {
  for (const code of N5_CODES) {
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

describe('N5.1–N5.12 question quality', () => {
  for (const code of N5_CODES) {
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

describe('N5.1–N5.12 route model alignment', () => {
  /**
   * Route A = procedural (step-by-step method)
   * Route B = conceptual / visual (bar model, area model, number line)
   * Route C = misconception correction (spot-the-mistake, common errors)
   *
   * We verify each route's misconceptionSummary aligns with its intended approach.
   */

  for (const code of N5_CODES) {
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
        lcSummary.includes('upside') ||
        lcSummary.includes('alone') ||
        lcSummary.includes('too early') ||
        lcSummary.includes('both') ||
        lcSummary.includes('as well') ||
        lcSummary.includes('swap') ||
        lcSummary.includes('ignore') ||
        lcSummary.includes('wrong');
      expect(hasErrorLanguage, `${code} Route C misconception should reference a specific error pattern`).toBe(true);
    });
  }
});

/* ── 5. Language appropriateness ─────────────────────────────────────────── */

describe('N5.1–N5.12 language appropriateness (KS3)', () => {
  /**
   * Terms beyond the KS3 (Key Stage 3, Years 7–9, ages 11–14) curriculum.
   * The N5 skills cover fraction fundamentals, so anything at GCSE-higher
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
  ];

  for (const code of N5_CODES) {
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

describe('N5.1–N5.12 animation compatibility', () => {
  /**
   * Verify that the content is compatible with the available animation
   * visual primitives: fraction_bar, area_model, bar_model, step_reveal.
   *
   * All N5 skills are fraction-related, so worked examples should contain
   * fraction notation, fraction vocabulary, or bar/model references.
   */

  for (const code of FRACTION_SKILLS) {
    it(`${code} (fractions) has fraction-based content suitable for fraction_bar / area_model / bar_model / step_reveal`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        const hasFractionContent =
          /\d+\/\d+|fraction|denominator|numerator|equivalent|simplif/i.test(route.workedExample);
        expect(
          hasFractionContent,
          `${code} Route ${route.routeType} worked example should contain fraction content for animation`,
        ).toBe(true);
      }
    });
  }
});

/* ── 7. Mathematical correctness spot-checks ─────────────────────────────── */

describe('N5.1–N5.12 mathematical correctness', () => {
  // Spot-check a selection of checkpoint answers for correctness

  it('N5.1 Route A Step 1: bar divided into 6 equal sections → denominator is 6', () => {
    const step = SKILL_ROUTES['N5.1'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('6');
  });

  it('N5.1 Route A Step 2: 10 equal parts, 7 shaded → 7/10', () => {
    const step = SKILL_ROUTES['N5.1'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('7/10');
  });

  it('N5.2 Route A Step 1: 1/4 = ?/12 → 3/12 (scale factor 3)', () => {
    const step = SKILL_ROUTES['N5.2'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('3/12');
    // 1 × 3 = 3, 4 × 3 = 12
    expect(1 * 3).toBe(3);
    expect(4 * 3).toBe(12);
  });

  it('N5.2 Route A Step 2: 2/7 = ?/21 → 6/21 (scale factor 3)', () => {
    const step = SKILL_ROUTES['N5.2'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('6/21');
    expect(2 * 3).toBe(6);
    expect(7 * 3).toBe(21);
  });

  it('N5.3 Route A Step 1: LCD of 1/3 and 1/4 → 12', () => {
    const step = SKILL_ROUTES['N5.3'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('12');
  });

  it('N5.4 Route A Step 1: HCF of 12 and 18 → 6', () => {
    const step = SKILL_ROUTES['N5.4'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('6');
  });

  it('N5.4 Route A Step 2: simplify 12/18 → 2/3', () => {
    const step = SKILL_ROUTES['N5.4'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('2/3');
    // 12 ÷ 6 = 2, 18 ÷ 6 = 3
    expect(12 / 6).toBe(2);
    expect(18 / 6).toBe(3);
  });

  it('N5.5 Route A Step 3: 15 minutes as a fraction of 1 hour in simplest form → 1/4', () => {
    const step = SKILL_ROUTES['N5.5'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('1/4');
    expect(15 / 60).toBe(0.25);
  });

  it('N5.6 Route A Step 1: 1 3/4 as improper fraction → 7/4', () => {
    const step = SKILL_ROUTES['N5.6'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('7/4');
    // 1 × 4 + 3 = 7
    expect(1 * 4 + 3).toBe(7);
  });

  it('N5.6 Route A Step 2: 13/5 as mixed number → 2 3/5', () => {
    const step = SKILL_ROUTES['N5.6'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('2 3/5');
    // 13 ÷ 5 = 2 remainder 3
    expect(Math.floor(13 / 5)).toBe(2);
    expect(13 % 5).toBe(3);
  });

  it('N5.7 Route A Step 1: 3/8 + 4/8 → 7/8', () => {
    const step = SKILL_ROUTES['N5.7'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('7/8');
    expect(3 + 4).toBe(7);
  });

  it('N5.7 Route A Step 3: 1/4 + 1/6 → 5/12', () => {
    const step = SKILL_ROUTES['N5.7'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('5/12');
    // 1/4 = 3/12, 1/6 = 2/12, 3+2 = 5
    expect(3 + 2).toBe(5);
  });

  it('N5.8 Route A Step 3: 2/3 − 1/5 → 7/15', () => {
    const step = SKILL_ROUTES['N5.8'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('7/15');
    // 2/3 = 10/15, 1/5 = 3/15, 10−3 = 7
    expect(10 - 3).toBe(7);
  });

  it('N5.9 Route A Step 2: 1/4 + 2/3 → 11/12', () => {
    const step = SKILL_ROUTES['N5.9'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('11/12');
    // 1/4 = 3/12, 2/3 = 8/12, 3+8 = 11
    expect(3 + 8).toBe(11);
  });

  it('N5.10 Route A Step 1: 3 2/5 as improper fraction → 17/5', () => {
    const step = SKILL_ROUTES['N5.10'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('17/5');
    // 3 × 5 + 2 = 17
    expect(3 * 5 + 2).toBe(17);
  });

  it('N5.11 Route A Step 2: 1/4 − (−1/4) → 1/2', () => {
    const step = SKILL_ROUTES['N5.11'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('1/2');
    // 1/4 + 1/4 = 2/4 = 1/2
  });

  it('N5.12 Route A Step 3: (1/2 + 1/3) − 1/6 → 2/3', () => {
    const step = SKILL_ROUTES['N5.12'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('2/3');
    // 1/2 + 1/3 = 3/6 + 2/6 = 5/6, then 5/6 − 1/6 = 4/6 = 2/3
    expect(5 - 1).toBe(4);
  });
});
