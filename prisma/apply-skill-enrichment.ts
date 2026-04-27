/**
 * apply-skill-enrichment.ts
 *
 * Reads prisma/skill-enrichment.json (produced by generate-skill-enrichment.ts,
 * reviewed and edited by a human) and writes each enrichment into the DB.
 *
 * Safe to re-run — uses upsert logic (update if exists, skip if not changed).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' \
 *     prisma/apply-skill-enrichment.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import type { SkillEnrichment } from './generate-skill-enrichment';

const prisma = new PrismaClient();
const INPUT_PATH = path.join(__dirname, 'skill-enrichment.json');

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`skill-enrichment.json not found at ${INPUT_PATH}`);
    console.error('Run generate-skill-enrichment.ts first.');
    process.exit(1);
  }

  const enrichments: SkillEnrichment[] = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
  console.log(`Applying enrichment for ${enrichments.length} skills...`);

  let updated = 0;
  let skipped = 0;

  for (const e of enrichments) {
    const skill = await prisma.skill.findFirst({
      where: { code: e.code },
      select: { id: true, code: true },
    });

    if (!skill) {
      console.warn(`  ⚠ Skill ${e.code} not found in DB — skipping`);
      skipped++;
      continue;
    }

    await prisma.skill.update({
      where: { id: skill.id },
      data: {
        masteryDefinition:    e.masteryDefinition,
        misconceptions:       e.misconceptions       as object,
        difficultyDimensions: e.difficultyDimensions as object,
        transferContexts:     e.transferContexts     as object,
        generativeContext:    e.generativeContext,
      },
    });

    console.log(`  ✓ ${e.code}`);
    updated++;
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
