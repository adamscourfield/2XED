import { prisma } from '../src/db/prisma';
import { inferLiveItemMetadata, toPrismaJson } from '../src/lib/live/liveItemMetadata';

async function main() {
  const liveAttempts = await prisma.liveAttempt.findMany({
    select: { itemId: true, correct: true },
  });
  const attemptStats = new Map<string, { total: number; correct: number }>();
  for (const attempt of liveAttempts) {
    const existing = attemptStats.get(attempt.itemId) ?? { total: 0, correct: 0 };
    existing.total += 1;
    if (attempt.correct) existing.correct += 1;
    attemptStats.set(attempt.itemId, existing);
  }

  const items = await prisma.item.findMany({
    select: {
      id: true,
      question: true,
      type: true,
      options: true,
      answer: true,
      misconceptionMap: true,
      liveMetadata: true,
    },
  });

  let updated = 0;
  const purposeCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};
  const suitabilityCounts: Record<string, number> = {};

  for (const item of items) {
    const metadata = inferLiveItemMetadata({
      question: item.question,
      type: item.type,
      options: item.options,
      answer: item.answer,
      misconceptionMap: item.misconceptionMap,
      source: 'BACKFILLED',
    });

    const stats = attemptStats.get(item.id);
    if (stats && stats.total >= 5) {
      const wrongRate = 1 - stats.correct / stats.total;
      if (wrongRate >= 0.65) metadata.difficultyBand = 'CHALLENGE';
      else if (wrongRate <= 0.2) metadata.difficultyBand = 'EASIER';
    }

    purposeCounts[metadata.itemPurpose] = (purposeCounts[metadata.itemPurpose] ?? 0) + 1;
    difficultyCounts[metadata.difficultyBand] = (difficultyCounts[metadata.difficultyBand] ?? 0) + 1;
    suitabilityCounts[metadata.liveSuitability] = (suitabilityCounts[metadata.liveSuitability] ?? 0) + 1;

    if (JSON.stringify(item.liveMetadata) === JSON.stringify(metadata)) continue;

    await prisma.item.update({
      where: { id: item.id },
      data: { liveMetadata: toPrismaJson(metadata) },
    });
    updated += 1;
  }

  console.log(JSON.stringify({
    total: items.length,
    updated,
    purposeCounts,
    difficultyCounts,
    suitabilityCounts,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
