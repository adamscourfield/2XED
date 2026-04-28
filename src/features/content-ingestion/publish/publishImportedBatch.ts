import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { EnrichmentContext, ImportedQuestion, PublishResult } from '../types';
import { validateImportedQuestion } from '../validate/validateImportedQuestion';
import { inferLiveItemMetadata, toPrismaJson } from '@/lib/live/liveItemMetadata';

const stagingRoot = path.join(process.cwd(), 'docs', 'qa', 'content-ingestion-staging');

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function rubricLineToCriterion(line: string, index: number) {
  const cleaned = line.replace(/^[-•*\d.()\s]+/, '').trim();
  const [head, ...rest] = cleaned.split(':');
  const element = (rest.length > 0 ? head : `criterion_${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `criterion_${index + 1}`;
  const descriptorSeed = (rest.join(':').trim() || cleaned).slice(0, 180);

  return {
    element,
    weight: 1,
    descriptors: [
      { score: 0, descriptor: `Missing or not yet evident: ${descriptorSeed}` },
      { score: 1, descriptor: `Limited control of ${element.replace(/_/g, ' ')}.` },
      { score: 2, descriptor: `Partial control of ${element.replace(/_/g, ' ')}.` },
      { score: 3, descriptor: `Secure control of ${element.replace(/_/g, ' ')}.` },
      { score: 4, descriptor: `Strong, precise control of ${element.replace(/_/g, ' ')}.` },
    ],
  };
}

function coerceRubric(rubric: unknown) {
  if (!rubric) return null;
  if (typeof rubric === 'object') return rubric;
  if (typeof rubric !== 'string') return null;

  const trimmed = rubric.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const lines = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const criteria = (lines.length > 0 ? lines : [trimmed])
      .slice(0, 4)
      .map(rubricLineToCriterion)
      .map((criterion, _, arr) => ({
        ...criterion,
        weight: Number((1 / arr.length).toFixed(3)),
      }));

    return {
      criteria,
      overall: {
        wtmTemplate: 'What went well: {strength}',
        ebiTemplate: 'Even better if: improve {area}',
      },
      sourceText: trimmed,
    };
  }
}

function toStoredType(question: ImportedQuestion): string {
  const allowedModes = question.adaptive.answerModeAllowed.map((mode) => mode.toUpperCase());

  if (question.marking.markingMethod === 'MANUAL_RUBRIC') {
    if (allowedModes.some((mode) => mode.includes('CANVAS') || mode.includes('DRAW') || mode === 'MIXED')) {
      return 'CANVAS_INPUT';
    }
    return 'EXTENDED_WRITING';
  }

  const allowed = allowedModes[0] ?? '';
  if (allowed === 'TRUE_FALSE') return 'TRUE_FALSE';
  if (allowed === 'ORDER_SEQUENCE') return 'ORDER';
  if (allowed === 'NUMERIC' || allowed === 'SHORT_TEXT') return 'SHORT_TEXT';
  return 'MCQ';
}

function buildOptions(question: ImportedQuestion, storedType: string) {
  const rubric = coerceRubric(question.marking.rubric);
  return toJsonValue({
    choices: question.options ?? question.marking.distractors ?? [],
    acceptedAnswers: question.marking.correctAnswer ? [question.marking.correctAnswer] : [],
    importMeta: {
      version: question.quality.version,
      objectiveId: question.curriculum.objectiveId,
      yearBand: question.curriculum.yearBand,
      learningPhase: question.pedagogical.learningPhase,
      difficulty: question.pedagogical.difficulty,
      questionPurpose: question.pedagogical.questionPurpose,
      answerModeAllowed: question.adaptive.answerModeAllowed,
      answerModeBlocked: question.adaptive.answerModeBlocked ?? [],
      misconceptionTagsTarget: question.adaptive.misconceptionTagsTarget,
      reteachRouteCandidates: question.adaptive.reteachRouteCandidates,
      isSpacedRetrievalEligible: question.adaptive.isSpacedRetrievalEligible,
      extractionConfidence: question.quality.extractionConfidence,
      mappingConfidence: question.quality.mappingConfidence,
      provenance: question.provenance,
    },
    marking: {
      method: question.marking.markingMethod,
      tolerance: question.marking.tolerance,
      rubric,
    },
    rubric,
    responseMode:
      storedType === 'CANVAS_INPUT'
        ? 'draw+type'
        : storedType === 'EXTENDED_WRITING'
          ? 'write'
          : undefined,
  });
}

async function upsertPublishedItem(question: ImportedQuestion) {
  const subject = await prisma.subject.findFirst({
    where: {
      OR: [
        { slug: question.curriculum.subject },
        { title: question.curriculum.subject },
      ],
    },
  });

  const skill = question.curriculum.objectiveId
    ? await prisma.skill.findFirst({
        where: {
          OR: [
            { code: question.curriculum.objectiveId },
            { slug: question.curriculum.objectiveId.toLowerCase() },
          ],
        },
      })
    : null;

  const existing = await prisma.item.findFirst({
    where: {
      question: question.stem,
      answer: question.marking.correctAnswer,
      subjectId: subject?.id,
    },
  });

  const storedType = toStoredType(question);
  const options = buildOptions(question, storedType);
  const answer = question.marking.correctAnswer ?? '';
  const liveMetadata = inferLiveItemMetadata({
    question: question.stem,
    type: storedType,
    options,
    answer,
    source: 'AUTHORED',
  });

  const item = existing
    ? await prisma.item.update({
        where: { id: existing.id },
        data: {
          type: storedType,
          options,
          answer,
          liveMetadata: toPrismaJson(liveMetadata),
        },
      })
    : await prisma.item.create({
        data: {
          question: question.stem,
          type: storedType,
          options,
          answer,
          liveMetadata: toPrismaJson(liveMetadata),
          subjectId: subject?.id,
        },
      });

  if (skill) {
    await prisma.itemSkill.upsert({
      where: {
        itemId_skillId: {
          itemId: item.id,
          skillId: skill.id,
        },
      },
      update: {},
      create: {
        itemId: item.id,
        skillId: skill.id,
      },
    });
  }

  await prisma.event.create({
    data: {
      name: 'content_ingestion.publish',
      subjectId: subject?.id,
      skillId: skill?.id,
      itemId: item.id,
      payload: {
        version: question.quality.version,
        sourceFile: question.provenance.sourceFile,
        slideOrPageRef: question.provenance.slideOrPageRef,
        mappingConfidence: question.quality.mappingConfidence,
      },
    },
  });
}

export async function publishImportedBatch(
  questions: ImportedQuestion[],
  context: EnrichmentContext,
  opts?: { dryRun?: boolean; batchLabel?: string }
): Promise<PublishResult> {
  ensureDir(stagingRoot);
  const label = opts?.batchLabel ?? new Date().toISOString().replace(/[:.]/g, '-');
  const auditLogPath = path.join(stagingRoot, `publish-audit-${label}.json`);
  const stagingPath = path.join(stagingRoot, `staged-${label}.json`);

  const staged: Array<{ question: ImportedQuestion; issues: ReturnType<typeof validateImportedQuestion> }> = [];
  const published: ImportedQuestion[] = [];
  const rejected: ImportedQuestion[] = [];

  for (const question of questions) {
    const issues = validateImportedQuestion(question, context);
    if (issues.length > 0 || question.quality.needsHumanReview) {
      staged.push({ question, issues });
      if (issues.some((issue) => issue.severity === 'error')) rejected.push(question);
      continue;
    }

    if (!opts?.dryRun) {
      await upsertPublishedItem(question);
    }
    published.push(question);
  }

  const auditPayload = {
    label,
    timestamp: new Date().toISOString(),
    version: 1,
    fingerprint: crypto.createHash('sha256').update(JSON.stringify(questions.map((question) => ({
      stem: question.stem,
      objectiveId: question.curriculum.objectiveId,
      sourceFile: question.provenance.sourceFile,
      slideOrPageRef: question.provenance.slideOrPageRef,
    })))).digest('hex'),
    publishedCount: published.length,
    stagedCount: staged.length,
    rejectedCount: rejected.length,
  };

  fs.writeFileSync(auditLogPath, JSON.stringify(auditPayload, null, 2));
  fs.writeFileSync(stagingPath, JSON.stringify(staged, null, 2));

  return {
    publishedCount: published.length,
    stagedCount: staged.length,
    rejectedCount: rejected.length,
    auditLogPath,
    stagingPath,
  };
}
