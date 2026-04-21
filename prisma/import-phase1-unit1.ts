import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  MappingRow,
  MappingRowSchema,
  deriveStoredItemFromMapping,
  getItemContractIssues,
} from '../src/features/content/questionContract';
import { resolveItemVisuals } from '../src/features/learn/itemVisuals';

const prisma = new PrismaClient();

/** Same directory as `prisma/import-question-bank.ts` — load every `*.jsonl` so legacy packs (e.g. `n1-*-questions.jsonl`) stay in sync. */
const QUESTION_BANK_DIR = path.resolve(process.cwd(), 'docs/unit-mapping/question-bank');

const PHASE1_SKILL_META: Record<string, { name: string; strand: string; sortOrder: number }> = {
  'N1.1': { name: 'Recognise the place value of each digit in whole numbers up to millions', strand: 'PV', sortOrder: 5 },
  'N1.2': { name: 'Write integers in words and figures', strand: 'PV', sortOrder: 7 },
  'N1.3': { name: 'Compare two numbers using =, ≠, <, >, ≤, ≥', strand: 'PV', sortOrder: 10 },
  'N1.4': { name: 'Use and interpret inequalities in context (incl number lines and statements)', strand: 'PV', sortOrder: 15 },
  'N1.5': { name: 'Find the median from a set of numbers (incl midpoint using a calculator)', strand: 'STA', sortOrder: 20 },
  'N1.6': { name: 'Decimal place value', strand: 'PV', sortOrder: 30 },
  'N1.7': { name: 'Compare decimals using =, ≠, <, >, ≤, ≥', strand: 'PV', sortOrder: 40 },
  'N1.8': { name: 'Order a list of decimals', strand: 'PV', sortOrder: 50 },
  'N1.9': { name: 'Position integers on a number line', strand: 'PV', sortOrder: 60 },
  'N1.10': { name: 'Rounding to the nearest 10, 100, 1000, integer', strand: 'PV', sortOrder: 70 },
  'N1.11': { name: 'Position decimals on a number line (incl midpoint using a calculator)', strand: 'PV', sortOrder: 80 },
  'N1.12': { name: 'Rounding to decimal places', strand: 'PV', sortOrder: 90 },
  'N1.13': { name: 'Position negatives on a number line', strand: 'PV', sortOrder: 100 },
  'N1.14': { name: 'Compare negatives using =, ≠, <, >, ≤, ≥', strand: 'PV', sortOrder: 110 },
  'N1.15': { name: 'Order any integers, negatives and decimals', strand: 'PV', sortOrder: 120 },
  'N1.16': { name: 'Rounding to significant figures', strand: 'PV', sortOrder: 130 },
  'N1.17': { name: 'Write 10, 100, 1000 etc as powers of 10', strand: 'PV', sortOrder: 140 },
  'N1.18': { name: 'Write positive integers in standard form', strand: 'PV', sortOrder: 150 },
  'N1.19': { name: 'Investigate negative powers of 10', strand: 'PV', sortOrder: 160 },
  'N1.20': { name: 'Place value systems beyond base 10', strand: 'PV', sortOrder: 170 },
  'N2.1': { name: 'Properties of addition and subtraction', strand: 'ADD', sortOrder: 180 },
  'N2.2': { name: 'Mental strategies for addition and subtraction', strand: 'ADD', sortOrder: 190 },
  'N2.3': { name: 'Use commutative and associative laws', strand: 'LAW', sortOrder: 200 },
  'N2.4': { name: 'Use formal methods for addition of integers', strand: 'ADD', sortOrder: 205 },
  'N2.5': { name: 'Use formal methods for addition of decimals', strand: 'ADD', sortOrder: 210 },
  'N2.6': { name: 'Use formal methods for subtraction of integers', strand: 'ADD', sortOrder: 215 },
  'N2.7': { name: 'Use formal methods for subtraction of decimals; complement of a decimal (1 − p)', strand: 'ADD', sortOrder: 220 },
  'N2.8': { name: 'Money problems involving addition and subtraction', strand: 'ADD', sortOrder: 230 },
  'N2.9': { name: 'Perimeter of irregular polygons', strand: 'PER', sortOrder: 240 },
  'N2.10': { name: 'Perimeter of regular polygons', strand: 'PER', sortOrder: 250 },
  'N2.11': { name: 'Perimeter of rectangles and parallelograms', strand: 'PER', sortOrder: 260 },
  'N2.12': { name: 'Perimeter of an isosceles triangle or an isosceles trapezium', strand: 'PER', sortOrder: 270 },
  'N2.13': { name: 'Perimeter of a compound shape', strand: 'PER', sortOrder: 280 },
  'N2.14': { name: 'Solve problems involving tables and timetables', strand: 'DATA', sortOrder: 290 },
  'N2.15': { name: 'Solve problems involving frequency trees', strand: 'DATA', sortOrder: 295 },
  'N2.16': { name: 'Add and subtract numbers given in standard form', strand: 'NOT', sortOrder: 300 },
  'N3.1': { name: 'Properties of multiplication and division', strand: 'MULT', sortOrder: 310 },
  'N3.2': { name: 'Mental strategies for multiplication and division', strand: 'MULT', sortOrder: 320 },
  'N3.3': { name: 'Multiply and divide by powers of 10', strand: 'MULT', sortOrder: 330 },
  'N3.4': { name: 'Multiplication (without carrying)', strand: 'MULT', sortOrder: 340 },
  'N3.5': { name: 'Multiplication (with carrying)', strand: 'MULT', sortOrder: 350 },
  'N3.6': { name: 'Area of rectangles, parallelograms, triangles and compound shapes', strand: 'MULT', sortOrder: 360 },
  'N3.7': { name: 'Short division (without remainder carrying)', strand: 'MULT', sortOrder: 370 },
  'N3.8': { name: 'Short division (with remainder carrying)', strand: 'MULT', sortOrder: 380 },
  'N3.9': { name: 'Order of operations (BIDMAS)', strand: 'MULT', sortOrder: 390 },
  'N3.10': { name: 'Multiples', strand: 'MULT', sortOrder: 400 },
  'N3.11': { name: 'Factors', strand: 'MULT', sortOrder: 410 },
  'N3.12': { name: 'Lowest common multiple (LCM)', strand: 'MULT', sortOrder: 420 },
  'N3.13': { name: 'Highest common factor (HCF)', strand: 'MULT', sortOrder: 430 },
  'N3.14': { name: 'Metric unit conversions', strand: 'MULT', sortOrder: 440 },
  'N3.15': { name: 'Multiply a decimal by a whole number', strand: 'MULT', sortOrder: 450 },
  'N3.16': { name: 'Multiply a decimal by a decimal', strand: 'MULT', sortOrder: 460 },
  'N3.17': { name: 'Multiply by 0.1 and 0.01', strand: 'MULT', sortOrder: 470 },
  'N3.18': { name: 'Short division with integer remainders', strand: 'MULT', sortOrder: 480 },
  'N3.19': { name: 'Short division giving a decimal answer', strand: 'MULT', sortOrder: 490 },
  'N3.20': { name: 'Divide by a decimal', strand: 'MULT', sortOrder: 500 },
  'N3.21': { name: 'Find a missing length using area', strand: 'MULT', sortOrder: 510 },
  'N3.22': { name: 'Mean of a data set', strand: 'MULT', sortOrder: 520 },
  'N3.23': { name: 'Squares, cubes and roots', strand: 'MULT', sortOrder: 530 },
  'N3.24': { name: 'Prime numbers', strand: 'MULT', sortOrder: 540 },
  'N4.1': { name: 'Understand a fraction as part of a whole and locate simple fractions on a number line', strand: 'FDP', sortOrder: 600 },
  'N4.2': { name: 'Generate equivalent fractions', strand: 'FDP', sortOrder: 610 },
  'N4.3': { name: 'Simplify a fraction using factors/HCF', strand: 'FDP', sortOrder: 620 },
  'N4.4': { name: 'Convert a fraction to a decimal (terminating decimals)', strand: 'FDP', sortOrder: 630 },
  'N4.5': { name: 'Convert a decimal to a fraction (simple/terminating)', strand: 'FDP', sortOrder: 640 },
  'N4.6': { name: 'Convert a decimal to a percentage and a percentage to a decimal', strand: 'FDP', sortOrder: 650 },
  'N4.7': { name: 'Convert a fraction to a percentage (via decimal or equivalence to /100)', strand: 'FDP', sortOrder: 660 },
  'N4.8': { name: 'Compare and order fractions, decimals and percentages', strand: 'FDP', sortOrder: 670 },
  'N4.9': { name: 'Find a percentage of an amount (using non-calculator-friendly methods)', strand: 'FDP', sortOrder: 680 },
  'A1.1': { name: 'Algebraic terminology (e.g. term, expression, coefficient)', strand: 'ALG', sortOrder: 1100 },
  'A1.2': { name: 'Algebraic notation and basic collecting like terms (juxtaposition, index, fraction)', strand: 'ALG', sortOrder: 1110 },
  'A1.3': { name: 'Collecting like terms', strand: 'ALG', sortOrder: 1120 },
  'A1.4': { name: 'Multiplying terms', strand: 'ALG', sortOrder: 1130 },
  'A1.5': { name: 'Dividing terms', strand: 'ALG', sortOrder: 1140 },
  'A1.6': { name: 'Substituting into expressions with one operation', strand: 'ALG', sortOrder: 1150 },
  'A1.7': { name: 'Substituting into expressions with multiple operations', strand: 'ALG', sortOrder: 1160 },
  'A1.8': { name: 'Substituting into formulae', strand: 'ALG', sortOrder: 1170 },
  'A1.9': { name: 'Expand single brackets', strand: 'ALG', sortOrder: 1180 },
  'A1.10': { name: 'Expand two single brackets and simplify expressions', strand: 'ALG', sortOrder: 1190 },
  'A1.11': { name: 'Factorising into a single bracket', strand: 'ALG', sortOrder: 1200 },
  'A1.12': { name: 'Describe and continue sequences of diagrams, predicting and checking the next term', strand: 'SEQ', sortOrder: 1210 },
  'A1.13': { name: 'Identify and continue linear sequences', strand: 'SEQ', sortOrder: 1220 },
  'A1.14': { name: 'Generate linear sequences, using term to term rules', strand: 'SEQ', sortOrder: 1230 },
  'A1.15': { name: 'Recognise and continue common sequences (triangular, square, cube, Fibonacci)', strand: 'SEQ', sortOrder: 1240 },
  'A1.16': { name: 'Identify and continue geometric sequences', strand: 'SEQ', sortOrder: 1250 },
  'A1.17': { name: 'Generate geometric sequences, using term to term rules', strand: 'SEQ', sortOrder: 1260 },
  'A1.18': { name: 'Generate sequences given simple and complex algebraic rules (nth term)', strand: 'SEQ', sortOrder: 1270 },
  'A1.19': { name: 'Find the nth term of a sequence', strand: 'SEQ', sortOrder: 1280 },
};

