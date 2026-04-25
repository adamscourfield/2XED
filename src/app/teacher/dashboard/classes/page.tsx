import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { LearningPageShell } from '@/components/LearningPageShell';
import { countLiveSessionsThisTermForClassrooms, loadTeacherClassesPageData } from '@/app/teacher/dashboard/teacherDashboardData';
import { TeacherClassesHub, type TeacherClassesHubRow } from '@/app/teacher/dashboard/TeacherClassesHub';
import { TeacherClassesPageActions } from '@/app/teacher/dashboard/TeacherClassesPageActions';
import { classCodeLabel, formatSessionTime, iconHue } from '@/app/teacher/dashboard/TeacherHomeDashboard';

function parseScope(raw: string | undefined): { yearGroup: string | null; subjectSlug: string | null } | null {
  if (!raw || raw === 'all') return null;
  try {
    const o = JSON.parse(raw) as { y?: string | null; s?: string | null };
    if (o && typeof o === 'object') {
      return { yearGroup: o.y ?? null, subjectSlug: o.s ?? null };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function scopeToken(yearGroup: string | null, subjectSlug: string | null): string {
  return JSON.stringify({ y: yearGroup, s: subjectSlug });
}

function scopeLabel(yearGroup: string | null, subjectSlug: string | null, subjectTitleBySlug: Map<string, string>): string {
  const y = yearGroup?.trim() || '';
  const slug = subjectSlug?.trim() || '';
  const subjectTitle = slug ? subjectTitleBySlug.get(slug) ?? slug.replace(/-/g, ' ') : '';
  const parts = [y, subjectTitle].filter(Boolean);
  return parts.length ? parts.join(' ') : 'All classes';
}

interface Props {
  searchParams?: Promise<{ scope?: string }>;
}

export default async function TeacherDashboardClassesPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const rawScope = params.scope?.trim();
  const parsedScope = parseScope(rawScope);

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string; name?: string | null; email?: string | null };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const data = await loadTeacherClassesPageData(user.id);

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

  const { teacherProfile, lastLiveSessionByClassroomId, liveSessionsThisTerm, subjectTitleBySlug } = data;
  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'there';

  const scopeTokens = new Map<string, { yearGroup: string | null; subjectSlug: string | null }>();
  for (const tc of teacherProfile.classrooms) {
    const c = tc.classroom;
    const token = scopeToken(c.yearGroup, c.subjectSlug);
    if (!scopeTokens.has(token)) {
      scopeTokens.set(token, { yearGroup: c.yearGroup, subjectSlug: c.subjectSlug });
    }
  }
  const scopeFilter =
    parsedScope && [...scopeTokens.values()].some(
      (v) =>
        (v.yearGroup ?? '') === (parsedScope.yearGroup ?? '') &&
        (v.subjectSlug ?? '') === (parsedScope.subjectSlug ?? '')
    )
      ? parsedScope
      : null;

  const scopeOptions = [
    { value: 'all', label: 'All classes' },
    ...[...scopeTokens.entries()]
      .map(([value, { yearGroup, subjectSlug }]) => ({
        value,
        label: scopeLabel(yearGroup, subjectSlug, subjectTitleBySlug),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
  ];

  const matchesScope = (yearGroup: string | null, subjectSlug: string | null) => {
    if (!scopeFilter) return true;
    const yOk =
      !scopeFilter.yearGroup || (yearGroup?.trim() ?? '') === scopeFilter.yearGroup.trim();
    const sOk =
      !scopeFilter.subjectSlug || (subjectSlug?.trim() ?? '') === scopeFilter.subjectSlug.trim();
    return yOk && sOk;
  };

  const scopedClassrooms = teacherProfile.classrooms.filter((tc) =>
    matchesScope(tc.classroom.yearGroup, tc.classroom.subjectSlug)
  );

  const hubRows: TeacherClassesHubRow[] = scopedClassrooms.map((tc) => {
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

  const statClassCount = hubRows.length;
  const statStudentIds = new Set<string>();
  for (const tc of scopedClassrooms) {
    for (const e of tc.classroom.enrollments) {
      statStudentIds.add(e.studentUserId);
    }
  }
  const statStudentCount = statStudentIds.size;

  let statAvgUnderstandingPct: number | null = null;
  if (hubRows.length > 0) {
    const weighted = hubRows.reduce((s, r) => s + r.avgUnderstandingPct * r.studentCount, 0);
    const n = hubRows.reduce((s, r) => s + r.studentCount, 0);
    statAvgUnderstandingPct = n > 0 ? Math.round(weighted / n) : Math.round(hubRows.reduce((s, r) => s + r.avgUnderstandingPct, 0) / hubRows.length);
  }

  const classroomIdsInScope = scopedClassrooms.map((tc) => tc.classroomId);
  const statLiveLessonsThisTerm = scopeFilter
    ? await countLiveSessionsThisTermForClassrooms(user.id, classroomIdsInScope)
    : liveSessionsThisTerm;

  return (
    <LearningPageShell
      title="Classes"
      subtitle="Manage your classes and view their progress."
      maxWidthClassName="max-w-6xl"
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      actions={<TeacherClassesPageActions scopeOptions={scopeOptions} />}
    >
      <TeacherClassesHub
        rows={hubRows}
        teacherDisplayName={displayName}
        statClassCount={statClassCount}
        statStudentCount={statStudentCount}
        statAvgUnderstandingPct={statAvgUnderstandingPct}
        statLiveLessonsThisTerm={statLiveLessonsThisTerm}
      />
    </LearningPageShell>
  );
}
