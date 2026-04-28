import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { hasCompletedOnboardingDiagnostic } from '@/features/learn/onboarding';
import { selectNextSkill } from '@/features/learn/nextSkill';
import { LearningPageShell } from '@/components/LearningPageShell';
import { StudentDashboardView, type DashboardSubjectSummary, type StudentLivePromo } from '@/components/student/StudentDashboardView';
import { getUserGamificationSummary } from '@/features/gamification/gamificationService';
import type { StudentTopBarSubjectOption } from '@/components/student/StudentTopBarSubjectSelector';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekMonday(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function subjectEmoji(slug: string): string {
  if (slug.includes('maths')) return '📐';
  if (slug.includes('english')) return '📖';
  return '📘';
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  if (role === 'TEACHER') redirect('/teacher/dashboard');
  if (role === 'ADMIN') redirect('/admin');

  const now = new Date();
  const weekStart = startOfWeekMonday(now);

  const [subjects, gamification, weekQuestionEvents, liveParticipant] = await Promise.all([
    prisma.subject.findMany({
      include: {
        skills: {
          include: {
            prerequisites: true,
            masteries: {
              where: { userId },
            },
          },
        },
      },
    }),
    getUserGamificationSummary(userId),
    prisma.event.findMany({
      where: {
        name: 'question_answered',
        studentUserId: userId,
        createdAt: { gte: weekStart },
      },
      select: { id: true },
    }),
    prisma.liveParticipant.findFirst({
      where: {
        studentUserId: userId,
        isActive: true,
        session: {
          status: { in: ['LOBBY', 'ACTIVE'] },
        },
      },
      orderBy: { joinedAt: 'desc' },
      include: {
        session: {
          include: {
            subject: { select: { title: true } },
            skill: { select: { name: true, code: true } },
            teacher: { select: { name: true, email: true } },
            classroom: { select: { name: true, externalClassId: true } },
          },
        },
      },
    }),
  ]);

  const weekActivityCount = weekQuestionEvents.length;

  const onboardingResults = await Promise.all(
    subjects.map((subject) => hasCompletedOnboardingDiagnostic(userId, subject.id))
  );
  const onboardingBySubject = new Map<string, boolean>();
  subjects.forEach((subject, i) => {
    onboardingBySubject.set(subject.id, onboardingResults[i] ?? false);
  });

  const subjectSummaries: DashboardSubjectSummary[] = subjects.map((subject) => {
    const onboardingComplete = onboardingBySubject.get(subject.id) ?? false;
    const startedSkills = subject.skills.filter((skill) => Boolean(skill.masteries[0]?.lastPracticedAt)).length;
    const averageMastery = subject.skills.length
      ? Math.round(
          (subject.skills.reduce((sum, skill) => sum + (skill.masteries[0]?.mastery ?? 0), 0) / subject.skills.length) * 100
        )
      : 0;

    const nextSkill = selectNextSkill(
      subject.skills,
      subject.skills
        .map((skill) => {
          const mastery = skill.masteries[0];
          if (!mastery) return null;
          return {
            skillId: skill.id,
            mastery: mastery.mastery,
            confirmedCount: mastery.confirmedCount,
            nextReviewAt: mastery.nextReviewAt,
          };
        })
        .filter(
          (
            mastery
          ): mastery is {
            skillId: string;
            mastery: number;
            confirmedCount: number;
            nextReviewAt: Date | null;
          } => mastery !== null
        ),
      now
    );

    const nextSkillMastery = nextSkill ? nextSkill.masteries[0] : null;
    const nextSkillStarted = Boolean(nextSkillMastery?.lastPracticedAt);
    const nextSkillIsDue = !nextSkillMastery?.nextReviewAt || nextSkillMastery.nextReviewAt <= now;

    const estimatedPracticeMinutes = Math.min(45, Math.max(8, Math.round(subject.skills.length * 1.2)));

    return {
      id: subject.id,
      slug: subject.slug,
      title: subject.title,
      emoji: subjectEmoji(subject.slug),
      onboardingComplete,
      averageMastery,
      startedSkills,
      totalSkills: subject.skills.length,
      nextSkillName: onboardingComplete && nextSkill ? nextSkill.name : null,
      nextHref: onboardingComplete ? `/learn/${subject.slug}` : `/diagnostic/${subject.slug}`,
      nextLabel: onboardingComplete ? (nextSkillStarted ? 'Continue learning' : 'Start practice') : 'Start diagnostic',
      nextSkillStarted,
      nextSkillIsDue,
      estimatedPracticeMinutes,
    };
  });

  const topBarSubjects: StudentTopBarSubjectOption[] = subjectSummaries.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    href: s.nextHref,
  }));

  let livePromo: StudentLivePromo | null = null;
  if (liveParticipant?.session) {
    const ls = liveParticipant.session;
    const topicTitle = ls.skill?.name ?? ls.subject.title;
    const teacherName = ls.teacher.name?.trim() || ls.teacher.email?.split('@')[0] || 'Your teacher';
    const className = ls.classroom.name;
    const classCode = ls.classroom.externalClassId?.slice(-4).toUpperCase() ?? '';
    livePromo = {
      topicTitle,
      teacherLine: `with ${teacherName}`,
      classLine: classCode ? `${className} · ${classCode}` : className,
    };
  }

  const displayName =
    session.user.name?.trim() ||
    (typeof session.user.email === 'string' ? session.user.email.split('@')[0] : null) ||
    'there';

  const primarySubjectSlug = subjectSummaries[0]?.slug ?? null;

  return (
    <LearningPageShell
      title="Dashboard"
      subtitle="Your calendar, progress, and shortcuts in one place."
      maxWidthClassName="max-w-6xl"
      appChrome="student"
      appChromeStudentLayout="topbar"
      appChromeStudentSubjects={topBarSubjects}
      hideHeader
    >
      <StudentDashboardView
        displayName={displayName}
        gamification={gamification}
        subjects={subjectSummaries}
        livePromo={livePromo}
        weekActivityCount={weekActivityCount}
        primarySubjectSlug={primarySubjectSlug}
      />

      {subjects.length === 0 && (
        <div className="anx-card mt-6 px-6 py-16 text-center text-[color:var(--anx-text-muted)]">
          <p>No subjects available yet. Check back when your school has set them up.</p>
        </div>
      )}
    </LearningPageShell>
  );
}
