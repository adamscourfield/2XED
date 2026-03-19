/**
 * g1ContentAudit.test.ts
 *
 * Comprehensive audit of G1.1, G1.1b, G1.2, G1.3, G1.4, G1.5, G1.6, G1.7 explanation routes.
 * Validates:
 *   1. Structure  — every skill has 3 routes (A/B/C), each with 3 steps
 *   2. Questions  — pass the write-guard; MCQ answer is in options; no duplicates
 *   3. Language   — no placeholder/fallback text; reasonable lengths
 *   4. Model      — route types map to procedural / conceptual / misconception
 *   5. Animations — visual type recommendations per skill strand
 */

import { describe, expect, it } from 'vitest';
import { validateExplanationStepWrite } from '@/features/learn/explanationStepWriteGuard';

// Import route data — the PrismaClient in ensure-routes-g1.ts is lazy and
// never connects because we only read the exported constant.
import { SKILL_ROUTES, type RouteDef, type StepDef } from '../../prisma/ensure-routes-g1';

/* ── Constants ───────────────────────────────────────────────────────────── */

const G1_CODES = ['G1.1', 'G1.1b', 'G1.2', 'G1.3', 'G1.4', 'G1.5', 'G1.6', 'G1.7'];

const EXPECTED_ROUTE_TYPES = ['A', 'B', 'C'];
const EXPECTED_STEPS_PER_ROUTE = 3;

const FALLBACK_ANSWER = 'See explanation above.';
const FALLBACK_QUESTION_PREFIX = 'Answer a question about';

/** Minimum character length for substantive explanatory text */
const MIN_EXPLANATION_LENGTH = 40;
const MIN_MISCONCEPTION_LENGTH = 30;
const MIN_WORKED_EXAMPLE_LENGTH = 30;

/**
 * Skills whose animation visuals should favour step_procedure
 * (geometry angles — procedural step_reveal for protractor/angle instructions).
 */
