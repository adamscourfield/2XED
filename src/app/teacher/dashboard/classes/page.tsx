import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LearningPageShell } from '@/components/LearningPageShell';
import { loadTeacherDashboardData, parseDays } from '@/app/teacher/dashboard/teacherDashboardData';
import { MOMENTUM_HELP } from '@/app/teacher/dashboard/teacherDashboardAnalytics';
import { TeacherDashboardClassesView } from '@/app/teacher/dashboard/TeacherDashboardClassesView';
import { TeacherClassesHub, type TeacherClassesHubRow } from '@/app/teacher/dashboard/TeacherClassesHub';
import { TeacherHomeClassSelector } from '@/app/teacher/dashboard/TeacherHomeClassSelector';
import { classCodeLabel, formatSessionTime, iconHue } from '@/app/teacher/dashboard/TeacherHomeDashboard';

interface Props {
  searchParams?: Promise<{ days?: string; subtopic?: string }>;
}

export default async function TeacherDashboardClassesPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const days = parseDays(params.days);
  const subtopicFilter = params.subtopic?.trim() || '';

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string; name?: string | null; email?: string | null };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const data = await loadTeacherDashboardData(user.id, days);

  if (!data.teacherProfile) {
    return (
      <LearningPageShell
        title="Teacher Dashboard"
        subtitle={`Observe-linked analytics for ${user.name ?? user.email}`}
        appChrome="teacher"
        appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No teacher profile linked yet. Add a TeacherProfile row mapped to your Observe teacher id.
        </div>
      </LearningPageShell>
    );
  }

  const { teacherProfile, lastLiveSessionByClassroomId, liveSessionsThisTerm } = data;
  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'there';
  const classCount = teacherProfile.classrooms.length;

  const classSelectorOptions = teacherProfile.classrooms.map((tc) => {
    const c = tc.classroom;
    return {
      id: c.id,
      name: c.name,
      code: classCodeLabel(c.externalClassId, c.subjectSlug),
      studentCount: c.enrollments.length,
      hue: iconHue(c.id),
    };
  });

  const hubRows: TeacherClassesHubRow[] = teacherProfile.classrooms.map((tc) => {
    const cls = tc.classroom;
    const classStudents = cls.enrollments.map((e) => e.student);
    const avgMasteryVals = classStudents.flatMap((s) => s.skillMasteries.map((m) => m.mastery));
    const avgUnderstandingPct = avgMasteryVals.length
      ? Math.round((avgMasteryVals.reduce((a, b) => a + b, 0) / avgMasteryVals.length) * 100)
      : 0;

    const last = lastLiveSessionByClassroomId.get(cls.id);
    const lastAt = last ? (last.endedAt ?? last.startedAt ?? last.createdAt) : null;
    const lastLive =
      last && lastAt
        ? {
            at: formatSessionTime(lastAt),
            topic: last.skill?.name ?? last.subject.title,
            isLive: last.status === 'ACTIVE' || last.status === 'LOBBY',
          }
        : null;

    return {
      id: cls.id,
      name: cls.name,
      code: classCodeLabel(cls.externalClassId, cls.subjectSlug),
      hue: iconHue(cls.id),
      yearGroup: cls.yearGroup,
      studentCount: classStudents.length,
      avgUnderstandingPct,
      lastLive,
    };
  });

  const totalStudents = hubRows.reduce((sum, r) => sum + r.studentCount, 0);
  const weightedSum = hubRows.reduce((sum, r) => sum + r.avgUnderstandingPct * r.studentCount, 0);
  const avgUnderstandingAcrossClasses =
    totalStudents > 0 ? Math.round(weightedSum / totalStudents) : hubRows.length > 0
      ? Math.round(hubRows.reduce((s, r) => s + r.avgUnderstandingPct, 0) / hubRows.length)
      : null;

  const studentCount = [...new Set(teacherProfile.classrooms.flatMap((tc) => tc.classroom.enrollments.map((e) => e.studentUserId)))]
    .length;

  return (
    <LearningPageShell
      title="Classes"
      subtitle="Manage your classes and view their progress."
      maxWidthClassName="max-w-6xl"
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <TeacherHomeClassSelector classes={classSelectorOptions} />
          <span className="td-home-bell shrink-0" title="Notifications" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2V20h16v-2l-2-2Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="td-home-bell-dot" />
          </span>
          <button
            type="button"
            className="anx-btn-primary text-sm opacity-60 cursor-not-allowed"
            disabled
            title="Contact your school admin to link a new class"
          >
            + Add class
          </button>
        </div>
      }
    >
      <TeacherClassesHub
        rows={hubRows}
        teacherDisplayName={displayName}
        classCount={classCount}
        studentCount={studentCount}
        avgUnderstandingAcrossClasses={avgUnderstandingAcrossClasses}
        liveLessonsThisTerm={liveSessionsThisTerm}
      />

      <div className="mt-10 border-t border-[color:var(--anx-outline-variant)] pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>
              Class analytics
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              Calendar, mastery, checkpoints, and Observe-linked signals. Use the table above to jump to a class.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/teacher/dashboard" className="anx-btn-secondary text-sm no-underline">
              ← Home
            </Link>
            <Link href="/teacher/live/new" className="anx-btn-primary text-sm no-underline">
              Start a live lesson
            </Link>
            <Link href="/teacher/timetable" className="anx-btn-secondary text-sm no-underline">
              Timetable
            </Link>
            {(user.role === 'ADMIN' || user.role === 'LEADERSHIP') && (
              <Link href="/teacher/leadership" className="anx-btn-secondary text-sm no-underline">
                School overview
              </Link>
            )}
          </div>
        </div>
        <p className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          <span className="font-semibold">DLE momentum:</span> {MOMENTUM_HELP}
        </p>
        <TeacherDashboardClassesView
          data={data}
          days={days}
          subtopicFilter={subtopicFilter}
          teacherProfile={teacherProfile}
          externalTeacherId={teacherProfile.externalTeacherId}
          externalSchoolId={teacherProfile.externalSchoolId}
          compactLayout
        />
      </div>
    </LearningPageShell>
  );
}
