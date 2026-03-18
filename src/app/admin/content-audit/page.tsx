import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';

interface SkillAuditRow {
  code: string;
  name: string;
  strand: string;
  totalItems: number;
  realItems: number;
  placeholderItems: number;
  itemTypes: Record<string, number>;
  routeA: boolean;
  routeB: boolean;
  routeC: boolean;
  totalRoutes: number;
  totalSteps: number;
  stepsPerRoute: Record<string, number>;
}

interface StrandSummary {
  strand: string;
  skillCount: number;
  totalItems: number;
  realItems: number;
  placeholderItems: number;
  totalRoutes: number;
  totalSteps: number;
  fullRouteCoverage: number;
  skills: SkillAuditRow[];
}

export default async function ContentAuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') redirect('/dashboard');

  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) return <div className="p-8 text-red-600">Subject ks3-maths not found. Run db:seed first.</div>;

  const skills = await prisma.skill.findMany({
    where: { subjectId: subject.id },
    include: {
      items: { include: { item: { select: { id: true, question: true, type: true } } } },
      explanationRoutes: {
        select: {
          id: true,
          routeType: true,
          isActive: true,
          steps: { select: { id: true }, },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const skillRows: SkillAuditRow[] = skills.map((skill) => {
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
  const strandMap = new Map<string, SkillAuditRow[]>();
  for (const row of skillRows) {
    const list = strandMap.get(row.strand) ?? [];
    list.push(row);
    strandMap.set(row.strand, list);
  }

  const strandSummaries: StrandSummary[] = Array.from(strandMap.entries())
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

  // Global totals
  const totals = {
    skills: skillRows.length,
    totalItems: skillRows.reduce((s, r) => s + r.totalItems, 0),
    realItems: skillRows.reduce((s, r) => s + r.realItems, 0),
    placeholderItems: skillRows.reduce((s, r) => s + r.placeholderItems, 0),
    totalRoutes: skillRows.reduce((s, r) => s + r.totalRoutes, 0),
    totalSteps: skillRows.reduce((s, r) => s + r.totalSteps, 0),
    fullRouteCoverage: skillRows.filter((r) => r.routeA && r.routeB && r.routeC).length,
    noQuestions: skillRows.filter((r) => r.realItems === 0).length,
    noExplanations: skillRows.filter((r) => r.totalRoutes === 0).length,
  };

  return (
    <main className="anx-shell">
      <div className="mx-auto w-full max-w-7xl space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Content Audit — {subject.title}</h1>
          <div className="flex items-center gap-4 text-sm">
            <a href={`/admin/content/${subject.slug}`} className="text-blue-600 hover:underline">
              → QA Workbench
            </a>
            <a href={`/admin/insight/${subject.slug}`} className="text-blue-600 hover:underline">
              → Insight Dashboard
            </a>
          </div>
        </div>

        {/* Global Summary Cards */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Global Summary</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Total skills</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totals.skills}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Real questions</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totals.realItems}</p>
              {totals.placeholderItems > 0 && (
                <p className="mt-0.5 text-xs text-amber-600">+ {totals.placeholderItems} placeholders</p>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Explanation routes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totals.totalRoutes}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Explanation steps</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totals.totalSteps}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Full route coverage (A+B+C)</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {totals.fullRouteCoverage}/{totals.skills}
              </p>
            </div>
          </div>

          {/* Gap highlights */}
          {(totals.noQuestions > 0 || totals.noExplanations > 0) && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">⚠ Content gaps detected</p>
              <ul className="mt-1 space-y-1 text-sm text-amber-700">
                {totals.noQuestions > 0 && (
                  <li>{totals.noQuestions} skill(s) with no real questions</li>
                )}
                {totals.noExplanations > 0 && (
                  <li>{totals.noExplanations} skill(s) with no explanation routes</li>
                )}
              </ul>
            </div>
          )}
        </section>

        {/* Strand-by-strand breakdown */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Breakdown by Strand</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Strand</th>
                  <th className="px-4 py-3 text-center">Skills</th>
                  <th className="px-4 py-3 text-center">Real Qs</th>
                  <th className="px-4 py-3 text-center">Placeholders</th>
                  <th className="px-4 py-3 text-center">Routes</th>
                  <th className="px-4 py-3 text-center">Steps</th>
                  <th className="px-4 py-3 text-center">Full A+B+C</th>
                </tr>
              </thead>
              <tbody>
                {strandSummaries.map((s) => (
                  <tr key={s.strand} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.strand}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{s.skillCount}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{s.realItems}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={s.placeholderItems > 0 ? 'text-amber-600' : 'text-gray-400'}>
                        {s.placeholderItems}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{s.totalRoutes}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{s.totalSteps}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={s.fullRouteCoverage === s.skillCount ? 'text-emerald-600' : 'text-amber-600'}>
                        {s.fullRouteCoverage}/{s.skillCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed skill-by-skill breakdown */}
        {strandSummaries.map((s) => (
          <section key={s.strand}>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{s.strand}</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Skill Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3 text-center">Real Qs</th>
                    <th className="px-4 py-3 text-center">Placeholders</th>
                    <th className="px-4 py-3 text-center">Types</th>
                    <th className="px-4 py-3 text-center">Route A</th>
                    <th className="px-4 py-3 text-center">Route B</th>
                    <th className="px-4 py-3 text-center">Route C</th>
                    <th className="px-4 py-3 text-center">Steps</th>
                  </tr>
                </thead>
                <tbody>
                  {s.skills.map((skill) => {
                    const hasGap = skill.realItems === 0 || skill.totalRoutes === 0;
                    return (
                      <tr
                        key={skill.code}
                        className={`border-b border-gray-100 ${hasGap ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-900">{skill.code}</td>
                        <td className="px-4 py-3 text-gray-700">{skill.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={skill.realItems === 0 ? 'font-medium text-red-600' : 'text-gray-700'}>
                            {skill.realItems}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={skill.placeholderItems > 0 ? 'text-amber-600' : 'text-gray-400'}>
                            {skill.placeholderItems}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                          {Object.entries(skill.itemTypes).map(([type, count]) => (
                            <span key={type} className="mr-1">
                              {type}:{count}
                            </span>
                          ))}
                          {Object.keys(skill.itemTypes).length === 0 && '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {skill.routeA ? (
                            <span className="text-emerald-600" title={`${skill.stepsPerRoute['A'] ?? 0} steps`}>
                              ✓ ({skill.stepsPerRoute['A'] ?? 0})
                            </span>
                          ) : (
                            <span className="text-red-400">✗</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {skill.routeB ? (
                            <span className="text-emerald-600" title={`${skill.stepsPerRoute['B'] ?? 0} steps`}>
                              ✓ ({skill.stepsPerRoute['B'] ?? 0})
                            </span>
                          ) : (
                            <span className="text-red-400">✗</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {skill.routeC ? (
                            <span className="text-emerald-600" title={`${skill.stepsPerRoute['C'] ?? 0} steps`}>
                              ✓ ({skill.stepsPerRoute['C'] ?? 0})
                            </span>
                          ) : (
                            <span className="text-red-400">✗</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{skill.totalSteps}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <p className="text-xs text-gray-400 text-center pb-6">
          Generated at {new Date().toISOString()} · Subject: {subject.slug}
        </p>
      </div>
    </main>
  );
}
