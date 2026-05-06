import { prisma } from '@/db/prisma';

export type CheckPlanSlot = { skillId: string; itemId: string };

/** Stored on LiveSession.checkPlan (JSON) */
export type LiveCheckPlan = {
  shared?: CheckPlanSlot[];
  perStudent?: Record<string, CheckPlanSlot[]>;
};

/** v=1 entries carry an explicit schema version so future migrations can detect old rows. */
export type OpeningCheckQueueEntry = { v: 1; itemId: string; skillId: string };

/**
 * Safely parse the JSON blob stored in LiveParticipant.openingCheckQueue.
 * Accepts both the legacy schema (no `v` field) and the current v=1 schema so
 * in-flight sessions created before the versioning change continue to work.
 */
export function parseOpeningCheckQueue(raw: unknown): OpeningCheckQueueEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: OpeningCheckQueueEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.itemId !== 'string' || typeof e.skillId !== 'string') continue;
    out.push({ v: 1, itemId: e.itemId, skillId: e.skillId });
  }
  return out;
}

function dedupeSequential(slots: CheckPlanSlot[]): CheckPlanSlot[] {
  const seen = new Set<string>();
  const out: CheckPlanSlot[] = [];
  for (const s of slots) {
    const key = `${s.skillId}:${s.itemId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * Validates items belong to subject (or global) and each item is linked to the given skillId (or falls back to first linked skill).
 */
export async function resolveOpeningCheckQueueForParticipant(params: {
  studentUserId: string;
  checkPlan: LiveCheckPlan | null | undefined;
  subjectId: string;
}): Promise<OpeningCheckQueueEntry[]> {
  const { studentUserId, checkPlan, subjectId } = params;
  if (!checkPlan) return [];

  const personal = checkPlan.perStudent?.[studentUserId];
  const rawSlots =
    personal && personal.length > 0 ? personal : checkPlan.shared ?? [];
  const slots = dedupeSequential(rawSlots);
  if (slots.length === 0) return [];

  const itemIds = [...new Set(slots.map((s) => s.itemId))];
  const items = await prisma.item.findMany({
    where: {
      id: { in: itemIds },
      OR: [{ subjectId }, { subjectId: null }],
    },
    select: {
      id: true,
      skills: { select: { skillId: true } },
      liveMetadata: true,
    },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const out: OpeningCheckQueueEntry[] = [];
  for (const slot of slots) {
    const item = itemMap.get(slot.itemId);
    if (!item) continue;

    // Skip items explicitly rated as unsuitable for live delivery.
    const metadata = item.liveMetadata as { liveSuitability?: string } | null;
    if (metadata?.liveSuitability === 'LOW') continue;

    const skillIds = new Set(item.skills.map((x) => x.skillId));
    let skillId = slot.skillId;
    if (!skillIds.has(skillId)) {
      const skillIdArray = [...skillIds];
      if (skillIdArray.length === 0) continue;
      skillId = skillIdArray[0]!;
    }
    out.push({ v: 1, itemId: item.id, skillId });
  }
  return out;
}

/** One example item per skill for the subject (for picker UI). */
export async function fetchSampleItemsBySkillIds(
  skillIds: string[],
  subjectId: string,
  takePerSkill = 12,
): Promise<
  Array<{
    skillId: string;
    items: Array<{ id: string; question: string; type: string; liveMetadata: unknown }>;
  }>
> {
  const uniqueSkills = [...new Set(skillIds)];
  const result: Array<{
    skillId: string;
    items: Array<{ id: string; question: string; type: string; liveMetadata: unknown }>;
  }> = [];

  for (const skillId of uniqueSkills) {
    const links = await prisma.itemSkill.findMany({
      where: {
        skillId,
        item: { OR: [{ subjectId }, { subjectId: null }] },
      },
      select: {
        item: {
          select: {
            id: true,
            question: true,
            type: true,
            liveMetadata: true,
          },
        },
      },
      take: takePerSkill,
    });
    const items = links.map((l) => l.item);
    result.push({ skillId, items });
  }
  return result;
}
