/**
 * scripts/generate-english-animations.ts
 *
 * Generates English curriculum animation schemas using algorithmic visual primitives.
 * No AI API required — all visuals are rule-based from skill type + content.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' scripts/generate-english-animations.ts
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' scripts/generate-english-animations.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' scripts/generate-english-animations.ts --skill E7.1
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' scripts/generate-english-animations.ts --route A
 */

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const SCHEMA_VERSION = '1.0';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKILL_FILTER = (() => {
  const i = args.indexOf('--skill');
  return i !== -1 ? args[i + 1]?.toUpperCase() : null;
})();
const ROUTE_FILTER = (() => {
  const i = args.indexOf('--route');
  return i !== -1 ? args[i + 1]?.toUpperCase() : null;
})();

// ── Schema validators ─────────────────────────────────────────────────────────

const EnglishAnimationStepSchema = z.object({
  stepIndex: z.number(),
  id: z.string(),
  visuals: z.array(z.record(z.unknown())),
  narration: z.string(),
  audioFile: z.string().nullable(),
});

const EnglishAnimationSchemaValidator = z.object({
  schemaVersion: z.string(),
  skillCode: z.string(),
  skillName: z.string(),
  routeType: z.enum(['A', 'B', 'C']),
  routeLabel: z.string(),
  misconceptionSummary: z.string().optional(),
  generatedAt: z.string(),
  steps: z.array(EnglishAnimationStepSchema),
  loopable: z.boolean(),
  pauseAtEndMs: z.number(),
});

// ── Visual style selector ─────────────────────────────────────────────────────
// Maps English skill codes (e.g. E7.1, E8.3) to an English-specific visual style.

type EnglishVisualStyle =
  | 'inference_chain'
  | 'sentence_parse'
  | 'paragraph_structure'
  | 'persuasive_device'
  | 'vocab_root'
  | 'summary_build'
  | 'text_highlight'
  | 'character_analysis'
  | 'quotation_reveal'
  | 'step_procedure';

function getEnglishVisualStyle(skillCode: string, stepIndex: number, title: string): EnglishVisualStyle {
  const lc = (skillCode + ' ' + title).toLowerCase();

  if (lc.includes('infer')) return 'inference_chain';
  if (lc.includes('sentence') || lc.includes('grammar') || lc.includes('verb') || lc.includes('noun')) return 'sentence_parse';
  if (lc.includes('paragraph') || lc.includes('peel') || lc.includes('structure') || lc.includes('essay')) return 'paragraph_structure';
  if (lc.includes('persua') || lc.includes('argument') || lc.includes('persuasive')) return 'persuasive_device';
  if (lc.includes('vocab') || lc.includes('word') || lc.includes('root') || lc.includes('prefix') || lc.includes('suffix')) return 'vocab_root';
  if (lc.includes('summary') || lc.includes('summarise')) return 'summary_build';
  if (lc.includes('character')) return 'character_analysis';
  if (lc.includes('quotation') || lc.includes('quote') || lc.includes('cite')) return 'quotation_reveal';
  if (lc.includes('explain') || lc.includes('analyse') || lc.includes('evaluate')) return 'text_highlight';

  // Default: fall back to step_reveal for procedural tasks
  return 'step_procedure';
}

// ── Narration helpers ─────────────────────────────────────────────────────────

function toNarration(explanation: string, routeType: string, stepIndex: number, totalSteps: number): string {
  const clean = explanation
    .replace(/\d+\.\d+/g, 'the decimal shown')
    .replace(/\b\d{3,}\b/g, 'that number')
    .replace(/\s{2,}/g, ' ')
    .trim();

  let narration = clean.length > 200 ? clean.slice(0, 197) + '...' : clean;

  if (routeType === 'C' && stepIndex === 0) {
    narration = 'Watch carefully — this is the mistake many students make. ' + narration;
  }
  if (routeType === 'B' && stepIndex === 0) {
    narration = 'Focus on the visual. ' + narration;
  }
  if (stepIndex === totalSteps - 1) {
    narration = narration + ' Take a moment to check your answer makes sense.';
  }

  return narration.slice(0, 300);
}

