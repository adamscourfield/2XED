import { NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { summariseStudentSession } from '@/lib/live/summariseStudentSession';

/**
 * GET /api/student/last-lesson-focus
 *
 * Surfaces the focus areas from the student's most recent completed live
 * session so the post-lesson review informs what they work on next, rather
 * than vanishing when the review screen closes. Returns `{ focus: null }` when
 * there is no completed session or it produced no focus areas.
 */
export async function GET() {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const latest = await prisma.liveParticipant.findFirst({
    where: { studentUserId: user.id, session: { status: 'COMPLETED' } },
    orderBy: { session: { endedAt: 'desc' } },
    select: {
      session: {
        select: { id: true, endedAt: true, subject: { select: { slug: true } } },
      },
    },
  });

  if (!latest) return NextResponse.json({ focus: null });

  const summary = await summariseStudentSession(latest.session.id, user.id);
  if (!summary || summary.focusAreas.length === 0) return NextResponse.json({ focus: null });

  return NextResponse.json({
    focus: {
      sessionId: summary.sessionId,
      endedAt: latest.session.endedAt?.toISOString() ?? null,
      subjectTitle: summary.subject.title,
      subjectSlug: latest.session.subject.slug,
      skillName: summary.skill?.name ?? null,
      areas: summary.focusAreas,
    },
  });
}
