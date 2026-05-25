import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { AppChrome } from '@/components/AppChrome';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { DiagnosticRunClient } from '@/features/diagnostic/DiagnosticRunClient';
import {
  initPayload,
  selectNextSkill,
  type DiagnosticPayload,
} from '@/features/diagnostic/diagnosticService';

function parsePayload(payload: unknown): DiagnosticPayload {
  if (!payload || typeof payload !== 'object') return initPayload();
  const value = payload as Partial<DiagnosticPayload>;
  return {
    estimates: value.estimates ?? {},
    strandCounts: value.strandCounts ?? {},
    skillSignals: value.skillSignals ?? {},
    routeRecommendations: value.routeRecommendations ?? {},
  };
}

export default async function DiagnosticRunPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role && user.role !== 'STUDENT') redirect('/dashboard');

  const { subjectSlug } = await params;
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: {
      id: true,
      title: true,
      slug: true,
      skills: {
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          strand: true,
          items: { select: { itemId: true } },
        },
      },
    },
  });

  if (!subject) redirect('/dashboard');

  const completed = await prisma.diagnosticSession.findFirst({
    where: { userId: user.id, subjectId: subject.id, status: 'COMPLETED' },
    select: { id: true },
  });
  if (completed) redirect(`/learn/${subject.slug}`);

  const existing = await prisma.diagnosticSession.findFirst({
    where: { userId: user.id, subjectId: subject.id, status: 'IN_PROGRESS' },
    orderBy: { startedAt: 'desc' },
  });

  const diagnosticSession = existing ?? await prisma.diagnosticSession.create({
    data: { userId: user.id, subjectId: subject.id, payload: initPayload() as unknown as Prisma.InputJsonValue },
  });

  const attempted = await prisma.attempt.findMany({
    where: { userId: user.id, sessionId: diagnosticSession.id, mode: 'DIAGNOSTIC' },
    select: { itemId: true },
  });
  const attemptedItemIds = new Set(attempted.map((attempt) => attempt.itemId));
  const payload = parsePayload(diagnosticSession.payload);
  const availableSkills = subject.skills.filter((skill) =>
    skill.items.some((item) => !attemptedItemIds.has(item.itemId)),
  );
  const nextSkill = selectNextSkill(availableSkills, payload);

  if (!nextSkill || diagnosticSession.itemsSeen >= diagnosticSession.maxItems) {
    await prisma.diagnosticSession.update({
      where: { id: diagnosticSession.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    redirect(`/learn/${subject.slug}`);
  }

  const skill = subject.skills.find((candidate) => candidate.id === nextSkill.id);
  const itemId = skill?.items.find((item) => !attemptedItemIds.has(item.itemId))?.itemId;
  if (!skill || !itemId) redirect(`/learn/${subject.slug}`);

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, question: true, options: true, answer: true, type: true },
  });
  if (!item) redirect(`/learn/${subject.slug}`);

  return (
    <AppChrome variant="student">
      <DiagnosticRunClient
        subject={{ id: subject.id, title: subject.title, slug: subject.slug }}
        skill={{ id: skill.id, code: skill.code, name: skill.name, strand: skill.strand }}
        item={item}
        sessionId={diagnosticSession.id}
        itemsSeen={diagnosticSession.itemsSeen}
        maxItems={diagnosticSession.maxItems}
        subjectSlug={subject.slug}
      />
    </AppChrome>
  );
}
