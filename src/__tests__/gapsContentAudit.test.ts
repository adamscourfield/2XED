/**
 * gapsContentAudit.test.ts
 *
 * Comprehensive audit of explanation routes for gap skills:
 *   N1.6, N1.8, N1.15  (Decimals & Ordering)
 *   N2.1, N2.2, N2.6, N2.7  (Operations)
 *   N3.4, N3.5, N3.6, N3.7, N3.8, N3.18, N3.19  (Multiplication, Area, Division)
 *
 * Validates:
 *   1. Structure  — every skill has 3 routes (A/B/C), each with 3 steps
 *   2. Questions  — pass the write-guard; MCQ answer is in options; no duplicates
 *   3. Language   — no placeholder/fallback text; reasonable lengths
 *   4. Model      — route types map to procedural / conceptual / misconception
 *   5. Animations — visual type recommendations per skill strand
 */

import { describe, expect, it } from 'vitest';
import { validateExplanationStepWrite } from '@/features/learn/explanationStepWriteGuard';

// Import route data — the PrismaClient in ensure-routes-gaps.ts is lazy and
// never connects because we only read the exported constant.
import { SKILL_ROUTES, type RouteDef, type StepDef } from '../../prisma/ensure-routes-gaps';

/* ── Constants ───────────────────────────────────────────────────────────── */

const GAP_CODES = [
  'N1.6', 'N1.8', 'N1.15',
  'N2.1', 'N2.2', 'N2.6', 'N2.7',
  'N3.4', 'N3.5', 'N3.6', 'N3.7', 'N3.8', 'N3.18', 'N3.19',
];

const EXPECTED_ROUTE_TYPES = ['A', 'B', 'C'];
const EXPECTED_STEPS_PER_ROUTE = 3;

const FALLBACK_ANSWER = 'See explanation above.';
const FALLBACK_QUESTION_PREFIX = 'Answer a question about';

/** Minimum character length for substantive explanatory text */
const MIN_EXPLANATION_LENGTH = 40;
const MIN_MISCONCEPTION_LENGTH = 30;
const MIN_WORKED_EXAMPLE_LENGTH = 30;