function misconceptionNarration(summary: string): string {
  const clean = summary.replace(/\d+\.\d+/g, 'the number shown').trim();
  return `Watch out for this — ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
}

// ── Visual builders ────────────────────────────────────────────────────────────

function buildVisualsForStep(
  style: EnglishVisualStyle,
  step: { title: string; explanation: string },
  routeType: string,
  stepIndex: number
): Record<string, unknown>[] {
  const { title, explanation } = step;

  switch (style) {
    case 'inference_chain': {
      // Build a 3-node inference chain from the content
      const nodes = [
        { label: 'What the text says', text: title.length > 60 ? title.slice(0, 57) + '…' : title, highlight: routeType !== 'C' },
        { label: 'What you know', text: 'Draw on your own knowledge', highlight: false },
        { label: 'What you infer', text: explanation.length > 80 ? explanation.slice(0, 77) + '…' : explanation, highlight: routeType === 'C' },
      ];
      return [
        { type: 'inference_chain', nodes, highlightNode: routeType === 'C' ? 2 : 0 },
        { type: 'step_reveal', lines: [{ text: title, highlight: 'accent' }, { text: explanation.slice(0, 120), highlight: null }] },
      ];
    }

    case 'sentence_parse': {
      const sentence = title + '. ' + explanation.slice(0, 80);
      // Approximate character positions for annotation — real positions would come from NLP
      const annotations = [
        { text: 'Subject', start: 0, end: Math.min(8, sentence.length), label: 'Subject', color: '#3b82f6' },
        { text: 'Verb', start: Math.min(9, sentence.length), end: Math.min(14, sentence.length), label: 'Verb', color: '#10b981' },
      ];
      return [
        { type: 'sentence_parse', sentence, annotations },
        { type: 'step_reveal', lines: [{ text: title, highlight: 'accent' }, { text: explanation.slice(0, 100), highlight: null }] },
      ];
    }

    case 'paragraph_structure': {
      const elements = [
        { role: 'P' as const, text: title },
        { role: 'E' as const, text: explanation.slice(0, 60) + '…' },
        { role: 'E2' as const, text: 'Explain the effect on the reader.' },
        { role: 'L' as const, text: 'Link to the next paragraph or argument.' },
      ];
      return [
        { type: 'peel_reveal', paragraphIndex: 0, elements },
        { type: 'rule_callout', ruleText: 'PEEL Structure', subText: 'Point, Evidence, Explain, Link — use for every paragraph.' },
      ];
    }

    case 'persuasive_device': {
      return [
        { type: 'persuasive_highlight', text: title, device: 'Rhetorical question', explanation: explanation.slice(0, 100) },
        { type: 'step_reveal', lines: [{ text: title, highlight: 'accent' }, { text: explanation.slice(0, 120), highlight: null }] },
      ];
    }

    case 'vocab_root': {
      // Attempt to extract a root word from the title
      const words = title.split(/\s+/);
      const root = words[words.length - 1] ?? title;
      return [
        { type: 'vocab_breakdown', word: title, root, family: [root + 'ly', root + 'ity', root + 'ous', root + 'tion'].slice(0, 3) },
        { type: 'step_reveal', lines: [{ text: title, highlight: 'accent' }, { text: explanation.slice(0, 100), highlight: null }] },
      ];
    }

    case 'summary_build': {
      return [
        { type: 'step_reveal', lines: [{ text: 'Building your summary…', highlight: 'accent' }, { text: title, highlight: null }, { text: explanation.slice(0, 80), highlight: null }] },
        { type: 'rule_callout', ruleText: 'Summary tip', subText: 'Keep it brief — one sentence per paragraph. Use your own words.' },
      ];
    }

    case 'character_analysis': {
      const traits = ['Ambitious', 'Courageous', ' Loyal', 'Manipulative'].slice(0, 2);
      return [
        { type: 'step_reveal', lines: [{ text: title, highlight: 'accent' }, { text: `Character traits: ${traits.join(', ')}`, highlight: 'evidence' }, { text: explanation.slice(0, 80), highlight: null }] },
        { type: 'rule_callout', ruleText: 'Character analysis', subText: 'Always support your points with evidence from the text.' },
      ];
    }

    case 'quotation_reveal': {
      const quote = title.length > 80 ? title.slice(0, 77) + '…' : title;
      return [
        { type: 'quotation_annotate', quote, annotation: explanation.slice(0, 100), annotationSide: 'below' },
        { type: 'step_reveal', lines: [{ text: 'Look closely at the language and its effects.', highlight: 'accent' }] },
      ];
    }

    case 'text_highlight': {
      const highlightStyle = (['bold', 'underline', 'italic', 'accent'] as const)[stepIndex % 4];
      return [
        { type: 'text_block', content: title, highlightSpans: [{ text: title, style: highlightStyle }] },
        { type: 'step_reveal', lines: [{ text: title, highlight: 'accent' }, { text: explanation.slice(0, 120), highlight: null }] },
      ];
    }

    case 'step_procedure':
    default: {
      return [
        { type: 'step_reveal', lines: [
          { text: title, highlight: 'accent' },
          { text: explanation.slice(0, 120), highlight: null },
          ...(explanation.length > 120 ? [{ text: explanation.slice(120, 240), highlight: null }] : []),
        ]},
      ];
    }
  }
}

// ── Step builder ────────────────────────────────────────────────────────────────

interface RouteData {
  id: string;
  routeType: string;
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  skill: { code: string; name: string };
  steps: Array<{
    stepOrder: number;
    title: string;
    explanation: string;
    checkpointQuestion: string;
    checkpointAnswer: string;
  }>;
}

function buildSteps(route: RouteData): object[] {
  const { routeType, steps, skill, guidedPrompt, guidedAnswer } = route;
  const allSteps: object[] = [];
  const totalAnimSteps = steps.length + 1;

  // Route C: show misconception first
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

  // Main steps
  steps.forEach((step, i) => {
    const stepIndex = routeType === 'C' ? i + 1 : i;
    const style = getEnglishVisualStyle(skill.code, stepIndex, step.title);
    const narration = toNarration(step.explanation, routeType, stepIndex, totalAnimSteps);
    const visuals = buildVisualsForStep(style, step, routeType, stepIndex);

    // Route B: prefix first step with a rule callout
    if (routeType === 'B' && i === 0) {
      visuals.unshift({
        type: 'rule_callout',
        ruleText: step.title,
        subText: 'Focus on the visual — watch what changes.',
      });
    }

    allSteps.push({
      stepIndex,
      id: `${skill.code}-${routeType}-step-${stepIndex}`,
      visuals,
      narration,
      audioFile: null,
    });
  });

  // Guided practice final step
  const finalIndex = allSteps.length;
  allSteps.push({
    stepIndex: finalIndex,
    id: `${skill.code}-${routeType}-guided`,
    visuals: [
      {
        type: 'step_reveal',
        lines: [
          { text: 'Your turn:', highlight: 'accent' },
          { text: guidedPrompt, highlight: null },
          { text: '→ ' + guidedAnswer, highlight: 'green' },
        ],
      },
      { type: 'result_reveal', expression: guidedAnswer, label: 'Check your answer' },
    ],
    narration: `Now you try. Pause the animation and work it out before the answer appears.${routeType === 'C' ? ' Make sure you use the correct method.' : ''}`.trim(),
    audioFile: null,
  });

  return allSteps;
}

// ── Schema builder ─────────────────────────────────────────────────────────────

function buildSchema(route: RouteData): object {
  const steps = buildSteps(route);

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
    loopable: true,
    pauseAtEndMs: 2500,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📽️  English animation schema generator${DRY_RUN ? ' (DRY RUN)' : ''}${SKILL_FILTER ? ` — skill: ${SKILL_FILTER}` : ''}${ROUTE_FILTER ? ` — route: ${ROUTE_FILTER}` : ''}`);
  console.log('─'.repeat(60));

  const subject = await prisma.subject.findFirst({
    where: { slug: 'english' },
  });

  if (!subject) {
    console.error('❌ Subject "english" not found in database.');
    console.log('Available subjects:');
    const subjects = await prisma.subject.findMany({ select: { slug: true, title: true } });
    subjects.forEach(s => console.log(`  - ${s.slug} (${s.title})`));
    await prisma.$disconnect();
    return;
  }

  const where: Parameters<typeof prisma.explanationRoute.findMany>[0]['where'] = {
    isActive: true,
    animationGeneratedAt: null,
    skill: {
      subjectId: subject.id,
      ...(SKILL_FILTER ? { code: SKILL_FILTER } : {}),
      ...(ROUTE_FILTER ? {} : {}),
    },
    ...(ROUTE_FILTER ? { routeType: ROUTE_FILTER } : {}),
  };

  const routes = await prisma.explanationRoute.findMany({
    where,
    include: {
      skill: { select: { code: true, name: true } },
      steps: {
        orderBy: { stepOrder: 'asc' },
        select: { stepOrder: true, title: true, explanation: true, checkpointQuestion: true, checkpointAnswer: true },
      },
    },
    orderBy: [{ skill: { sortOrder: 'asc' } }, { routeType: 'asc' }],
  });

  const total = await prisma.explanationRoute.count({ where: { isActive: true, skill: { subjectId: subject.id } } });
  const done = await prisma.explanationRoute.count({ where: { isActive: true, skill: { subjectId: subject.id }, NOT: { animationGeneratedAt: null } } });

  console.log(`Subject: ${subject.title} (${subject.slug})`);
  console.log(`Progress: ${done}/${total} routes already have animation schemas.`);
  console.log(`Generating: ${routes.length} routes.\n`);

  if (routes.length === 0) {
    console.log('✅ All routes already have animation schemas (or none match your filters).');
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
      const result = EnglishAnimationSchemaValidator.safeParse(schema);

      if (!result.success) {
        console.error(`  ❌ ${label} — validation failed:`, result.error.issues.map(i => i.message).join(', '));
        failed++;
        continue;
      }

      if (DRY_RUN) {
        const s = schema as { steps: object[] };
        const firstStep = s.steps[0] as { visuals?: { type: string }[] } | undefined;
        const firstVisualType = firstStep?.visuals?.[0]?.type ?? 'unknown';
        console.log(`  🔍 ${label} — ${s.steps.length} steps, first visual: ${firstVisualType}`);
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
    const nowDone = await prisma.explanationRoute.count({
      where: { isActive: true, skill: { subjectId: subject.id }, NOT: { animationGeneratedAt: null } },
    });
    console.log(`\nOverall progress: ${nowDone}/${total} English routes have animation schemas.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
