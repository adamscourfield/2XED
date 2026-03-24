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

const PACK_FILES = [
  'docs/unit-mapping/review-pack-english-y7-foundation.jsonl',
] as const;

const ENGLISH_SKILL_META: Record<string, { name: string; strand: string; sortOrder: number }> = {
  'Y7-CON-03': { name: 'Explain how a character is presented', strand: 'CON', sortOrder: 10 },
  'Y7-ANA-04': { name: 'Explain evidence clearly', strand: 'ANA', sortOrder: 20 },
  'Y7-CON-05': { name: 'Explain how a moment links to a theme', strand: 'CON', sortOrder: 30 },
  'Y7-WRT-04': { name: 'Show emotion instead of telling it directly', strand: 'WRT', sortOrder: 40 },
  // Gothic unit nodes
  'Y7-LIT-01': { name: 'Recall and apply Gothic conventions', strand: 'LIT', sortOrder: 50 },
  'Y7-CRA-02': { name: 'Explain how setting creates atmosphere', strand: 'CRA', sortOrder: 60 },
  'Y7-ANA-06': { name: 'Plan and write a What-How-Why analytical paragraph', strand: 'ANA', sortOrder: 70 },
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function toSlug(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function ensureSkill(subjectId: string, code: string) {
  const existing = await prisma.skill.findUnique({
    where: { subjectId_code: { subjectId, code } },
  });
  if (existing) return existing;

  const meta = ENGLISH_SKILL_META[code];
  if (!meta) return null;

  return prisma.skill.create({
    data: {
      subjectId,
      code,
      slug: toSlug(code),
      name: meta.name,
      strand: meta.strand,
      sortOrder: meta.sortOrder,
      isStretch: false,
    },
  });
}

async function main() {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-english' } });
  if (!subject) {
    throw new Error('Subject ks3-english not found. Run db:seed:english first.');
  }

  const importedSkillCodes = new Set<string>();
  let created = 0;
  let updated = 0;
  let linked = 0;
  let rowsProcessed = 0;

  for (const relativePath of PACK_FILES) {
    const mappingPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(mappingPath)) {
      throw new Error(`Mapping file not found: ${mappingPath}`);
    }

    const lines = fs
      .readFileSync(mappingPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const raw = JSON.parse(line);
      const row = MappingRowSchema.parse(raw);
      const derived = deriveStoredItemFromMapping(row);
      const issues = getItemContractIssues({
        question: row.question.stem,
        type: derived.type,
        answer: derived.answer,
        options: derived.options,
      });
      const hardIssues = issues.filter((issue) => issue.severity === 'error');
      if (hardIssues.length > 0) {
        throw new Error(
          `Invalid mapped question ${row.source.question_ref}: ${hardIssues.map((issue) => issue.message).join('; ')}`
        );
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
          data: {
            type: derived.type,
            options,
            answer: derived.answer,
          },
        });
        updated += 1;
      }

      const skillCodes = unique([row.skills.primary_skill_code, ...(row.skills.secondary_skill_codes ?? [])]);
      for (const code of skillCodes) {
        importedSkillCodes.add(code);
        const skill = await ensureSkill(subject.id, code);
        if (!skill) {
          console.warn(`Skipping missing skill ${code} for ${row.source.question_ref}`);
          continue;
        }

        await prisma.itemSkill.upsert({
          where: { itemId_skillId: { itemId: item.id, skillId: skill.id } },
          update: {},
          create: { itemId: item.id, skillId: skill.id },
        });
        linked += 1;
      }

      rowsProcessed += 1;
    }
  }

  const importedSkills = await prisma.skill.findMany({
    where: {
      subjectId: subject.id,
      code: { in: [...importedSkillCodes] },
    },
    select: { id: true, code: true },
  });

  const placeholderItems = await prisma.item.findMany({
    where: {
      question: { contains: 'Placeholder question', mode: 'insensitive' },
      skills: {
        some: {
          skillId: { in: importedSkills.map((skill) => skill.id) },
        },
      },
    },
    select: { id: true, question: true },
  });

  if (placeholderItems.length > 0) {
    const placeholderIds = placeholderItems.map((item) => item.id);
    await prisma.itemSkill.deleteMany({ where: { itemId: { in: placeholderIds } } });

    for (const item of placeholderItems) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          subjectId: null,
          question: item.question.startsWith('[ARCHIVED PLACEHOLDER]')
            ? item.question
            : `[ARCHIVED PLACEHOLDER] ${item.question}`,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        importedPacks: PACK_FILES.length,
        rowsProcessed,
        created,
        updated,
        linked,
        importedSkills: importedSkills.map((skill) => skill.code).sort(),
        placeholdersRemoved: placeholderItems.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
