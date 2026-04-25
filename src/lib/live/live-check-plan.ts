import { prisma } from '@/db/prisma';

export type CheckPlanSlot = { skillId: string; itemId: string };

/** Stored on LiveSession.checkPlan (JSON) */
export type LiveCheckPlan = {
  shared?: CheckPlanSlot[];
  perStudent?: Record<string, CheckPlanSlot[]>;
};

export type OpeningCheckQueueEntry = { itemId: string; skillId: string };

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
    select: { id: true, skills: { select: { skillId: true } } },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const out: OpeningCheckQueueEntry[] = [];
  for (const slot of slots) {
    const item = itemMap.get(slot.itemId);
    if (!item) continue;
    const skillIds = new Set(item.skills.map((x) => x.skillId));
    let skillId = slot.skillId;
    if (!skillIds.has(skillId)) {
      const alt = [...skillIds][0];
      if (!alt) continue;
      skillId = alt;
    }
    out.push({ itemId: item.id, skillId });
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
    items: Array<{ id: string; question: string; type: string }>;
  }>
> {
  const uniqueSkills = [...new Set(skillIds)];
  const result: Array<{
    skillId: string;
    items: Array<{ id: string; question: string; type: string }>;
  }> = [];

  for (const skillId of uniqueSkills) {
    const links = await prisma.itemSkill.findMany({
      where: { skillId },
      select: {
        item: {
          select: {
            id: true,
            question: true,
            type: true,
            subjectId: true,
          },
        },
      },
      take: 80,
    });
    const items = links
      .map((l) => l.item)
      .filter((it) => it.subjectId === subjectId || it.subjectId === null)
      .slice(0, takePerSkill);
    result.push({ skillId, items });
  }
  return result;
}
