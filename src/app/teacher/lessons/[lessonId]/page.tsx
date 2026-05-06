import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect, notFound } from 'next/navigation';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';
import { AppChrome } from '@/components/AppChrome';
import { LessonBuilder } from '@/app/teacher/lessons/[lessonId]/LessonBuilder';
import type { LessonBuilderData } from '@/app/teacher/lessons/[lessonId]/LessonBuilder';

export default async function LessonBuilderPage({ params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonModel = (prisma as any).lesson;
  if (!lessonModel) {
    return (
      <AppChrome variant="teacher">
        <main className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-[#6b7280]">
            Lesson builder not yet available — run <code>npx prisma migrate deploy && npx prisma generate</code> first.
          </p>
        </main>
      </AppChrome>
    );
  }

  const lesson = await lessonModel.findUnique({
    where: { id: params.lessonId },
    include: {
      subject: { select: { id: true, title: true, slug: true } },
      curriculumUnit: { select: { id: true, title: true } },
      blocks: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              sortOrder: true,
              itemType: true,
              answerMode: true,
              content: true,
              skillId: true,
              sourceItemId: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) notFound();
  if (lesson.teacherUserId !== user.id && user.role !== 'ADMIN') redirect('/teacher/lessons');

  // Serialize dates for client
  const data: LessonBuilderData = {
    id: lesson.id,
    title: lesson.title,
    topic: lesson.topic,
    isPublished: lesson.isPublished,
    curriculumUnitId: lesson.curriculumUnitId,
    curriculumPromptDismissed: lesson.curriculumPromptDismissed,
    subject: lesson.subject,
    curriculumUnit: lesson.curriculumUnit,
    blocks: lesson.blocks.map((b: {
      id: string;
      type: string;
      sortOrder: number;
      title: string | null;
      items: Array<{
        id: string;
        sortOrder: number;
        itemType: string;
        answerMode: string | null;
        content: unknown;
        skillId: string | null;
        sourceItemId: string | null;
      }>;
    }) => ({
      id: b.id,
      type: b.type as LessonBuilderData['blocks'][number]['type'],
      sortOrder: b.sortOrder,
      title: b.title,
      items: b.items,
    })),
  };

  return (
    <AppChrome variant="teacher">
      <LessonBuilder lesson={data} />
    </AppChrome>
  );
}
