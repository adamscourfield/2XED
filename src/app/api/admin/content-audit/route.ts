import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) return NextResponse.json({ error: 'Subject ks3-maths not found' }, { status: 404 });

  const skills = await prisma.skill.findMany({
    where: { subjectId: subject.id },
    include: {
      items: { include: { item: { select: { id: true, question: true, type: true } } } },
      explanationRoutes: {
        select: {
          id: true,
          routeType: true,
          isActive: true,
          steps: { select: { id: true } },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const skillRows = skills.map((skill) => {
    const linkedItems = skill.items.map((link) => link.item);
    const realItems: typeof linkedItems = [];
    const placeholderItems: typeof linkedItems = [];
    for (const item of linkedItems) {
      if (item.question.includes('Placeholder question')) {
        placeholderItems.push(item);
      } else {
        realItems.push(item);
      }
    }

    const itemTypes: Record<string, number> = {};
    for (const item of realItems) {
      itemTypes[item.type] = (itemTypes[item.type] ?? 0) + 1;
    }

    const activeRoutes = skill.explanationRoutes.filter((r) => r.isActive);
    const routeTypes = new Set(activeRoutes.map((r) => r.routeType));

    const stepsPerRoute: Record<string, number> = {};
    let totalSteps = 0;
    for (const route of activeRoutes) {
      stepsPerRoute[route.routeType] = route.steps.length;
      totalSteps += route.steps.length;
    }

    return {
      code: skill.code,
      name: skill.name,
      strand: skill.strand || 'Unassigned',
      totalItems: linkedItems.length,
      realItems: realItems.length,
      placeholderItems: placeholderItems.length,
      itemTypes,
      routeA: routeTypes.has('A'),
      routeB: routeTypes.has('B'),
      routeC: routeTypes.has('C'),
      totalRoutes: activeRoutes.length,
      totalSteps,
      stepsPerRoute,
    };
  });

  // Group by strand
  const strandMap = new Map<string, (typeof skillRows)[number][]>();
  for (const row of skillRows) {
    const list = strandMap.get(row.strand) ?? [];
    list.push(row);
    strandMap.set(row.strand, list);
  }

  const strands = Array.from(strandMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([strand, rows]) => ({
      strand,
      skillCount: rows.length,
      totalItems: rows.reduce((s, r) => s + r.totalItems, 0),
      realItems: rows.reduce((s, r) => s + r.realItems, 0),
      placeholderItems: rows.reduce((s, r) => s + r.placeholderItems, 0),
      totalRoutes: rows.reduce((s, r) => s + r.totalRoutes, 0),
      totalSteps: rows.reduce((s, r) => s + r.totalSteps, 0),
      fullRouteCoverage: rows.filter((r) => r.routeA && r.routeB && r.routeC).length,
      skills: rows,
    }));

  const summary = {
    generatedAt: new Date().toISOString(),
    subject: subject.slug,
    totalSkills: skillRows.length,
    totalRealItems: skillRows.reduce((s, r) => s + r.realItems, 0),
    totalPlaceholderItems: skillRows.reduce((s, r) => s + r.placeholderItems, 0),
    totalRoutes: skillRows.reduce((s, r) => s + r.totalRoutes, 0),
    totalSteps: skillRows.reduce((s, r) => s + r.totalSteps, 0),
    skillsWithFullRouteCoverage: skillRows.filter((r) => r.routeA && r.routeB && r.routeC).length,
    skillsWithNoRealQuestions: skillRows.filter((r) => r.realItems === 0).length,
    skillsWithNoExplanations: skillRows.filter((r) => r.totalRoutes === 0).length,
  };

  return NextResponse.json({ summary, strands });
}
