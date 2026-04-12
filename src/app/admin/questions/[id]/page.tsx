import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
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

  return (
    <main className="anx-shell" style={{ background: 'var(--anx-surface-bright)', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <Link href="/admin/questions" className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
            ← Question Bank
          </Link>
          <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--anx-text)' }}>
            Edit question
          </h1>
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--anx-text-faint)' }}>
            {item.question.match(/^\[([^\]]+)\]/)?.[1] ?? item.id}
          </p>
        </div>

        {/* Meta bar */}
        <div className="flex gap-4 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          <span>Type: <strong style={{ color: 'var(--anx-text)' }}>{item.type}</strong></span>
          <span>Created: <strong style={{ color: 'var(--anx-text)' }}>{new Date(item.createdAt).toLocaleDateString('en-GB')}</strong></span>
          <span>Attempts: <strong style={{ color: 'var(--anx-text)' }}>{attemptCount.toLocaleString()}</strong></span>
        </div>

        {attemptCount > 0 && (
          <div className="anx-callout-info text-sm">
            This question has {attemptCount.toLocaleString()} student attempt{attemptCount !== 1 ? 's' : ''}.
            Edits to the stem or answer may affect historical accuracy data.
          </div>
        )}

        {/* Form */}
        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--anx-surface-container-lowest)', border: '1px solid var(--anx-border)' }}
        >
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
      </div>
    </main>
  );
}
