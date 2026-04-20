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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(value);
}

function progressTone(masteryPct: number) {
  if (masteryPct >= 80) {
    return {
      badge: 'anx-badge anx-badge-green',
      barColor: 'var(--anx-success)',
    };
  }

  if (masteryPct >= 50) {
    return {
      badge: 'anx-badge anx-badge-amber',
      barColor: 'var(--anx-warning)',
    };
  }

  return {
    badge: 'anx-badge anx-badge-red',
    barColor: 'var(--anx-danger)',
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
      <div className="anx-card anx-dashboard-hero overflow-hidden">
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
                  <span className={isComplete ? 'anx-badge anx-badge-green' : 'anx-badge anx-badge-amber'}>
                    {isComplete ? 'Completed' : 'In progress'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Detailed subject cards */}
      {subjectCards.map(({ subject, onboardingComplete, startedSkills, completedEnoughSkills, averageMastery, nextSkill, nextSkillStarted, nextSkillIsDue, dueNowCount }) => (
        <section key={subject.id} className="space-y-4">
          <div className="anx-card overflow-hidden">
            <div className="border-b border-[color:var(--anx-border)] bg-[color:var(--anx-surface-soft)] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--anx-text-muted)]">Keep learning</p>
                  <h2 className="mt-1 text-xl font-semibold text-[color:var(--anx-text)]">{subject.title}</h2>
                  <p className="mt-1 text-sm text-[color:var(--anx-text-secondary)]">
                    {onboardingComplete
                      ? 'We will keep your next step clear and easy to follow.'
                      : 'Start with a short quiz so we can choose the right place for you.'}
                  </p>
                </div>
                {onboardingComplete ? (
                  <Link href={`/learn/${subject.slug}`} className="anx-btn-primary shrink-0">
                    {nextSkillStarted ? 'Keep going' : 'Start next skill'}
                  </Link>
                ) : (
                  <Link href={`/diagnostic/${subject.slug}`} className="anx-btn-primary shrink-0">
                    Start quiz
                  </Link>
                )}
              </div>
            </div>

            <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
              <div className="anx-stat">
                <p className="anx-stat-label">Due now</p>
                <p className="anx-stat-value">{onboardingComplete ? dueNowCount : '—'}</p>
                <p className="mt-1 text-sm text-[color:var(--anx-text-secondary)]">
                  {onboardingComplete
                    ? dueNowCount > 0
                      ? `${dueNowCount} skill${dueNowCount !== 1 ? 's are' : ' is'} ready now.`
                      : 'Nothing urgent — just keep going with the next step.'
                    : 'This will show after your quiz.'}
                </p>
              </div>

              <div className="anx-stat">
                <p className="anx-stat-label">Progress so far</p>
                <p className="anx-stat-value">{onboardingComplete ? `${averageMastery}%` : 'Not started'}</p>
                <div className="mt-3 anx-progress-track">
                  <div className="anx-progress-bar" style={{ width: `${onboardingComplete ? averageMastery : 0}%` }} />
                </div>
                <p className="mt-2 text-sm text-[color:var(--anx-text-secondary)]">
                  {onboardingComplete
                    ? `${startedSkills} of ${subject.skills.length} skills started.`
                    : 'Your progress will show here once you begin.'}
                </p>
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
                      <span className="anx-chip">{nextSkillIsDue ? 'Due now' : 'Up next'}</span>
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
            </div>

            {onboardingComplete && nextSkill && (
              <div className="border-t border-[color:var(--anx-border)] bg-[var(--anx-surface-soft)] px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--anx-text)]">What happens next</p>
                    <p className="mt-1 text-sm text-[color:var(--anx-text-secondary)]">
                      You will do a short set of questions. Then we will choose the best next step for you.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[color:var(--anx-text-secondary)]">
                    <span className="anx-chip">{completedEnoughSkills} secure</span>
                    <span className="anx-chip">{subject.skills.length - completedEnoughSkills} still building</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {onboardingComplete && (
            <div className="anx-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--anx-border)] bg-[color:var(--anx-surface-soft)] px-5 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-[color:var(--anx-text)]">Skill overview</h3>
                  <p className="text-xs text-[color:var(--anx-text-muted)]">See your progress and what is ready next.</p>
                </div>
                {dueNowCount > 0 && <span className="anx-badge anx-badge-amber">{dueNowCount} due now</span>}
              </div>

              <div className="space-y-3 px-5 py-4">
                {subject.skills.map((skill) => {
                  const mastery = skill.masteries[0];
                  const masteryPct = mastery ? Math.round(mastery.mastery * 100) : 0;
                  const isDue = !mastery?.nextReviewAt || mastery.nextReviewAt <= now;
                  const tone = progressTone(masteryPct);

                  return (
                    <div key={skill.id} className={`rounded-xl border p-4 ${isDue ? 'border-[color:var(--anx-warning)] bg-[var(--anx-warning-soft)]' : 'border-[color:var(--anx-border)] bg-white'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-[color:var(--anx-text)]">{skill.name}</span>
                            <span className={tone.badge}>
                              {masteryPct}% mastery
                            </span>
                            {isDue && <span className="anx-badge anx-badge-amber">Due now</span>}
                          </div>
                          <p className="mt-2 text-sm text-[color:var(--anx-text-secondary)]">
                            {mastery?.lastPracticedAt
                              ? `Last practised ${formatDate(new Date(mastery.lastPracticedAt))}`
                              : 'Not started yet.'}
                          </p>
                        </div>
                        <div className="text-left text-xs text-[color:var(--anx-text-muted)] sm:text-right">
                          {mastery?.nextReviewAt ? (
                            isDue ? (
                              <span className="font-medium" style={{ color: 'var(--anx-warning)' }}>Ready now</span>
                            ) : (
                              <span>Next review {formatDate(new Date(mastery.nextReviewAt))}</span>
                            )
                          ) : (
                            <span>{mastery?.lastPracticedAt ? 'Next review being planned' : 'Start when ready'}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 anx-progress-track">
                        <div className="anx-progress-bar" style={{ width: `${masteryPct}%`, background: tone.barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ))}

      {subjects.length === 0 && (
        <div className="anx-card px-6 py-16 text-center text-[color:var(--anx-text-muted)]">
          <p>No subjects available yet.</p>
        </div>
      )}

    </LearningPageShell>
  );
}
