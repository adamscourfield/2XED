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
      const res = await fetch(
        `/api/live-sessions/${sessionId}/participants/${participantId}/handback`,
        { method: 'POST' }
      );
      if (res.ok) {
        await fetchLanes();
      }
    },
    [sessionId, fetchLanes]
  );

  return { data, error, loading, refetch: fetchLanes, handback };
}
