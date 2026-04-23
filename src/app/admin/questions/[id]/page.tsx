import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { AdminPageFrame } from '@/components/admin/AdminPageFrame';
import { QuestionFormClient, QuestionType, Misconception, NumberLineConfig } from '../QuestionFormClient';

function extractStem(question: string): string {
  return question.replace(/^\[[^\]]+\]\s*/, '');
}

export default async function EditQuestionPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { role?: string };
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [item, allSkills] = await Promise.all([
    prisma.item.findUnique({
      where: { id: params.id },
      include: {
        skills: {
          include: { skill: { select: { id: true, code: true, name: true, strand: true } } },
        },
      },
    }),
    prisma.skill.findMany({
      select: { id: true, code: true, name: true, strand: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  if (!item) notFound();

  const opts = (item.options && typeof item.options === 'object') ? item.options as Record<string, unknown> : {};
  const choices = Array.isArray(opts.choices) ? (opts.choices as string[]) : [];
  const acceptedAnswers = Array.isArray(opts.acceptedAnswers) ? (opts.acceptedAnswers as string[]) : [item.answer];
  const numberLine = opts.numberLine as NumberLineConfig | undefined;
  const tolerance = typeof (opts as { meta?: { tolerance?: number } }).meta?.tolerance === 'number'
    ? (opts as { meta: { tolerance: number } }).meta.tolerance
    : numberLine?.tolerance;

  const misconceptionMap = (item.misconceptionMap && typeof item.misconceptionMap === 'object')
    ? item.misconceptionMap as Record<string, string>
    : {};
  const misconceptions: Misconception[] = Object.entries(misconceptionMap).map(([type, signal]) => ({
    type,
    diagnostic_signal: signal,
  }));

  const skillIds = item.skills.map((is) => is.skill.id);
  const stem = extractStem(item.question);

  const attemptCount = await prisma.attempt.count({ where: { itemId: item.id } });
  const refLabel = item.question.match(/^\[([^\]]+)\]/)?.[1] ?? item.id;

  return (
    <AdminPageFrame
      maxWidthClassName="max-w-3xl"
      title="Edit question"
      subtitle={(
        <>
          <span className="font-mono text-xs" style={{ color: 'var(--anx-text-faint)' }}>{refLabel}</span>
          <span className="mx-2 text-[var(--anx-text-muted)]">·</span>
          <span>Type <strong style={{ color: 'var(--anx-text)' }}>{item.type}</strong></span>
          <span className="mx-2 text-[var(--anx-text-muted)]">·</span>
          <span>Created <strong style={{ color: 'var(--anx-text)' }}>{new Date(item.createdAt).toLocaleDateString('en-GB')}</strong></span>
          <span className="mx-2 text-[var(--anx-text-muted)]">·</span>
          <span><strong style={{ color: 'var(--anx-text)' }}>{attemptCount.toLocaleString('en-GB')}</strong> attempts</span>
        </>
      )}
      backHref="/admin/questions"
      backLabel="← Question bank"
    >
      {attemptCount > 0 ? (
        <div className="anx-callout-info text-sm leading-relaxed">
          This question has {attemptCount.toLocaleString('en-GB')} student attempt{attemptCount !== 1 ? 's' : ''}.
          Edits to the stem or answer may affect historical accuracy data.
        </div>
      ) : null}

      <div className="anx-card rounded-2xl p-6 sm:p-8">
        <QuestionFormClient
          mode="edit"
          itemId={item.id}
          allSkills={allSkills}
          initialData={{
            stem,
            type: item.type as QuestionType,
            answer: item.answer,
            choices,
            acceptedAnswers,
            tolerance,
            numberLine,
            skillIds,
            misconceptions,
          }}
        />
      </div>
    </AdminPageFrame>
  );
}
