import type { PrismaClient } from '@prisma/client';

export type ExplainBridgeOption = 'easier' | 'wrong-vs-right' | 'misconception' | 'comparison';

/** Ordered route types to try per bridging intent (matches A/B/C pedagogy lanes in the DB). */
const ROUTE_PRIORITY: Record<ExplainBridgeOption, string[]> = {
  easier: ['A', 'B', 'C'],
  'wrong-vs-right': ['B', 'A', 'C'],
  misconception: ['C', 'B', 'A'],
  comparison: ['B', 'C', 'A'],
};

export interface ExplainBridgePayload {
  headline: string;
  body: string;
  routeType: string;
  explanationId?: string;
}

function normalizeWeaknessTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function routeWeaknessScore(summary: string, tags: string[]): number {
  const haystack = summary.toLowerCase();
  return tags.reduce((score, tag) => (haystack.includes(tag) ? score + 1 : score), 0);
}

function formatBody(misconceptionSummary: string, workedExample: string): string {
  const m = misconceptionSummary.trim();
  const w = workedExample.trim();
  if (m && w) return `${m}\n\n${w}`;
  return m || w || '';
}

/**
 * Resolves a concrete ExplanationRoute for the live teacher canvas from skill + bridging intent.
 */
export async function resolveExplainBridgeForSkill(
  prisma: PrismaClient,
  skillId: string,
  option: ExplainBridgeOption,
): Promise<ExplainBridgePayload | null> {
  const priority = ROUTE_PRIORITY[option];
  const routes = await prisma.explanationRoute.findMany({
    where: { skillId, isActive: true, routeType: { in: priority } },
    select: {
      id: true,
      routeType: true,
      misconceptionSummary: true,
      workedExample: true,
    },
  });
  const byType = new Map(routes.map((r) => [r.routeType, r]));
  for (const rt of priority) {
    const row = byType.get(rt);
    if (row) {
      const body = formatBody(row.misconceptionSummary, row.workedExample);
      if (!body) continue;
      const intentLabel =
        option === 'easier'
          ? 'Easier model'
          : option === 'wrong-vs-right'
            ? 'Wrong vs right'
            : option === 'misconception'
              ? 'Misconception repair'
              : 'Comparison example';
      return {
        headline: `${intentLabel} (route ${row.routeType})`,
        body,
        routeType: row.routeType,
        explanationId: row.id,
      };
    }
  }

  const perf = await prisma.explanationPerformance.findFirst({
    where: { skillId },
    orderBy: { dle: 'desc' },
    include: {
      explanation: {
        select: {
          id: true,
          routeType: true,
          misconceptionSummary: true,
          workedExample: true,
        },
      },
    },
  });
  if (perf?.explanation) {
    const e = perf.explanation;
    const body = formatBody(e.misconceptionSummary, e.workedExample);
    if (body) {
      return {
        headline: `Explanation (route ${e.routeType})`,
        body,
        routeType: e.routeType,
        explanationId: e.id,
      };
    }
  }

  return null;
}

export function collectSkillIdsFromLiveSession(
  phases: unknown,
  primarySkillId: string | null | undefined,
): string[] {
  const out: string[] = [];
  if (primarySkillId) out.push(primarySkillId);
  if (Array.isArray(phases)) {
    for (const p of phases) {
      if (p && typeof p === 'object' && 'skillId' in p) {
        const sid = (p as { skillId?: unknown }).skillId;
        if (typeof sid === 'string' && sid.length > 0) out.push(sid);
      }
    }
  }
  return [...new Set(out)];
}

/**
 * Pick a skill to rank explanations against: prefer the weakest skill (by correct rate) among session skills when there is attempt data.
 */
export function pickSkillIdForExplanationRecommendation(params: {
  phases: unknown;
  primarySkillId: string | null | undefined;
  responseSummary: Array<{ skillId: string; answeredCount: number; correctCount: number }>;
}): string | null {
  const skillIds = collectSkillIdsFromLiveSession(params.phases, params.primarySkillId);
  if (skillIds.length === 0) return null;
  const withData = params.responseSummary.filter(
    (r) => skillIds.includes(r.skillId) && r.answeredCount > 0,
  );
  if (withData.length === 0) return skillIds[0] ?? null;
  const ranked = [...withData].sort((a, b) => {
    const ra = a.correctCount / a.answeredCount;
    const rb = b.correctCount / b.answeredCount;
    return ra - rb;
  });
  return ranked[0]?.skillId ?? skillIds[0] ?? null;
}

export type RecommendedExplanationSnapshot = {
  explanationId: string;
  skillId: string;
  dle: number;
  routeType: string;
  misconceptionSummary: string;
  workedExample: string;
  /** Present when the route has a generated animation (teacher preview / metadata). */
  animationSchema: unknown | null;
};

/** Top DLE explanation route for the focus skill (weakest by attempt data when available). */
export async function getRecommendedExplanationForLiveSession(
  prisma: PrismaClient,
  params: {
    phases: unknown;
    primarySkillId: string | null | undefined;
    responseSummary: Array<{ skillId: string; answeredCount: number; correctCount: number }>;
    weaknessTags?: string[];
  },
): Promise<RecommendedExplanationSnapshot | null> {
  const focusSkillId = pickSkillIdForExplanationRecommendation(params);
  if (!focusSkillId) return null;

  const weaknessTags = normalizeWeaknessTags(params.weaknessTags);
  const candidates = await prisma.explanationPerformance.findMany({
    where: { skillId: focusSkillId },
    include: {
      explanation: {
        select: {
          id: true,
          routeType: true,
          misconceptionSummary: true,
          workedExample: true,
          animationSchema: true,
        },
      },
    },
    orderBy: { dle: 'desc' },
  });

  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort((a, b) => {
    const weaknessDelta = routeWeaknessScore(b.explanation.misconceptionSummary ?? '', weaknessTags)
      - routeWeaknessScore(a.explanation.misconceptionSummary ?? '', weaknessTags);
    if (weaknessDelta !== 0) return weaknessDelta;
    return b.dle - a.dle;
  });

  const top = ranked[0]!;

  return {
    explanationId: top.explanationId,
    skillId: top.skillId,
    dle: top.dle,
    routeType: top.explanation.routeType,
    misconceptionSummary: top.explanation.misconceptionSummary,
    workedExample: top.explanation.workedExample,
    animationSchema: top.explanation.animationSchema,
  };
}