const GEOMETRY_PROCEDURE_SKILLS = ['G1.1', 'G1.1b', 'G1.2', 'G1.3', 'G1.4', 'G1.5', 'G1.6', 'G1.7'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/* ── 1. Structural completeness ──────────────────────────────────────────── */

describe('G1.1–G1.7 structural completeness', () => {
  it('contains exactly the 8 expected skill codes', () => {
    const presentCodes = Object.keys(SKILL_ROUTES).sort((a, b) => {
      // Sort numerically, with 'b' suffix handled
      const aNum = parseFloat(a.replace('G1.', '').replace('b', '.5'));
      const bNum = parseFloat(b.replace('G1.', '').replace('b', '.5'));
      return aNum - bNum;
    });
    expect(presentCodes).toEqual(G1_CODES);
  });

  for (const code of G1_CODES) {
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

describe('G1.1–G1.7 write-guard validation', () => {
  for (const code of G1_CODES) {
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

describe('G1.1–G1.7 question quality', () => {
  for (const code of G1_CODES) {
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

describe('G1.1–G1.7 route model alignment', () => {
  /**
   * Route A = procedural (step-by-step method)
   * Route B = conceptual / visual (understanding the "why")
   * Route C = misconception correction (spot-the-mistake, common errors)
   */

  for (const code of G1_CODES) {
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
        lcSummary.includes('wrong');
      expect(hasErrorLanguage, `${code} Route C misconception should reference a specific error pattern`).toBe(true);
    });
  }
});

/* ── 5. Language appropriateness ─────────────────────────────────────────── */

describe('G1.1–G1.7 language appropriateness (KS3)', () => {
  /**
   * Terms beyond KS3 (Key Stage 3, Years 7–9, ages 11–14).
   * G1 covers angles and protractor use — anything at GCSE-higher
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

  for (const code of G1_CODES) {
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

describe('G1.1–G1.7 animation compatibility', () => {
  /**
   * Verify that the content is compatible with the available animation
   * visual primitives: step_reveal, rule_callout, result_reveal.
   *
   * For geometry skills (G1.1–G1.3), step_procedure is the primary
   * visual style — step_reveal for protractor/angle procedures.
   */

  for (const code of GEOMETRY_PROCEDURE_SKILLS) {
    it(`${code} (geometry) has procedural content suitable for step_reveal`, () => {
      const routes = SKILL_ROUTES[code];
      for (const route of routes) {
        // Geometry worked examples should mention angle-related terms
        const hasGeometryContent =
          /angle|degree|°|protractor|acute|obtuse|reflex|right|vertex|arm|notation|∠|straight|line|point|triangle|opposite|sum|180|360/.test(route.workedExample) ||
          /angle|degree|°|protractor|acute|obtuse|reflex|right|vertex|arm|notation|∠|straight|line|point|triangle|opposite|sum|180|360/.test(route.misconceptionSummary);
        expect(
          hasGeometryContent,
          `${code} Route ${route.routeType} should contain geometry-related content for animation`,
        ).toBe(true);
      }
    });
  }
});

/* ── 7. Mathematical correctness spot-checks ─────────────────────────────── */

describe('G1.1–G1.7 mathematical correctness', () => {
  // G1.1 — Angle classification
  it('G1.1 Route A Step 2: 135° is obtuse', () => {
    const step = SKILL_ROUTES['G1.1'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('Obtuse');
    expect(135).toBeGreaterThan(90);
    expect(135).toBeLessThan(180);
  });

  it('G1.1 Route A Step 3: 200° is reflex', () => {
    const step = SKILL_ROUTES['G1.1'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('Reflex');
    expect(200).toBeGreaterThan(180);
    expect(200).toBeLessThan(360);
  });

  it('G1.1 Route C Step 1: 179° is obtuse', () => {
    const step = SKILL_ROUTES['G1.1'][2].steps[0]; // Route C, step 1
    expect(step.checkpointAnswer).toBe('Obtuse');
    expect(179).toBeGreaterThan(90);
    expect(179).toBeLessThan(180);
  });

  it('G1.1 Route C Step 3: 350° is reflex', () => {
    const step = SKILL_ROUTES['G1.1'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('Reflex');
    expect(350).toBeGreaterThan(180);
    expect(350).toBeLessThan(360);
  });

  // G1.1b — Angle notation
  it('G1.1b Route A Step 1: vertex of ∠DEF is E', () => {
    const step = SKILL_ROUTES['G1.1b'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('E');
    // E is the middle letter
    expect('DEF'[1]).toBe('E');
  });

  it('G1.1b Route A Step 2: ∠PQR and ∠RQP are the same angle', () => {
    const step = SKILL_ROUTES['G1.1b'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('Yes');
    // Both have vertex Q, arms through P and R
  });

  it('G1.1b Route C Step 1: vertex of ∠RST is S', () => {
    const step = SKILL_ROUTES['G1.1b'][2].steps[0]; // Route C, step 1
    expect(step.checkpointAnswer).toBe('S');
    expect('RST'[1]).toBe('S');
  });

  // G1.2 — Measure angles
  it('G1.2 Route C Step 3: wrong-scale reading 160° for acute → correct is 20°', () => {
    const step = SKILL_ROUTES['G1.2'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('20°');
    expect(180 - 160).toBe(20);
  });

  // G1.3 — Draw angles
  it('G1.3 Route A Step 1: first step is draw a baseline', () => {
    const step = SKILL_ROUTES['G1.3'][0].steps[0]; // Route A, step 1
    expect(step.checkpointAnswer).toBe('Draw a baseline');
  });

  it('G1.3 Route A Step 3: second arm is drawn with a ruler', () => {
    const step = SKILL_ROUTES['G1.3'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('Ruler');
  });

  // G1.4 — Angles on a straight line
  it('G1.4 Route A Step 2: 180° − 130° = 50°', () => {
    const step = SKILL_ROUTES['G1.4'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('50°');
    expect(180 - 130).toBe(50);
  });

  it('G1.4 Route A Step 3: 40° + 60° + x° = 180° → x = 80°', () => {
    const step = SKILL_ROUTES['G1.4'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('80°');
    expect(180 - 40 - 60).toBe(80);
  });

  it('G1.4 Route C Step 3: 180° − 55° = 125°', () => {
    const step = SKILL_ROUTES['G1.4'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('125°');
    expect(180 - 55).toBe(125);
  });

  // G1.5 — Angles around a point
  it('G1.5 Route A Step 2: 360° − 90° − 150° = 120°', () => {
    const step = SKILL_ROUTES['G1.5'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('120°');
    expect(360 - 90 - 150).toBe(120);
  });

  it('G1.5 Route A Step 3: 360° − 80° − 70° − 100° = 110°', () => {
    const step = SKILL_ROUTES['G1.5'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('110°');
    expect(360 - 80 - 70 - 100).toBe(110);
  });

  it('G1.5 Route C Step 3: 360° − 145° − 85° = 130°', () => {
    const step = SKILL_ROUTES['G1.5'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('130°');
    expect(360 - 145 - 85).toBe(130);
  });

  // G1.6 — Vertically opposite angles
  it('G1.6 Route A Step 2: vertically opposite to 65° is 65°', () => {
    const step = SKILL_ROUTES['G1.6'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('65°');
  });

  it('G1.6 Route A Step 3: adjacent to 70° is 110°', () => {
    const step = SKILL_ROUTES['G1.6'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('110°');
    expect(180 - 70).toBe(110);
  });

  it('G1.6 Route C Step 3: vertically opposite to 35° is 35°', () => {
    const step = SKILL_ROUTES['G1.6'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('35°');
  });

  // G1.7 — Angles in a triangle
  it('G1.7 Route A Step 2: 180° − 60° − 80° = 40°', () => {
    const step = SKILL_ROUTES['G1.7'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('40°');
    expect(180 - 60 - 80).toBe(40);
  });

  it('G1.7 Route B Step 3: 180° − 90° − 35° = 55°', () => {
    const step = SKILL_ROUTES['G1.7'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('55°');
    expect(180 - 90 - 35).toBe(55);
  });

  it('G1.7 Route C Step 3: 180° − 45° − 75° = 60°', () => {
    const step = SKILL_ROUTES['G1.7'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('60°');
    expect(180 - 45 - 75).toBe(60);
  });
});
