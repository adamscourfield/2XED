#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSubjectSlug = process.env.NEXT_PUBLIC_DEFAULT_SUBJECT_SLUG ?? 'ks3-maths';
const routedSkillCodes = (process.env.NEXT_PUBLIC_ROUTED_SKILL_CODES ?? 'N1.1')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

async function main() {
  const problems = [];

  const subject = await prisma.subject.findUnique({ where: { slug: defaultSubjectSlug } });
  if (!subject) {
    problems.push(`Default subject slug not found: ${defaultSubjectSlug}`);
  }

  if (subject) {
    const skills = await prisma.skill.findMany({
      where: { subjectId: subject.id, code: { in: routedSkillCodes } },
      select: { id: true, code: true },
    });

    const found = new Set(skills.map((s) => s.code.toUpperCase()));
    for (const code of routedSkillCodes) {
      if (!found.has(code)) problems.push(`Routed skill code missing in subject ${defaultSubjectSlug}: ${code}`);
    }

    const routes = await prisma.explanationRoute.findMany({
      where: { skillId: { in: skills.map((s) => s.id) } },
      select: { skillId: true, routeType: true },
    });

    const routeIndex = new Map();
    for (const r of routes) {
      const set = routeIndex.get(r.skillId) ?? new Set();
      set.add(r.routeType);
      routeIndex.set(r.skillId, set);
    }

    for (const skill of skills) {
      const set = routeIndex.get(skill.id) ?? new Set();
      for (const rt of ['A', 'B', 'C']) {
        if (!set.has(rt)) problems.push(`ExplanationRoute missing for skill ${skill.code}, route ${rt}`);
      }
    }
  }

  if (problems.length > 0) {
    console.error('❌ Learning config validation failed:');
    for (const p of problems) console.error(`- ${p}`);
    process.exit(1);
  }

  console.log('✅ Learning config validation passed');
  console.log(`- defaultSubjectSlug: ${defaultSubjectSlug}`);
  console.log(`- routedSkillCodes: ${routedSkillCodes.join(', ')}`);
}

main()
  .catch((err) => {
    console.error('❌ Validation failed with exception:', err?.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
