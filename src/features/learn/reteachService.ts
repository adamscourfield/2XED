import { prisma } from '@/db/prisma';
import { getReteachPlan, type RouteType, type ReteachPlan } from './reteachContent';

export async function getReteachPlanForSkill(skillId: string, routeType: RouteType): Promise<ReteachPlan> {
  const strictDbMode = process.env.RETEACH_DB_REQUIRED === 'true';

  const route = await prisma.explanationRoute.findUnique({
    where: { skillId_routeType: { skillId, routeType } },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  if (!route || route.steps.length === 0) {
    if (strictDbMode) {
      throw new Error(
        `Missing DB reteach content for skillId=${skillId}, routeType=${routeType}. Set RETEACH_DB_REQUIRED=false to allow fallback.`
      );
    }
    return getReteachPlan(routeType);
  }

  return {
    misconceptionSummary: route.misconceptionSummary,
    workedExample: route.workedExample,
    guidedPrompt: route.guidedPrompt,
    guidedAnswer: route.guidedAnswer,
    steps: route.steps.map((s) => ({
      title: s.title,
      explanation: s.explanation,
      checkpointQuestion: s.checkpointQuestion,
      checkpointOptions: (s.checkpointOptions as string[]) ?? [],
      checkpointAnswer: s.checkpointAnswer,
      alternativeHint: s.alternativeHint ?? undefined,
    })),
  };
}
