'use client';

import { LANES } from '@/lib/live/lanes';

// H9: EscalationReason kept as string so this type is compatible with the
// useLiveLanes hook — the hook uses string | null, a wider type than the
// original union. LaneColumns doesn't render escalationReason, so the
// widened type causes no behavioural change.
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

interface LaneColumnsProps {
  lane1: LaneGroup;
  lane2: LaneGroup;
  // lane3 may carry extra reteach fields from the hook; LaneGroup is the
  // minimum contract this component needs — extra props are simply ignored.
  lane3: LaneGroup & { reteachAlert?: boolean; reteachMessage?: string | null };
  onHandback?: (participantId: string) => void;
  actingOnIds?: Set<string>;
}

function WaitingBadge({ minutes }: { minutes: number }) {
  const color = minutes > 6 ? 'text-red-700 bg-red-50' : minutes > 3 ? 'text-amber-700 bg-amber-50' : 'text-on-surface-variant bg-surface-container-high';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {minutes} min
    </span>
  );
}

export function LaneColumns({ lane1, lane2, lane3, onHandback, actingOnIds }: LaneColumnsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Lane 1 */}
      {/* H9: show individual student names so teachers know who is in each lane */}
      <div className="rounded-lg border bg-white p-4" style={{ borderColor: LANES.LANE_1.colorVar }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: LANES.LANE_1.colorVar }}>{LANES.LANE_1.teacherLabel}</h3>
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: LANES.LANE_1.softVar, color: LANES.LANE_1.colorVar }}
          >
            {lane1.count}
          </span>
        </div>
        {lane1.students.length === 0 ? (
          <p className="text-sm text-muted">No students here yet</p>
        ) : (
          <div className="space-y-1.5">
            {lane1.students.map((student) => (
              <div
                key={student.studentUserId}
                className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2"
              >
                <span className="text-sm font-medium text-on-surface">{student.studentName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lane 2 */}
      <div className="rounded-lg border bg-white p-4" style={{ borderColor: LANES.LANE_2.colorVar }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: LANES.LANE_2.colorVar }}>{LANES.LANE_2.teacherLabel}</h3>
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: LANES.LANE_2.softVar, color: LANES.LANE_2.colorVar }}
          >
            {lane2.count}
          </span>
        </div>
        {lane2.students.length === 0 ? (
          <p className="text-sm text-muted">No students in support yet</p>
        ) : (
          <div className="space-y-1.5">
            {lane2.students.map((student) => (
              <div
                key={student.studentUserId}
                className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-on-surface">{student.studentName}</span>
                  {student.waitingMinutes > 0 && <WaitingBadge minutes={student.waitingMinutes} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lane 3 */}
      <div className="rounded-lg border bg-white p-4" style={{ borderColor: LANES.LANE_3.colorVar }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: LANES.LANE_3.colorVar }}>{LANES.LANE_3.teacherLabel}</h3>
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: LANES.LANE_3.softVar, color: LANES.LANE_3.colorVar }}
          >
            {lane3.count}
          </span>
        </div>
        {lane3.students.length === 0 ? (
          <p className="text-sm text-muted">No students need attention</p>
        ) : (
          <div className="space-y-2">
            {lane3.students.map((student) => (
              <div
                key={student.studentUserId}
                className="rounded-md border border-outline-variant bg-surface-container-low p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold text-on-surface">
                    {student.studentName}
                  </span>
                  <WaitingBadge minutes={student.waitingMinutes} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {student.isUnexpectedFailure && (
                    <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      ⚠ Usually secure
                    </span>
                  )}
                  {student.holdingAtFinalCheck && (
                    <span className="inline-block rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      App waiting
                    </span>
                  )}
                </div>
                {onHandback && (
                  <button
                    onClick={() => onHandback(student.participantId)}
                    disabled={actingOnIds?.has(student.participantId)}
                    className="anx-btn-primary mt-2 w-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actingOnIds?.has(student.participantId) ? 'Working…' : 'Hand back to app'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
