import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { AdminRebaselineClient } from '@/features/admin/AdminRebaselineClient';
import { AdminReteachPolicyPanel } from '@/features/reteach/AdminReteachPolicyPanel';

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
    <main>
      <section>
        <h1>Interventions</h1>
        <div>A: {routeA} · B: {routeB} · C: {routeC}</div>
      </section>
      <section>
        <h2>Secure fast-pass (7d)</h2>
        <div>{secureFastPass}</div>
      </section>
      <section>
        <h2>Shadow pairs (7d)</h2>
        <div>Passed: {shadowPassed} · Failed: {shadowFailed}</div>
      </section>
      <section>
        <h2>Interventions flagged (7d)</h2>
        <div>{Math.max(flags.length, interventionFlagged)}</div>
      </section>
      <section>
        <h2>Reteach policy</h2>
        <AdminReteachPolicyPanel />
      </section>
      <section>
        <h2>Re-baseline student</h2>
        <AdminRebaselineClient subjects={subjects} />
      </section>
    </main>
  );
}
