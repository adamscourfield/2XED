import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { AdminRebaselineClient } from '@/features/admin/AdminRebaselineClient';
import { AdminReteachPolicyPanel } from '@/features/reteach/AdminReteachPolicyPanel';
import { LearningPageShell } from '@/components/LearningPageShell';

type RouteRecommendationEvent = {
  name: string;
  payload?: {
    route?: string;
    status?: string;
  } | null;
};

export default async function AdminInterventionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN') redirect('/dashboard');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [flags, events, subjects] = await Promise.all([
    prisma.interventionFlag.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true },
    }),
    prisma.event.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        name: {
          in: [
            'diagnostic_route_recommended',
            'shadow_pair_passed',
            'shadow_pair_failed',
            'intervention_flagged',
          ],
        },
      },
      select: { name: true, payload: true },
    }),
    prisma.subject.findMany({
      orderBy: { title: 'asc' },
      select: { slug: true, title: true },
    }),
  ]);

  const typedEvents = events as RouteRecommendationEvent[];
  const routeA = typedEvents.filter((e) => e.name === 'diagnostic_route_recommended' && e.payload?.route === 'A').length;
  const routeB = typedEvents.filter((e) => e.name === 'diagnostic_route_recommended' && e.payload?.route === 'B').length;
  const routeC = typedEvents.filter((e) => e.name === 'diagnostic_route_recommended' && e.payload?.route === 'C').length;
  const secureFastPass = typedEvents.filter(
    (e) => e.name === 'diagnostic_route_recommended' && e.payload?.status === 'secure',
  ).length;
  const shadowPassed = typedEvents.filter((e) => e.name === 'shadow_pair_passed').length;
  const shadowFailed = typedEvents.filter((e) => e.name === 'shadow_pair_failed').length;
  const interventionFlagged = typedEvents.filter((e) => e.name === 'intervention_flagged').length;

  return (
    <LearningPageShell
      title="Interventions"
      subtitle="Review route signals and manage high-impact support controls."
      appChrome="teacher"
      appChromeShowLeadershipNav
      maxWidthClassName="max-w-6xl"
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4" aria-label="Seven day intervention summary">
          {[
            ['Routes', `A: ${routeA} · B: ${routeB} · C: ${routeC}`],
            ['Secure fast-pass', String(secureFastPass)],
            ['Shadow pairs', `Passed: ${shadowPassed} · Failed: ${shadowFailed}`],
            ['Flags', String(Math.max(flags.length, interventionFlagged))],
          ].map(([label, value]) => (
            <div key={label} className="anx-card p-4">
              <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[color:var(--anx-text-muted)]">{label}</p>
              <p className="m-0 mt-2 text-lg font-bold text-[color:var(--anx-text)]">{value}</p>
            </div>
          ))}
        </section>
        <section aria-labelledby="reteach-policy-heading">
          <h2 id="reteach-policy-heading" className="mb-3 text-base font-semibold text-[color:var(--anx-text)]">Reteach policy</h2>
          <AdminReteachPolicyPanel />
        </section>
        <section aria-labelledby="rebaseline-heading">
          <h2 id="rebaseline-heading" className="mb-3 text-base font-semibold text-[color:var(--anx-text)]">Re-baseline student</h2>
          <AdminRebaselineClient subjects={subjects} />
        </section>
      </div>
    </LearningPageShell>
  );
}
