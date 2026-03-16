/**
 * generate-all-animations.ts
 *
 * Batch script to generate animation schema stubs for explanation routes
 * that don't have one yet.
 *
 * Usage:
 *   npx tsx scripts/generate-all-animations.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SCHEMA_VERSION = '1.0.0';

interface AnimationStep {
  stepIndex: number;
  id: string;
  visuals: Array<{ type: string; [key: string]: unknown }>;
  narration: string;
  audioFile: null;
}

function generateStubSchema(route: {
  id: string;
  routeType: string;
  misconceptionSummary: string;
  skill: { code: string; name: string };
  steps: Array<{ stepOrder: number; title: string; explanation: string }>;
}): object {
  const animationSteps: AnimationStep[] = route.steps.map((step, i) => ({
    stepIndex: i,
    id: `${route.skill.code}-${route.routeType}-step-${i}`,
    visuals: [
      {
        type: 'step_reveal',
        lines: [
          { text: step.title, highlight: 'accent' },
          { text: step.explanation.slice(0, 120), highlight: null },
        ],
      },
    ],
    narration: step.explanation.slice(0, 200),
    audioFile: null,
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    skillCode: route.skill.code,
    skillName: route.skill.name,
    routeType: route.routeType,
    routeLabel: `Route ${route.routeType}`,
    misconceptionSummary: route.misconceptionSummary,
    generatedAt: new Date().toISOString(),
    steps: animationSteps,
    misconceptionStrip: {
      text: route.misconceptionSummary,
      audioNarration: route.misconceptionSummary,
    },
    loopable: false,
    pauseAtEndMs: 2000,
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`\n📽️  Animation schema generator (${isDryRun ? 'DRY RUN' : 'LIVE'})`);
  console.log('─'.repeat(60));

  const routes = await prisma.explanationRoute.findMany({
    where: {
      isActive: true,
      animationSchema: null,
    },
    include: {
      skill: { select: { code: true, name: true } },
      steps: {
        orderBy: { stepOrder: 'asc' },
        select: { stepOrder: true, title: true, explanation: true },
      },
    },
  });

  console.log(`Found ${routes.length} routes without animation schemas.\n`);

  if (routes.length === 0) {
    console.log('✅ All routes already have schemas. Nothing to do.');
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const route of routes) {
    if (route.steps.length === 0) {
      console.log(`  ⏭  ${route.skill.code} / ${route.routeType} — no steps, skipping`);
      skipped++;
      continue;
    }

    const schema = generateStubSchema(route);

    if (isDryRun) {
      console.log(`  🔍 ${route.skill.code} / ${route.routeType} — would generate ${route.steps.length} steps`);
    } else {
      await prisma.explanationRoute.update({
        where: { id: route.id },
        data: {
          animationSchema: schema,
          animationVersion: SCHEMA_VERSION,
          animationGeneratedAt: new Date(),
        },
      });
      console.log(`  ✅ ${route.skill.code} / ${route.routeType} — generated ${route.steps.length} steps`);
    }
    updated++;
  }

  console.log(`\n─${'─'.repeat(59)}`);
  console.log(`Updated: ${updated}  |  Skipped: ${skipped}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
