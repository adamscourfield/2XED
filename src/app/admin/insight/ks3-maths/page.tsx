import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';

export default async function InsightDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') redirect('/dashboard');

  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) return <div>Subject not found</div>;

  const skills = await prisma.skill.findMany({
    where: { subjectId: subject.id },
    include: {
      masteries: { select: { mastery: true, confirmedCount: true, userId: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // A) Coverage by strand
  const strandMap = new Map<string, { totalStudents: number; stableStudents: number; masteries: number[] }>();
  for (const skill of skills) {
    const strand = skill.strand;
    if (!strandMap.has(strand)) strandMap.set(strand, { totalStudents: 0, stableStudents: 0, masteries: [] });
    const entry = strandMap.get(strand)!;
    for (const m of skill.masteries) {
      entry.totalStudents++;
      if (m.mastery > 0) entry.masteries.push(m.mastery);
      if (m.confirmedCount >= 2 && m.mastery >= 0.85) entry.stableStudents++;
    }
  }

  // D) Fragile skills: highest share of students mastery < 0.6
  const fragileSkills = skills
    .map((skill) => {
      const total = skill.masteries.length;
      if (total === 0) return { skill, fragileShare: 0 };
      const fragile = skill.masteries.filter((m) => m.mastery < 0.6).length;
      return { skill, fragileShare: fragile / total };
    })
    .filter((s) => s.skill.masteries.length > 0)
    .sort((a, b) => b.fragileShare - a.fragileShare)
    .slice(0, 10);

  // B) Review success by interval bucket
  const reviewEvents = await prisma.event.findMany({
    where: { name: 'review_completed', subjectId: subject.id },
    select: { payload: true },
  });

  const buckets: Record<string, { pass: number; fail: number }> = {
    '1d': { pass: 0, fail: 0 },
    '3d': { pass: 0, fail: 0 },
    '7d': { pass: 0, fail: 0 },
    '14d': { pass: 0, fail: 0 },
  };
  // For now just count pass/fail totals (interval bucket detection requires more data)
  for (const e of reviewEvents) {
    const p = e.payload as { outcome?: string };
    const outcome = p?.outcome === 'pass' ? 'pass' : 'fail';
    // Default to 7d bucket without interval info
    buckets['7d'][outcome]++;
  }

  const engagementEvents = await prisma.event.findMany({
    where: { name: 'question_answered', subjectId: subject.id },
    select: { studentUserId: true, createdAt: true },
  });
  const routeEvents = await prisma.event.findMany({
    where: { name: 'route_completed', subjectId: subject.id },
    select: { payload: true, studentUserId: true },
  });

  const uniqueLearners = new Set(engagementEvents.map((e) => e.studentUserId).filter(Boolean)).size;
  const activeDays = new Set(engagementEvents.map((e) => e.createdAt.toISOString().slice(0, 10))).size;
  const avgQuestionsPerLearner = uniqueLearners > 0 ? Math.round((engagementEvents.length / uniqueLearners) * 10) / 10 : 0;

  const routeStats = routeEvents.reduce(
    (acc, e) => {
      const payload = e.payload as { accuracy?: number; routeType?: 'A' | 'B' | 'C' };
      const accuracy = payload?.accuracy ?? 0;
      const routeType = payload?.routeType ?? 'A';
      acc.count += 1;
      acc.sumAccuracy += accuracy;
      if (accuracy >= 0.8) acc.strongRoutes += 1;
      acc.byRoute[routeType].count += 1;
      acc.byRoute[routeType].sumAccuracy += accuracy;
      return acc;
    },
    {
      count: 0,
      sumAccuracy: 0,
      strongRoutes: 0,
      byRoute: {
        A: { count: 0, sumAccuracy: 0 },
        B: { count: 0, sumAccuracy: 0 },
        C: { count: 0, sumAccuracy: 0 },
      },
    }
  );

  const shadowPassed = await prisma.event.count({ where: { name: 'shadow_pair_passed', subjectId: subject.id } });
  const shadowFailed = await prisma.event.count({ where: { name: 'shadow_pair_failed', subjectId: subject.id } });
  const shadowTotal = shadowPassed + shadowFailed;

  const routeAssignments = await prisma.event.findMany({
    where: { name: 'explanation_route_assigned', subjectId: subject.id },
    select: { payload: true },
  });

  const stepAttemptEvents = await prisma.event.findMany({
    where: { name: 'step_checkpoint_attempted', subjectId: subject.id },
    select: { payload: true },
  });

  const stepHotspots = stepAttemptEvents.reduce((acc, e) => {
    const payload = e.payload as { stepTitle?: string; correct?: boolean; retryCount?: number; routeType?: 'A' | 'B' | 'C' };
    const key = `${payload.routeType ?? 'A'}::${payload.stepTitle ?? 'Unknown step'}`;
    if (!acc[key]) acc[key] = { routeType: payload.routeType ?? 'A', stepTitle: payload.stepTitle ?? 'Unknown step', attempts: 0, fails: 0, retries2Plus: 0 };
    acc[key].attempts += 1;
    if (!payload.correct) acc[key].fails += 1;
    if ((payload.retryCount ?? 0) >= 2) acc[key].retries2Plus += 1;
    return acc;
  }, {} as Record<string, { routeType: string; stepTitle: string; attempts: number; fails: number; retries2Plus: number }>);

  const topStepHotspots = Object.values(stepHotspots)
    .sort((a, b) => (b.fails - a.fails) || (b.retries2Plus - a.retries2Plus))
    .slice(0, 6);

  const lowConfidenceSignals = stepAttemptEvents.filter((e) => {
    const payload = e.payload as { confidence?: 'low' | 'medium' | 'high' };
    return payload?.confidence === 'low';
  }).length;

  const assignmentStats = routeAssignments.reduce(
    (acc, e) => {
      const payload = e.payload as { routeType?: 'A' | 'B' | 'C'; source?: 'diagnostic_signals' | 'fallback_chain' | 'history_default' };
      const route = payload?.routeType;
      const source = payload?.source;
      if (route) acc.byRoute[route] += 1;
      if (source) acc.bySource[source] += 1;
      return acc;
    },
    {
      byRoute: { A: 0, B: 0, C: 0 },
      bySource: { diagnostic_signals: 0, fallback_chain: 0, history_default: 0 },
    }
  );

  const recentDrilldownEvents = await prisma.event.findMany({
    where: {
      subjectId: subject.id,
      name: { in: ['reward_granted', 'explanation_route_assigned', 'intervention_flagged'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { name: true, createdAt: true, studentUserId: true, payload: true },
  });

  const recentStudentIds = [...new Set(recentDrilldownEvents.map((e) => e.studentUserId).filter(Boolean))] as string[];
  const recentUsers = recentStudentIds.length
    ? await prisma.user.findMany({ where: { id: { in: recentStudentIds } }, select: { id: true, email: true, name: true } })
    : [];
  const userMap = new Map(recentUsers.map((u) => [u.id, u]));

  // C) Time to stable mastery (median days from first attempt to confirmedCount=2)
  const stableSkillMasteries = await prisma.skillMastery.findMany({
    where: { confirmedCount: { gte: 2 }, skill: { subjectId: subject.id } },
    select: { createdAt: true, updatedAt: true },
  });
  let medianDays = 0;
  if (stableSkillMasteries.length > 0) {
    const days = stableSkillMasteries.map((m) => {
      const diff = m.updatedAt.getTime() - m.createdAt.getTime();
      return diff / (1000 * 60 * 60 * 24);
    }).sort((a, b) => a - b);
    medianDays = days[Math.floor(days.length / 2)] ?? 0;
  }

  const strandEntries = Array.from(strandMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <main className="anx-shell">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-on-surface">Insight Dashboard — Maths</h1>
          <div className="flex items-center gap-4 text-sm">
            <a href="/admin/content/ks3-maths" className="text-primary hover:underline">
              → Content Verification
            </a>
            <a href="/admin/interventions" className="text-primary hover:underline">
              → Interventions
            </a>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">Snapshot — Engagement & Route Quality</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="anx-card rounded-xl p-4">
              <p className="text-xs text-muted">Unique learners</p>
              <p className="mt-1 text-2xl font-semibold text-on-surface">{uniqueLearners}</p>
            </div>
            <div className="anx-card rounded-xl p-4">
              <p className="text-xs text-muted">Question events</p>
              <p className="mt-1 text-2xl font-semibold text-on-surface">{engagementEvents.length}</p>
            </div>
            <div className="anx-card rounded-xl p-4">
              <p className="text-xs text-muted">Avg questions / learner</p>
              <p className="mt-1 text-2xl font-semibold text-on-surface">{avgQuestionsPerLearner}</p>
            </div>
            <div className="anx-card rounded-xl p-4">
              <p className="text-xs text-muted">Strong routes (≥80%)</p>
              <p className="mt-1 text-2xl font-semibold text-on-surface">
                {routeStats.count > 0 ? `${Math.round((routeStats.strongRoutes / routeStats.count) * 100)}%` : '—'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Active days observed: {activeDays} · Avg route accuracy:{' '}
            {routeStats.count > 0 ? `${Math.round((routeStats.sumAccuracy / routeStats.count) * 100)}%` : '—'}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">Route Effectiveness (A/B/C) + Shadow Validation</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="anx-card rounded-xl p-4">
              <p className="mb-3 text-sm font-medium text-on-surface-variant">Average Accuracy by Route</p>
              <div className="space-y-2 text-sm">
                {(['A', 'B', 'C'] as const).map((route) => {
                  const row = routeStats.byRoute[route];
                  const avg = row.count > 0 ? Math.round((row.sumAccuracy / row.count) * 100) : null;
                  return (
                    <div key={route} className="flex items-center justify-between rounded-md border border-outline-variant px-3 py-2">
                      <span className="font-mono text-xs">Route {route}</span>
                      <span className="text-on-surface-variant">{row.count > 0 ? `${avg}% (${row.count})` : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="anx-card rounded-xl p-4">
              <p className="mb-3 text-sm font-medium text-on-surface-variant">Shadow Pair Pass Rate</p>
              <p className="text-2xl font-semibold text-on-surface">
                {shadowTotal > 0 ? `${Math.round((shadowPassed / shadowTotal) * 100)}%` : '—'}
              </p>
              <p className="mt-1 text-xs text-muted">
                Passed: {shadowPassed} · Failed: {shadowFailed}
              </p>
            </div>
            <div className="anx-card rounded-xl p-4">
              <p className="mb-3 text-sm font-medium text-on-surface-variant">Route Assignment Sources</p>
              <div className="space-y-2 text-xs text-on-surface-variant">
                <div>Diagnostic signals: {assignmentStats.bySource.diagnostic_signals}</div>
                <div>Fallback chain: {assignmentStats.bySource.fallback_chain}</div>
                <div>History default: {assignmentStats.bySource.history_default}</div>
              </div>
              <p className="mt-3 text-xs text-muted">
                Assigned route count — A:{assignmentStats.byRoute.A} · B:{assignmentStats.byRoute.B} · C:{assignmentStats.byRoute.C}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">Teacher Drilldown — Recent Routing & Rewards</h2>
          <div className="anx-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {recentDrilldownEvents.map((e, idx) => {
                  const user = e.studentUserId ? userMap.get(e.studentUserId) : undefined;
                  const payload = e.payload as { routeType?: string; reason?: string; rewardEvent?: string; xp?: number; tokens?: number };
                  return (
                    <tr key={`${e.name}-${idx}`} className="hover:bg-surface-container-low">
                      <td className="px-4 py-3 text-xs text-muted">{e.createdAt.toISOString().replace('T', ' ').slice(0, 16)}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{user?.name ?? user?.email ?? e.studentUserId ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{e.name}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {e.name === 'explanation_route_assigned' && `Route ${payload.routeType} · ${payload.reason ?? ''}`}
                        {e.name === 'reward_granted' && `${payload.rewardEvent ?? 'reward'} (+${payload.xp ?? 0} XP, +${payload.tokens ?? 0} tokens)`}
                        {e.name === 'intervention_flagged' && (payload.reason ?? 'Intervention flagged')}
                      </td>
                    </tr>
                  );
                })}
                {recentDrilldownEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">No routing/reward events yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">Reteach Step Hotspots</h2>
          <p className="mb-2 text-xs text-muted">Low-confidence checkpoint signals: {lowConfidenceSignals}</p>
          <div className="anx-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Route</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Step</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Attempts</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Fails</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">2+ Retry signals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {topStepHotspots.map((row, idx) => (
                  <tr key={`${row.routeType}-${idx}`} className="hover:bg-surface-container-low">
                    <td className="px-4 py-3 font-mono text-xs">{row.routeType}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.stepTitle}</td>
                    <td className="px-4 py-3">{row.attempts}</td>
                    <td className="px-4 py-3 text-rose-600">{row.fails}</td>
                    <td className="px-4 py-3 text-amber-700">{row.retries2Plus}</td>
                  </tr>
                ))}
                {topStepHotspots.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">No step checkpoint data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* A) Coverage by strand */}
        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">A) Coverage &amp; Progress by Strand</h2>
          <div className="anx-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Strand</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Avg Mastery</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">% Stable (confirmedCount ≥ 2)</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Total Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {strandEntries.map(([strand, data]) => {
                  const avgMastery = data.masteries.length > 0
                    ? data.masteries.reduce((s, v) => s + v, 0) / data.masteries.length
                    : 0;
                  const stablePct = data.totalStudents > 0
                    ? Math.round((data.stableStudents / data.totalStudents) * 100)
                    : 0;
                  return (
                    <tr key={strand} className="hover:bg-surface-container-low">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-on-surface-variant">{strand}</td>
                      <td className="px-4 py-3">{Math.round(avgMastery * 100)}%</td>
                      <td className="px-4 py-3">{stablePct}%</td>
                      <td className="px-4 py-3 text-on-surface-variant">{data.totalStudents}</td>
                    </tr>
                  );
                })}
                {strandEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">No mastery data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* B) Review success by bucket */}
        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">B) Retention Proxy — Review Success Rate</h2>
          <div className="anx-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Interval Bucket</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Pass</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Fail</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {Object.entries(buckets).map(([bucket, counts]) => {
                  const total = counts.pass + counts.fail;
                  const rate = total > 0 ? Math.round((counts.pass / total) * 100) : 0;
                  return (
                    <tr key={bucket} className="hover:bg-surface-container-low">
                      <td className="px-4 py-3 font-mono text-xs">{bucket}</td>
                      <td className="px-4 py-3 text-green-600">{counts.pass}</td>
                      <td className="px-4 py-3 text-red-500">{counts.fail}</td>
                      <td className="px-4 py-3">{total > 0 ? `${rate}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* C) Time to stable mastery */}
        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">C) Time to Stable Mastery</h2>
          <div className="anx-card rounded-xl p-4">
            <p className="text-on-surface-variant">
              Median days from first attempt to stable mastery (confirmedCount ≥ 2):{' '}
              <span className="font-bold">
                {stableSkillMasteries.length > 0 ? `${medianDays.toFixed(1)} days` : 'No data yet'}
              </span>
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Based on {stableSkillMasteries.length} stable skill mastery entr{stableSkillMasteries.length !== 1 ? 'ies' : 'y'}.
            </p>
          </div>
        </section>

        {/* D) Fragile skills */}
        <section>
          <h2 className="text-lg font-semibold text-on-surface mb-3">D) Top Fragile Skills (mastery &lt; 60%)</h2>
          <div className="anx-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Skill</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Strand</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">% Students Fragile</th>
                  <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Total Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {fragileSkills.map(({ skill, fragileShare }) => (
                  <tr key={skill.id} className="hover:bg-surface-container-low">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-on-surface-variant">{skill.code}</span>{' '}
                      {skill.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-surface-container-high rounded text-xs">{skill.strand}</span>
                    </td>
                    <td className="px-4 py-3 text-red-600 font-semibold">
                      {Math.round(fragileShare * 100)}%
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{skill.masteries.length}</td>
                  </tr>
                ))}
                {fragileSkills.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">No fragile skills detected.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
