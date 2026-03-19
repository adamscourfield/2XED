/**
 * ensure-routes-n4-1-to-n4-3.ts
 *
 * Seeds explanation routes (A / B / C) for N4.1, N4.2, N4.3 which are
 * not covered by the FDP PPTX (N6 booklet starts at decimal-fraction conversions).
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-n4-1-to-n4-3.ts
 */

import { PrismaClient } from '@prisma/client';
import { validateExplanationStepWrite } from '../src/features/learn/explanationStepWriteGuard';

const prisma = new PrismaClient();

export type RouteType = 'A' | 'B' | 'C';

export interface StepDef {
  stepOrder: number;
  title: string;
  explanation: string;
  checkpointQuestion: string;
  checkpointOptions?: string[];
  checkpointAnswer: string;
}

export interface RouteDef {
  routeType: RouteType;
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  steps: StepDef[];
}

export const SKILL_ROUTES: Record<string, RouteDef[]> = {
  'N4.1': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students may confuse numerator and denominator, or count total parts incorrectly.',
      workedExample: 'Shape split into 6 equal parts, 2 shaded → fraction = 2/6.',
      guidedPrompt: 'A bar is split into 8 equal parts. 3 are shaded. Write the fraction shaded.',
      guidedAnswer: '3/8',
      steps: [
        {
          stepOrder: 1,
          title: 'What a fraction means',
          explanation: 'A fraction shows parts out of a whole. The denominator (bottom) = total equal parts. The numerator (top) = parts chosen.',
          checkpointQuestion: 'In 3/8, what does the 8 represent?',
          checkpointAnswer: 'The total number of equal parts.',
        },
        {
          stepOrder: 2,
          title: 'Writing the fraction',
          explanation: 'Count all equal parts (denominator), then count the chosen/shaded parts (numerator). Write numerator/denominator.',
          checkpointQuestion: 'A bar is split into 5 equal parts. 3 are shaded. Write the fraction shaded.',
          checkpointAnswer: '3/5',
        },
        {
          stepOrder: 3,
          title: 'Fractions on a number line',
          explanation: 'To place a fraction on a number line between 0 and 1, divide the line into (denominator) equal sections and count (numerator) sections from 0.',
          checkpointQuestion: 'Where does 3/4 sit on a number line between 0 and 1?',
          checkpointAnswer: 'Three quarters of the way from 0 to 1.',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students may think parts do not need to be equal to form a fraction.',
      workedExample: 'If parts are unequal, 1/4 of a pizza could be any size slice — so equal parts are essential.',
      guidedPrompt: 'Explain why the parts of a whole must be equal for a fraction to have a fixed meaning.',
      guidedAnswer: 'If parts are unequal, 1/4 would be a different amount each time — fractions require equal divisions.',
      steps: [
        {
          stepOrder: 1,
          title: 'Equal parts are essential',
          explanation: 'A fraction only makes sense when the whole is divided into equal parts. Unequal parts mean the numerator does not consistently represent the same amount.',
          checkpointQuestion: 'True or false: the parts of a whole must be equal for a fraction to be meaningful.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Numerator and denominator',
          explanation: 'The numerator tells how many parts are selected. The denominator tells how many equal parts make up the whole.',
          checkpointQuestion: 'A class has 30 students and 12 are girls. What fraction are girls?',
          checkpointAnswer: '12/30',
        },
        {
          stepOrder: 3,
          title: 'Fractions on a number line',
          explanation: 'Fractions between 0 and 1 on a number line represent parts of one whole. 1/2 is midway, 1/4 is one quarter of the way, and so on.',
          checkpointQuestion: 'Which fraction is closer to 1: 3/4 or 1/4?',
          checkpointOptions: ['3/4', '1/4'],
          checkpointAnswer: '3/4',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students write the unshaded parts as the numerator, or swap numerator and denominator.',
      workedExample: '8 parts total, 3 shaded → shaded fraction = 3/8 (not 5/8 or 8/3).',
      guidedPrompt: 'A shape has 8 parts. 3 are shaded. A student writes 5/8. What is their error?',
      guidedAnswer: 'They counted the unshaded parts (5) instead of the shaded parts (3). Correct answer is 3/8.',
      steps: [
        {
          stepOrder: 1,
          title: 'Numerator = chosen parts',
          explanation: 'The numerator (top) counts the parts you are describing (e.g. shaded). Do NOT count the remaining (unshaded) parts.',
          checkpointQuestion: 'A pie has 6 slices. 4 are eaten. What fraction is eaten?',
          checkpointAnswer: '4/6',
        },
        {
          stepOrder: 2,
          title: 'Avoid the swap error',
          explanation: 'Another common error: writing the fraction upside down (e.g. 8/3 instead of 3/8). For proper fractions (less than 1), the numerator is always smaller than the denominator.',
          checkpointQuestion: 'True or false: 8/3 and 3/8 represent the same amount.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 3,
          title: 'Check on a number line',
          explanation: 'Use the number line to sanity-check: if 3 out of 8 parts are shaded, the fraction 3/8 should sit between 0 and 1/2.',
          checkpointQuestion: 'Is 3/8 closer to 0 or closer to 1?',
          checkpointOptions: ['Closer to 0', 'Closer to 1'],
          checkpointAnswer: 'Closer to 0',
        },
      ],
    },
  ],

  'N4.2': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students add the same number to numerator and denominator rather than multiplying.',
      workedExample: '2/3 = ?/12 → scale factor = 4 → 8/12.',
      guidedPrompt: 'Complete: 3/4 = ?/20',
      guidedAnswer: '15/20',
      steps: [
        {
          stepOrder: 1,
          title: 'Making equivalent fractions',
          explanation: 'To make an equivalent fraction, multiply (or divide) both numerator and denominator by the same number. This is like multiplying by 1.',
          checkpointQuestion: 'Complete: 1/2 = ?/8',
          checkpointAnswer: '4/8',
        },
        {
          stepOrder: 2,
          title: 'Finding the scale factor',
          explanation: 'Find the scale factor: what do you multiply the given denominator by to get the new denominator? Then multiply the numerator by the same factor.',
          checkpointQuestion: 'Complete: 3/4 = ?/20',
          checkpointAnswer: '15/20',
        },
        {
          stepOrder: 3,
          title: 'Dividing to simplify',
          explanation: 'You can also go the other way: divide numerator and denominator by the same factor to get a simpler equivalent fraction.',
          checkpointQuestion: 'Complete: 6/10 = ?/5',
          checkpointAnswer: '3/5',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not recognise that equivalent fractions represent the same quantity.',
      workedExample: '1/2 and 4/8 sit at the same point on the number line — they are the same amount.',
      guidedPrompt: 'Explain why 2/4 and 1/2 are the same amount.',
      guidedAnswer: '2/4 simplifies to 1/2 by dividing by 2. Both represent exactly half the whole.',
      steps: [
        {
          stepOrder: 1,
          title: 'Same amount, different form',
          explanation: 'Equivalent fractions are different ways to write the same amount. 1/2 and 4/8 both represent exactly half of a whole — just cut into different numbers of pieces.',
          checkpointQuestion: 'True or false: 2/4 and 3/6 are equivalent.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Why multiplication works',
          explanation: 'Multiplying top and bottom by the same number is the same as multiplying by 1 (e.g. 3/3 = 1), so the value does not change.',
          checkpointQuestion: 'Why does multiplying both parts of a fraction by 4 not change its value?',
          checkpointAnswer: 'Because 4/4 = 1, and multiplying by 1 does not change the value.',
        },
        {
          stepOrder: 3,
          title: 'Using equivalence to compare',
          explanation: 'Rewrite fractions with the same denominator to compare them — a key use of equivalent fractions.',
          checkpointQuestion: 'Which is bigger: 2/3 or 3/5? Rewrite with denominator 15 to decide.',
          checkpointAnswer: '2/3 = 10/15 and 3/5 = 9/15, so 2/3 is bigger.',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students add (not multiply) to both parts to create equivalent fractions.',
      workedExample: '1/3 ≠ 3/5 (adding 2). Correct: 1/3 = 2/6 = 3/9 (multiplying).',
      guidedPrompt: 'A student says 1/3 = 3/5 by adding 2 to both parts. Explain the error.',
      guidedAnswer: 'Adding does not preserve the ratio. You must multiply both numerator and denominator by the same number.',
      steps: [
        {
          stepOrder: 1,
          title: 'The additive error',
          explanation: 'Adding the same number to top and bottom changes the fraction. For example, 1/3 + 2 top and bottom gives 3/5, but 3/5 ≠ 1/3.',
          checkpointQuestion: 'Is 1/4 equivalent to 3/6?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Always multiply',
          explanation: 'Find the scale factor between denominators (or numerators), then multiply the other part of the fraction by the same factor.',
          checkpointQuestion: 'Complete: 2/5 = ?/15',
          checkpointAnswer: '6/15',
        },
        {
          stepOrder: 3,
          title: 'Cross-multiply to verify',
          explanation: 'Check equivalence by cross-multiplying: if a/b = c/d then a × d should equal b × c.',
          checkpointQuestion: 'Is 3/4 equivalent to 9/12? Check by cross-multiplying.',
          checkpointAnswer: 'Yes. 3 × 12 = 36 and 4 × 9 = 36.',
        },
      ],
    },
  ],

  'N4.3': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students partially simplify and stop before reaching the simplest form.',
      workedExample: '12/18: HCF(12,18)=6 → 12÷6=2, 18÷6=3 → 2/3.',
      guidedPrompt: 'Simplify 8/12 fully.',
      guidedAnswer: '2/3',
      steps: [
        {
          stepOrder: 1,
          title: 'Find the HCF',
          explanation: 'To simplify a fraction, divide both parts by their Highest Common Factor (HCF) — the largest number that divides into both exactly.',
          checkpointQuestion: 'What is the HCF of 8 and 12?',
          checkpointAnswer: '4',
        },
        {
          stepOrder: 2,
          title: 'Divide both parts',
          explanation: 'Divide numerator and denominator by the HCF. The resulting fraction is equivalent but uses smaller numbers.',
          checkpointQuestion: 'Simplify 8/12.',
          checkpointAnswer: '2/3',
        },
        {
          stepOrder: 3,
          title: 'Check fully simplified',
          explanation: 'After simplifying, check the new numerator and denominator share no common factor other than 1. If they do, simplify again.',
          checkpointQuestion: 'Simplify 24/36.',
          checkpointAnswer: '2/3',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students think simplifying changes the value of the fraction.',
      workedExample: '6/9 and 2/3 sit at exactly the same position on a number line — they are equal.',
      guidedPrompt: 'Explain why 6/9 and 2/3 are the same fraction.',
      guidedAnswer: 'Both equal two thirds. Simplifying just rewrites the fraction with smaller numbers using the same ratio.',
      steps: [
        {
          stepOrder: 1,
          title: 'Simplifying preserves value',
          explanation: 'Simplifying does not change a fraction\'s value — it just uses smaller numbers. 6/9 and 2/3 sit at exactly the same point on a number line.',
          checkpointQuestion: 'True or false: 10/15 and 2/3 are equal in value.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Simplest form defined',
          explanation: 'A fraction is in simplest form when the only number that divides both numerator and denominator is 1 (they share no common factor other than 1).',
          checkpointQuestion: 'Is 4/9 in its simplest form?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'Yes',
        },
        {
          stepOrder: 3,
          title: 'Why simplest form is useful',
          explanation: 'Simplest form makes fractions easier to compare and use in further calculations such as adding or ordering fractions.',
          checkpointQuestion: 'Which is easier to compare: 12/18 and 10/15, or 2/3 and 2/3?',
          checkpointOptions: ['12/18 and 10/15', '2/3 and 2/3'],
          checkpointAnswer: '2/3 and 2/3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students stop after one step of simplification rather than fully simplifying.',
      workedExample: '16/24 → 8/12 (÷2) → 4/6 (÷2) → 2/3 (÷2). Better: HCF=8 → 2/3 in one step.',
      guidedPrompt: 'A student simplifies 16/24 to 8/12. Have they finished? What is the simplest form?',
      guidedAnswer: 'No. 8/12 = 2/3. They should have used HCF = 8 to reach 2/3 directly.',
      steps: [
        {
          stepOrder: 1,
          title: 'Check after each step',
          explanation: 'After simplifying, always check: do the new numerator and denominator share any common factor other than 1? If yes, simplify again.',
          checkpointQuestion: 'A student simplifies 12/16 to 6/8. Is this the simplest form?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Use the HCF directly',
          explanation: 'Using the HCF in one step is more efficient than simplifying repeatedly. Find the largest common factor, not just any common factor.',
          checkpointQuestion: 'Simplify 18/24 in one step using the HCF.',
          checkpointAnswer: '3/4',
        },
        {
          stepOrder: 3,
          title: 'Verify simplest form',
          explanation: 'To confirm simplest form, check that HCF of the resulting numerator and denominator is 1.',
          checkpointQuestion: 'Is 3/4 in simplest form? How do you know?',
          checkpointAnswer: 'Yes — the HCF of 3 and 4 is 1.',
        },
      ],
    },
  ],
};

async function main() {
  const subject = await prisma.subject.findFirstOrThrow({ where: { slug: 'ks3-maths' } });

  for (const [skillCode, routes] of Object.entries(SKILL_ROUTES)) {
    const skill = await prisma.skill.findUnique({
      where: { subjectId_code: { subjectId: subject.id, code: skillCode } },
    });
    if (!skill) {
      console.warn(`[SKIP] Skill ${skillCode} not found in DB.`);
      continue;
    }

    for (const route of routes) {
      const upserted = await prisma.explanationRoute.upsert({
        where: { skillId_routeType: { skillId: skill.id, routeType: route.routeType } },
        create: {
          skillId: skill.id,
          routeType: route.routeType,
          misconceptionSummary: route.misconceptionSummary,
          workedExample: route.workedExample,
          guidedPrompt: route.guidedPrompt,
          guidedAnswer: route.guidedAnswer,
          isActive: true,
        },
        update: {
          misconceptionSummary: route.misconceptionSummary,
          workedExample: route.workedExample,
          guidedPrompt: route.guidedPrompt,
          guidedAnswer: route.guidedAnswer,
          isActive: true,
        },
      });

      for (const step of route.steps) {
        const validated = validateExplanationStepWrite({
          checkpointQuestion: step.checkpointQuestion,
          checkpointOptions: step.checkpointOptions,
          checkpointAnswer: step.checkpointAnswer,
        });

        await prisma.explanationStep.upsert({
          where: { explanationRouteId_stepOrder: { explanationRouteId: upserted.id, stepOrder: step.stepOrder } },
          create: {
            explanationRouteId: upserted.id,
            stepOrder: step.stepOrder,
            title: step.title,
            explanation: step.explanation,
            stepType: 'checkpoint',
            checkpointQuestion: validated.checkpointQuestion,
            checkpointOptions: validated.checkpointOptions,
            checkpointAnswer: validated.checkpointAnswer,
            questionType: validated.questionType,
          },
          update: {
            title: step.title,
            explanation: step.explanation,
            stepType: 'checkpoint',
            checkpointQuestion: validated.checkpointQuestion,
            checkpointOptions: validated.checkpointOptions,
            checkpointAnswer: validated.checkpointAnswer,
            questionType: validated.questionType,
          },
        });
      }

      console.log(`  ✓ ${skillCode} Route ${route.routeType}`);
    }
  }

  console.log(`\n✅ ensured explanation routes for N4.1, N4.2, N4.3`);
}

// Only execute when run directly (not when imported by tests/other modules).
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
