import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { buildUnit1VisualBackfill } from '../src/features/learn/unit1VisualBackfill';

const prisma = new PrismaClient();

type ReportRow = {
  itemId: string;
  primarySkillCode: string;
  question: string;
  type: string;
  status: 'already_stored' | 'generated' | 'manual_review' | 'not_needed';
  reason: string;
};

function timestampForFile(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function asJsonObject(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

async function main() {
  const now = new Date();
  const reportDir = path.resolve(process.cwd(), 'docs/qa');
  fs.mkdirSync(reportDir, { recursive: true });

  const items = await prisma.item.findMany({
    where: {
      skills: {
        some: {
          skill: {
            OR: [{ code: { startsWith: 'N1.' } }, { code: { startsWith: 'N2.' } }],
          },
        },
      },
    },
    include: {
      skills: {
        include: {
          skill: {
            select: { code: true, sortOrder: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const reportRows: ReportRow[] = [];
  let generatedCount = 0;
  let alreadyStoredCount = 0;
  let manualReviewCount = 0;
  let notNeededCount = 0;

  for (const item of items) {
    const orderedSkills = [...item.skills].sort(
      (a, b) => (a.skill.sortOrder ?? 9999) - (b.skill.sortOrder ?? 9999) || a.skill.code.localeCompare(b.skill.code)
    );
    const primarySkillCode = orderedSkills[0]?.skill.code ?? '';
    const result = buildUnit1VisualBackfill({
      question: item.question,
      answer: item.answer,
      type: item.type,
      options: item.options,
      primarySkillCode,
    });

    reportRows.push({
      itemId: item.id,
      primarySkillCode,
      question: item.question,
      type: item.type,
      status: result.status,
      reason: result.reason,
    });

    if (result.status === 'generated') {
      generatedCount += 1;
      const options =
        item.options && typeof item.options === 'object' && !Array.isArray(item.options)
          ? ({ ...(item.options as Record<string, unknown>) } as Record<string, unknown>)
          : {};
      options.visuals = result.visuals as unknown as Prisma.InputJsonValue;
      options.visualMeta = {
        source: 'unit1-backfill',
        generatedAt: now.toISOString(),
        primarySkillCode,
      };

      await prisma.item.update({
        where: { id: item.id },
        data: {
          options: asJsonObject(options),
        },
      });
    } else if (result.status === 'already_stored') {
      alreadyStoredCount += 1;
    } else if (result.status === 'manual_review') {
      manualReviewCount += 1;
    } else {
      notNeededCount += 1;
    }
  }

  const report = {
    generatedAt: now.toISOString(),
    scope: 'Unit 1 items linked to N1.* or N2.* skills',
    summary: {
      totalItems: items.length,
      generated: generatedCount,
      alreadyStored: alreadyStoredCount,
      manualReview: manualReviewCount,
      notNeeded: notNeededCount,
    },
    manualReviewItems: reportRows.filter((row) => row.status === 'manual_review'),
    generatedItems: reportRows.filter((row) => row.status === 'generated').map((row) => ({
      itemId: row.itemId,
      primarySkillCode: row.primarySkillCode,
      question: row.question,
    })),
  };

  const reportPath = path.join(reportDir, `unit1-visual-backfill-${timestampForFile(now)}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(
    JSON.stringify(
      {
        reportPath,
        summary: report.summary,
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
