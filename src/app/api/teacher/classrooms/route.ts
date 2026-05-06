import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

export interface TeacherClassroomItem {
  id: string;
  name: string;
  yearGroup: string | null;
  studentCount: number;
}

/**
 * GET /api/teacher/classrooms
 *
 * Returns the classrooms linked to the authenticated teacher's profile.
 * Returns an empty array (not an error) if no TeacherProfile exists.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: {
      classrooms: {
        include: {
          classroom: {
            select: {
              id: true,
              name: true,
              yearGroup: true,
              _count: { select: { enrollments: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!profile) return NextResponse.json({ classrooms: [] });

  const classrooms: TeacherClassroomItem[] = profile.classrooms.map((tc) => ({
    id: tc.classroom.id,
    name: tc.classroom.name,
    yearGroup: tc.classroom.yearGroup,
    studentCount: tc.classroom._count.enrollments,
  }));

  return NextResponse.json({ classrooms });
}
