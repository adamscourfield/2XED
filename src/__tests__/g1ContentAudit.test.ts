/**
 * g1ContentAudit.test.ts
 *
 * Comprehensive audit of G1.1, G1.1b, G1.2, G1.3 explanation routes.
 * Comprehensive audit of G1.1, G1.1b, G1.2, G1.3, G1.4, G1.5, G1.6, G1.7, G1.8, G1.9, G1.10 explanation routes.
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

const G1_CODES = ['G1.1', 'G1.1b', 'G1.2', 'G1.3'];
const G1_CODES = ['G1.1', 'G1.1b', 'G1.2', 'G1.3', 'G1.4', 'G1.5', 'G1.6', 'G1.7', 'G1.8', 'G1.9', 'G1.10'];

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
const GEOMETRY_PROCEDURE_SKILLS = ['G1.1', 'G1.1b', 'G1.2', 'G1.3'];
const GEOMETRY_PROCEDURE_SKILLS = ['G1.1', 'G1.1b', 'G1.2', 'G1.3', 'G1.4', 'G1.5', 'G1.6', 'G1.7', 'G1.8', 'G1.9', 'G1.10'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/* ── 1. Structural completeness ──────────────────────────────────────────── */

describe('G1.1–G1.3 structural completeness', () => {
  it('contains exactly the 4 expected skill codes', () => {
describe('G1.1–G1.10 structural completeness', () => {
  it('contains exactly the 11 expected skill codes', () => {
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

describe('G1.1–G1.3 write-guard validation', () => {
describe('G1.1–G1.10 write-guard validation', () => {
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

describe('G1.1–G1.3 question quality', () => {
describe('G1.1–G1.10 question quality', () => {
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

describe('G1.1–G1.3 route model alignment', () => {
describe('G1.1–G1.10 route model alignment', () => {
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

describe('G1.1–G1.3 language appropriateness (KS3)', () => {
describe('G1.1–G1.10 language appropriateness (KS3)', () => {
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

describe('G1.1–G1.3 animation compatibility', () => {
describe('G1.1–G1.10 animation compatibility', () => {
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
          /angle|degree|°|protractor|acute|obtuse|reflex|right|vertex|arm|notation|∠/.test(route.workedExample) ||
          /angle|degree|°|protractor|acute|obtuse|reflex|right|vertex|arm|notation|∠/.test(route.misconceptionSummary);
          /angle|degree|°|protractor|acute|obtuse|reflex|right|vertex|arm|notation|∠|straight|line|point|triangle|opposite|sum|180|360|quadrilateral|polygon|interior|exterior|diagonal/.test(route.workedExample) ||
          /angle|degree|°|protractor|acute|obtuse|reflex|right|vertex|arm|notation|∠|straight|line|point|triangle|opposite|sum|180|360|quadrilateral|polygon|interior|exterior|diagonal/.test(route.misconceptionSummary);
        expect(
          hasGeometryContent,
          `${code} Route ${route.routeType} should contain geometry-related content for animation`,
        ).toBe(true);
      }
    });
  }
});

/* ── 7. Mathematical correctness spot-checks ─────────────────────────────── */

describe('G1.1–G1.3 mathematical correctness', () => {
describe('G1.1–G1.10 mathematical correctness', () => {
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

  // G1.8 — Angles in a quadrilateral
  it('G1.8 Route A Step 2: 360° − 90° − 80° − 110° = 80°', () => {
    const step = SKILL_ROUTES['G1.8'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('80°');
    expect(360 - 90 - 80 - 110).toBe(80);
  });

  it('G1.8 Route A Step 3: 360° − 120° − 60° − 85° = 95°', () => {
    const step = SKILL_ROUTES['G1.8'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('95°');
    expect(360 - 120 - 60 - 85).toBe(95);
  });

  it('G1.8 Route B Step 3: 360° − 70° − 110° − 90° = 90°', () => {
    const step = SKILL_ROUTES['G1.8'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('90°');
    expect(360 - 70 - 110 - 90).toBe(90);
  });

  it('G1.8 Route C Step 3: 360° − 100° − 90° − 80° = 90°', () => {
    const step = SKILL_ROUTES['G1.8'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('90°');
    expect(360 - 100 - 90 - 80).toBe(90);
  });

  // G1.9 — Interior angle sum of any polygon
  it('G1.9 Route A Step 2: 180 × (5 − 2) = 540°', () => {
    const step = SKILL_ROUTES['G1.9'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('540°');
    expect(180 * (5 - 2)).toBe(540);
  });

  it('G1.9 Route A Step 3: 180 × (6 − 2) = 720°', () => {
    const step = SKILL_ROUTES['G1.9'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('720°');
    expect(180 * (6 - 2)).toBe(720);
  });

  it('G1.9 Route B Step 3: 180 × (8 − 2) = 1080°', () => {
    const step = SKILL_ROUTES['G1.9'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('1080°');
    expect(180 * (8 - 2)).toBe(1080);
  });

  it('G1.9 Route C Step 3: 180 × (7 − 2) = 900°', () => {
    const step = SKILL_ROUTES['G1.9'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('900°');
    expect(180 * (7 - 2)).toBe(900);
  });

  // G1.10 — Exterior angles of any polygon
  it('G1.10 Route A Step 2: 360° ÷ 8 = 45°', () => {
    const step = SKILL_ROUTES['G1.10'][0].steps[1]; // Route A, step 2
    expect(step.checkpointAnswer).toBe('45°');
    expect(360 / 8).toBe(45);
  });

  it('G1.10 Route A Step 3: 360° ÷ 40° = 9 sides', () => {
    const step = SKILL_ROUTES['G1.10'][0].steps[2]; // Route A, step 3
    expect(step.checkpointAnswer).toBe('9');
    expect(360 / 40).toBe(9);
  });

  it('G1.10 Route B Step 1: 180° − 150° = 30°', () => {
    const step = SKILL_ROUTES['G1.10'][1].steps[0]; // Route B, step 1
    expect(step.checkpointAnswer).toBe('30°');
    expect(180 - 150).toBe(30);
  });

  it('G1.10 Route B Step 3: interior of regular pentagon = 108°', () => {
    const step = SKILL_ROUTES['G1.10'][1].steps[2]; // Route B, step 3
    expect(step.checkpointAnswer).toBe('108°');
    expect(180 - 360 / 5).toBe(108);
  });

  it('G1.10 Route C Step 2: exterior of regular hexagon = 60°', () => {
    const step = SKILL_ROUTES['G1.10'][2].steps[1]; // Route C, step 2
    expect(step.checkpointAnswer).toBe('60°');
    expect(360 / 6).toBe(60);
  });

  it('G1.10 Route C Step 3: 360° ÷ 10 = 36°', () => {
    const step = SKILL_ROUTES['G1.10'][2].steps[2]; // Route C, step 3
    expect(step.checkpointAnswer).toBe('36°');
    expect(360 / 10).toBe(36);
  });
});

/* ── 8. Guided prompt / answer validation ────────────────────────────────── */

describe('G1.1–G1.10 guided prompt and answer quality', () => {
  const MIN_GUIDED_PROMPT_LENGTH = 20;
  const MIN_GUIDED_ANSWER_LENGTH = 20;

  for (const code of G1_CODES) {
    for (const route of SKILL_ROUTES[code]) {
      describe(`${code} Route ${route.routeType}`, () => {
        it('has a substantive guided prompt', () => {
          expect(route.guidedPrompt.length).toBeGreaterThanOrEqual(MIN_GUIDED_PROMPT_LENGTH);
        });

        it('has a substantive guided answer', () => {
          expect(route.guidedAnswer.length).toBeGreaterThanOrEqual(MIN_GUIDED_ANSWER_LENGTH);
        });

        it('guided prompt is a question or instruction', () => {
          const endsCorrectly =
            route.guidedPrompt.endsWith('?') ||
            route.guidedPrompt.endsWith('.') ||
            route.guidedPrompt.endsWith('°') ||
            route.guidedPrompt.endsWith(')');
          expect(endsCorrectly, `${code} Route ${route.routeType} guidedPrompt should end with ?, ., ° or )`).toBe(true);
        });

        it('guided answer does not repeat the prompt verbatim', () => {
          expect(route.guidedAnswer).not.toBe(route.guidedPrompt);
        });
      });
    }
  }

  // Arithmetic spot-checks on guided answers
  it('G1.4 Route A guided answer: 180 − 65 = 115', () => {
    const route = SKILL_ROUTES['G1.4'][0]; // Route A
    expect(route.guidedAnswer).toContain('115');
    expect(180 - 65).toBe(115);
  });

  it('G1.4 Route C guided answer: 180 − 140 = 40', () => {
    const route = SKILL_ROUTES['G1.4'][2]; // Route C
    expect(route.guidedAnswer).toContain('40');
    expect(180 - 140).toBe(40);
  });

  it('G1.5 Route A guided answer: 360 − 100 − 80 = 180', () => {
    const route = SKILL_ROUTES['G1.5'][0]; // Route A
    expect(route.guidedAnswer).toContain('180');
    expect(360 - 100 - 80).toBe(180);
  });

  it('G1.5 Route C guided answer: 360 − 90 − 60 = 210', () => {
    const route = SKILL_ROUTES['G1.5'][2]; // Route C
    expect(route.guidedAnswer).toContain('210');
    expect(360 - 90 - 60).toBe(210);
  });

  it('G1.7 Route A guided answer: 180 − 80 − 45 = 55', () => {
    const route = SKILL_ROUTES['G1.7'][0]; // Route A
    expect(route.guidedAnswer).toContain('55');
    expect(180 - 80 - 45).toBe(55);
  });

  it('G1.7 Route C guided answer: 180 − 70 − 50 = 60', () => {
    const route = SKILL_ROUTES['G1.7'][2]; // Route C
    expect(route.guidedAnswer).toContain('60');
    expect(180 - 70 - 50).toBe(60);
  });

  it('G1.8 Route A guided answer: 360 − 100 − 85 − 95 = 80', () => {
    const route = SKILL_ROUTES['G1.8'][0]; // Route A
    expect(route.guidedAnswer).toContain('80');
    expect(360 - 100 - 85 - 95).toBe(80);
  });

  it('G1.8 Route C guided answer: 360 − 60 − 70 − 80 = 150', () => {
    const route = SKILL_ROUTES['G1.8'][2]; // Route C
    expect(route.guidedAnswer).toContain('150');
    expect(360 - 60 - 70 - 80).toBe(150);
  });

  it('G1.9 Route A guided answer: 180 × (6 − 2) = 720', () => {
    const route = SKILL_ROUTES['G1.9'][0]; // Route A
    expect(route.guidedAnswer).toContain('720');
    expect(180 * (6 - 2)).toBe(720);
  });

  it('G1.10 Route A guided answer: 360 ÷ 5 = 72', () => {
    const route = SKILL_ROUTES['G1.10'][0]; // Route A
    expect(route.guidedAnswer).toContain('72');
    expect(360 / 5).toBe(72);
  });

  it('G1.10 Route C guided answer: 180 − 108 = 72 and 360 ÷ 5 = 72', () => {
    const route = SKILL_ROUTES['G1.10'][2]; // Route C
    expect(route.guidedAnswer).toContain('72');
    expect(180 - 108).toBe(72);
    expect(360 / 5).toBe(72);
  });
});

/* ── 9. Cross-route differentiation ──────────────────────────────────────── */

describe('G1.1–G1.10 cross-route differentiation', () => {
  for (const code of G1_CODES) {
    const routes = SKILL_ROUTES[code];

    it(`${code} routes have distinct misconception summaries`, () => {
      const summaries = routes.map((r: RouteDef) => r.misconceptionSummary);
      expect(summaries.length).toBe(unique(summaries).length);
    });

    it(`${code} routes have distinct worked examples`, () => {
      const examples = routes.map((r: RouteDef) => r.workedExample);
      expect(examples.length).toBe(unique(examples).length);
    });

    it(`${code} routes have distinct guided prompts`, () => {
      const prompts = routes.map((r: RouteDef) => r.guidedPrompt);
      expect(prompts.length).toBe(unique(prompts).length);
    });

    it(`${code} routes have distinct guided answers`, () => {
      const answers = routes.map((r: RouteDef) => r.guidedAnswer);
      expect(answers.length).toBe(unique(answers).length);
    });
  }
});

/* ── 10. Step progression and uniqueness ─────────────────────────────────── */

describe('G1.1–G1.10 step progression and uniqueness', () => {
  for (const code of G1_CODES) {
    for (const route of SKILL_ROUTES[code]) {
      describe(`${code} Route ${route.routeType}`, () => {
        it('has unique step titles within the route', () => {
          const titles = route.steps.map((s: StepDef) => s.title.toLowerCase());
          expect(titles.length).toBe(unique(titles).length);
        });

        it('has unique checkpoint questions within the route', () => {
          const questions = route.steps.map((s: StepDef) => s.checkpointQuestion);
          expect(questions.length).toBe(unique(questions).length);
        });

        it('has unique explanations within the route', () => {
          const explanations = route.steps.map((s: StepDef) => s.explanation);
          expect(explanations.length).toBe(unique(explanations).length);
        });

        it('does not have all identical checkpoint answers (guards against copy-paste)', () => {
          // It's acceptable for two steps to share an answer if they test different things,
          // but all three being identical suggests copy-paste
          const answers = route.steps.map((s: StepDef) => s.checkpointAnswer);
          const allSame = answers.every((a) => a === answers[0]);
          expect(allSame, `${code} Route ${route.routeType}: all 3 checkpoint answers are identical`).toBe(false);
        });
      });
    }
  }
});

/* ── 11. Complete mathematical correctness (remaining arithmetic) ────────── */

describe('G1.1–G1.10 complete mathematical verification', () => {
  // G1.2 — additional arithmetic checks
  it('G1.2 Route A Step 3: 180 − 145 = 35 (sense-check correction)', () => {
    // The question describes reading 145° for an acute angle; answer is to subtract from 180°
    const step = SKILL_ROUTES['G1.2'][0].steps[2];
    expect(step.checkpointAnswer).toBe('Subtract from 180° to get 35°');
    expect(180 - 145).toBe(35);
  });

  it('G1.2 Route C Step 2: inner=65° outer=115° → answer is 65°', () => {
    const step = SKILL_ROUTES['G1.2'][2].steps[1];
    expect(step.checkpointAnswer).toBe('65°');
    expect(180 - 115).toBe(65);
  });

  // G1.3 — procedure verification
  it('G1.3 Route C Step 3: 140° drawn as acute ≈ 40° (wrong scale)', () => {
    const step = SKILL_ROUTES['G1.3'][2].steps[2];
    expect(step.checkpointAnswer).toBe('Read the wrong scale');
    expect(180 - 140).toBe(40); // supports the "about 40°" in the question
  });

  // G1.4 — supplementary angle check
  it('G1.4 Route B Step 3: 180 − 75 = 105 (supplementary)', () => {
    const step = SKILL_ROUTES['G1.4'][1].steps[2];
    expect(step.checkpointAnswer).toBe('105°');
    expect(180 - 75).toBe(105);
  });

  // G1.5 — additional checks
  it('G1.5 Route C Step 2: negative result signals wrong rule', () => {
    const step = SKILL_ROUTES['G1.5'][2].steps[1];
    expect(step.checkpointAnswer).toBe('Used 180° instead of 360°');
    // Verify the student's erroneous calculation is negative
    expect(180 - 120 - 100).toBe(-40); // confirms the error described
  });

  // G1.6 — full set verification
  it('G1.6 Route B Step 1: a + b = 180°', () => {
    const step = SKILL_ROUTES['G1.6'][1].steps[0];
    expect(step.checkpointAnswer).toBe('180°');
  });

  it('G1.6 Route B Step 2: a + b = b + c implies a = c', () => {
    const step = SKILL_ROUTES['G1.6'][1].steps[1];
    expect(step.checkpointAnswer).toBe('a = c');
  });

  it('G1.6 Route B Step 3: vertically opposite to 125° is 125°', () => {
    const step = SKILL_ROUTES['G1.6'][1].steps[2];
    expect(step.checkpointAnswer).toBe('125°');
  });

  // G1.7 — verification check
  it('G1.7 Route A Step 3: 50 + 70 + 60 = 180 (verification)', () => {
    const step = SKILL_ROUTES['G1.7'][0].steps[2];
    expect(step.checkpointAnswer).toBe('Yes');
    expect(50 + 70 + 60).toBe(180);
  });

  // G1.8 — full Route B verification
  it('G1.8 Route B Step 1: quadrilateral splits into 2 triangles', () => {
    const step = SKILL_ROUTES['G1.8'][1].steps[0];
    expect(step.checkpointAnswer).toBe('2');
  });

  it('G1.8 Route B Step 2: 2 × 180 = 360', () => {
    const step = SKILL_ROUTES['G1.8'][1].steps[1];
    expect(step.checkpointAnswer).toBe('360°');
    expect(2 * 180).toBe(360);
  });

  // G1.9 — triangle decomposition checks
  it('G1.9 Route B Step 1: pentagon → 3 triangles (5 − 2)', () => {
    const step = SKILL_ROUTES['G1.9'][1].steps[0];
    expect(step.checkpointAnswer).toBe('3');
    expect(5 - 2).toBe(3);
  });

  it('G1.9 Route B Step 2: hexagon → 4 triangles (6 − 2)', () => {
    const step = SKILL_ROUTES['G1.9'][1].steps[1];
    expect(step.checkpointAnswer).toBe('4');
    expect(6 - 2).toBe(4);
  });

  it('G1.9 Route C Step 1: subtract 2 from n', () => {
    const step = SKILL_ROUTES['G1.9'][2].steps[0];
    expect(step.checkpointAnswer).toBe('2');
  });

  it('G1.9 Route C Step 2: pentagon = 180 × 3 = 540°', () => {
    const step = SKILL_ROUTES['G1.9'][2].steps[1];
    expect(step.checkpointAnswer).toBe('540°');
    expect(180 * (5 - 2)).toBe(540);
  });

  // G1.10 — interior/exterior relationship
  it('G1.10 Route C Step 1: interior + exterior = 180°', () => {
    const step = SKILL_ROUTES['G1.10'][2].steps[0];
    expect(step.checkpointAnswer).toBe('180°');
  });

  it('G1.10 Route C Step 2: regular hexagon exterior = 60° (360 ÷ 6)', () => {
    // Already tested; cross-verify from interior angle
    const step = SKILL_ROUTES['G1.10'][2].steps[1];
    expect(step.checkpointAnswer).toBe('60°');
    expect(180 - 120).toBe(60); // interior 120°, exterior 60°
  });
});

/* ── 12. Curriculum keyword coverage ─────────────────────────────────────── */

describe('G1.1–G1.10 curriculum keyword coverage', () => {
  /** Each skill should consistently reference its key concept across all routes. */
  const SKILL_KEYWORDS: Record<string, RegExp> = {
    'G1.1':  /acute|obtuse|reflex|right/i,
    'G1.1b': /vertex|notation|∠|middle letter/i,
    'G1.2':  /protractor|measure|scale/i,
    'G1.3':  /draw|protractor|baseline/i,
    'G1.4':  /straight line|180/i,
    'G1.5':  /around a point|360/i,
    'G1.6':  /vertically opposite|equal/i,
    'G1.7':  /triangle|180/i,
    'G1.8':  /quadrilateral|360/i,
    'G1.9':  /polygon|interior|n\s*[−\-–]\s*2/i,
    'G1.10': /exterior|360/i,
  };

  for (const code of G1_CODES) {
    const keyword = SKILL_KEYWORDS[code];
    if (!keyword) continue;

    for (const route of SKILL_ROUTES[code]) {
      it(`${code} Route ${route.routeType} references its key curriculum concept`, () => {
        const allText = [
          route.misconceptionSummary,
          route.workedExample,
          route.guidedPrompt,
          route.guidedAnswer,
          ...route.steps.flatMap((s: StepDef) => [s.explanation, s.checkpointQuestion, s.title]),
        ].join(' ');

        expect(
          keyword.test(allText),
          `${code} Route ${route.routeType} should reference its key concept: ${keyword}`,
        ).toBe(true);
      });
    }
  }
});