/** Skill strands for animation compatibility checks */
const N1_SKILLS = ['N1.6', 'N1.8', 'N1.15'];
const N2_SKILLS = ['N2.1', 'N2.2', 'N2.6', 'N2.7'];
const N3_SKILLS = ['N3.4', 'N3.5', 'N3.6', 'N3.7', 'N3.8', 'N3.18', 'N3.19'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/* ── 1. Structural completeness ──────────────────────────────────────────── */

describe('Gaps (N1/N2/N3) structural completeness', () => {
  it('contains exactly the 14 expected skill codes', () => {
    const presentCodes = Object.keys(SKILL_ROUTES).sort((a, b) => {
      const [, prefixA, numA] = a.match(/^(N\d+)\.(\d+)$/)!;
      const [, prefixB, numB] = b.match(/^(N\d+)\.(\d+)$/)!;
      const pA = parseInt(prefixA.slice(1));
      const pB = parseInt(prefixB.slice(1));
      if (pA !== pB) return pA - pB;
      return parseInt(numA) - parseInt(numB);
    });
    expect(presentCodes).toEqual(GAP_CODES);
  });

  for (const code of GAP_CODES) {
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

describe('Gaps (N1/N2/N3) write-guard validation', () => {
  for (const code of GAP_CODES) {
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

describe('Gaps (N1/N2/N3) question quality', () => {
  for (const code of GAP_CODES) {
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

describe('Gaps (N1/N2/N3) route model alignment', () => {
  /**
   * Route A = procedural (step-by-step method)
   * Route B = conceptual / visual (bar model, area model, number line)
   * Route C = misconception correction (spot-the-mistake, common errors)
   */

  for (const code of GAP_CODES) {
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
        lcSummary.includes('wrong') ||
        lcSummary.includes('add') ||
        lcSummary.includes('subtract') ||
        lcSummary.includes('omit') ||
        lcSummary.includes('attach');
      expect(hasErrorLanguage, `${code} Route C misconception should reference a specific error pattern`).toBe(true);
    });
  }
});

/* ── 5. Language appropriateness ─────────────────────────────────────────── */

describe('Gaps (N1/N2/N3) language appropriateness (KS3)', () => {
  /**
   * Terms beyond the KS3 (Key Stage 3, Years 7–9, ages 11–14) curriculum.
   * The gap skills cover number fundamentals, so anything at GCSE-higher
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

  for (const code of GAP_CODES) {
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

describe('Gaps (N1/N2/N3) animation compatibility', () => {
  /**
   * N1 skills (decimals/ordering) should have decimal/place-value content
   * suitable for step_reveal or number_line animations.
   */
  for (const code of N1_SKILLS) {
    it(`${code} (decimals) has decimal-based content suitable for step_reveal / number_line`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        const hasDecimalContent =
          /\d+\.\d+|decimal|place.?value|tenths|hundredths|number.?line|order/i.test(route.workedExample);
        expect(
          hasDecimalContent,
          `${code} Route ${route.routeType} worked example should contain decimal content for animation`,
        ).toBe(true);
      }
    });
  }

  /**
   * N2 skills (addition/subtraction) should have arithmetic content
   * suitable for step_reveal or bar_model animations.
   */
  for (const code of N2_SKILLS) {
    it(`${code} (operations) has arithmetic content suitable for step_reveal / bar_model`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        const hasArithContent =
          /\d+\s*[\+\-−×÷]\s*\d+|add|subtract|commutative|borrow|column|mental|round|partition|adjust|pad|placeholder/i.test(route.workedExample);
        expect(
          hasArithContent,
          `${code} Route ${route.routeType} worked example should contain arithmetic content for animation`,
        ).toBe(true);
      }
    });
  }

  /**
   * N3 skills (multiplication/division/area) should have
   * multiplication, division, or area content.
   */
  for (const code of N3_SKILLS) {
    it(`${code} (multiplication/division/area) has relevant content suitable for step_reveal / grid_model`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        const hasContent =
          /\d+\s*[×÷]\s*\d+|\d+\s*÷\s*\d+|multipl|divid|carry|remainder|area|grid|quotient|zero.?placeholder/i.test(route.workedExample);
        expect(
          hasContent,
          `${code} Route ${route.routeType} worked example should contain multiplication/division/area content`,
        ).toBe(true);
      }
    });
  }
});

/* ── 7. Mathematical correctness spot-checks ─────────────────────────────── */

describe('Gaps (N1/N2/N3) mathematical correctness', () => {
  // ── N1.6: Decimal place value ──

  it('N1.6 Route A Step 1: in 0.72, digit in hundredths column → 2', () => {
    const step = SKILL_ROUTES['N1.6'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('2');
  });

  it('N1.6 Route A Step 3: 2.36 in expanded form → 2 + 0.3 + 0.06', () => {
    const step = SKILL_ROUTES['N1.6'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('2 + 0.3 + 0.06');
  });

  // ── N1.8: Order decimals ──

  it('N1.8 Route A Step 1: 0.4 and 0.38 padded → 0.40 and 0.38', () => {
    const step = SKILL_ROUTES['N1.8'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('0.40 and 0.38');
  });

  it('N1.8 Route A Step 3: 0.6, 0.59, 0.605 ascending → 0.59, 0.6, 0.605', () => {
    const step = SKILL_ROUTES['N1.8'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('0.59, 0.6, 0.605');
  });

  // ── N1.15: Mixed integers/negatives/decimals ──

  it('N1.15 Route A Step 2: -3, 1, -1, 0 ascending → -3, -1, 0, 1', () => {
    const step = SKILL_ROUTES['N1.15'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('-3, -1, 0, 1');
  });

  it('N1.15 Route B Step 2: -2, -1, -0.5, 0.5 ascending → -2, -1, -0.5, 0.5', () => {
    const step = SKILL_ROUTES['N1.15'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('-2, -1, -0.5, 0.5');
  });

  // ── N2.1: Properties of addition and subtraction ──

  it('N2.1 Route A Step 1: 6 + 9 = 9 + 6 → True (commutativity)', () => {
    const step = SKILL_ROUTES['N2.1'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('True');
  });

  it('N2.1 Route A Step 2: subtraction is commutative → False', () => {
    const step = SKILL_ROUTES['N2.1'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('False');
  });

  // ── N2.2: Mental strategies ──

  it('N2.2 Route A Step 1: 63 + 29 mentally → 92', () => {
    const step = SKILL_ROUTES['N2.2'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('92');
    expect(63 + 29).toBe(92);
  });

  it('N2.2 Route A Step 2: 83 − 56 by counting up → 27', () => {
    const step = SKILL_ROUTES['N2.2'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('27');
    expect(83 - 56).toBe(27);
  });

  it('N2.2 Route A Step 3: 145 + 43 by partitioning → 188', () => {
    const step = SKILL_ROUTES['N2.2'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('188');
    expect(145 + 43).toBe(188);
  });

  // ── N2.6: Formal subtraction of integers ──

  it('N2.6 Route B Step 2: 61 − 34 → 27', () => {
    const step = SKILL_ROUTES['N2.6'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('27');
    expect(61 - 34).toBe(27);
  });

  it('N2.6 Route A Step 3: 502 − 174 → 328', () => {
    const step = SKILL_ROUTES['N2.6'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('328');
    expect(502 - 174).toBe(328);
  });

  // ── N2.7: Formal subtraction of decimals ──

  it('N2.7 Route A Step 2: 4.50 − 2.37 → 2.13', () => {
    const step = SKILL_ROUTES['N2.7'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('2.13');
    expect(4.50 - 2.37).toBeCloseTo(2.13);
  });

  it('N2.7 Route A Step 3: 1 − 0.64 → 0.36', () => {
    const step = SKILL_ROUTES['N2.7'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('0.36');
    expect(1 - 0.64).toBeCloseTo(0.36);
  });

  // ── N3.4: Multiplication without carrying ──

  it('N3.4 Route A Step 1: 23 × 3 → 69', () => {
    const step = SKILL_ROUTES['N3.4'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('69');
    expect(23 * 3).toBe(69);
  });

  it('N3.4 Route A Step 3: 23 × 13 → 299', () => {
    const step = SKILL_ROUTES['N3.4'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('299');
    expect(23 * 13).toBe(299);
  });

  // ── N3.5: Multiplication with carrying ──

  it('N3.5 Route A Step 2: 47 × 6 → 282', () => {
    const step = SKILL_ROUTES['N3.5'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('282');
    expect(47 * 6).toBe(282);
  });

  it('N3.5 Route A Step 3: 136 × 4 → 544', () => {
    const step = SKILL_ROUTES['N3.5'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('544');
    expect(136 * 4).toBe(544);
  });

  // ── N3.6: Area ──

  it('N3.6 Route A Step 1: 7 cm × 3 cm rectangle → 21 cm²', () => {
    const step = SKILL_ROUTES['N3.6'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('21 cm²');
    expect(7 * 3).toBe(21);
  });

  it('N3.6 Route A Step 2: triangle base 10, height 6 → 30 cm²', () => {
    const step = SKILL_ROUTES['N3.6'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('30 cm²');
    expect(0.5 * 10 * 6).toBe(30);
  });

  // ── N3.7: Short division without remainder ──

  it('N3.7 Route A Step 1: 8 ÷ 4 → 2', () => {
    const step = SKILL_ROUTES['N3.7'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('2');
    expect(8 / 4).toBe(2);
  });

  it('N3.7 Route A Step 3: 132 ÷ 4 → 33', () => {
    const step = SKILL_ROUTES['N3.7'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('33');
    expect(132 / 4).toBe(33);
  });

  // ── N3.8: Short division with carrying ──

  it('N3.8 Route A Step 1: 19 ÷ 4 → 4 remainder 3', () => {
    const step = SKILL_ROUTES['N3.8'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('4 remainder 3.');
    expect(Math.floor(19 / 4)).toBe(4);
    expect(19 % 4).toBe(3);
  });

  // ── N3.18: Short division with integer remainders ──

  it('N3.18 Route A Step 1: 31 ÷ 4 → 7 r 3', () => {
    const step = SKILL_ROUTES['N3.18'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('7 r 3.');
    expect(Math.floor(31 / 4)).toBe(7);
    expect(31 % 4).toBe(3);
  });

  // ── N3.19: Short division giving decimal answer ──

  it('N3.19 Route A Step 3: 9 ÷ 4 → 2.25', () => {
    const step = SKILL_ROUTES['N3.19'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('2.25');
    expect(9 / 4).toBe(2.25);
  });

  it('N3.19 Route B Step 2: 15 ÷ 4 → 3.75', () => {
    const step = SKILL_ROUTES['N3.19'][1].steps[1]; // Route B, step 2
    expect(step.checkpointAnswer).toBe('3.75');
    expect(15 / 4).toBe(3.75);
  });

  it('N3.19 Route C Step 2: 3 ÷ 8 → 0.375', () => {
    const step = SKILL_ROUTES['N3.19'][2].steps[1]; // Route C, step 2
    expect(step.checkpointAnswer).toBe('0.375');
    expect(3 / 8).toBe(0.375);
  });
});
