import Link from 'next/link';
import { StaffAnalyticsDisclosure } from '@/components/staff/StaffAnalyticsDisclosure';
import { DashboardLessonCalendar } from '@/components/DashboardLessonCalendar';
import type { EventPayload } from '@/app/teacher/dashboard/teacherDashboardData';
import {
  getRiskModel,
  MOMENTUM_HELP,
  pct,
  efficiencyScore,
  trendBadge,
  trendDirection,
} from '@/app/teacher/dashboard/teacherDashboardAnalytics';
import type { loadTeacherDashboardData } from '@/app/teacher/dashboard/teacherDashboardData';
import type { TeacherProfileWithClassrooms } from '@/app/teacher/dashboard/teacherDashboardData';

type DashboardData = Awaited<ReturnType<typeof loadTeacherDashboardData>>;

type Props = {
  data: Exclude<DashboardData, { teacherProfile: null }>;
  days: number;
  subtopicFilter: string;
  teacherProfile: TeacherProfileWithClassrooms;
  externalTeacherId: string;
  externalSchoolId: string | null;
  /** Omit calendar and side column; stack analytics for the classes hub layout. */
  compactLayout?: boolean;
};

export function TeacherDashboardClassesView({
  data,
  days,
  subtopicFilter,
  teacherProfile,
  externalTeacherId,
  externalSchoolId,
  compactLayout = false,
}: Props) {
  const { events, questionAttempts, subjectMap, since, recentSessions } = data;
  const now = new Date();

  return (
    <div className={compactLayout ? 'staff-dash-bento staff-dash-bento--stack' : 'staff-dash-bento'}>
      <div className="staff-dash-bento-main">
        {!compactLayout && (
          <DashboardLessonCalendar
            className="student-dash-calendar anx-card overflow-hidden"
            hint="Class timetables you maintain, your live sessions, and student reviews."
          />
        )}

        <div className="staff-dash-filter-row">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--anx-text-muted)]">Window</span>
          <div className="staff-dash-pill-group">
            {[7, 30, 90].map((d) => (
              <Link
                key={d}
                href={`/teacher/dashboard/classes?days=${d}${subtopicFilter ? `&subtopic=${encodeURIComponent(subtopicFilter)}` : ''}`}
                className={`staff-dash-pill${days === d ? ' staff-dash-pill--active' : ''}`}
              >
                Last {d} days
              </Link>
            ))}
          </div>
        </div>

        <div className="staff-dash-section-gap">
          {teacherProfile.classrooms.map((tc) => {
            const cls = tc.classroom;
            const classSubjectId = cls.subjectSlug ? subjectMap.get(cls.subjectSlug) : undefined;
            const classStudents = cls.enrollments.map((e) => e.student);
            const classStudentIds = new Set(classStudents.map((s) => s.id));

            const classEvents = events.filter((e) => {
              if (!e.studentUserId || !classStudentIds.has(e.studentUserId)) return false;
              if (classSubjectId && !(e.subjectId === classSubjectId || e.subjectId == null)) return false;
              if (subtopicFilter && (e.payload as EventPayload).subtopicCode !== subtopicFilter) return false;
              return true;
            });

            const questionEvents = classEvents.filter((e) => e.name === 'question_answered');
            const routeEvents = classEvents.filter((e) => e.name === 'route_completed');
            const stepAttemptEvents = classEvents.filter((e) => e.name === 'step_checkpoint_attempted');
            const interactionEvalEvents = classEvents.filter((e) => e.name === 'step_interaction_evaluated');

            const avgMasteryVals = classStudents.flatMap((s) => s.skillMasteries.map((m) => m.mastery));
            const avgMastery = avgMasteryVals.length
              ? Math.round((avgMasteryVals.reduce((a, b) => a + b, 0) / avgMasteryVals.length) * 100)
              : 0;
            const stableCount = classStudents.filter((s) =>
              s.skillMasteries.some((m) => m.confirmedCount >= 2 && m.mastery >= 0.85)
            ).length;
            const reviewDueCount = classStudents.filter((s) =>
              s.skillMasteries.some((m) => !m.nextReviewAt || m.nextReviewAt <= now)
            ).length;

            const checkpointCorrect = stepAttemptEvents.filter((e) => Boolean((e.payload as EventPayload).correct)).length;
            const routeStrong = routeEvents.filter((e) => ((e.payload as EventPayload).accuracy as number | undefined ?? 0) >= 0.8).length;
            const rulePassed = interactionEvalEvents.filter((e) => Boolean((e.payload as EventPayload).rulePassed)).length;
            const wrongFirstDiff = interactionEvalEvents.filter(
              (e) => (e.payload as EventPayload).errorType === 'wrong_first_difference'
            ).length;

            const classKnowledgeStates = classStudents.flatMap((s) => s.knowledgeSkillStates);
            const classDleValues = classKnowledgeStates.map((s) => s.latestDle).filter((v): v is number => typeof v === 'number');
            const classAvgDle = classDleValues.length ? classDleValues.reduce((sum, v) => sum + v, 0) / classDleValues.length : null;
            const classDurableCount = classKnowledgeStates.filter((s) => s.durabilityBand === 'DURABLE').length;
            const classAtRiskCount = classKnowledgeStates.filter((s) => s.durabilityBand === 'AT_RISK').length;
            const classInstructionalTimes = classKnowledgeStates
              .map((s) => s.latestInstructionalTimeMs)
              .filter((v): v is number => typeof v === 'number');
            const classAvgInstructionalTimeMs = classInstructionalTimes.length
              ? Math.round(classInstructionalTimes.reduce((sum, v) => sum + v, 0) / classInstructionalTimes.length)
              : null;

            const classAttempts = questionAttempts.filter((a) => {
              if (!classStudentIds.has(a.userId)) return false;
              if (classSubjectId && a.skill.subjectId !== classSubjectId) return false;
              return true;
            });
            const classRecentAttempts = classAttempts.filter((a) => a.occurredAt >= since);
            const classPreviousAttempts = classAttempts.filter((a) => a.occurredAt < since);
            const classTrend = trendDirection(efficiencyScore(classRecentAttempts), efficiencyScore(classPreviousAttempts));

            const studentRows = cls.enrollments.map((enrollment) => {
              const student = enrollment.student;
              const studentEvents = classEvents.filter((e) => e.studentUserId === student.id);
              const studentQuestion = studentEvents.filter((e) => e.name === 'question_answered').length;
              const studentStep = studentEvents.filter((e) => e.name === 'step_checkpoint_attempted');
              const studentEval = studentEvents.filter((e) => e.name === 'step_interaction_evaluated');
              const studentInterventions = studentEvents.filter((e) => e.name === 'intervention_flagged').length;

              const masteryVals = student.skillMasteries.map((m) => m.mastery);
              const masteryAvg = masteryVals.length ? Math.round((masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length) * 100) : 0;
              const checkpointHits = studentStep.filter((e) => Boolean((e.payload as EventPayload).correct)).length;
              const evalPass = studentEval.filter((e) => Boolean((e.payload as EventPayload).rulePassed)).length;
              const evalWrong = studentEval.filter((e) => (e.payload as EventPayload).errorType === 'wrong_first_difference').length;
              const studentDleValues = student.knowledgeSkillStates.map((s) => s.latestDle).filter((v): v is number => typeof v === 'number');
              const studentAvgDle = studentDleValues.length
                ? studentDleValues.reduce((sum, v) => sum + v, 0) / studentDleValues.length
                : null;
              const studentDurability =
                student.knowledgeSkillStates.find((s) => s.durabilityBand === 'AT_RISK')?.durabilityBand ??
                student.knowledgeSkillStates.find((s) => s.durabilityBand === 'DEVELOPING')?.durabilityBand ??
                student.knowledgeSkillStates.find((s) => s.durabilityBand === 'DURABLE')?.durabilityBand ??
                null;

              const checkpointRateValue = studentStep.length > 0 ? checkpointHits / studentStep.length : 1;
              const interactionPassRateValue = studentEval.length > 0 ? evalPass / studentEval.length : 1;
              const { riskLevel, riskScore } = getRiskModel({
                checkpointRate: checkpointRateValue,
                interactionPassRate: interactionPassRateValue,
                interventions: studentInterventions,
                wrongFirstDiff: evalWrong,
              });
              const studentAttempts = questionAttempts.filter((a) => {
                if (a.userId !== student.id) return false;
                if (classSubjectId && a.skill.subjectId !== classSubjectId) return false;
                return true;
              });
              const studentTrend = trendDirection(
                efficiencyScore(studentAttempts.filter((a) => a.occurredAt >= since)),
                efficiencyScore(studentAttempts.filter((a) => a.occurredAt < since))
              );
              const needsAction = riskLevel !== 'GREEN';

              return {
                id: student.id,
                name: student.name ?? student.email ?? student.id,
                observeStudentId: enrollment.studentProfile?.externalStudentId ?? '—',
                masteryAvg,
                questionCount: studentQuestion,
                checkpointRate: pct(checkpointHits, studentStep.length),
                interactionPassRate: pct(evalPass, studentEval.length),
                wrongFirstDiff: evalWrong,
                interventions: studentInterventions,
                riskLevel,
                riskScore,
                studentAvgDle,
                studentDurability,
                studentTrend,
                needsAction,
              };
            });

            const requiringAction = studentRows.filter((s) => s.needsAction);

            return (
              <section key={cls.id} id={`class-analytics-${cls.id}`} className="staff-dash-class-panel scroll-mt-24">
                <div className="staff-dash-class-head">
                  <h2 className="staff-dash-class-title">{cls.name}</h2>
                  <p className="staff-dash-class-meta">
                    {cls.yearGroup ?? '—'} · {cls.subjectSlug ?? '—'} · Observe class id: {cls.externalClassId}
                  </p>
                </div>

                <div className="staff-dash-metric-grid">
                  <div className="staff-dash-metric-tile">
                    <p className="staff-dash-metric-label">Students</p>
                    <p className="staff-dash-metric-value">{classStudents.length}</p>
                  </div>
                  <div className="staff-dash-metric-tile">
                    <p className="staff-dash-metric-label">Average mastery</p>
                    <p className="staff-dash-metric-value">{avgMastery}%</p>
                  </div>
                  <div className="staff-dash-metric-tile">
                    <p className="staff-dash-metric-label">Stable learners</p>
                    <p className="staff-dash-metric-value">{stableCount}</p>
                  </div>
                  <div className="staff-dash-metric-tile">
                    <p className="staff-dash-metric-label">Review due</p>
                    <p className="staff-dash-metric-value">{reviewDueCount}</p>
                  </div>
                </div>

                <StaffAnalyticsDisclosure
                  storageKey={`teacher-class-analytics:${cls.id}`}
                  summary={
                    <>
                      Full student roster with risk and durability.{' '}
                      {requiringAction.length === 0 ? (
                        <>No students flagged for follow-up in this window.</>
                      ) : (
                        <>
                          <strong>
                            {requiringAction.length} student{requiringAction.length !== 1 ? 's' : ''}
                          </strong>{' '}
                          flagged for follow-up.
                        </>
                      )}
                    </>
                  }
                >
                <div className="staff-dash-metric-grid staff-dash-metric-grid--5">
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--accent">
                    <p className="staff-dash-metric-label">Question events</p>
                    <p className="staff-dash-metric-value">{questionEvents.length}</p>
                  </div>
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--accent">
                    <p className="staff-dash-metric-label">Checkpoint accuracy</p>
                    <p className="staff-dash-metric-value">{pct(checkpointCorrect, stepAttemptEvents.length)}</p>
                  </div>
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--accent">
                    <p className="staff-dash-metric-label">Interaction rule pass</p>
                    <p className="staff-dash-metric-value">{pct(rulePassed, interactionEvalEvents.length)}</p>
                  </div>
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--accent">
                    <p className="staff-dash-metric-label">Strong routes (≥80%)</p>
                    <p className="staff-dash-metric-value">{pct(routeStrong, routeEvents.length)}</p>
                  </div>
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--warn">
                    <p className="staff-dash-metric-label">Wrong first-difference</p>
                    <p className="staff-dash-metric-value">{wrongFirstDiff}</p>
                  </div>
                </div>

                <div className="staff-dash-metric-grid staff-dash-metric-grid--5">
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--teal">
                    <p className="staff-dash-metric-label">Avg DLE (latest)</p>
                    <p className="staff-dash-metric-value">{classAvgDle != null ? classAvgDle.toFixed(2) : '—'}</p>
                  </div>
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--sky" title={MOMENTUM_HELP}>
                    <p className="staff-dash-metric-label">DLE momentum</p>
                    <p className="staff-dash-metric-value">{trendBadge(classTrend)}</p>
                    <p className="mt-1 text-[11px] text-sky-800">Proxy metric</p>
                  </div>
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--emerald">
                    <p className="staff-dash-metric-label">Durable states</p>
                    <p className="staff-dash-metric-value">{classDurableCount}</p>
                  </div>
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--amber">
                    <p className="staff-dash-metric-label">At-risk states</p>
                    <p className="staff-dash-metric-value">{classAtRiskCount}</p>
                  </div>
                  <div className="staff-dash-metric-tile staff-dash-metric-tile--cyan">
                    <p className="staff-dash-metric-label">Avg instructional time</p>
                    <p className="staff-dash-metric-value">
                      {classAvgInstructionalTimeMs != null ? `${Math.round(classAvgInstructionalTimeMs / 1000)}s` : '—'}
                    </p>
                  </div>
                </div>

                <div className="staff-dash-callout">
                  <p className="staff-dash-callout-label">Students requiring action</p>
                  <p className="staff-dash-callout-body">
                    {requiringAction.length === 0
                      ? 'No high-priority students in this filter window.'
                      : requiringAction.map((s) => `${s.name} (${s.riskLevel})`).join(', ')}
                  </p>
                </div>

                <div className="staff-dash-table-wrap">
                  <table className="staff-dash-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Observe ID</th>
                        <th>Risk</th>
                        <th>DLE</th>
                        <th>Durability</th>
                        <th>Trend</th>
                        <th>Mastery</th>
                        <th>Questions</th>
                        <th>Checkpoint</th>
                        <th>Interaction pass</th>
                        <th>Wrong first-diff</th>
                        <th>Interventions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRows.map((row) => (
                        <tr key={row.id} className={row.needsAction ? 'bg-amber-50/60' : ''}>
                          <td>{row.name}</td>
                          <td className="font-mono text-xs">{row.observeStudentId}</td>
                          <td>
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-semibold ${
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
                          <td className="font-mono text-xs">{row.studentAvgDle != null ? row.studentAvgDle.toFixed(2) : '—'}</td>
                          <td>
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                row.studentDurability === 'AT_RISK'
                                  ? 'bg-rose-100 text-rose-800'
                                  : row.studentDurability === 'DEVELOPING'
                                    ? 'bg-amber-100 text-amber-800'
                                    : row.studentDurability === 'DURABLE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {row.studentDurability ?? '—'}
                            </span>
                          </td>
                          <td className="text-xs text-sky-800">{trendBadge(row.studentTrend)}</td>
                          <td>{row.masteryAvg}%</td>
                          <td>{row.questionCount}</td>
                          <td>{row.checkpointRate}</td>
                          <td>{row.interactionPassRate}</td>
                          <td className="text-rose-700">{row.wrongFirstDiff}</td>
                          <td>{row.interventions}</td>
                        </tr>
                      ))}
                      {studentRows.length === 0 && (
                        <tr>
                          <td colSpan={12} className="py-8 text-center text-[color:var(--anx-text-muted)]">
                            No students enrolled in this class yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                </StaffAnalyticsDisclosure>
              </section>
            );
          })}
        </div>
      </div>

      {!compactLayout ? (
      <aside className="staff-dash-bento-side">
        <section className="staff-dash-side-card">
          <p className="student-dash-eyebrow" style={{ color: 'var(--anx-text-muted)' }}>
            Observe link
          </p>
          <h3 className="staff-dash-side-title">Your profile</h3>
          <ul className="staff-dash-meta-list">
            <li>
              <strong>Teacher ID</strong> {externalTeacherId}
            </li>
            <li>
              <strong>School ID</strong> {externalSchoolId ?? '—'}
            </li>
            <li>
              <strong>Analytics window</strong> Last {days} days
            </li>
            <li>
              <strong>Subtopic filter</strong> {subtopicFilter || 'All'}
            </li>
          </ul>
        </section>

        <section className="staff-dash-side-card">
          <p className="student-dash-eyebrow" style={{ color: 'var(--anx-text-muted)' }}>
            Live teaching
          </p>
          <h3 className="staff-dash-side-title">Recent sessions</h3>
          <p className="staff-dash-side-text">Resume a lobby or active lesson, or start a new one from the hero.</p>
          {recentSessions.length === 0 ? (
            <p className="staff-dash-side-text mt-2">No sessions yet — start your first live lesson when you are ready.</p>
          ) : (
            <ul className="mt-3 flex list-none flex-col gap-2 p-0">
              {recentSessions.map((ls) => {
                const isLive = ls.status === 'ACTIVE' || ls.status === 'LOBBY';
                const statusColour =
                  ls.status === 'ACTIVE'
                    ? 'anx-badge-green'
                    : ls.status === 'LOBBY'
                      ? 'anx-badge-blue'
                      : ls.status === 'PAUSED'
                        ? 'anx-badge-blue'
                        : 'anx-badge-blue';
                return (
                  <li key={ls.id} className="staff-dash-live-row">
                    <div className="staff-dash-live-row-main">
                      {isLive ? <span className="anx-live-dot shrink-0" /> : <span className="w-2 shrink-0" aria-hidden />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--anx-text)]">
                          {ls.subject.title}
                          {ls.skill ? ` — ${ls.skill.code}: ${ls.skill.name}` : ''}
                        </p>
                        <p className="text-xs text-[color:var(--anx-text-muted)]">
                          <span className="font-mono font-semibold">{ls.joinCode}</span> · {ls._count.participants} student
                          {ls._count.participants !== 1 ? 's' : ''} · {ls.createdAt.toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                    <div className="staff-dash-live-actions">
                      <span className={`anx-badge ${statusColour}`}>{ls.status}</span>
                      {(isLive || ls.status === 'PAUSED') && (
                        <Link href={`/teacher/live/${ls.id}`} className="anx-btn-secondary px-3 py-1.5 text-xs">
                          Open
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
      ) : null}
    </div>
  );
}