type Phase1Row = MappingRow & {
  variation?: {
    notes?: string;
  };
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function roleFromNotes(notes: string | undefined): 'anchor' | 'practice' {
  if (typeof notes !== 'string') return 'practice';
  return notes.toUpperCase().includes('ONBOARDING') ? 'anchor' : 'practice';
}

function toSlug(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function parseSlideNumber(questionRef: string): number | null {
  const match = questionRef.match(/^Slide(\d+)/i);
  return match ? Number(match[1]) : null;
}

async function ensureSkill(subjectId: string, code: string) {
  const existing = await prisma.skill.findUnique({
    where: { subjectId_code: { subjectId, code } },
  });
  if (existing) return existing;

  const meta = PHASE1_SKILL_META[code];
  if (!meta) return null;

  return prisma.skill.create({
    data: {
      subjectId,
      code,
      slug: toSlug(code),
      name: meta.name,
      strand: meta.strand,
      sortOrder: meta.sortOrder,
      isStretch: false,
    },
  });
}

async function main() {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) {
    throw new Error('Subject ks3-maths not found. Run db:seed first.');
  }

  if (!fs.existsSync(QUESTION_BANK_DIR)) {
    throw new Error(`Question bank directory not found: ${QUESTION_BANK_DIR}`);
  }

  const packFiles = fs
    .readdirSync(QUESTION_BANK_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => path.join(QUESTION_BANK_DIR, f));

  if (packFiles.length === 0) {
    console.log(JSON.stringify({ message: 'No JSONL files in question-bank directory.', importedPacks: 0 }, null, 2));
    return;
  }

  const importedSkillCodes = new Set<string>();
  let created = 0;
  let updated = 0;
  let linked = 0;
  let rowsProcessed = 0;

  for (const mappingPath of packFiles) {
    const lines = fs
      .readFileSync(mappingPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const raw = JSON.parse(line) as Phase1Row;
      const row = MappingRowSchema.parse(raw);
      const derived = deriveStoredItemFromMapping(row);
      const issues = getItemContractIssues({
        question: row.question.stem,
        type: derived.type,
        answer: derived.answer,
        options: derived.options,
      });
      // ORDER contract errors arise when the stem triggers ordering detection but the
      // question was authored as SHORT format (free-text answer). Downgrade to SHORT_TEXT.
      const orderIssues = issues.filter((i) => i.severity === 'error' && (i.code === 'order_min_choices' || i.code === 'order_missing_answer_values'));
      if (orderIssues.length > 0) {
        console.warn(`  [WARN] ${row.source.question_ref}: ordering contract mismatch — importing as SHORT_TEXT`);
        derived.type = 'SHORT_TEXT';
        derived.options = { choices: [], acceptedAnswers: derived.options.acceptedAnswers };
      }
      const hardIssues = issues.filter((issue) => issue.severity === 'error' && !orderIssues.includes(issue));
      if (hardIssues.length > 0) {
        throw new Error(
          `Invalid mapped question ${row.source.question_ref}: ${hardIssues.map((issue) => issue.message).join('; ')}`
        );
      }

      const questionText = `[${row.source.question_ref}] ${row.question.stem}`;
      const slideNumber = parseSlideNumber(row.source.question_ref);
      const visuals = resolveItemVisuals(
        {
          question: row.question.stem,
          options: derived.options,
        },
        row.skills.primary_skill_code
      );
      const options = {
        ...derived.options,
        ...(visuals.length > 0 ? { visuals: visuals as unknown as Prisma.InputJsonValue } : {}),
        meta: {
          question_role: roleFromNotes(raw.variation?.notes),
          source: {
            question_ref: row.source.question_ref,
            source_file: row.source.source_file ?? null,
            slide_number: slideNumber,
          },
        },
      };

      let item = await prisma.item.findFirst({
        where: { question: questionText, subjectId: subject.id },
      });

      if (!item) {
        item = await prisma.item.create({
          data: {
            subjectId: subject.id,
            type: derived.type,
            question: questionText,
            options,
            answer: derived.answer,
          },
        });
        created += 1;
      } else {
        item = await prisma.item.update({
          where: { id: item.id },
          data: {
            type: derived.type,
            options,
            answer: derived.answer,
          },
        });
        updated += 1;
      }

      const skillCodes = unique([row.skills.primary_skill_code, ...(row.skills.secondary_skill_codes ?? [])]);
      for (const code of skillCodes) {
        importedSkillCodes.add(code);
        const skill = await ensureSkill(subject.id, code);
        if (!skill) {
          console.warn(`Skipping missing skill ${code} for ${row.source.question_ref}`);
          continue;
        }

        await prisma.itemSkill.upsert({
          where: { itemId_skillId: { itemId: item.id, skillId: skill.id } },
          update: {},
          create: { itemId: item.id, skillId: skill.id },
        });
        linked += 1;
      }

      rowsProcessed += 1;
    }
  }

  const importedSkills = await prisma.skill.findMany({
    where: {
      subjectId: subject.id,
      code: { in: [...importedSkillCodes] },
    },
    select: { id: true, code: true },
  });

  const placeholderItems = await prisma.item.findMany({
    where: {
      question: { contains: 'Placeholder question', mode: 'insensitive' },
      skills: {
        some: {
          skillId: { in: importedSkills.map((skill) => skill.id) },
        },
      },
    },
    select: { id: true, question: true },
  });

  if (placeholderItems.length > 0) {
    const placeholderIds = placeholderItems.map((item) => item.id);
    await prisma.itemSkill.deleteMany({ where: { itemId: { in: placeholderIds } } });

    for (const item of placeholderItems) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          subjectId: null,
          question: item.question.startsWith('[ARCHIVED PLACEHOLDER]')
            ? item.question
            : `[ARCHIVED PLACEHOLDER] ${item.question}`,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        importedPacks: packFiles.length,
        rowsProcessed,
        created,
        updated,
        linked,
        importedSkills: importedSkills.map((skill) => skill.code).sort(),
        placeholdersRemoved: placeholderItems.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
