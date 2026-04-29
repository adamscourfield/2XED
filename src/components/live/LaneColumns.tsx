'use client';

type EscalationReason =
  | 'SHADOW_CHECK_FAILED'
  | 'ANCHOR_FAILED'
  | 'MISCONCEPTION_FAILED'
  | 'SCAFFOLDED_CORRECT'
  | 'MANUAL_TEACHER';

interface LaneStudent {
  participantId: string;
  studentUserId: string;
  studentName: string;
  masteryProbability: number;
  currentExplanationRouteType: string | null;
  escalationReason: EscalationReason | null;
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
  lane3: LaneGroup;
  onHandback?: (participantId: string) => void;
}

function WaitingBadge({ minutes }: { minutes: number }) {
  const color = minutes > 6 ? 'text-red-700 bg-red-50' : minutes > 3 ? 'text-amber-700 bg-amber-50' : 'text-on-surface-variant bg-surface-container-high';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {minutes} min
    </span>
  );
}

export function LaneColumns({ lane1, lane2, lane3, onHandback }: LaneColumnsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Lane 1 — Got it */}
      <div className="rounded-lg border border-green-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-green-800">Got it</h3>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
            {lane1.count}
          </span>
        </div>
        <p className="text-sm text-muted">Moving forward independently</p>
      </div>

      {/* Lane 2 — Nearly there */}
      <div className="rounded-lg border border-amber-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-amber-800">Nearly there</h3>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
            {lane2.count}
          </span>
        </div>
        <p className="text-sm text-muted">App is working with them</p>
      </div>

      {/* Lane 3 — Needs teacher */}
      <div className="rounded-lg border border-red-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-red-800">Needs teacher</h3>
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
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
                    className="anx-btn-primary mt-2 w-full text-xs"
                  >
                    Hand back to app
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
