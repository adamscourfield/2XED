/**
 * audit-explanation-content.ts
 *
 * Audits the ExplanationRoute / ExplanationStep content in the DB and reports:
 *   1. Skills with missing or incomplete routes
 *   2. Routes missing animation data
 *   3. Steps with fallback placeholder values
 *   4. Summary counts
 *
 * Run:
 *   ./node_modules/.bin/ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/audit-explanation-content.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPECTED_ROUTES = ['A', 'B', 'C'];
const EXPECTED_STEPS_PER_ROUTE = 3;
const FALLBACK_ANSWER = 'See explanation above.';
const FALLBACK_QUESTION_PREFIX = 'Answer a question about';

async function main() {
  console.log('🔍 Auditing ExplanationRoute content...\n');

  // ── 1. All skills that have at least one ExplanationRoute ──────────────────
  const skills = await prisma.skill.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      explanationRoutes: {
        select: {
          id: true,
          routeType: true,
          animationSchema: true,
          animationVersion: true,
          animationGeneratedAt: true,
          steps: {
            select: {
              stepOrder: true,
              checkpointQuestion: true,
              checkpointAnswer: true,
            },
            orderBy: { stepOrder: 'asc' },
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const skillsWithRoutes = skills.filter((s: typeof skills[number]) => s.explanationRoutes.length > 0);
  const skillsWithoutRoutes = skills.filter((s: typeof skills[number]) => s.explanationRoutes.length === 0);

  // ── 2. Per-skill route completeness ───────────────────────────────────────
  const missingRoutes: { code: string; title: string | null; missing: string[] }[] = [];
  const incompleteSteps: { code: string; routeType: string; stepCount: number }[] = [];

  for (const skill of skillsWithRoutes) {
    const presentTypes = skill.explanationRoutes.map(r => r.routeType);
    const missing = EXPECTED_ROUTES.filter(r => !presentTypes.includes(r));
    if (missing.length > 0) {
      missingRoutes.push({ code: skill.code, title: skill.title, missing });
    }
    for (const route of skill.explanationRoutes) {
      if (route.steps.length < EXPECTED_STEPS_PER_ROUTE) {
        incompleteSteps.push({
          code: skill.code,
          routeType: route.routeType,
          stepCount: route.steps.length,
        });
      }
    }
  }

  // ── 3. Animation coverage ─────────────────────────────────────────────────
  const allRoutes = skillsWithRoutes.flatMap(s => s.explanationRoutes);
  const routesWithAnimation = allRoutes.filter(r => r.animationSchema !== null);
  const routesWithoutAnimation = allRoutes.filter(r => r.animationSchema === null);

  // ── 4. Fallback placeholder steps ─────────────────────────────────────────
  const fallbackSteps: { code: string; routeType: string; stepOrder: number; field: string; value: string }[] = [];

  for (const skill of skillsWithRoutes) {
    for (const route of skill.explanationRoutes) {
      for (const step of route.steps) {
        if (step.checkpointAnswer === FALLBACK_ANSWER) {
          fallbackSteps.push({
            code: skill.code,
            routeType: route.routeType,
            stepOrder: step.stepOrder,
            field: 'checkpointAnswer',
            value: step.checkpointAnswer,
          });
        }
        if (step.checkpointQuestion.startsWith(FALLBACK_QUESTION_PREFIX)) {
          fallbackSteps.push({
            code: skill.code,
            routeType: route.routeType,
            stepOrder: step.stepOrder,
            field: 'checkpointQuestion',
            value: step.checkpointQuestion,
          });
        }
      }
    }
  }

  // ── Output ─────────────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total skills in DB:               ${skills.length}`);
  console.log(`  Skills with explanation routes:   ${skillsWithRoutes.length}`);
  console.log(`  Skills WITHOUT any routes:        ${skillsWithoutRoutes.length}`);
  console.log(`  Total routes:                     ${allRoutes.length}`);
  console.log(`  Routes with animation:            ${routesWithAnimation.length}`);
  console.log(`  Routes WITHOUT animation:         ${routesWithoutAnimation.length}`);
  console.log(`  Steps with fallback placeholders: ${fallbackSteps.length}`);
  console.log();

  // ── Skills with no routes ──────────────────────────────────────────────────
  if (skillsWithoutRoutes.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ⚠️  SKILLS WITH NO EXPLANATION ROUTES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const s of skillsWithoutRoutes) {
      console.log(`  ${s.code.padEnd(10)}  ${s.title ?? '(no title)'}`);
    }
    console.log();
  }

  // ── Skills with incomplete routes ─────────────────────────────────────────
  if (missingRoutes.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ⚠️  SKILLS WITH MISSING ROUTE TYPES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const s of missingRoutes) {
      console.log(`  ${s.code.padEnd(10)}  missing routes: ${s.missing.join(', ')}  — ${s.title ?? '(no title)'}`);
    }
    console.log();
  }

  // ── Routes with too few steps ─────────────────────────────────────────────
  if (incompleteSteps.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ⚠️  ROUTES WITH FEWER THAN 3 STEPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const r of incompleteSteps) {
      console.log(`  ${r.code.padEnd(10)}  Route ${r.routeType}  — ${r.stepCount} step(s)`);
    }
    console.log();
  }

  // ── Fallback placeholder steps ────────────────────────────────────────────
  if (fallbackSteps.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ⚠️  STEPS WITH FALLBACK PLACEHOLDER VALUES');
    console.log('     (needs manual review / real content)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const s of fallbackSteps) {
      console.log(`  ${s.code.padEnd(10)}  Route ${s.routeType}  step ${s.stepOrder}  [${s.field}]`);
      console.log(`             "${s.value}"`);
    }
    console.log();
  }

  // ── Animation breakdown ───────────────────────────────────────────────────
  if (routesWithoutAnimation.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ℹ️  ROUTES WITHOUT ANIMATION (animationSchema = null)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Group by skill for readability
    const bySkill: Record<string, string[]> = {};
    for (const skill of skillsWithRoutes) {
      const missing = skill.explanationRoutes
        .filter(r => r.animationSchema === null)
        .map(r => r.routeType);
      if (missing.length > 0) {
        bySkill[skill.code] = missing;
      }
    }
    for (const [code, routes] of Object.entries(bySkill)) {
      console.log(`  ${code.padEnd(10)}  routes without animation: ${routes.join(', ')}`);
    }
    console.log();
  }

  if (
    missingRoutes.length === 0 &&
    incompleteSteps.length === 0 &&
    fallbackSteps.length === 0 &&
    skillsWithoutRoutes.length === 0
  ) {
    console.log('✅ All seeded skills have complete routes and steps with real content.');
    if (routesWithoutAnimation.length > 0) {
      console.log(`ℹ️  ${routesWithoutAnimation.length} routes are still pending animation generation.`);
    }
  }

  console.log();
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
