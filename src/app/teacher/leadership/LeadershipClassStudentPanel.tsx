'use client';

import { StaffAnalyticsDisclosure } from '@/components/staff/StaffAnalyticsDisclosure';

export type LeadershipClassStudentRow = {
  id: string;
  name: string;
  riskLevel: 'RED' | 'AMBER' | 'GREEN';
  riskScore: number;
  avgDle: string;
  durability: 'AT_RISK' | 'DEVELOPING' | 'DURABLE' | null;
  masteryAvg: number;
  accuracy: string;
  trendLabel: string;
};

type ClassSummary = {
  name: string;
  yearGroup: string | null;
  teacherName: string;
  studentCount: number;
  avgMastery: number;
  clsTrendLabel: string;
  atRisk: number;
  amber: number;
};

type Props = {
  storageKey: string;
  /** Used for deep links: `#leadership-class-<id>` opens this class panel */
  classroomId: string;
  defaultOpen?: boolean;
  /** Analytics window (days) for copy in empty states. */
  windowDays?: number;
  classSummary: ClassSummary;
  studentRows: LeadershipClassStudentRow[];
};

export function LeadershipClassStudentPanel({
  storageKey,
  defaultOpen,
  windowDays = 30,
  classSummary,
  studentRows,
}: Props) {
  const { name, yearGroup, teacherName, studentCount, avgMastery, clsTrendLabel, atRisk, amber } = classSummary;

  const noElevatedRiskInClass =
    studentCount > 0 &&
    studentRows.length > 0 &&
    studentRows.every((r) => r.riskLevel === 'GREEN' && r.durability !== 'AT_RISK');

  return (
    <div id={`leadership-class-${classroomId}`} className="staff-dash-class-panel scroll-mt-24">
      <div className="staff-dash-class-head flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="staff-dash-class-title m-0">{name}</p>
          <p className="staff-dash-class-meta m-0 mt-1">
            {yearGroup ?? '—'} · {teacherName} · {studentCount} students
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {atRisk > 0 && <span className="anx-badge anx-badge-red">{atRisk} at risk</span>}
          {amber > 0 && <span className="anx-badge anx-badge-amber">{amber} amber</span>}
          <span className="text-xs text-[color:var(--anx-text-muted)]">
            {avgMastery}% mastery · {clsTrendLabel}
          </span>
        </div>
      </div>

      <StaffAnalyticsDisclosure
        storageKey={storageKey}
        expandHashId={`leadership-class-${classroomId}`}
        defaultOpen={defaultOpen}
        summary={
          <>
            {studentRows.length} student{studentRows.length !== 1 ? 's' : ''} in this class. Open for risk, DLE, and per-student
            trends.{' '}
            {atRisk === 0 && studentCount > 0 ? (
              <span className="text-emerald-800">No at-risk students in this class for the last {windowDays} days.</span>
            ) : null}
          </>
        }
      >
        {noElevatedRiskInClass ? (
          <p
            className="mb-3 rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--anx-outline-variant)',
              background: 'rgba(16, 185, 129, 0.08)',
              color: 'var(--anx-text-secondary)',
            }}
          >
            No at-risk students in the last {windowDays} days — knowledge states and practice signals look stable in this
            class.
          </p>
        ) : null}
        <div className="staff-dash-table-wrap">
          <table className="staff-dash-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Risk</th>
                <th>DLE</th>
                <th>Durability</th>
                <th>Mastery</th>
                <th>Accuracy</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map((row) => (
                <tr
                  key={row.id}
                  className={row.riskLevel === 'RED' ? 'bg-rose-50/60' : row.riskLevel === 'AMBER' ? 'bg-amber-50/40' : ''}
                >
                  <td className="font-medium">{row.name}</td>
                  <td>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        row.riskLevel === 'RED'
                          ? 'bg-rose-100 text-rose-800'
                          : row.riskLevel === 'AMBER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {row.riskLevel} ({row.riskScore})
                    </span>
                  </td>
                  <td className="font-mono text-xs">{row.avgDle}</td>
                  <td>
                    {row.durability ? (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          row.durability === 'AT_RISK'
                            ? 'bg-rose-100 text-rose-800'
                            : row.durability === 'DEVELOPING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {row.durability}
                      </span>
                    ) : (
                      <span className="text-[color:var(--anx-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="font-medium">{row.masteryAvg}%</td>
                  <td>{row.accuracy}</td>
                  <td className="text-xs text-[color:var(--anx-text-secondary)]">{row.trendLabel}</td>
                </tr>
              ))}
              {studentRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[color:var(--anx-text-muted)]">
                    No students enrolled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </StaffAnalyticsDisclosure>
    </div>
  );
}
