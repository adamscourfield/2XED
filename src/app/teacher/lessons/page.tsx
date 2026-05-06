import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { LessonLibrary, type LessonLibraryRow } from '@/app/teacher/lessons/LessonLibrary';

export default async function TeacherLessonsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonModel = (prisma as any).lesson;
  const rawLessons: LessonLibraryRow[] = lessonModel
    ? await lessonModel.findMany({
        where: { teacherUserId: user.id },
        include: {
          subject: { select: { title: true, slug: true } },
          curriculumUnit: { select: { id: true, title: true } },
          _count: { select: { blocks: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }).then((rows: Array<{
        id: string;
        title: string;
        topic: string;
        isPublished: boolean;
        isCopy: boolean;
        curriculumPromptDismissed: boolean;
        curriculumUnitId: string | null;
        createdAt: Date;
        updatedAt: Date;
        subject: { title: string; slug: string };
        curriculumUnit: { id: string; title: string } | null;
        _count: { blocks: number };
      }>) =>
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          topic: r.topic,
          isPublished: r.isPublished,
          isCopy: r.isCopy,
          curriculumUnitId: r.curriculumUnitId,
          curriculumUnitTitle: r.curriculumUnit?.title ?? null,
          subjectTitle: r.subject.title,
          subjectSlug: r.subject.slug,
          blockCount: r._count.blocks,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }))
      )
    : [];

  return (
    <LearningPageShell
      title="Lessons"
      appChrome="teacher"
      hideHeader
      maxWidthClassName="max-w-[90rem]"
    >
      <LessonLibrary rows={rawLessons} />
    </LearningPageShell>
  );
}
