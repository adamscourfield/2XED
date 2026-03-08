import { prisma } from '@/db/prisma';
import { getReteachPlan, type RouteType, type ReteachPlan } from './reteachContent';

export async function getReteachPlanForSkill(skillId: string, routeType: RouteType): Promise<ReteachPlan> {
  const route = await prisma.explanationRoute.findUnique({
    where: { skillId_routeType: { skillId, routeType } },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  if (!route || route.steps.length === 0) {
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
