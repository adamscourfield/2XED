import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { EnglishLearnSession } from '@/features/learn/EnglishLearnSession';

interface Props {
  params: Promise<{ skillCode: string }>;
}

export default async function EnglishLearnPage({ params }: Props) {
  const { skillCode } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userId = (session.user as { id: string }).id;

  const subject = await prisma.subject.findUnique({
    where: { slug: 'english' },
    select: { id: true, title: true, slug: true },
  });

  if (!subject) redirect('/dashboard');

  const skill = await prisma.skill.findFirst({
    where: { code: skillCode, subjectId: subject.id },
    select: { id: true, code: true, name: true, intro: true, description: true },
  });

  if (!skill) redirect('/dashboard');

  const blocks = await prisma.englishContentBlock.findMany({
    where: { skillId: skill.id, isPublished: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, blockType: true, sortOrder: true, content: true, sourceRef: true },
  });

  if (blocks.length === 0) {
    return (
      <LearningPageShell
        title={skill.name}
        subtitle={`${subject.title} · ${skill.code}`}
      >
        <div className="anx-callout-info max-w-lg">
          <p className="font-medium">No content published yet</p>
          <p className="mt-1 text-sm">
            Content for this skill hasn&apos;t been published yet. Ask your teacher, or check back
            soon.
          </p>
        </div>
      </LearningPageShell>
    );
  }

  return (
    <EnglishLearnSession
      subject={subject}
      skill={skill}
      blocks={blocks}
      userId={userId}
    />
  );
}
