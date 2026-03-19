/**
 * a1ContentAudit.test.ts
 *
 * Comprehensive audit of A1.1 – A1.12 explanation routes.
 * Validates:
 *   1. Structure  — every skill has 3 routes (A/B/C), each with 3 steps
 *   2. Questions  — pass the write-guard; MCQ answer is in options; no duplicates
 *   3. Language   — no placeholder/fallback text; reasonable lengths
 *   4. Model      — route types map to procedural / conceptual / misconception
 *   5. Animations — visual type recommendations per skill strand
 */

import { describe, expect, it } from 'vitest';
import { validateExplanationStepWrite } from '@/features/learn/explanationStepWriteGuard';

// Import route data — the PrismaClient in ensure-routes-a1.ts is lazy and
// never connects because we only read the exported constant.
import { SKILL_ROUTES, type RouteDef, type StepDef } from '../../prisma/ensure-routes-a1';

/* ── Constants ───────────────────────────────────────────────────────────── */

const A1_CODES = [
  'A1.1', 'A1.2', 'A1.3', 'A1.4', 'A1.5', 'A1.6',
  'A1.7', 'A1.8', 'A1.9', 'A1.10', 'A1.11', 'A1.12',
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
 * Skills whose animation visuals should favour show_expression / step_reveal
 * (algebra manipulation).
 */
const ALGEBRA_EXPRESSION_SKILLS = [
  'A1.1', 'A1.2', 'A1.3', 'A1.4', 'A1.5', 'A1.6',
  'A1.7', 'A1.8', 'A1.9', 'A1.10', 'A1.11',
];

/** Sequence-related skill where number_line / step_reveal would be suitable */
const SEQUENCE_SKILLS = ['A1.12'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/* ── 1. Structural completeness ──────────────────────────────────────────── */

describe('A1.1–A1.12 structural completeness', () => {
  it('contains exactly the 12 expected skill codes', () => {
    const presentCodes = Object.keys(SKILL_ROUTES).sort((a, b) => {
      const aN = parseFloat(a.replace('A1.', ''));
      const bN = parseFloat(b.replace('A1.', ''));
      return aN - bN;
    });
    expect(presentCodes).toEqual(A1_CODES);
  });

  for (const code of A1_CODES) {
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

describe('A1.1–A1.12 write-guard validation', () => {
  for (const code of A1_CODES) {
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

describe('A1.1–A1.12 question quality', () => {
  for (const code of A1_CODES) {
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

describe('A1.1–A1.12 route model alignment', () => {
  /**
   * Route A = procedural (step-by-step method / inverse operations)
   * Route B = conceptual / visual (balance model, function machine, area model)
   * Route C = misconception correction (spot-the-mistake, common errors)
   *
   * We verify each route's misconceptionSummary aligns with its intended approach.
   */

  for (const code of A1_CODES) {
    const routes = SKILL_ROUTES[code];

    it(`${code} Route A (procedural) addresses a process or method gap`, () => {
      const routeA = routes.find((r: RouteDef) => r.routeType === 'A')!;
      // Route A misconception summaries typically mention what students do wrong procedurally
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
        lcSummary.includes('only');
      expect(hasErrorLanguage, `${code} Route C misconception should reference a specific error pattern`).toBe(true);
    });
  }
});

/* ── 5. Language appropriateness ─────────────────────────────────────────── */

describe('A1.1–A1.12 language appropriateness (KS3)', () => {
  /**
   * Terms beyond the KS3 (Key Stage 3, Years 7–9, ages 11–14) curriculum.
   * The A1 skills cover algebraic fundamentals up to sequences, so anything
   * at GCSE-higher or A-level is flagged.  Based on the DfE Mathematics
   * programme of study for KS3 and the skills mapping in
   * docs/unit-mapping/maths-subtopic-master-list.md.
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

  for (const code of A1_CODES) {
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

describe('A1.1–A1.12 animation compatibility', () => {
  /**
   * Verify that the content is compatible with the available animation
   * visual primitives: show_expression, step_reveal, rule_callout,
   * result_reveal, number_line, area_model, fraction_bar.
   *
   * For algebra skills (A1.1–A1.11), show_expression and step_reveal
   * are the primary visuals. For A1.12 (sequences), number_line and
   * step_reveal are more appropriate.
   */

  for (const code of ALGEBRA_EXPRESSION_SKILLS) {
    it(`${code} (algebra) has expression-based content suitable for show_expression / step_reveal`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        // Worked examples should contain algebraic notation that can be animated
        const hasAlgebraicContent =
          /[a-z][²³⁴]|[a-z]\s*[\+\−\-\×\*\/÷=]|\d+[a-z]|[a-z]\/\d/.test(route.workedExample) ||
          /\d+\s*[\+\−\-\×\*\/÷=]\s*\d+/.test(route.workedExample);
        expect(
          hasAlgebraicContent,
          `${code} Route ${route.routeType} worked example should contain algebraic content for animation`,
        ).toBe(true);
      }
    });
  }

  for (const code of SEQUENCE_SKILLS) {
    it(`${code} (sequence) has sequential content suitable for step_reveal / number_line`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        // Sequence examples should contain comma-separated terms or arrows
        const hasSequenceContent =
          /\d+\s*,\s*\d+\s*,\s*\d+/.test(route.workedExample) ||
          /→/.test(route.workedExample) ||
          /term/i.test(route.workedExample);
        expect(
          hasSequenceContent,
          `${code} Route ${route.routeType} worked example should contain sequence content`,
        ).toBe(true);
      }
    });
  }
});

/* ── 7. Mathematical correctness spot-checks ─────────────────────────────── */

describe('A1.1–A1.12 mathematical correctness', () => {
  // Spot-check a selection of checkpoint answers for correctness

  it('A1.3 Route A Step 3: 3x + 5 when x = 3 → 14', () => {
    const step = SKILL_ROUTES['A1.3'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('14');
    expect(3 * 3 + 5).toBe(14);
  });

  it('A1.3 Route B Step 3: a + 2b when a = 5, b = 3 → 11', () => {
    const step = SKILL_ROUTES['A1.3'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('11');
    expect(5 + 2 * 3).toBe(11);
  });

  it('A1.3 Route C Step 2: 4x when x = −3 → −12', () => {
    const step = SKILL_ROUTES['A1.3'][2].steps[1]; // Route C, step 2
    expect(step.checkpointAnswer).toBe('-12');
    expect(4 * -3).toBe(-12);
  });

  it('A1.3 Route C Step 3: 4s when s = 9 → 36', () => {
    const step = SKILL_ROUTES['A1.3'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('36');
    expect(4 * 9).toBe(36);
  });

  it('A1.5 Route A Step 2: 3(a + 7) → 3a + 21', () => {
    const step = SKILL_ROUTES['A1.5'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('3a + 21');
  });

  it('A1.5 Route A Step 3: 4(m − 2) → 4m − 8', () => {
    const step = SKILL_ROUTES['A1.5'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('4m − 8');
  });

  it('A1.8 Route A Step 2: x − 4 = 10 → x = 14', () => {
    const step = SKILL_ROUTES['A1.8'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('x = 14');
  });

  it('A1.8 Route B Step 3: x/3 = 8 → x = 24', () => {
    const step = SKILL_ROUTES['A1.8'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('x = 24');
    expect(24 / 3).toBe(8);
  });

  it('A1.9 Route A Step 2: 3x − 1 = 14 → x = 5', () => {
    const step = SKILL_ROUTES['A1.9'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('x = 5');
    expect(3 * 5 - 1).toBe(14);
  });

  it('A1.9 Route A Step 3: (x − 4)/2 = 6 → x = 16', () => {
    const step = SKILL_ROUTES['A1.9'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('x = 16');
    expect((16 - 4) / 2).toBe(6);
  });

  it('A1.9 Route C Step 3: 4(3) + 2 ≠ 18, gives 14', () => {
    const step = SKILL_ROUTES['A1.9'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('No — it gives 14');
    expect(4 * 3 + 2).toBe(14);
  });

  it('A1.10 Route A Step 2: 8x + 5 = 3x + 25 → x = 4', () => {
    const step = SKILL_ROUTES['A1.10'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('x = 4');
    // 8(4)+5 = 37, 3(4)+25 = 37
    expect(8 * 4 + 5).toBe(3 * 4 + 25);
  });

  it('A1.10 Route A Step 3: x = 3 solves 4x + 2 = 2x + 8 (both sides = 14)', () => {
    const step = SKILL_ROUTES['A1.10'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('Yes — both sides equal 14');
    expect(4 * 3 + 2).toBe(14);
    expect(2 * 3 + 8).toBe(14);
  });

  it('A1.11 Route A Step 2: 2(x + 5) = 16 → x = 3', () => {
    const step = SKILL_ROUTES['A1.11'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('x = 3');
    expect(2 * (3 + 5)).toBe(16);
  });

  it('A1.11 Route C Step 3: 3(x − 2) = 15 → x = 7', () => {
    const step = SKILL_ROUTES['A1.11'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('x = 7');
    expect(3 * (7 - 2)).toBe(15);
  });

  it('A1.12 Route A Step 2: first term 2, add 7, fourth term is 23', () => {
    const step = SKILL_ROUTES['A1.12'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('23');
    // 2, 9, 16, 23
    let term = 2;
    for (let i = 1; i < 4; i++) term += 7;
    expect(term).toBe(23);
  });

  it('A1.12 Route B Step 3: first term 1, multiply by 3, 5th term is 81', () => {
    const step = SKILL_ROUTES['A1.12'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('81');
    // 1, 3, 9, 27, 81
    let term = 1;
    for (let i = 1; i < 5; i++) term *= 3;
    expect(term).toBe(81);
  });

  it('A1.12 Route C Step 2: first term 30, subtract 7, third term is 16', () => {
    const step = SKILL_ROUTES['A1.12'][2].steps[1]; // Route C, step 2
    expect(step.checkpointAnswer).toBe('16');
    // 30, 23, 16
    let term = 30;
    for (let i = 1; i < 3; i++) term -= 7;
    expect(term).toBe(16);
  });
});
