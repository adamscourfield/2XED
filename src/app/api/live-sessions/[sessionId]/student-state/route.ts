import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { buildStudentState } from '@/lib/live/buildStudentState';

interface Props {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/live-sessions/[sessionId]/student-state
 *
 * Lightweight poll endpoint for student devices. Returns only what students
 * need to detect phase changes and teacher broadcasts:
 *   - status
 *   - currentPhaseIndex
 *   - currentContent (broadcast payload if any)
 *   - studentLane
 *   - pendingRecheckItem (if teacher handed the student back to app)
 *
 * This is the fallback path: students prefer the SSE `student-stream` endpoint
 * and fall back to polling this every 3s when SSE is unavailable.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const { sessionId } = await params;
  const result = await buildStudentState(sessionId, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(result.payload);
}
