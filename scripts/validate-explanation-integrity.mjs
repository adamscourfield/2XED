#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSubjectSlug = process.env.NEXT_PUBLIC_DEFAULT_SUBJECT_SLUG ?? 'ks3-maths';
const routedSkillCodes = (process.env.NEXT_PUBLIC_ROUTED_SKILL_CODES ?? 'N1.1')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
  if (raw && typeof raw === 'object') {
    const arr = Array.isArray(raw.options)
      ? raw.options
      : Array.isArray(raw.choices)
        ? raw.choices
        : [];
    return arr.filter((v) => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
  }
  return [];
}

async function main() {
  const problems = [];

  const subject = await prisma.subject.findUnique({ where: { slug: defaultSubjectSlug } });
  if (!subject) {
    throw new Error(`Subject not found for NEXT_PUBLIC_DEFAULT_SUBJECT_SLUG=${defaultSubjectSlug}`);
  }

  const skills = await prisma.skill.findMany({
    where: { subjectId: subject.id, code: { in: routedSkillCodes } },
    select: { id: true, code: true },
  });

  const skillById = new Map(skills.map((s) => [s.id, s.code]));

  const routes = await prisma.explanationRoute.findMany({
    where: { skillId: { in: skills.map((s) => s.id) } },
    select: { id: true, skillId: true, routeType: true },
  });

  const routeCoverage = new Map();
  for (const r of routes) {
    const set = routeCoverage.get(r.skillId) ?? new Set();
    set.add(r.routeType);
    routeCoverage.set(r.skillId, set);
  }

  for (const skill of skills) {
    const set = routeCoverage.get(skill.id) ?? new Set();
    for (const routeType of ['A', 'B', 'C']) {
      if (!set.has(routeType)) {
        problems.push(`Missing explanation route ${routeType} for skill ${skill.code}`);
      }
    }
  }

  const steps = await prisma.explanationStep.findMany({
    where: { explanationRouteId: { in: routes.map((r) => r.id) } },
    select: {
      id: true,
      questionType: true,
      checkpointOptions: true,
      checkpointAnswer: true,
      route: { select: { routeType: true, skill: { select: { code: true } } } },
    },
  });

  for (const step of steps) {
    const label = `[${step.route.skill.code} route ${step.route.routeType} step ${step.id}]`;
    const type = typeof step.questionType === 'string' ? step.questionType.trim().toUpperCase() : '';
    if (!type) {
      problems.push(`${label} questionType is missing`);
      continue;
    }

    const options = parseOptions(step.checkpointOptions);
    const answer = typeof step.checkpointAnswer === 'string' ? step.checkpointAnswer.trim() : '';
    const optionSet = new Set(options.map((o) => o.toLowerCase()));

    if (type === 'MCQ' || type === 'TRUE_FALSE') {
      if (options.length < 2) {
        problems.push(`${label} ${type} requires at least 2 options`);
      }
      if (!optionSet.has(answer.toLowerCase())) {
        problems.push(`${label} ${type} answer not present in options`);
      }
    }

    if (type === 'TRUE_FALSE') {
      const hasBoolPair = optionSet.has('true') && optionSet.has('false');
      const answerIsBool = answer.toLowerCase() === 'true' || answer.toLowerCase() === 'false';
      if (!hasBoolPair || !answerIsBool) {
        problems.push(`${label} TRUE_FALSE must use True/False options with True/False answer`);
      }
    }
  }

  if (problems.length > 0) {
    console.error('❌ Explanation integrity validation failed:');
    for (const p of problems) console.error(`- ${p}`);
    process.exit(1);
  }

  console.log('✅ Explanation integrity validation passed');
  console.log(`- subject: ${defaultSubjectSlug}`);
  console.log(`- routed skills: ${routedSkillCodes.join(', ')}`);
  console.log(`- routes checked: ${routes.length}`);
  console.log(`- steps checked: ${steps.length}`);
}

main()
  .catch((err) => {
    console.error('❌ Validation failed with exception:', err?.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
