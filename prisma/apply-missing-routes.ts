/**
 * apply-missing-routes.ts
 *
 * Reads prisma/missing-routes.json and upserts ExplanationRoute +
 * ExplanationStep records for the 52 skills that had no routes.
 *
 * Safe to re-run — all writes use upsert so existing rows are updated.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' \
 *     prisma/apply-missing-routes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env without dotenv dependency
const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { validateExplanationStepWrite } from '../src/features/learn/explanationStepWriteGuard';

const prisma = new PrismaClient();

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteStep {
  stepOrder: number;
  title: string;
  explanation: string;
  checkpointQuestion: string;
  checkpointOptions?: string[];
  checkpointAnswer: string;
}

interface RouteEntry {
  routeType: 'A' | 'B' | 'C';
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  steps: RouteStep[];
}

type RoutesJson = Record<string, RouteEntry[]>;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const jsonPath = path.resolve(__dirname, 'missing-routes.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`missing-routes.json not found at ${jsonPath}`);
  }

  const routesData: RoutesJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const skillCodes = Object.keys(routesData);

  console.log(`Applying routes for ${skillCodes.length} skills from missing-routes.json...\n`);

  // Pre-fetch all relevant skills in one query
  const skills = await prisma.skill.findMany({
    where: { code: { in: skillCodes } },
    select: { id: true, code: true },
  });

  const skillMap = new Map(skills.map(s => [s.code, s.id]));

  const missing = skillCodes.filter(c => !skillMap.has(c));
  if (missing.length > 0) {
    console.warn(`⚠ The following skill codes were not found in DB: ${missing.join(', ')}`);
  }

  let skillsDone = 0;
  let routesDone = 0;
  let stepsDone = 0;
  let errors = 0;

  for (const code of skillCodes) {
    const skillId = skillMap.get(code);
    if (!skillId) continue;

    const routes = routesData[code];
    console.log(`→ ${code} (${routes.length} routes)`);

    for (const route of routes) {
      if (!['A', 'B', 'C'].includes(route.routeType)) {
        console.warn(`  ⚠ Invalid routeType "${route.routeType}" for ${code} — skipping`);
        continue;
      }

      try {
        const upserted = await prisma.explanationRoute.upsert({
          where: { skillId_routeType: { skillId, routeType: route.routeType } },
          create: {
            skillId,
            routeType: route.routeType,
            misconceptionSummary: route.misconceptionSummary ?? '',
            workedExample: route.workedExample ?? '',
            guidedPrompt: route.guidedPrompt ?? '',
            guidedAnswer: route.guidedAnswer ?? '',
            isActive: true,
            defaultPriorityRank:
              route.routeType === 'A' ? 0 : route.routeType === 'B' ? 1 : 2,
          },
          update: {
            misconceptionSummary: route.misconceptionSummary ?? '',
            workedExample: route.workedExample ?? '',
            guidedPrompt: route.guidedPrompt ?? '',
            guidedAnswer: route.guidedAnswer ?? '',
            isActive: true,
          },
        });

        routesDone++;

        const steps = Array.isArray(route.steps) ? route.steps : [];
        for (const step of steps) {
          try {
            const validated = validateExplanationStepWrite({
              checkpointQuestion: step.checkpointQuestion,
              checkpointOptions: step.checkpointOptions ?? [],
              checkpointAnswer: step.checkpointAnswer,
            });

            await prisma.explanationStep.upsert({
              where: {
                explanationRouteId_stepOrder: {
                  explanationRouteId: upserted.id,
                  stepOrder: step.stepOrder,
                },
              },
              create: {
                explanationRouteId: upserted.id,
                stepOrder: step.stepOrder,
                title: step.title ?? '',
                explanation: step.explanation ?? '',
                stepType: 'checkpoint',
                checkpointQuestion: validated.checkpointQuestion,
                checkpointOptions:
                  validated.checkpointOptions as unknown as Prisma.InputJsonValue,
                checkpointAnswer: validated.checkpointAnswer,
                questionType: validated.questionType,
              },
              update: {
                title: step.title ?? '',
                explanation: step.explanation ?? '',
                checkpointQuestion: validated.checkpointQuestion,
                checkpointOptions:
                  validated.checkpointOptions as unknown as Prisma.InputJsonValue,
                checkpointAnswer: validated.checkpointAnswer,
                questionType: validated.questionType,
              },
            });

            stepsDone++;
          } catch (stepErr) {
            console.warn(
              `    ⚠ ${code} Route ${route.routeType} step ${step.stepOrder}: ${(stepErr as Error).message}`,
            );
            errors++;
          }
        }

        console.log(`  ✓ Route ${route.routeType} (${steps.length} steps)`);
      } catch (routeErr) {
        console.error(
          `  ✗ ${code} Route ${route.routeType} failed: ${(routeErr as Error).message}`,
        );
        errors++;
      }
    }

    skillsDone++;
  }

  console.log('\n─────────────────────────────────────────');
  console.log('Done.');
  console.log(`  Skills processed : ${skillsDone}`);
  console.log(`  Routes upserted  : ${routesDone}`);
  console.log(`  Steps upserted   : ${stepsDone}`);
  console.log(`  Errors           : ${errors}`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
