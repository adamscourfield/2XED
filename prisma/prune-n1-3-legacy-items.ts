/**
 * prune-n1-3-legacy-items.ts
 *
 * Archives legacy N1.3 items that were ingested via the old content-ingestion
 * pipeline and do not originate from the Phase 1 review packs.
 *
 * Background
 * ----------
 * The DB contains ~136 items for N1.3 (Compare two numbers using =, ≠, <, >, ≤, ≥).
 * 57 of these are MCQ, which violates the review rules for this skill
 * (TRUE_FALSE for statement checks; SHORT_TEXT for symbol insertion).
 * All Phase 1 review-pack items have a question prefix of the form
 * "[SlideN-N1.3-...]", e.g. "[Slide17-N1.3-ONB-01] True or false: …".
 * Legacy items do not have this prefix.
 *
 * Action
 * ------
 * 1. Find all items linked to the N1.3 skill.
 * 2. Items whose question text begins with "[Slide" are review-pack items → keep.
 * 3. All other items (legacy ingestion) → archive (prefix with [ARCHIVED LEGACY]).
 *
 * Run AFTER import-phase1-unit1 so the review-pack items are already present.
 *
 * Usage
 * -----
 *   npx ts-node prisma/prune-n1-3-legacy-items.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) throw new Error('Subject ks3-maths not found. Run db:seed first.');

  const skill = await prisma.skill.findUnique({
    where: { subjectId_code: { subjectId: subject.id, code: 'N1.3' } },
  });
  if (!skill) throw new Error('Skill N1.3 not found. Run db:import:phase1-unit1 first.');

  // All items linked to N1.3
  const itemSkills = await prisma.itemSkill.findMany({
    where: { skillId: skill.id },
    include: { item: { select: { id: true, question: true, type: true } } },
  });

  const all = itemSkills.map((is) => is.item);

  const reviewPackItems = all.filter((i) => i.question.startsWith('[Slide'));
  const legacyItems = all.filter((i) => !i.question.startsWith('[Slide'));
  const alreadyArchived = legacyItems.filter((i) =>
    i.question.startsWith('[ARCHIVED LEGACY]')
  );
  const toArchive = legacyItems.filter((i) => !i.question.startsWith('[ARCHIVED LEGACY]'));

  console.log('N1.3 item summary:');
  console.log('  Total linked:', all.length);
  console.log('  Review-pack items (keep):', reviewPackItems.length);
  console.log('  Legacy items:', legacyItems.length);
  console.log('    Already archived:', alreadyArchived.length);
  console.log('    To archive now:', toArchive.length);

  if (toArchive.length === 0) {
    console.log('\nNothing to archive.');
    return;
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN — no changes made. First 10 items that would be archived:');
    for (const item of toArchive.slice(0, 10)) {
      console.log(`  [${item.type}] ${item.question.slice(0, 80)}`);
    }
    return;
  }

  console.log('\nArchiving legacy items…');
  let archived = 0;
  for (const item of toArchive) {
    // Unlink from all skills first
    await prisma.itemSkill.deleteMany({ where: { itemId: item.id } });
    // Prefix question and clear subjectId to remove from active pool
    await prisma.item.update({
      where: { id: item.id },
      data: {
        subjectId: null,
        question: `[ARCHIVED LEGACY] ${item.question}`,
      },
    });
    archived += 1;
  }

  console.log(`Done. Archived ${archived} legacy N1.3 items.`);
  console.log(`Remaining active N1.3 items: ${reviewPackItems.length + alreadyArchived.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
