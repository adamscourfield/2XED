'use client';

import { LANES, LANE_IDS, laneReasonText, type LaneId } from '@/lib/live/lanes';

export interface ConductorLaneStudent {
  id: string;
  name: string | null;
  email: string;
  hasFlag: boolean;
  escalationReason: string | null;
  isUnexpectedFailure: boolean;
  holdingAtFinalCheck: boolean;
  movedRecently: boolean;
}

interface Props {
  laneCounts: { LANE_1: number; LANE_2: number; LANE_3: number };
  laneStudents: { LANE_1: ConductorLaneStudent[]; LANE_2: ConductorLaneStudent[]; LANE_3: ConductorLaneStudent[] };
  /** Push the AI alternative explanation to everyone in a support lane. Enables the
   *  per-lane bulk action; omit to hide it. */
  onPushExplanation?: (lane: LaneId) => void;
  /** True while a push is in flight (disables the buttons). */
  pushingExplanation?: boolean;
}

function StudentChip({ student, lane }: { student: ConductorLaneStudent; lane: LaneId }) {
  const def = LANES[lane];
  const reason = laneReasonText(student.escalationReason);
  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 ${student.movedRecently ? 'anx-lane-chip-moved' : ''}`}
      style={{
        borderColor: 'var(--anx-outline-variant)',
        background: student.movedRecently ? def.softVar : 'var(--anx-surface-container-lowest)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
          {student.name ?? student.email}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {student.movedRecently && (
            <span className="text-[10px] font-bold" style={{ color: def.colorVar }} title="Just moved lane">
              ● just moved
            </span>
          )}
          {student.hasFlag && (
            <span className="text-xs" style={{ color: 'var(--anx-danger-text)' }} title="Open intervention flag">⚑</span>
          )}
        </span>
      </div>
      {(reason || student.isUnexpectedFailure || student.holdingAtFinalCheck) && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {reason && (
            <span className="text-[11px]" style={{ color: 'var(--anx-text-muted)' }}>
              {reason}
            </span>
          )}
          {student.isUnexpectedFailure && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--anx-warning-soft, #fff8e1)', color: 'var(--anx-warning-text, #b45309)' }}>
              ⚠ usually secure
            </span>
          )}
          {student.holdingAtFinalCheck && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--anx-surface-container-high)', color: 'var(--anx-text-secondary)' }}>
              app waiting
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The 3-lane triage board, brought into the conductor so the teacher's clearest
 * view of where students are isn't on a separate page. Each lane shows who is in
 * it, *why* (escalation reason), the "usually secure" / "app waiting" flags, and
 * a pulse on students who just changed lane.
 */
export function ConductorLaneBoard({ laneCounts, laneStudents, onPushExplanation, pushingExplanation }: Props) {
  return (
    <section className="anx-signals-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--anx-text-muted)' }}>
        Lanes
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LANE_IDS.map((lane) => {
          const def = LANES[lane];
          const students = laneStudents[lane];
          return (
            <div key={lane} className="flex min-w-0 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: def.colorVar }}>{def.teacherLabel}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
                  style={{ background: def.softVar, color: def.colorVar }}
                >
                  {laneCounts[lane]}
                </span>
              </div>
              {students.length === 0 ? (
                <p className="rounded-lg border border-dashed px-2.5 py-3 text-center text-xs"
                  style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-muted)' }}>
                  {lane === 'LANE_1' ? 'No one here yet' : lane === 'LANE_2' ? 'No one needs support' : 'No one needs you'}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {students.map((s) => (
                    <StudentChip key={s.id} student={s} lane={lane} />
                  ))}
                </div>
              )}
              {/* Per-lane bulk action: push the AI alternative explanation to a
                  whole support lane (the amber/red "needs a simpler explanation"
                  move from the product model). */}
              {onPushExplanation && lane !== 'LANE_1' && students.length > 0 && (
                <button
                  type="button"
                  onClick={() => onPushExplanation(lane)}
                  disabled={pushingExplanation}
                  className="mt-2 w-full rounded-lg border px-2 py-1.5 text-xs font-semibold transition hover:bg-[var(--anx-primary-soft)] disabled:opacity-50"
                  style={{ borderColor: def.colorVar, color: def.colorVar }}
                >
                  {pushingExplanation ? 'Sending…' : `Push alt. explanation`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
