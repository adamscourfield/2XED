import fs from 'fs';
import path from 'path';
import { PrismaClient, ItemReviewCategory, ItemReviewStatus } from '@prisma/client';
import { summarizeQuestionQa } from '../../src/features/items/questionQa';
import {
  applyAutoRepair,
  extractAutoQaIssueCode,
  type SupportedAutoQaIssueCode,
} from '../../src/features/qa/autoRepair';

const prisma = new PrismaClient();

const TARGET_CATEGORIES: ItemReviewCategory[] = [
  ItemReviewCategory.ANSWER_MODE,
  ItemReviewCategory.ANSWER_MAPPING,
  ItemReviewCategory.STEM_COPY,
  ItemReviewCategory.DISTRACTOR_QUALITY,
];

const BATCH_SIZE = Number(process.argv.find((arg) => arg.startsWith('--batch='))?.split('=')[1] ?? 50);

type OpenNote = {
  id: string;
  itemId: string;
  category: ItemReviewCategory;
  note: string;
  createdAt: Date;
};

interface ItemSnapshot {
  id: string;
  question: string;
  type: string;
  answer: string;
  options: unknown;
}

function snapshotFromRepairable(
  itemId: string,
  item: { id?: string; question: string; type: string; answer: string; options: unknown }
): ItemSnapshot {
  return {
    id: item.id ?? itemId,
    question: item.question,
    type: item.type,
    answer: item.answer,
    options: item.options,
  };
}

interface ReportEntry {
  itemId: string;
  noteIds: string[];
  issueCodes: SupportedAutoQaIssueCode[];
  before: ItemSnapshot;
  after?: ItemSnapshot;
  actions?: string[];
  reason?: string;
}

function timestampToken() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function resolutionSummary(actions: string[]): string {
  const uniqueActions = [...new Set(actions)];
  return `[AUTO_RESOLVED:${new Date().toISOString()}] ${uniqueActions.join(' ')}`;
}

function stableStringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function loadAllOpenNotes(): Promise<OpenNote[]> {
  return prisma.itemReviewNote.findMany({
    where: {
      status: ItemReviewStatus.OPEN,
      category: { in: TARGET_CATEGORIES },
      note: { contains: '[AUTO_QA:' },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      itemId: true,
      category: true,
      note: true,
      createdAt: true,
    },
  });
}

function groupByItem(notes: OpenNote[]): Map<string, OpenNote[]> {
  const groups = new Map<string, OpenNote[]>();
  for (const note of notes) {
    if (!groups.has(note.itemId)) groups.set(note.itemId, []);
    groups.get(note.itemId)!.push(note);
  }
  return groups;
}

function itemSnapshot(item: ItemSnapshot): ItemSnapshot {
  return {
    id: item.id,
    question: item.question,
    type: item.type,
    answer: item.answer,
    options: item.options,
  };
}

