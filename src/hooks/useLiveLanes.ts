'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface LaneStudent {
  participantId: string;
  studentUserId: string;
  studentName: string;
  masteryProbability: number;
  currentExplanationRouteType: string | null;
  escalationReason: string | null;
  isUnexpectedFailure: boolean;
  waitingMinutes: number;
  holdingAtFinalCheck: boolean;
}

interface LaneGroup {
  count: number;
  students: LaneStudent[];
}

interface Lane3Group extends LaneGroup {
  reteachAlert: boolean;
  reteachMessage: string | null;
}

interface LaneViewData {
  lane1: LaneGroup;
  lane2: LaneGroup;
  lane3: Lane3Group;
  totalParticipants: number;
  unassigned: number;
}

export function useLiveLanes(sessionId: string, pollIntervalMs = 4000) {
  const [data, setData] = useState<LaneViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingOnIds, setActingOnIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLanes = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/lanes`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Failed to fetch lanes');
        return;
      }
      const json: LaneViewData = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchLanes();
    intervalRef.current = setInterval(fetchLanes, pollIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLanes, pollIntervalMs]);

  const handback = useCallback(
    async (participantId: string) => {
      setActingOnIds((s) => new Set(s).add(participantId));
      // H8: catch errors inside the hook so an unhandled rejection never propagates
      // to LaneColumns — instead the shared `error` state surfaces the message.
      try {
        const res = await fetch(
          `/api/live-sessions/${sessionId}/participants/${participantId}/handback`,
          { method: 'POST' }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? 'Handback failed');
        }
        await fetchLanes();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Handback failed');
      } finally {
        setActingOnIds((s) => {
          const next = new Set(s);
          next.delete(participantId);
          return next;
        });
      }
    },
    [sessionId, fetchLanes]
  );

  return { data, error, loading, actingOnIds, refetch: fetchLanes, handback };
}
