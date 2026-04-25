import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LearningPageShell } from '@/components/LearningPageShell';
import { StaffDashboardShell } from '@/components/staff/StaffDashboardShell';
import { loadTeacherDashboardData, parseDays } from '@/app/teacher/dashboard/teacherDashboardData';
import { MOMENTUM_HELP } from '@/app/teacher/dashboard/teacherDashboardAnalytics';
import { TeacherDashboardClassesView } from '@/app/teacher/dashboard/TeacherDashboardClassesView';

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

  const { teacherProfile, recentSessions, events, allStudentIds } = data;
  const now = new Date();
  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'there';
  const classCount = teacherProfile.classrooms.length;
  const studentCount = allStudentIds.length;
  const activitySignals = events.filter((e) => e.name === 'question_answered').length;
  const reviewDueStudentIds = new Set<string>();
  for (const tc of teacherProfile.classrooms) {
    for (const en of tc.classroom.enrollments) {
      if (en.student.skillMasteries.some((m) => !m.nextReviewAt || m.nextReviewAt <= now)) {
        reviewDueStudentIds.add(en.studentUserId);
      }
    }
  }
  const reviewsDueStudents = reviewDueStudentIds.size;
  const liveNowCount = recentSessions.filter((ls) => ls.status === 'ACTIVE' || ls.status === 'LOBBY').length;

  return (
    <LearningPageShell
      title="Class analytics"
      subtitle="Calendar, mastery, checkpoints, and Observe-linked signals."
      maxWidthClassName="max-w-6xl"
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      actions={
        <Link href="/teacher/dashboard" className="anx-btn-secondary text-sm no-underline">
          ← Home
        </Link>
      }
    >
      <StaffDashboardShell
        variant="teacher"
        eyebrow="Teaching workspace"
        displayName={displayName}
        title="Your classes at a glance"
        lead="Use the calendar for what is coming up, then dive into each group for mastery, checkpoints, and who needs you next."
        stats={[
          { label: 'Classes', value: String(classCount) },
          { label: 'Students', value: String(studentCount) },
          { label: 'Practice signals', value: String(activitySignals), hint: `Question events · last ${days}d` },
          {
            label: 'Attention',
            value: String(reviewsDueStudents),
            hint: `${liveNowCount} live session${liveNowCount === 1 ? '' : 's'} (lobby or active)`,
          },
        ]}
        heroActions={
          <>
            <Link href="/teacher/live/new" className="anx-btn-primary">
              Start a live lesson
            </Link>
            <Link href="/teacher/timetable" className="anx-btn-secondary">
              Timetable
            </Link>
            {(user.role === 'ADMIN' || user.role === 'LEADERSHIP') && (
              <Link href="/teacher/leadership" className="anx-btn-secondary">
                School overview
              </Link>
            )}
          </>
        }
        footnote={
          <p className="m-0">
            <span className="font-semibold">DLE momentum:</span> {MOMENTUM_HELP}
          </p>
        }
      >
        <TeacherDashboardClassesView
          data={data}
          days={days}
          subtopicFilter={subtopicFilter}
          teacherProfile={teacherProfile}
          externalTeacherId={teacherProfile.externalTeacherId}
          externalSchoolId={teacherProfile.externalSchoolId}
        />
      </StaffDashboardShell>
    </LearningPageShell>
  );
}
