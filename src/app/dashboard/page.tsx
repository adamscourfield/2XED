import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { hasCompletedOnboardingDiagnostic } from '@/features/learn/onboarding';
import { selectNextSkill } from '@/features/learn/nextSkill';
import { LearningPageShell } from '@/components/LearningPageShell';
import {
  StudentDashboardView,
  type DashboardRecentSession,
  type DashboardRewardRow,
  type DashboardSubjectSummary,
  type JourneyMonthBar,
} from '@/components/student/StudentDashboardView';
import { getUserGamificationSummary } from '@/features/gamification/gamificationService';

const MAX_RECENT_ATTEMPTS = 20;
const MAX_RECENT_SESSIONS = 5;
const JOURNEY_MONTHS = 6;
const REWARD_LEDGER_LIMIT = 12;

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

function monthKeysDescending(now: Date, count: number): { key: string; label: string; date: Date }[] {
  const out: { key: string; label: string; date: Date }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d);
    out.push({ key, label, date: d });
  }
  return out;
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
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const journeyMonthDefs = monthKeysDescending(now, JOURNEY_MONTHS);
  const journeyFrom = journeyMonthDefs[0]?.date ?? new Date(now.getFullYear(), now.getMonth() - (JOURNEY_MONTHS - 1), 1);

  const [
    subjects,
    gamification,
    recentAttempts,
    journeyEvents,
    weekQuestionEvents,
    prevWeekQuestionEvents,
    weekAttempts,
    rewardTransactions,
  ] = await Promise.all([
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
    prisma.attempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_RECENT_ATTEMPTS,
      include: {
        item: {
          include: {
            skills: {
              include: { skill: { include: { subject: true } } },
            },
          },
        },
      },
    }),
    prisma.event.findMany({
      where: {
        name: 'question_answered',
        studentUserId: userId,
        createdAt: { gte: journeyFrom },
      },
      select: { createdAt: true },
    }),
    prisma.event.findMany({
      where: {
        name: 'question_answered',
        studentUserId: userId,
        createdAt: { gte: weekStart },
      },
      select: { id: true },
    }),
    prisma.event.findMany({
      where: {
        name: 'question_answered',
        studentUserId: userId,
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
      select: { id: true },
    }),
    prisma.attempt.findMany({
      where: {
        userId,
        createdAt: { gte: weekStart },
      },
      select: { correct: true },
    }),
    prisma.rewardTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: REWARD_LEDGER_LIMIT,
      select: {
        id: true,
        createdAt: true,
        reason: true,
        xpDelta: true,
        tokenDelta: true,
      },
    }),
  ]);

  const monthCounts = new Map<string, number>();
  for (const def of journeyMonthDefs) {
    monthCounts.set(def.key, 0);
  }
  for (const ev of journeyEvents) {
    const d = ev.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthCounts.has(key)) {
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
  }
  const journeyMonths: JourneyMonthBar[] = journeyMonthDefs.map((def) => ({
    key: def.key,
    label: def.label,
    count: monthCounts.get(def.key) ?? 0,
  }));

  const weekQuestions = weekQuestionEvents.length;
  const prevWeekQuestions = prevWeekQuestionEvents.length;
  const weekCorrect = weekAttempts.filter((a) => a.correct).length;
  const weekAccuracyPct =
    weekAttempts.length === 0 ? null : Math.round((weekCorrect / weekAttempts.length) * 100);

  const recentBySubject = new Map<string, { subjectTitle: string; subjectSlug: string; total: number; correct: number; date: Date }>();
  for (const attempt of recentAttempts) {
    const firstSkill = attempt.item.skills[0]?.skill;
    if (!firstSkill?.subject) continue;
    const subId = firstSkill.subject.id;
    if (!recentBySubject.has(subId)) {
      recentBySubject.set(subId, {
        subjectTitle: firstSkill.subject.title,
        subjectSlug: firstSkill.subject.slug,
        total: 0,
        correct: 0,
        date: attempt.createdAt,
      });
    }
    const entry = recentBySubject.get(subId)!;
    entry.total += 1;
    if (attempt.correct) entry.correct += 1;
  }
  const recentSessions: DashboardRecentSession[] = Array.from(recentBySubject.values())
    .slice(0, MAX_RECENT_SESSIONS)
    .map((r) => ({
      subjectTitle: r.subjectTitle,
      subjectSlug: r.subjectSlug,
      total: r.total,
      correct: r.correct,
    }));

  const rewardRows: DashboardRewardRow[] = rewardTransactions.map((t) => ({
    id: t.id,
    at: t.createdAt.toISOString(),
    reason: t.reason,
    xpDelta: t.xpDelta,
    tokenDelta: t.tokenDelta,
  }));

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
    };
  });

  const first = subjectSummaries[0];
  let primaryCtaHref = '/dashboard';
  let primaryCtaLabel = 'Your dashboard';
  if (first) {
    primaryCtaHref = first.onboardingComplete ? `/learn/${first.slug}` : `/diagnostic/${first.slug}`;
    primaryCtaLabel = first.onboardingComplete ? 'Continue learning' : 'Start your diagnostic';
  }

  const displayName =
    session.user.name?.trim() ||
    (typeof session.user.email === 'string' ? session.user.email.split('@')[0] : null) ||
    'there';

  return (
    <LearningPageShell
      title="Dashboard"
      subtitle="Your calendar, progress, and shortcuts in one place."
      maxWidthClassName="max-w-6xl"
      appChrome="student"
    >
      <StudentDashboardView
        displayName={displayName}
        gamification={gamification}
        weekQuestions={weekQuestions}
        weekAccuracyPct={weekAccuracyPct}
        prevWeekQuestions={prevWeekQuestions}
        journeyMonths={journeyMonths}
        recentSessions={recentSessions}
        rewardRows={rewardRows}
        subjects={subjectSummaries}
        primaryCtaHref={primaryCtaHref}
        primaryCtaLabel={primaryCtaLabel}
      />

      {subjects.length === 0 && (
        <div className="anx-card px-6 py-16 text-center text-[color:var(--anx-text-muted)]">
          <p>No subjects available yet. Check back when your school has set them up.</p>
        </div>
      )}
    </LearningPageShell>
  );
}
