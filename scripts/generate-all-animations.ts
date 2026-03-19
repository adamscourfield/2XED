/**
 * generate-all-animations.ts
 *
 * Generates production-quality animation schemas for all explanation routes
 * that don't yet have one. Safe to re-run — skips routes already done.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' scripts/generate-all-animations.ts
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' scripts/generate-all-animations.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' scripts/generate-all-animations.ts --skill N3.6
 */

import { PrismaClient } from '@prisma/client';
import { AnimationSchemaValidator } from '../src/lib/validators/animation-schema';

const prisma = new PrismaClient();
const SCHEMA_VERSION = '1.0';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKILL_FILTER = (() => { const i = args.indexOf('--skill'); return i !== -1 ? args[i + 1]?.toUpperCase() : null; })();

// ── Visual primitive selector ────────────────────────────────────────────────
// Returns the primary visual style suited to each skill's mathematical domain.

type VisualStyle =
  | 'number_line'
  | 'fraction_bar'
  | 'area_model'
  | 'expression_steps'  // show_expression + step_reveal combo
  | 'step_procedure';   // step_reveal only

function getVisualStyle(skillCode: string): VisualStyle {
  const [strand, subStr] = skillCode.split('.');
  const sub = parseInt(subStr ?? '0', 10);

  if (strand === 'N1') {
    if ([9, 11, 13, 14, 15].includes(sub)) return 'number_line';  // number line positioning / negatives
    if ([1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 17, 18, 19, 20].includes(sub)) return 'expression_steps';
  }
  if (strand === 'N2') return 'step_procedure';
  if (strand === 'N3') {
    if ([6, 21].includes(sub)) return 'area_model';
    return 'step_procedure';
  }
  if (strand === 'N4') {
    if ([1, 2, 3, 4, 5, 6, 7].includes(sub)) return 'fraction_bar';
    if (sub === 8) return 'number_line';   // ordering FDP → number line
    if (sub === 9) return 'step_procedure'; // percentage of amount
  }
  if (strand === 'A1') return 'expression_steps';  // algebra — show_expression + step_reveal
  return 'step_procedure';
}

// ── Narration helpers ────────────────────────────────────────────────────────
// Transforms raw explanation text into complementary narration that directs
// attention and explains meaning rather than reading the maths aloud.

function toNarration(explanation: string, routeType: string, stepIndex: number, totalSteps: number): string {
  // Strip any inline maths notation to avoid reading it aloud
  const clean = explanation
    .replace(/[=≠<>≤≥÷×]/g, '')
    .replace(/\d+\/\d+/g, 'the fraction shown')
    .replace(/\b\d+\.\d+\b/g, 'the decimal')
    .replace(/\b\d{3,}\b/g, 'that number')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Keep under 200 chars and end on a complete sentence
  let narration = clean.length > 200 ? clean.slice(0, 197) + '...' : clean;

  // Route-type prefix cues
  if (routeType === 'C' && stepIndex === 0) {
    narration = 'Watch carefully — this is the mistake most students make. ' + narration;
  }
  if (routeType === 'B' && stepIndex === 0) {
    narration = 'Focus on the visual. ' + narration;
  }
  if (stepIndex === totalSteps - 1) {
    narration = narration + ' Take a moment to check that answer makes sense.';
  }

  return narration.slice(0, 300);
}

