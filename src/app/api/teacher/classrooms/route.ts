import { NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';

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
  const { user, response } = await requireApiUser();
  if (response) return response;

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
