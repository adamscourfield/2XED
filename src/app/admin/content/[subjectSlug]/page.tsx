import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { QuestionQaWorkbench } from '@/components/admin/QuestionQaWorkbench';
import { buildQaItemView } from '@/features/items/questionQa.server';

interface Props {
  params: Promise<{ subjectSlug: string }>;
}

export default async function AdminContentPage({ params }: Props) {
  const { subjectSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') redirect('/dashboard');

  const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) return <div>Subject not found</div>;

  const importedItems = await prisma.item.findMany({
    where: {
      OR: [
        { subjectId: subject.id },
        {
          skills: {
            some: {
              skill: {
                subjectId: subject.id,
              },
            },
          },
        },
      ],
    },
    include: {
      skills: {
        include: {
          skill: { select: { code: true, sortOrder: true } },
        },
      },
      reviewNotes: {
        include: {
          author: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { question: 'asc' }],
  });

  const qaItems = importedItems
    .map(buildQaItemView)
    .sort((a, b) => {
      const purposeOrder = { ONBOARDING: 0, LEARN: 1, RETEACH_SHADOW: 2 } as const;
      const routeOrder = { A: 0, B: 1, C: 2 } as const;

      return (
        a.primarySkillSortOrder - b.primarySkillSortOrder ||
        a.primarySkillCode.localeCompare(b.primarySkillCode) ||
        purposeOrder[a.questionPurpose] - purposeOrder[b.questionPurpose] ||
        a.sequenceKey.diagnosticOrdinal - b.sequenceKey.diagnosticOrdinal ||
        a.sequenceKey.questionOrdinal - b.sequenceKey.questionOrdinal ||
        a.sequenceKey.questionAlphaOrder - b.sequenceKey.questionAlphaOrder ||
        (routeOrder[a.sequenceKey.shadowRoute as keyof typeof routeOrder] ?? 99) -
          (routeOrder[b.sequenceKey.shadowRoute as keyof typeof routeOrder] ?? 99) ||
        a.sequenceKey.shadowOrdinal - b.sequenceKey.shadowOrdinal ||
        (a.sequenceKey.createdAt ?? '').localeCompare(b.sequenceKey.createdAt ?? '') ||
        a.displayQuestion.localeCompare(b.displayQuestion)
      );
    });
  const skillSet = Array.from(new Set(qaItems.flatMap((item) => item.skills))).sort();
  const typeSet = Array.from(new Set(qaItems.map((item) => item.type))).sort();
  const typeCounts = typeSet.map((type) => ({
    type,
    count: qaItems.filter((item) => item.type === type).length,
  }));
  const realQuestionCount = qaItems.filter((item) => !item.isPlaceholder).length;
  const placeholderCount = qaItems.filter((item) => item.isPlaceholder).length;
  const issueCount = qaItems.reduce((sum, item) => sum + item.issues.length, 0);
  const flaggedCount = qaItems.filter((item) => item.issues.length > 0).length;
  const repairOpenCount = qaItems.reduce(
    (sum, item) => sum + item.reviewNotes.filter((note) => note.status === 'OPEN').length,
    0
  );

  return (
    <main className="anx-shell">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question QA Lab — {subject.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review answer mode, stored answers, accepted answers, and grading behaviour before students see items.
            </p>
          </div>
          <a href={`/admin/insight/${subject.slug}`} className="text-sm text-blue-600 hover:underline">
            ← Back to Insight Dashboard
          </a>
        </div>

        <section className="grid gap-4 md:grid-cols-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Total rows</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{qaItems.length}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Real questions</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">{realQuestionCount}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Placeholder rows</div>
            <div className="mt-1 text-2xl font-bold text-slate-600">{placeholderCount}</div>
            {placeholderCount > 0 && (
              <div className="mt-1 text-xs text-gray-500">Hidden by default in the list</div>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Flagged items</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{flaggedCount}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Contract issues</div>
            <div className="mt-1 text-2xl font-bold text-amber-600">{issueCount}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Skills covered</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{skillSet.length}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Open repair notes</div>
            <div className="mt-1 text-2xl font-bold text-indigo-600">{repairOpenCount}</div>
          </div>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          <p className="font-semibold">Use this page to test how the student actually answers the question.</p>
          <p className="mt-1">
            Filter by answer mode or stored type, preview the student input, and check whether the stored answer can really be selected or typed.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Stored Type Coverage</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {typeCounts.map(({ type, count }) => (
              <div key={type} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {type}: <span className="font-semibold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <QuestionQaWorkbench items={qaItems} availableSkills={skillSet} availableTypes={typeSet} />
      </div>
    </main>
  );
}
