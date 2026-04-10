import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  MappingRow,
  MappingRowSchema,
  deriveStoredItemFromMapping,
  getItemContractIssues,
} from '../src/features/content/questionContract';

const prisma = new PrismaClient();

const QUESTION_BANK_DIR = path.resolve(process.cwd(), 'docs/unit-mapping/question-bank');

function toSlug(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

async function ensureSkill(subjectId: string, code: string) {
  return prisma.skill.findUnique({
    where: { subjectId_code: { subjectId, code } },
  });
}

async function main() {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) {
    throw new Error('Subject ks3-maths not found. Run db:seed first.');
  }

  // Discover all JSONL files in the question-bank directory
  if (!fs.existsSync(QUESTION_BANK_DIR)) {
    throw new Error(`Question bank directory not found: ${QUESTION_BANK_DIR}\nRun content:extract:question-bank first.`);
  }

  const packFiles = fs
    .readdirSync(QUESTION_BANK_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => path.join(QUESTION_BANK_DIR, f));

  if (packFiles.length === 0) {
    console.log('No JSONL files found in question-bank directory. Nothing to import.');
    return;
  }

  const importedSkillCodes = new Set<string>();
  let created = 0;
  let updated = 0;
  let linked = 0;
  let rowsProcessed = 0;
  let skipped = 0;

  for (const filePath of packFiles) {
    const lines = fs
      .readFileSync(filePath, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const raw = JSON.parse(line) as MappingRow;
      const row = MappingRowSchema.parse(raw);
      const derived = deriveStoredItemFromMapping(row);
      const issues = getItemContractIssues({
        question: row.question.stem,
        type: derived.type,
        answer: derived.answer,
        options: derived.options,
      });

      // ORDER contract errors: downgrade to SHORT_TEXT (same as phase1 import)
      const orderIssues = issues.filter(
        (i) =>
          i.severity === 'error' &&
          (i.code === 'order_min_choices' || i.code === 'order_missing_answer_values')
      );
      if (orderIssues.length > 0) {
        console.warn(`  [WARN] ${row.source.question_ref}: ordering contract mismatch — importing as SHORT_TEXT`);
        derived.type = 'SHORT_TEXT';
        derived.options = { choices: [], acceptedAnswers: derived.options.acceptedAnswers };
      }

      const hardIssues = issues.filter((i) => i.severity === 'error' && !orderIssues.includes(i));
      if (hardIssues.length > 0) {
        console.warn(
          `  [SKIP] ${row.source.question_ref}: ${hardIssues.map((i) => i.message).join('; ')}`
        );
        skipped += 1;
        continue;
      }

      const skillCode = row.skills.primary_skill_code;
      const skill = await ensureSkill(subject.id, skillCode);
      if (!skill) {
        console.warn(`  [SKIP] ${row.source.question_ref}: skill ${skillCode} not found in DB (run db:seed first)`);
        skipped += 1;
        continue;
      }

      const questionText = `[${row.source.question_ref}] ${row.question.stem}`;
      const options = {
        ...derived.options,
        meta: {
          question_role: 'practice',
          source: {
            question_ref: row.source.question_ref,
            source_file: row.source.source_file ?? null,
          },
        },
      };

      let item = await prisma.item.findFirst({
        where: { question: questionText, subjectId: subject.id },
      });

      if (!item) {
        item = await prisma.item.create({
          data: {
            subjectId: subject.id,
            type: derived.type,
            question: questionText,
            options,
            answer: derived.answer,
          },
        });
        created += 1;
      } else {
        item = await prisma.item.update({
          where: { id: item.id },
          data: { type: derived.type, options, answer: derived.answer },
        });
        updated += 1;
      }

      const skillCodes = unique([skillCode, ...(row.skills.secondary_skill_codes ?? [])]);
      for (const code of skillCodes) {
        importedSkillCodes.add(code);
        const s = await ensureSkill(subject.id, code);
        if (!s) continue;
        await prisma.itemSkill.upsert({
          where: { itemId_skillId: { itemId: item.id, skillId: s.id } },
          update: {},
          create: { itemId: item.id, skillId: s.id },
        });
        linked += 1;
      }

      rowsProcessed += 1;
    }
  }

  // Archive placeholder items for any skill that now has real questions
  const importedSkills = await prisma.skill.findMany({
    where: { subjectId: subject.id, code: { in: [...importedSkillCodes] } },
    select: { id: true, code: true },
  });

  const placeholderItems = await prisma.item.findMany({
    where: {
      question: { contains: 'Placeholder question', mode: 'insensitive' },
      skills: { some: { skillId: { in: importedSkills.map((s) => s.id) } } },
    },
    select: { id: true, question: true },
  });

  if (placeholderItems.length > 0) {
    const ids = placeholderItems.map((i) => i.id);
    await prisma.itemSkill.deleteMany({ where: { itemId: { in: ids } } });
    for (const p of placeholderItems) {
      await prisma.item.update({
        where: { id: p.id },
        data: {
          subjectId: null,
          question: p.question.startsWith('[ARCHIVED PLACEHOLDER]')
            ? p.question
            : `[ARCHIVED PLACEHOLDER] ${p.question}`,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        importedFiles: packFiles.length,
        rowsProcessed,
        created,
        updated,
        linked,
        skipped,
        importedSkills: [...importedSkillCodes].sort(),
        placeholdersRemoved: placeholderItems.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
