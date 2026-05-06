import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const routeCount = await prisma.explanationRoute.count();
  const stepCount = await prisma.explanationStep.count();
  const enrichedSkills = await prisma.skill.count({ where: { masteryDefinition: { not: null } } });
  const skillsWithRoutes = await prisma.explanationRoute.groupBy({
    by: ['skillId'],
    _count: true,
  });

  console.log('ExplanationRoute rows :', routeCount);
  console.log('ExplanationStep rows  :', stepCount);
  console.log('Enriched skills       :', enrichedSkills);
  console.log('Skills with any route :', skillsWithRoutes.length);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
