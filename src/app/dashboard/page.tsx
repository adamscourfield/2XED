import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { hasCompletedOnboardingDiagnostic } from '@/features/learn/onboarding';
import { selectNextSkill } from '@/features/learn/nextSkill';
import { LearningPageShell } from '@/components/LearningPageShell';
import { JoinSessionInput } from '@/components/JoinSessionInput';
import { DashboardLessonCalendar } from '@/components/DashboardLessonCalendar';
import { getUserGamificationSummary } from '@/features/gamification/gamificationService';

const MAX_RECENT_ATTEMPTS = 20;
const MAX_RECENT_SESSIONS = 5;

type SkillRowVisual = {
  statusLabel: string;
  barColor: string;
  badgeBg: string;
  badgeText: string;
  dotClass: string;
};

function skillRowVisual(isDue: boolean, masteryPct: number): SkillRowVisual {
  if (isDue) {
    return {
      statusLabel: 'Due',
      barColor: '#e85d75',
      badgeBg: 'rgba(232, 93, 117, 0.14)',
      badgeText: '#c73e54',
      dotClass: 'bg-[#e85d75]',
    };
  }
  if (masteryPct >= 80) {
    return {
      statusLabel: 'Strong',
      barColor: 'var(--anx-success)',
      badgeBg: 'rgba(0, 105, 71, 0.12)',
      badgeText: '#006947',
      dotClass: 'bg-emerald-600',
    };
  }
  return {
    statusLabel: 'Building',
    barColor: '#d97706',
    badgeBg: 'rgba(217, 119, 6, 0.12)',
    badgeText: '#b45309',
    dotClass: 'bg-amber-500',
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  if (role === 'TEACHER') redirect('/teacher/dashboard');
  if (role === 'ADMIN') redirect('/admin');

  const subjects = await prisma.subject.findMany({
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
  });

  const gamification = await getUserGamificationSummary(userId);

  const recentAttempts = await prisma.attempt.findMany({
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
  });

  /* Group recent attempts into the last completed session per subject */
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
  const recentSessions = Array.from(recentBySubject.values()).slice(0, MAX_RECENT_SESSIONS);

  const now = new Date();
  const onboardingBySubject = new Map<string, boolean>();

  for (const subject of subjects) {
    onboardingBySubject.set(subject.id, await hasCompletedOnboardingDiagnostic(userId, subject.id));
  }

  const subjectCards = subjects.map((subject) => {
    const onboardingComplete = onboardingBySubject.get(subject.id) ?? false;
    const dueSkills = subject.skills.filter((skill) => {
      const mastery = skill.masteries[0];
      if (!mastery) return true;
      if (!mastery.nextReviewAt) return true;
      return mastery.nextReviewAt <= now;
    });

    const startedSkills = subject.skills.filter((skill) => Boolean(skill.masteries[0]?.lastPracticedAt)).length;
    const completedEnoughSkills = subject.skills.filter((skill) => (skill.masteries[0]?.mastery ?? 0) >= 0.8).length;
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
    const dueNowCount = dueSkills.length;

    return {
      subject,
      onboardingComplete,
      startedSkills,
      completedEnoughSkills,
      averageMastery,
      nextSkill,
      nextSkillStarted,
      nextSkillIsDue,
      dueNowCount,
    };
  });

  return (
    <LearningPageShell
      title={`Hi, ${session.user.name ?? session.user.email}`}
      subtitle="Ready to learn"
      maxWidthClassName="max-w-5xl"
      appChrome="student"
      actions={<span className="anx-xp-badge">🏅 {gamification.xp} XP</span>}
    >
      {/* Hero banner */}
      <div className="anx-dashboard-hero overflow-hidden">
        <div className="px-8 py-8 text-white sm:px-10 sm:py-9">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Keep Learning</h2>
          <p className="mt-2 max-w-md text-sm font-normal text-white/95">Start your next session and earn more XP.</p>
          <div className="mt-6">
            {subjectCards.length > 0 && subjectCards[0].onboardingComplete ? (
              <Link href={`/learn/${subjectCards[0].subject.slug}`} className="anx-dashboard-hero-cta">
                Get Started →
              </Link>
            ) : subjectCards.length > 0 ? (
              <Link href={`/diagnostic/${subjectCards[0].subject.slug}`} className="anx-dashboard-hero-cta">
                Get Started →
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <DashboardLessonCalendar hint="Shows your class timetable (when set), scheduled reviews, and practice due dates." />

      {/* Join live session */}
      <section className="anx-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>Join a live lesson</p>
          <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Enter the code your teacher shows on the board.</p>
        </div>
        <JoinSessionInput />
      </section>

      {/* Categories */}
      {subjectCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: 'var(--anx-text)' }}>Categories</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {subjectCards.map(({ subject, onboardingComplete, averageMastery }) => (
              <Link
                key={subject.id}
                href={onboardingComplete ? `/learn/${subject.slug}` : `/diagnostic/${subject.slug}`}
                className="anx-category-card"
              >
                <span className="text-2xl mb-2">
                  {subject.slug.includes('maths') ? '📐' : subject.slug.includes('english') ? '📖' : '📘'}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>{subject.title}</span>
                {onboardingComplete && (
                  <span className="mt-1 text-xs" style={{ color: 'var(--anx-text-muted)' }}>{averageMastery}% mastery</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      {recentSessions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--anx-text)' }}>Recent</h3>
          <div className="space-y-2">
            {recentSessions.map((rs) => {
              const pct = rs.total > 0 ? Math.round((rs.correct / rs.total) * 100) : 0;
              const isComplete = pct >= 80;
              return (
                <Link key={rs.subjectSlug} href={`/learn/${rs.subjectSlug}`} className="anx-card flex items-center gap-4 px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ background: 'var(--anx-primary-soft)' }}>
                    {rs.subjectSlug.includes('maths') ? '📐' : rs.subjectSlug.includes('english') ? '📖' : '📘'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>{rs.subjectTitle}</p>
                    <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>{rs.total} questions</p>
                  </div>
                  <span className={isComplete ? 'anx-badge anx-badge-green' : 'anx-badge anx-badge-blue'}>
                    {isComplete ? 'Completed' : 'In progress'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Detailed subject cards — compound card layout */}
      {subjectCards.map(({ subject, onboardingComplete, startedSkills, averageMastery, nextSkill, nextSkillStarted, nextSkillIsDue, dueNowCount }) => {
        const previewSkills =
          onboardingComplete
            ? [...subject.skills]
                .sort((a, b) => {
                  const aM = a.masteries[0];
                  const bM = b.masteries[0];
                  const aDue = !aM?.nextReviewAt || aM.nextReviewAt <= now;
                  const bDue = !bM?.nextReviewAt || bM.nextReviewAt <= now;
                  if (aDue !== bDue) return aDue ? -1 : 1;
                  const aPct = aM ? Math.round(aM.mastery * 100) : 0;
                  const bPct = bM ? Math.round(bM.mastery * 100) : 0;
                  return aPct - bPct;
                })
                .slice(0, 2)
            : [];

        return (
          <section key={subject.id}>
            <div className="anx-card anx-compound-card overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
              {/* Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 pr-2">
                  <h2 className="text-xl font-bold tracking-tight text-[#2d3142]">{subject.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#757575]">
                    {onboardingComplete
                      ? 'We will keep your next step clear and easy to follow.'
                      : 'Start with a short quiz so we can choose the right place for you.'}
                  </p>
                </div>
                {onboardingComplete ? (
                  <Link href={`/learn/${subject.slug}`} className="anx-btn-primary shrink-0 self-start sm:self-auto">
                    {nextSkillStarted ? 'Keep going' : 'Start next skill'}
                  </Link>
                ) : (
                  <Link href={`/diagnostic/${subject.slug}`} className="anx-btn-primary shrink-0 self-start sm:self-auto">
                    Start quiz
                  </Link>
                )}
              </div>

              <div className="anx-stat">
                <p className="anx-stat-label">Next step</p>
                {onboardingComplete && nextSkill ? (
                  <>
                    <p className="mt-2 text-base font-semibold text-[color:var(--anx-text)]">{nextSkill.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--anx-text-secondary)]">
                      {nextSkillStarted
                        ? nextSkillIsDue
                          ? 'Ready now for a short set.'
                          : 'We will come back to this soon.'
                        : 'This is the next new skill for you.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="anx-chip">{nextSkillStarted ? 'In progress' : 'New skill'}</span>
                      <span className={nextSkillIsDue ? 'anx-chip' : 'anx-chip-info'}>{nextSkillIsDue ? 'Due now' : 'Up next'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-base font-semibold text-[color:var(--anx-text)]">Start your quiz</p>
                    <p className="mt-1 text-sm text-[color:var(--anx-text-secondary)]">
                      It helps us choose the right level and your first lesson.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="anx-chip">Quiz first</span>
                      <span className="anx-chip">Short and simple</span>
                    </div>
                  </>
                )}
              </div>

            {onboardingComplete && nextSkill && (
              <div className="border-t border-[color:var(--anx-border)] bg-[var(--anx-surface-soft)] px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--anx-text)]">What happens next</p>
                    <p className="mt-1 text-sm text-[color:var(--anx-text-secondary)]">
                      You will do a short set of questions. Then we will choose the best next step for you.
                    </p>
                    <div
                      className="pointer-events-none absolute right-0 top-3 hidden h-[calc(100%-1.5rem)] w-px sm:block"
                      style={{ background: '#eeeeee' }}
                      aria-hidden
                    />
                  </div>

                  <div className="relative px-0 sm:px-6">
                    <p className="anx-compound-metric-label">Progress</p>
                    <p className="anx-stat-value mt-2 text-[#2d3142]">{onboardingComplete ? `${averageMastery}%` : '—'}</p>
                    <div className="mt-3 anx-compound-progress-track">
                      <div className="anx-compound-progress-bar" style={{ width: `${onboardingComplete ? averageMastery : 0}%` }} />
                    </div>
                    <div
                      className="pointer-events-none absolute right-0 top-3 hidden h-[calc(100%-1.5rem)] w-px sm:block"
                      style={{ background: '#eeeeee' }}
                      aria-hidden
                    />
                  </div>

                  <div className="px-0 sm:pl-6">
                    <p className="anx-compound-metric-label">Next step</p>
                    {onboardingComplete && nextSkill ? (
                      <>
                        <p className="mt-2 text-lg font-semibold leading-snug text-[#2d3142]">{nextSkill.name}</p>
                        <div className="mt-3">
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-[#2d3142]"
                            style={{ background: '#eeeeee' }}
                          >
                            {nextSkillIsDue ? 'Due now' : 'Up next'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-lg font-semibold leading-snug text-[#2d3142]">Start your quiz</p>
                        <div className="mt-3">
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-[#2d3142]"
                            style={{ background: '#eeeeee' }}
                          >
                            Quiz first
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

              {/* Skill preview rows */}
              {onboardingComplete && previewSkills.length > 0 && (
                <div className="mt-6 divide-y divide-[#eeeeee]">
                  {previewSkills.map((skill) => {
                    const mastery = skill.masteries[0];
                    const masteryPct = mastery ? Math.round(mastery.mastery * 100) : 0;
                    const isDue = !mastery?.nextReviewAt || mastery.nextReviewAt <= now;
                    const row = skillRowVisual(isDue, masteryPct);

                    return (
                      <div key={skill.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                        <p className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-[#2d3142]">
                          {skill.name}
                        </p>
                        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
                          <div className="anx-compound-skill-track">
                            <div className="anx-compound-skill-bar" style={{ width: `${masteryPct}%`, background: row.barColor }} />
                          </div>
                          <span className="w-9 text-right text-xs tabular-nums text-[#a0a0a0]">{masteryPct}%</span>
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ background: row.badgeBg, color: row.badgeText }}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.dotClass}`} aria-hidden />
                            {row.statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              {onboardingComplete && (
                <div
                  className="mt-6 flex flex-col gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: '#eeeeee' }}
                >
                  <p className="text-sm text-[#757575]">
                    {startedSkills} of {subject.skills.length} skills started
                  </p>
                  <Link href={`/learn/${subject.slug}`} className="text-sm font-medium text-[#757575] transition-colors hover:text-[#2d3142]">
                    View all skills →
                  </Link>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {subjects.length === 0 && (
        <div className="anx-card px-6 py-16 text-center text-[color:var(--anx-text-muted)]">
          <p>No subjects available yet.</p>
        </div>
      )}

    </LearningPageShell>
  );
}
