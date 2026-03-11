import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import type { MathsVisual } from '../../src/lib/maths/visuals/types';
import { parseStoredVisuals } from '../../src/features/learn/itemVisuals';

const prisma = new PrismaClient();

interface AuditFinding {
  itemId: string;
  primarySkillCode: string;
  question: string;
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

function timestampForFile(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function numericTokens(value: string): number[] {
  return [...value.matchAll(/[-+]?\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter((entry) => Number.isFinite(entry));
}

function parseJumpPrompt(question: string): { start: number; delta: number; end: number } | null {
  const direct = question.match(/starts?\s+at\s+(-?\d+(?:\.\d+)?)\s+and\s+jumps?\s+(?:on|by)\s+(-?\d+(?:\.\d+)?)/i);
  if (!direct) return null;
  const start = Number(direct[1]);
  const delta = Number(direct[2]);
  if (!Number.isFinite(start) || !Number.isFinite(delta)) return null;
  return { start, delta, end: start + delta };
}

function parseEdgeMeasurement(label: string): number | null {
  const match = label.match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function firstShape(visuals: MathsVisual[]): MathsVisual | null {
  return visuals.find((visual) => visual.type === 'shape') ?? null;
}

function firstNumberLine(visuals: MathsVisual[]): MathsVisual | null {
  return visuals.find((visual) => visual.type === 'number-line') ?? null;
}

function firstArithmeticLayout(visuals: MathsVisual[]): MathsVisual | null {
  return visuals.find((visual) => visual.type === 'arithmetic-layout') ?? null;
}

function answerIncludesValue(answer: string, value: number): boolean {
  return numericTokens(answer).some((token) => token === value);
}

function shouldRequireRectangleVisual(question: string): boolean {
  const lower = question.toLowerCase();
  if (!lower.includes('rectangle')) return false;
  if (lower.includes('correct name')) return false;
  return /\b(perimeter|length|width|opposite side|opposite sides|long side|short side)\b/i.test(question);
}

function auditVisual(
  question: string,
  answer: string,
  visuals: MathsVisual[]
): Array<Omit<AuditFinding, 'itemId' | 'primarySkillCode' | 'question'>> {
  const findings: Array<Omit<AuditFinding, 'itemId' | 'primarySkillCode' | 'question'>> = [];
  const lower = question.toLowerCase();
  const shape = firstShape(visuals);
  const numberLine = firstNumberLine(visuals);
  const arithmetic = firstArithmeticLayout(visuals);

  if (visuals.length === 0) {
    findings.push({
      severity: 'error',
      code: 'missing_visual',
      message: 'Item is in the visualised set but has no stored visual spec.',
    });
    return findings;
  }

  if (lower.includes('irregular polygon') || lower.includes('irregular shape')) {
    if (shape?.type !== 'shape' || shape.shape !== 'irregular-polygon') {
      findings.push({
        severity: 'error',
        code: 'irregular_shape_mismatch',
        message: 'Irregular shape question is not rendered as an irregular polygon.',
      });
    } else {
      const expectedSides = Math.max(3, numericTokens(question.match(/[-+]?\d+(?:\.\d+)?\s*cm\b/gi)?.join(' ') ?? '').length);
      if (shape.vertices.length !== expectedSides) {
        findings.push({
          severity: 'error',
          code: 'irregular_shape_side_count_mismatch',
          message: `Irregular shape shows ${shape.vertices.length} sides but the question gives ${expectedSides}.`,
        });
      }
    }
  }

  if (lower.includes('parallelogram')) {
    if (shape?.type !== 'shape' || shape.shape !== 'parallelogram') {
      findings.push({
        severity: 'error',
        code: 'parallelogram_mismatch',
        message: 'Parallelogram question is not rendered as a parallelogram.',
      });
    }
  }

  if (shouldRequireRectangleVisual(question) && !lower.includes('compound shape') && !lower.includes('rectangles join')) {
    if (shape?.type !== 'shape' || shape.shape !== 'rectangle') {
      findings.push({
        severity: 'error',
        code: 'rectangle_mismatch',
        message: 'Rectangle question is not rendered as a rectangle.',
      });
    }
  }

  if (/\bregular\s+(?:4-sided|four-sided)\s+shape\b/i.test(question)) {
    if (shape?.type !== 'shape' || shape.shape !== 'square') {
      findings.push({
        severity: 'error',
        code: 'square_naming_visual_mismatch',
        message: 'Regular 4-sided shape naming question should render as a square.',
      });
    }
  }

  const jumpPrompt = parseJumpPrompt(question);
  if (jumpPrompt) {
    if (numberLine?.type !== 'number-line') {
      findings.push({
        severity: 'error',
        code: 'jump_number_line_missing',
        message: 'Jump prompt is not rendered as a number line.',
      });
    } else {
      const jump = numberLine.jumps?.[0];
      if (!jump) {
        findings.push({
          severity: 'error',
          code: 'jump_arc_missing',
          message: 'Jump number line is missing its jump arc.',
        });
      } else if (jump.from !== jumpPrompt.start || jump.to !== jumpPrompt.end) {
        findings.push({
          severity: 'error',
          code: 'jump_arc_wrong_values',
          message: `Jump arc does not match prompt values. Expected ${jumpPrompt.start} to ${jumpPrompt.end}.`,
        });
      }

      if (!answerIncludesValue(answer, jumpPrompt.end)) {
        findings.push({
          severity: 'warning',
          code: 'jump_answer_visual_mismatch',
          message: `Stored answer does not mention the jump endpoint ${jumpPrompt.end}.`,
        });
      }
    }
  }

  if (lower.includes('number line') && !jumpPrompt) {
    if (numberLine?.type !== 'number-line') {
      findings.push({
        severity: 'error',
        code: 'number_line_type_mismatch',
        message: 'Number line question is not rendered as a number line.',
      });
    }
  }

  if (/\b(column addition|column subtraction|formal method|calculate .* [+\-] .*)\b/i.test(question)) {
    if (arithmetic?.type !== 'arithmetic-layout') {
      findings.push({
        severity: 'error',
        code: 'arithmetic_layout_missing',
        message: 'Formal arithmetic question is not rendered as an arithmetic layout.',
      });
    }
  }

  if (shape?.type === 'shape' && lower.includes('perimeter')) {
    const edgeValues = (shape.edges ?? [])
      .map((edge) => parseEdgeMeasurement(edge.label))
      .filter((value): value is number => value !== null);
    const expectedPerimeter = numericTokens(answer)[0];
    if (edgeValues.length === shape.vertices.length && expectedPerimeter != null) {
      const drawnPerimeter = Number(edgeValues.reduce((sum, value) => sum + value, 0).toFixed(6));
      if (Math.abs(drawnPerimeter - expectedPerimeter) > 0.000001) {
        findings.push({
          severity: 'error',
          code: 'perimeter_answer_visual_mismatch',
          message: `Shape edge labels total ${drawnPerimeter} but stored answer is ${expectedPerimeter}.`,
        });
      }
    }
  }

  if (/perimeter is the distance around the outside/i.test(question) && shape?.type === 'shape') {
    findings.push({
      severity: 'warning',
      code: 'definition_visual_maybe_unnecessary',
      message: 'Definition-only perimeter question has a shape visual; review whether it adds value.',
    });
  }

  return findings;
}

async function main() {
  const now = new Date();
  const reportDir = path.resolve(process.cwd(), 'docs/qa');
  fs.mkdirSync(reportDir, { recursive: true });

  const items = await prisma.item.findMany({
    where: {
      skills: {
        some: {
          skill: {
            OR: [{ code: { startsWith: 'N1.' } }, { code: { startsWith: 'N2.' } }],
          },
        },
      },
    },
    include: {
      skills: {
        include: {
          skill: {
            select: { code: true, sortOrder: true },
          },
        },
      },
    },
  });

  const visualItems = items.filter((item) => parseStoredVisuals(item.options).length > 0);
  const findings: AuditFinding[] = [];

  for (const item of visualItems) {
    const orderedSkills = [...item.skills].sort(
      (a, b) => (a.skill.sortOrder ?? 9999) - (b.skill.sortOrder ?? 9999) || a.skill.code.localeCompare(b.skill.code)
    );
    const primarySkillCode = orderedSkills[0]?.skill.code ?? '';
    const visuals = parseStoredVisuals(item.options);
    for (const finding of auditVisual(item.question, item.answer, visuals)) {
      findings.push({
        itemId: item.id,
        primarySkillCode,
        question: item.question,
        ...finding,
      });
    }
  }

  const report = {
    generatedAt: now.toISOString(),
    scope: 'Stored Unit 1 maths visuals',
    summary: {
      visualItemsChecked: visualItems.length,
      findings: findings.length,
      errors: findings.filter((finding) => finding.severity === 'error').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
    },
    findings,
  };

  const reportPath = path.join(reportDir, `unit1-visual-audit-${timestampForFile(now)}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath, summary: report.summary }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
