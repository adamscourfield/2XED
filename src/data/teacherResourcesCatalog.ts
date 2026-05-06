import { prisma } from '@/db/prisma';

export type TeacherResourceRouteDTO = {
  id: string;
  routeType: string;
  skillId: string;
  skillCode: string;
  skillName: string;
  strand: string;
  subjectId: string;
  subjectTitle: string;
  misconceptionSummary: string;
  updatedAt: string;
  stepCount: number;
};

export type TeacherResourceStrandFolderDTO = {
  id: string;
  label: string;
  count: number;
  accent: string;
};

export type TeacherResourceRecentSessionDTO = {
  id: string;
  title: string;
  phaseCount: number;
  endedAt: string | null;
};

export type TeacherResourceAiRowDTO = {
  id: string;
  title: string;
  typeLabel: string;
  context: string;
};

export type TeacherResourcesPayload = {
  subjects: { id: string; title: string; slug: string }[];
  subjectId: string | null;
  routes: TeacherResourceRouteDTO[];
  strandFolders: TeacherResourceStrandFolderDTO[];
  categoryCounts: { id: 'all' | 'A' | 'B' | 'C'; count: number }[];
  aiSuggestions: TeacherResourceAiRowDTO[];
  recentSessions: TeacherResourceRecentSessionDTO[];
};

const ROUTE_FOLDER_ACCENTS = [
  'from-violet-500/15 to-violet-600/5 text-violet-700',
  'from-emerald-500/15 to-emerald-600/5 text-emerald-800',
  'from-sky-500/15 to-sky-600/5 text-sky-800',
  'from-orange-500/15 to-amber-500/5 text-orange-900',
  'from-pink-500/15 to-rose-500/5 text-rose-800',
  'from-indigo-500/15 to-indigo-600/5 text-indigo-900',
  'from-teal-500/15 to-teal-600/5 text-teal-900',
  'from-fuchsia-500/15 to-fuchsia-600/5 text-fuchsia-900',
] as const;

function phaseCount(phases: unknown): number {
  if (!phases || !Array.isArray(phases)) return 0;
  return phases.length;
}

export async function loadTeacherResourcesData(params: {
  teacherUserId: string;
  subjectId: string | null;
}): Promise<TeacherResourcesPayload> {
  const subjects = await prisma.subject.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { title: 'asc' },
  });

  const subjectId =
    params.subjectId && subjects.some((s) => s.id === params.subjectId)
      ? params.subjectId
      : subjects[0]?.id ?? null;

  if (!subjectId) {
    return {
      subjects,
      subjectId: null,
      routes: [],
      strandFolders: [],
      categoryCounts: [
        { id: 'all', count: 0 },
        { id: 'A', count: 0 },
        { id: 'B', count: 0 },
        { id: 'C', count: 0 },
      ],
      aiSuggestions: [],
      recentSessions: [],
    };
  }

  const [routesRaw, recentSessionsRaw] = await Promise.all([
    prisma.explanationRoute.findMany({
      where: { isActive: true, skill: { subjectId } },
      select: {
        id: true,
        routeType: true,
        misconceptionSummary: true,
        updatedAt: true,
        skill: {
          select: {
            id: true,
            code: true,
            name: true,
            strand: true,
            subjectId: true,
            subject: { select: { title: true } },
          },
        },
        _count: { select: { steps: true } },
      },
      orderBy: [{ skill: { sortOrder: 'asc' } }, { routeType: 'asc' }],
    }),
    prisma.liveSession.findMany({
      where: { teacherUserId: params.teacherUserId, status: 'COMPLETED' },
      orderBy: { endedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        phases: true,
        subject: { select: { title: true } },
        endedAt: true,
      },
    }),
  ]);

  const routes: TeacherResourceRouteDTO[] = routesRaw.map((r) => ({
    id: r.id,
    routeType: r.routeType,
    skillId: r.skill.id,
    skillCode: r.skill.code,
    skillName: r.skill.name,
    strand: r.skill.strand || 'General',
    subjectId: r.skill.subjectId,
    subjectTitle: r.skill.subject.title,
    misconceptionSummary: r.misconceptionSummary,
    updatedAt: r.updatedAt.toISOString(),
    stepCount: r._count.steps,
  }));

  const strandMap = new Map<string, number>();
  for (const row of routes) {
    const key = row.strand || 'General';
    strandMap.set(key, (strandMap.get(key) ?? 0) + 1);
  }

  const strandFolders: TeacherResourceStrandFolderDTO[] = [...strandMap.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count], i) => ({
      id: label,
      label,
      count,
      accent: ROUTE_FOLDER_ACCENTS[i % ROUTE_FOLDER_ACCENTS.length],
    }));

  let countA = 0;
  let countB = 0;
  let countC = 0;
  for (const r of routes) {
    if (r.routeType === 'A') countA++;
    else if (r.routeType === 'B') countB++;
    else if (r.routeType === 'C') countC++;
  }

  const categoryCounts: TeacherResourcesPayload['categoryCounts'] = [
    { id: 'all', count: routes.length },
    { id: 'A', count: countA },
    { id: 'B', count: countB },
    { id: 'C', count: countC },
  ];

  const aiSuggestions: TeacherResourceAiRowDTO[] = routes
    .filter((r) => r.routeType === 'C' && r.misconceptionSummary.trim().length > 0)
    .slice(0, 12)
    .map((r) => {
      const summary = r.misconceptionSummary.trim();
      const short =
        summary.length > 120 ? `${summary.slice(0, 117).trim()}…` : summary;
      return {
        id: r.id,
        title: `${r.skillCode} · Misconception repair`,
        typeLabel: 'Misconception repair',
        context: short,
      };
    });

  const recentSessions: TeacherResourceRecentSessionDTO[] = recentSessionsRaw.map((s) => {
    const n = phaseCount(s.phases);
    return {
      id: s.id,
      title: s.subject.title,
      phaseCount: n,
      endedAt: s.endedAt?.toISOString() ?? null,
    };
  });

  return {
    subjects,
    subjectId,
    routes,
    strandFolders,
    categoryCounts,
    aiSuggestions,
    recentSessions,
  };
}
