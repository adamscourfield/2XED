import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { TeacherLessonsHub, type LessonsHubRow } from '@/app/teacher/lessons/TeacherLessonsHub';
import type { TeacherHomeClassOption } from '@/app/teacher/dashboard/TeacherHomeClassSelector';

function classCodeLabel(externalClassId: string, subjectSlug: string | null): string {
  if (subjectSlug && subjectSlug.length <= 5) return subjectSlug.toUpperCase();
  if (externalClassId.length <= 6) return externalClassId.toUpperCase();
  return externalClassId.slice(-4).toUpperCase();
}

function iconHue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h + seed.charCodeAt(i) * (i + 1)) % 360;
  return `hsl(${h} 62% 46%)`;
}

export default async function TeacherLessonsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: {
      classrooms: {
        include: {
          classroom: {
            select: {
              id: true,
              name: true,
              yearGroup: true,
              externalClassId: true,
              subjectSlug: true,
              enrollments: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  const sessions = await prisma.liveSession.findMany({
    where: { teacherUserId: user.id },
    include: {
      subject: { select: { title: true } },
      skill: { select: { name: true, code: true, strand: true } },
      classroom: {
        select: { id: true, name: true, yearGroup: true, externalClassId: true, subjectSlug: true },
      },
      _count: { select: { participants: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  const rows: LessonsHubRow[] = sessions.map((ls) => ({
    id: ls.id,
    updatedAt: ls.updatedAt.toISOString(),
    status: ls.status,
    subjectTitle: ls.subject.title,
    skillName: ls.skill?.name ?? null,
    skillCode: ls.skill?.code ?? null,
    skillStrand: ls.skill?.strand ?? '',
    classroomId: ls.classroom.id,
    classroomName: ls.classroom.name,
    yearGroup: ls.classroom.yearGroup,
    participantCount: ls._count.participants,
  }));

  const classOptions: TeacherHomeClassOption[] =
    teacherProfile?.classrooms.map((tc) => {
      const c = tc.classroom;
      return {
        id: c.id,
        name: c.name,
        code: classCodeLabel(c.externalClassId, c.subjectSlug),
        studentCount: c.enrollments.length,
        hue: iconHue(c.id),
      };
    }) ?? [];

  return (
    <LearningPageShell
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      hideHeader
      maxWidthClassName="max-w-[90rem]"
    >
      <TeacherLessonsHub rows={rows} classOptions={classOptions} />
    </LearningPageShell>
  );
}