async function processItemGroup(itemId: string, notes: OpenNote[]) {
  const parsedNotes = notes.map((note) => ({ note, issueCode: extractAutoQaIssueCode(note.note) }));
  const supportedNotes = parsedNotes.filter(
    (entry): entry is { note: OpenNote; issueCode: SupportedAutoQaIssueCode } => entry.issueCode !== null
  );
  const skippedNotes = parsedNotes
    .filter((entry) => entry.issueCode === null)
    .map(({ note }) => ({
      noteId: note.id,
      itemId,
      reason: 'Unsupported AUTO_QA issue code.',
    }));

  if (supportedNotes.length === 0) {
    return {
      repaired: false,
      resolvedNotes: [] as string[],
      unresolved: [] as Array<{ noteId: string; itemId: string; reason: string }>,
      skipped: skippedNotes,
      reportEntry: null as ReportEntry | null,
    };
  }

  const baseItem = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, question: true, type: true, answer: true, options: true },
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const item = baseItem;

      if (!item) {
        return {
          repaired: false,
          resolvedNotes: [] as string[],
          unresolved: supportedNotes.map(({ note }) => ({
            noteId: note.id,
            itemId,
            reason: 'Item not found.',
          })),
          skipped: skippedNotes,
          reportEntry: null as ReportEntry | null,
        };
      }

      const before = itemSnapshot(item);
      const issueCodes = [...new Set(supportedNotes.map((entry) => entry.issueCode))];
      const repaired = applyAutoRepair(item, issueCodes);

      if (repaired.unresolvedReason) {
        throw new Error(repaired.unresolvedReason);
      }

      const afterQa = summarizeQuestionQa(repaired.item);
      const unresolvedCodes = issueCodes.filter((issueCode) =>
        afterQa.issues.some((issue) => issue.code === issueCode)
      );

      if (unresolvedCodes.length > 0) {
        throw new Error(`Issues still present after repair: ${unresolvedCodes.join(', ')}`);
      }

      if (repaired.changed) {
        await tx.item.update({
          where: { id: itemId },
          data: {
            question: repaired.item.question,
            type: repaired.item.type,
            answer: repaired.item.answer,
            options: repaired.item.options as never,
          },
        });
      }

      const resolvedAt = new Date();
      const summary = resolutionSummary(repaired.actions);
      for (const { note } of supportedNotes) {
        await tx.itemReviewNote.update({
          where: { id: note.id },
          data: {
            status: ItemReviewStatus.RESOLVED,
            resolvedAt,
            note: note.note.includes('[AUTO_RESOLVED:')
              ? note.note
              : `${note.note.trim()}\n\n${summary}`,
          },
        });
      }

      return {
        repaired: repaired.changed,
        resolvedNotes: supportedNotes.map(({ note }) => note.id),
        unresolved: [] as Array<{ noteId: string; itemId: string; reason: string }>,
        skipped: skippedNotes,
        reportEntry: {
          itemId,
          noteIds: supportedNotes.map(({ note }) => note.id),
          issueCodes,
          before,
          after: snapshotFromRepairable(itemId, repaired.item),
          actions: repaired.actions,
        } satisfies ReportEntry,
      };
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown repair failure.';
    return {
      repaired: false,
      resolvedNotes: [] as string[],
      unresolved: supportedNotes.map(({ note }) => ({
        noteId: note.id,
        itemId,
        reason,
      })),
      skipped: skippedNotes,
      reportEntry: {
        itemId,
        noteIds: supportedNotes.map(({ note }) => note.id),
        issueCodes: supportedNotes.map(({ issueCode }) => issueCode),
        before: baseItem
          ? itemSnapshot(baseItem)
          : {
              id: itemId,
              question: '',
              type: '',
              answer: '',
              options: null,
            },
        reason,
      } satisfies ReportEntry,
    };
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const repairedEntries: ReportEntry[] = [];
  const unresolvedNotes: Array<{ noteId: string; itemId: string; reason: string }> = [];
  const skippedNotes: Array<{ noteId: string; itemId: string; reason: string }> = [];
  let repairedItemCount = 0;
  let resolvedNotesCount = 0;

  const allNotes = await loadAllOpenNotes();
  for (let index = 0; index < allNotes.length; index += BATCH_SIZE) {
    const notes = allNotes.slice(index, index + BATCH_SIZE);
    const itemGroups = groupByItem(notes);
    for (const [itemId, groupedNotes] of itemGroups.entries()) {
      const result = await processItemGroup(itemId, groupedNotes);
      if (result.repaired) repairedItemCount += 1;
      resolvedNotesCount += result.resolvedNotes.length;
      unresolvedNotes.push(...result.unresolved);
      skippedNotes.push(...result.skipped);
      if (result.reportEntry) repairedEntries.push(result.reportEntry);
    }
  }

  const finishedAt = new Date().toISOString();
  const report = {
    startedAt,
    finishedAt,
    batchSize: BATCH_SIZE,
    repairedItemCount,
    resolvedNotesCount,
    unresolvedNotes,
    skippedNotes,
    repairedEntries,
  };

  const reportPath = path.join(
    process.cwd(),
    'docs',
    'qa',
    `auto-repair-run-${timestampToken()}.json`
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${stableStringify(report)}\n`);

  console.log(
    JSON.stringify(
      {
        reportPath,
        repairedItemCount,
        resolvedNotesCount,
        unresolvedNotes: unresolvedNotes.length,
        skippedNotes: skippedNotes.length,
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