function misconceptionNarration(summary: string): string {
  const clean = summary.replace(/\d+\/\d+/g, 'the fraction').replace(/\d+\.\d+/g, 'the decimal').trim();
  return `Watch out for this — ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
}

// ── Step builders ─────────────────────────────────────────────────────────────

interface RouteData {
  id: string;
  routeType: string;
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  skill: { code: string; name: string };
  steps: Array<{ stepOrder: number; title: string; explanation: string; checkpointQuestion: string; checkpointAnswer: string }>;
}

function buildSteps(route: RouteData, style: VisualStyle): object[] {
  const { routeType, steps, skill, workedExample, guidedPrompt, guidedAnswer } = route;
  const allSteps: object[] = [];
  const totalAnimSteps = steps.length + 1; // +1 for guided practice step

  // ── Step 0: Route C only — show the misconception first ──────────────────
  if (routeType === 'C') {
    allSteps.push({
      stepIndex: 0,
      id: `${skill.code}-C-misconception`,
      visuals: [
        {
          type: 'rule_callout',
          ruleText: 'Common mistake to avoid',
          subText: route.misconceptionSummary.length > 80
            ? route.misconceptionSummary.slice(0, 80) + '…'
            : route.misconceptionSummary,
        },
      ],
      narration: misconceptionNarration(route.misconceptionSummary),
      audioFile: null,
    });
  }

  // ── Main steps from the explanation route steps ───────────────────────────
  steps.forEach((step, i) => {
    const stepIndex = routeType === 'C' ? i + 1 : i;
    const narration = toNarration(step.explanation, routeType, stepIndex, totalAnimSteps);

    let visuals: object[];

    if (style === 'number_line') {
      // Determine a sensible range from the skill code
      const [strand, subStr] = skill.code.split('.');
      const sub = parseInt(subStr ?? '0', 10);
      const isNegatives = (strand === 'N1' && sub >= 13) || (strand === 'N4' && sub === 8);
      const range: [number, number] = isNegatives ? [-10, 10] : [0, 10];

      visuals = [
        {
          type: 'number_line',
          range,
          highlightStart: range[0],
          arrowFrom: range[0],
          arrowTo: Math.floor((range[0] + range[1]) / 2),
        },
        {
          type: 'step_reveal',
          lines: [
            { text: step.title, highlight: 'accent' },
            { text: step.explanation.slice(0, 100), highlight: null },
          ],
        },
      ];
    } else if (style === 'fraction_bar') {
      // Pick sensible fraction values based on step position
      const fractionPairs: Array<[number, number]> = [[1, 2], [3, 4], [2, 3], [1, 4], [3, 5]];
      const [num, den] = fractionPairs[i % fractionPairs.length];
      const showDecimal = skill.code.startsWith('N4.4') || skill.code.startsWith('N4.5') || i > 0;
      const showPercent = skill.code.startsWith('N4.6') || skill.code.startsWith('N4.7') || skill.code.startsWith('N4.8');

      visuals = [
        {
          type: 'fraction_bar',
          numerator: num,
          denominator: den,
          showDecimal,
          showPercent,
        },
        {
          type: 'step_reveal',
          lines: [
            { text: step.title, highlight: 'accent' },
            { text: step.explanation.slice(0, 100), highlight: null },
          ],
        },
      ];
    } else if (style === 'area_model') {
      // Use a small area model with row/col counts that make sense for step index
      const sizes: Array<[number, number]> = [[4, 3], [5, 4], [6, 3], [4, 5]];
      const [rows, cols] = sizes[i % sizes.length];

      visuals = [
        {
          type: 'area_model',
          rows,
          cols,
          highlightRows: routeType === 'A' ? [0] : undefined,
          label: `${rows} × ${cols} = ${rows * cols}`,
        },
        {
          type: 'step_reveal',
          lines: [
            { text: step.title, highlight: 'accent' },
            { text: step.explanation.slice(0, 100), highlight: null },
          ],
        },
      ];
    } else if (style === 'expression_steps') {
      // show_expression for the title concept + step_reveal for the method
      visuals = [
        {
          type: 'show_expression',
          expression: step.title,
          parts: step.title.split(' ').map((word, wi) => ({
            text: word + (wi < step.title.split(' ').length - 1 ? ' ' : ''),
            id: `p${wi}`,
            highlight: wi === 0 ? 'accent' : null,
          })),
        },
        {
          type: 'step_reveal',
          lines: [
            { text: step.explanation.slice(0, 100), highlight: null },
            ...(step.explanation.length > 100 ? [{ text: step.explanation.slice(100, 200), highlight: null }] : []),
          ],
        },
      ];
    } else {
      // step_procedure — clean step_reveal
      visuals = [
        {
          type: 'step_reveal',
          lines: [
            { text: step.title, highlight: 'accent' },
            { text: step.explanation.slice(0, 120), highlight: null },
            ...(step.explanation.length > 120
              ? [{ text: step.explanation.slice(120, 240), highlight: null }]
              : []),
          ],
        },
      ];
    }

    // Route B: prefix each step with a rule_callout on the first step
    if (routeType === 'B' && i === 0) {
      visuals = [
        {
          type: 'rule_callout',
          ruleText: step.title,
          subText: 'Focus on the visual — watch what changes.',
        },
        ...visuals,
      ];
    }

    allSteps.push({
      stepIndex,
      id: `${skill.code}-${routeType}-step-${stepIndex}`,
      visuals,
      narration,
      audioFile: null,
    });
  });

  // ── Final guided-practice step ────────────────────────────────────────────
  const finalIndex = allSteps.length;
  const guidedLines: object[] = [
    { text: 'Your turn:', highlight: 'accent' },
    { text: guidedPrompt, highlight: null },
    { text: '→ ' + guidedAnswer, highlight: 'green' },
  ];

  allSteps.push({
    stepIndex: finalIndex,
    id: `${skill.code}-${routeType}-guided`,
    visuals: [
      {
        type: 'step_reveal',
        lines: guidedLines,
      },
      {
        type: 'result_reveal',
        expression: guidedAnswer,
        label: 'Check your answer',
      },
    ],
    narration: `Now you try. Pause the animation and work it out before the answer appears. ${routeType === 'C' ? 'Make sure you use the correct method, not the one shown at the start.' : ''}`.trim(),
    audioFile: null,
  });

  return allSteps;
}

// ── Schema builder ────────────────────────────────────────────────────────────

function buildSchema(route: RouteData): object {
  const style = getVisualStyle(route.skill.code);
  const steps = buildSteps(route, style);

  const routeLabels: Record<string, string> = {
    A: 'Procedural',
    B: 'Conceptual',
    C: 'Misconception-corrective',
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    skillCode: route.skill.code,
    skillName: route.skill.name,
    routeType: route.routeType,
    routeLabel: routeLabels[route.routeType] ?? `Route ${route.routeType}`,
    misconceptionSummary: route.misconceptionSummary,
    generatedAt: new Date().toISOString(),
    steps,
    misconceptionStrip: {
      text: route.misconceptionSummary,
      audioNarration: misconceptionNarration(route.misconceptionSummary),
    },
    loopable: true,
    pauseAtEndMs: 2500,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📽️  Animation schema generator${DRY_RUN ? ' (DRY RUN)' : ''}${SKILL_FILTER ? ` — skill: ${SKILL_FILTER}` : ''}`);
  console.log('─'.repeat(60));

  const routes = await prisma.explanationRoute.findMany({
    where: {
      isActive: true,
      animationGeneratedAt: null,  // resume-safe: skip routes already generated
      ...(SKILL_FILTER ? { skill: { code: SKILL_FILTER } } : {}),
    },
    include: {
      skill: { select: { code: true, name: true } },
      steps: {
        orderBy: { stepOrder: 'asc' },
        select: { stepOrder: true, title: true, explanation: true, checkpointQuestion: true, checkpointAnswer: true },
      },
    },
    orderBy: [{ skill: { sortOrder: 'asc' } }, { routeType: 'asc' }],
  });

  const total = await prisma.explanationRoute.count({ where: { isActive: true } });
  const done = await prisma.explanationRoute.count({ where: { isActive: true, NOT: { animationGeneratedAt: null } } });

  console.log(`Progress: ${done}/${total} already done. Generating ${routes.length} remaining.\n`);

  if (routes.length === 0) {
    console.log('✅ All routes already have animation schemas.');
    await prisma.$disconnect();
    return;
  }

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const route of routes) {
    const label = `${route.skill.code} / Route ${route.routeType}`;

    if (route.steps.length === 0) {
      console.log(`  ⏭  ${label} — no steps, skipping`);
      skipped++;
      continue;
    }

    try {
      const schema = buildSchema(route as unknown as RouteData);

      // Validate
      const result = AnimationSchemaValidator.safeParse(schema);
      if (!result.success) {
        console.error(`  ❌ ${label} — validation failed:`, result.error.issues.map(i => i.message).join(', '));
        failed++;
        continue;
      }

      if (DRY_RUN) {
        const s = schema as { steps: object[] };
        console.log(`  🔍 ${label} — ${s.steps.length} steps, style: ${getVisualStyle((route as unknown as RouteData).skill.code)}`);
      } else {
        await prisma.explanationRoute.update({
          where: { id: route.id },
          data: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            animationSchema: schema as any,
            animationVersion: SCHEMA_VERSION,
            animationGeneratedAt: new Date(),
          },
        });
        console.log(`  ✅ ${label} — ${(schema as { steps: object[] }).steps.length} steps`);
      }
      generated++;
    } catch (err) {
      console.error(`  ❌ ${label} — error:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Generated: ${generated}  |  Skipped: ${skipped}  |  Failed: ${failed}`);

  if (!DRY_RUN) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nowDone = await prisma.explanationRoute.count({ where: { isActive: true, NOT: { animationGeneratedAt: null } } });
    console.log(`\nOverall progress: ${nowDone}/${total} routes have animation schemas.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
