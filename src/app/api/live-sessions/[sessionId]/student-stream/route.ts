// Force Node.js runtime — setInterval inside ReadableStream.start() is frozen
// on serverless/edge runtimes, which silently stops SSE delivery mid-session.
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { buildStudentState } from '@/lib/live/buildStudentState';

interface Props {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/live-sessions/[sessionId]/student-stream
 *
 * Server-Sent Events stream for student devices — the push-based counterpart
 * to the `student-state` poll endpoint. Delivers the same per-student snapshot
 * shape as `state` events on a 2s server-side cadence, so lane changes and
 * teacher broadcasts reach students faster than the old 3s client poll without
 * each device making its own repeated HTTP requests.
 *
 * Events emitted:
 *   - "state" — StudentStatePayload snapshot
 *   - "ping"  — keepalive every ~14s
 *
 * The stream auto-closes when the session completes or after ~10 minutes;
 * the client falls back to polling `student-state` if SSE drops.
 */
export async function GET(req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const userId = user.id;
  const { sessionId } = await params;

  // Verify participation up front so non-participants get a clean 403 rather
  // than an empty stream.
  const initial = await buildStudentState(sessionId, userId);
  if (!initial.ok) return NextResponse.json({ error: initial.error }, { status: initial.status });

  const encoder = new TextEncoder();
  const sseMessage = (event: string, data: unknown): Uint8Array =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const STREAM_INTERVAL_MS = 2000;
  const MAX_ITERATIONS = 300; // ~10 min at 2s intervals

  const stream = new ReadableStream({
    async start(controller) {
      const abortSignal = req.signal;
      let iterations = 0;

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(sseMessage(event, data));
        } catch {
          // Stream already closed.
        }
      };

      send('state', initial.payload);

      const interval = setInterval(async () => {
        if (abortSignal.aborted || iterations >= MAX_ITERATIONS) {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }

        iterations++;

        // Keepalive every 7 intervals (~14s).
        if (iterations % 7 === 0) send('ping', { ts: Date.now() });

        const result = await buildStudentState(sessionId, userId);
        if (!result.ok) {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }

        send('state', result.payload);

        if (result.payload.status === 'COMPLETED') {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, STREAM_INTERVAL_MS);

      abortSignal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
