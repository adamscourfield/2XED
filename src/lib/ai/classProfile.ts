/**
 * Builds a compact, prompt-ready profile of a classroom's current attainment
 * so AI lesson generation targets the real class, not just a free-text
 * description. Sourced from StudentSkillState (mastery tracking).
 */

import { prisma } from '@/db/prisma';

const SECURE_THRESHOLD = 0.8;
const GAP_THRESHOLD = 0.6;
const MAX_LISTED_SKILLS = 5;

export interface ClassProfileParams {
  classroomId: string;
  subjectId: string;
  /** The requesting teacher — profile is only built for classrooms they teach. */
  teacherUserId: string;
}

export interface ClassProfileResult {
  /** Formatted block for inclusion in a lesson-generation prompt. */
  promptText: string;
  yearGroup: string | null;
  studentCount: number;
}

/**
 * Returns null when the teacher doesn't teach the classroom or there is no
 * mastery data to report — callers fall back to free-text inputs.
 */
export async function buildClassProfile(params: ClassProfileParams): Promise<ClassProfileResult | null> {
  const { classroomId, subjectId, teacherUserId } = params;

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUserId },
    select: {
      classrooms: {
        where: { classroomId },
        select: { classroomId: true },
        take: 1,
      },
    },
  });
  if (!teacherProfile || teacherProfile.classrooms.length === 0) return null;

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: {
      name: true,
      yearGroup: true,
      enrollments: { select: { studentUserId: true } },
    },
  });
  if (!classroom || classroom.enrollments.length === 0) return null;

  const studentIds = classroom.enrollments.map((e) => e.studentUserId);

  const states = await prisma.studentSkillState.findMany({
    where: {
      userId: { in: studentIds },
      skill: { subjectId },
    },
    select: {
      userId: true,
      masteryProbability: true,
      skill: { select: { code: true, name: true } },
    },
  });

  const lines: string[] = [];
  lines.push(
    `Class: ${classroom.name}${classroom.yearGroup ? ` (Year ${classroom.yearGroup})` : ''}, ${studentIds.length} students.`,
  );

  if (states.length > 0) {
    const bySkill = new Map<string, { name: string; sum: number; count: number; below: number }>();
    for (const state of states) {
      const entry = bySkill.get(state.skill.code) ?? { name: state.skill.name, sum: 0, count: 0, below: 0 };
      entry.sum += state.masteryProbability;
      entry.count += 1;
      if (state.masteryProbability < GAP_THRESHOLD) entry.below += 1;
      bySkill.set(state.skill.code, entry);
    }

    const aggregated = [...bySkill.entries()].map(([code, entry]) => ({
      code,
      name: entry.name,
      avg: entry.sum / entry.count,
      below: entry.below,
      count: entry.count,
    }));

    const secure = aggregated
      .filter((s) => s.avg >= SECURE_THRESHOLD)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, MAX_LISTED_SKILLS);
    const gaps = aggregated
      .filter((s) => s.avg < GAP_THRESHOLD)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, MAX_LISTED_SKILLS);

    if (secure.length > 0) {
      lines.push(
        `Secure skills (build on these): ${secure
          .map((s) => `${s.code} ${s.name} (avg mastery ${Math.round(s.avg * 100)}%)`)
          .join('; ')}.`,
      );
    }
    if (gaps.length > 0) {
      lines.push(
        `Known gaps (pitch carefully, scaffold these): ${gaps
          .map((s) => `${s.code} ${s.name} (avg mastery ${Math.round(s.avg * 100)}%, ${s.below} of ${s.count} students below ${Math.round(GAP_THRESHOLD * 100)}%)`)
          .join('; ')}.`,
      );
    }
    if (secure.length === 0 && gaps.length === 0) {
      lines.push('Mastery data exists but shows no strong strengths or gaps yet — assume mixed attainment.');
    }
  } else {
    lines.push('No mastery data recorded yet for this subject — assume mixed attainment.');
  }

  return {
    promptText: lines.join('\n'),
    yearGroup: classroom.yearGroup,
    studentCount: studentIds.length,
  };
}
