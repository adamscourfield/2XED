import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { AdminContentQaView } from '@/components/admin/AdminContentQaView';
import { AdminPageFrame } from '@/components/admin/AdminPageFrame';
import { buildQaItemView } from '@/features/items/questionQa.server';

export default async function AdminContentKSMathsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') redirect('/dashboard');

  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) {
    return (
      <AdminPageFrame title="Subject not found" subtitle="KS3 Maths is not in the database. Run db:seed first.">
        <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>Return to admin home and check your seed.</p>
      </AdminPageFrame>
    );
  }

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

  return <AdminContentQaView subjectTitle={subject.title} subjectSlug={subject.slug} qaItems={qaItems} />;
}
