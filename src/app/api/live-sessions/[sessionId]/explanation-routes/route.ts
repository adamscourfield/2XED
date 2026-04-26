import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: {
      teacherUserId: true,
      skillId: true,
      currentPhaseIndex: true,
      phases: true,
    },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Resolve skillId from current phase, falling back to session-level skill
  let skillId: string | null = liveSession.skillId ?? null;
  const phases = liveSession.phases as Array<{ index: number; skillId: string }> | null;
  if (phases && phases.length > 0) {
    const currentPhase = phases[liveSession.currentPhaseIndex] ?? phases[0];
    if (currentPhase?.skillId) skillId = currentPhase.skillId;
  }

  if (!skillId) {
    return NextResponse.json({ routes: { A: null, B: null, C: null } });
  }

  const routes = await prisma.explanationRoute.findMany({
    where: { skillId, isActive: true },
    select: {
      id: true,
      routeType: true,
      misconceptionSummary: true,
      workedExample: true,
      animationSchema: true,
      steps: {
        select: { title: true, explanation: true },
        orderBy: { stepOrder: 'asc' },
      },
    },
  });

  const routeMap: Record<string, typeof routes[number] | null> = { A: null, B: null, C: null };
  for (const route of routes) {
    routeMap[route.routeType] = route;
  }

  return NextResponse.json({ routes: routeMap });
}
