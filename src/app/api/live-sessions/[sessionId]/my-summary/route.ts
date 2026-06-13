import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { summariseStudentSession } from '@/lib/live/summariseStudentSession';

interface Props {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/live-sessions/[sessionId]/my-summary
 *
 * Student-scoped post-lesson review. Returns only the requesting student's
 * own performance: attempt totals, per-skill breakdown, lane journey, and
 * focus areas derived from misconceptions hit during the session.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const { sessionId } = await params;
  const summary = await summariseStudentSession(sessionId, user.id);
  if (!summary) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

  return NextResponse.json(summary);
}
