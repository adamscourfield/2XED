/**
 * ensure-routes-a1.ts
 *
 * Seeds explanation routes (A / B / C) for:
 *   A1.1 — Algebraic terminology
 *   A1.2 — Algebraic notation / basic collecting like terms
 *
 * Scoped to a small batch (the full A1.1–A1.19 range was too large for a
 * single generation run and caused timeouts).  Additional A1 skills
 * can be added in follow-up passes.
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-a1.ts
 */

import { PrismaClient } from '@prisma/client';
import { validateExplanationStepWrite } from '../src/features/learn/explanationStepWriteGuard';

const prisma = new PrismaClient();

type RouteType = 'A' | 'B' | 'C';

interface StepDef {
  stepOrder: number;
  title: string;
  explanation: string;
  checkpointQuestion: string;
  checkpointOptions?: string[];
  checkpointAnswer: string;
}

interface RouteDef {
  routeType: RouteType;
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  steps: StepDef[];
}

const SKILL_ROUTES: Record<string, RouteDef[]> = {
  /* ──────────────────────────────────────────────────────────────────────
   * A1.1 — Algebraic terminology (e.g. term, expression, coefficient)
   * ────────────────────────────────────────────────────────────────────── */
  'A1.1': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students confuse "term", "expression", "equation" and "formula", or cannot identify how many terms an expression contains.',
      workedExample:
        '3x + 5 is an expression with two terms: 3x and 5. An equation has an equals sign, e.g. 3x + 5 = 11. A formula links variables, e.g. A = l × w.',
      guidedPrompt: 'How many terms are in the expression 4a + 7b − 2?',
      guidedAnswer: '3',
      steps: [
        {
          stepOrder: 1,
          title: 'What is a term?',
          explanation:
            'A term is a single number, a single variable, or a number multiplied by one or more variables. Examples: 5, x, 3y, 4ab. Terms are separated by + or − signs.',
          checkpointQuestion: 'Which of these is a single term?',
          checkpointOptions: ['3x + 1', '3x', '3 + x'],
          checkpointAnswer: '3x',
        },
        {
          stepOrder: 2,
          title: 'What is an expression?',
          explanation:
            'An expression is one or more terms joined by + or − signs. It does NOT have an equals sign. For example, 2x + 3y − 7 is an expression with three terms.',
          checkpointQuestion: 'How many terms does 5m − 2n + 4 have?',
          checkpointOptions: ['2', '3', '4'],
          checkpointAnswer: '3',
        },
        {
          stepOrder: 3,
          title: 'Expression vs equation vs formula',
          explanation:
            'An expression has no equals sign: 2x + 1. An equation has an equals sign and can be solved: 2x + 1 = 9. A formula shows a relationship between variables: A = l × w.',
          checkpointQuestion: 'Which of these is an equation?',
          checkpointOptions: ['3n + 2', '3n + 2 = 14', 'A = l × w'],
          checkpointAnswer: '3n + 2 = 14',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students misidentify the coefficient of a term — especially the implicit coefficient of 1 in a bare variable such as x.',
      workedExample:
        'In 3y the coefficient is 3 (the number multiplying y). In the term y on its own the coefficient is 1, because y means 1 × y.',
      guidedPrompt: 'What is the coefficient of p in the term 8p?',
      guidedAnswer: '8',
      steps: [
        {
          stepOrder: 1,
          title: 'What is a coefficient?',
          explanation:
            'The coefficient is the number in front of a variable in a term. In 6x the coefficient is 6. In y (written without a number) the coefficient is 1.',
          checkpointQuestion: 'What is the coefficient of n in the term 4n?',
          checkpointOptions: ['n', '4', '4n'],
          checkpointAnswer: '4',
        },
        {
          stepOrder: 2,
          title: 'The hidden coefficient of 1',
          explanation:
            'When a variable appears on its own — like x or ab — there is an invisible 1 in front: x = 1x, ab = 1ab. So the coefficient is 1.',
          checkpointQuestion: 'What is the coefficient of y in the expression 2x + y?',
          checkpointOptions: ['0', '1', '2'],
          checkpointAnswer: '1',
        },
        {
          stepOrder: 3,
          title: 'Coefficients with negative signs',
          explanation:
            'A minus sign belongs to the coefficient. In −5t the coefficient is −5. In −m the coefficient is −1.',
          checkpointQuestion: 'What is the coefficient of k in the term −3k?',
          checkpointOptions: ['3', '-3', 'k'],
          checkpointAnswer: '-3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students confuse variables and constants, or do not recognise that a constant term is a term with no variable.',
      workedExample:
        'In 2x + 7, the variable is x (it can change), 2 is the coefficient and 7 is a constant (a fixed number with no variable attached).',
      guidedPrompt: 'Identify the constant term in 5a − 3b + 9.',
      guidedAnswer: '9',
      steps: [
        {
          stepOrder: 1,
          title: 'Variables and constants',
          explanation:
            'A variable is a letter that represents an unknown or changing value (e.g. x, y). A constant is a fixed number (e.g. 7). In 3x + 7, x is a variable and 7 is a constant.',
          checkpointQuestion: 'In the expression 4m + 10, which is the variable?',
          checkpointOptions: ['4', 'm', '10'],
          checkpointAnswer: 'm',
        },
        {
          stepOrder: 2,
          title: 'Identifying constant terms',
          explanation:
            'A constant term is a term with no variable. In 6p + 2q − 5 the constant term is −5. Remember: the sign in front belongs to the term.',
          checkpointQuestion: 'What is the constant term in 3x + y − 8?',
          checkpointOptions: ['3x', 'y', '-8'],
          checkpointAnswer: '-8',
        },
        {
          stepOrder: 3,
          title: 'Putting it all together',
          explanation:
            'For any term you should be able to name: the coefficient (the number), the variable(s) (the letter(s)), and whether it is a constant (no variable). E.g. in 9ab: coefficient = 9, variables = a and b.',
          checkpointQuestion: 'True or false: the term 12 is a constant term.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.2 — Algebraic notation / basic collecting like terms
   *   e.g. ab for a×b, 3y for y+y+y and 3×y, a² for a×a, a/b for ÷
   * ────────────────────────────────────────────────────────────────────── */
  'A1.2': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students do not recognise that multiplication signs are omitted in algebra: ab means a × b, and 3y means 3 × y, not "thirty-something".',
      workedExample:
        'In algebra we leave out the × sign. So a × b is written ab, 3 × y is written 3y, and 2 × a × b is written 2ab. The number always goes first.',
      guidedPrompt: 'Write 5 × m × n using algebraic notation.',
      guidedAnswer: '5mn',
      steps: [
        {
          stepOrder: 1,
          title: 'Multiplication is invisible',
          explanation:
            'In algebra we drop the × sign. a × b becomes ab. 4 × x becomes 4x. The number (coefficient) is always written first, then the letters in alphabetical order.',
          checkpointQuestion: 'Write 7 × p using algebraic notation.',
          checkpointOptions: ['7p', '7 × p', 'p7'],
          checkpointAnswer: '7p',
        },
        {
          stepOrder: 2,
          title: 'Multiple variables',
          explanation:
            'When multiplying several letters, write them next to each other in alphabetical order: a × c × b = abc. If there is a number it goes first: 2 × b × a = 2ab.',
          checkpointQuestion: 'Simplify 3 × c × a into algebraic notation.',
          checkpointOptions: ['3ca', '3ac', 'ca3'],
          checkpointAnswer: '3ac',
        },
        {
          stepOrder: 3,
          title: '1 × and the invisible coefficient',
          explanation:
            'We never write 1 in front of a variable: 1 × y is just y, 1 × a × b is just ab. Similarly, a × 1 is still just a.',
          checkpointQuestion: 'Simplify 1 × k × m.',
          checkpointOptions: ['1km', 'km', 'mk'],
          checkpointAnswer: 'km',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students struggle with index (power) notation — they may write a × a as 2a instead of a², or confuse a² with 2a.',
      workedExample:
        'a × a means a is multiplied by itself, so we write a². This is different from 2a which means a + a (two lots of a). Similarly b × b × b = b³.',
      guidedPrompt: 'Write y × y × y using index notation.',
      guidedAnswer: 'y³',
      steps: [
        {
          stepOrder: 1,
          title: 'What does a² mean?',
          explanation:
            'a² means a × a (a multiplied by itself). The small raised number is called the index or power. It tells you how many times the base is multiplied.',
          checkpointQuestion: 'What does m² mean?',
          checkpointOptions: ['m + m', 'm × 2', 'm × m'],
          checkpointAnswer: 'm × m',
        },
        {
          stepOrder: 2,
          title: 'a² is not the same as 2a',
          explanation:
            '2a means 2 × a (or a + a). a² means a × a. For example if a = 5: 2a = 10, but a² = 25. They are very different!',
          checkpointQuestion: 'If x = 4, what is x²?',
          checkpointOptions: ['8', '16', '44'],
          checkpointAnswer: '16',
        },
        {
          stepOrder: 3,
          title: 'Higher powers',
          explanation:
            'a³ means a × a × a (cubed). The pattern continues: a⁴ = a × a × a × a. You can also have coefficients: 3a² means 3 × a × a.',
          checkpointQuestion: 'Write n × n × n × n using index notation.',
          checkpointOptions: ['4n', 'n⁴', 'n × 4'],
          checkpointAnswer: 'n⁴',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students struggle with division notation in algebra — they do not connect a ÷ b with the fraction a/b, or misread the numerator and denominator.',
      workedExample:
        'In algebra, a ÷ b is written as a/b (a fraction). The top of the fraction is the numerator and the bottom is the denominator. So x ÷ 3 = x/3.',
      guidedPrompt: 'Write p ÷ 5 using algebraic fraction notation.',
      guidedAnswer: 'p/5',
      steps: [
        {
          stepOrder: 1,
          title: 'Division becomes a fraction',
          explanation:
            'In algebra we replace ÷ with a fraction bar. a ÷ b is written a/b. The value before ÷ goes on top (numerator) and the value after goes on the bottom (denominator).',
          checkpointQuestion: 'Write y ÷ 4 as a fraction.',
          checkpointOptions: ['4/y', 'y/4', '4y'],
          checkpointAnswer: 'y/4',
        },
        {
          stepOrder: 2,
          title: 'Expressions on top and bottom',
          explanation:
            'The numerator or denominator can be a whole expression. For example (2x + 1) ÷ 3 is written as (2x + 1)/3.',
          checkpointQuestion: 'How do you write (a + b) ÷ 2 as a fraction?',
          checkpointOptions: ['2/(a + b)', '(a + b)/2', 'a + b/2'],
          checkpointAnswer: '(a + b)/2',
        },
        {
          stepOrder: 3,
          title: 'Putting notation together',
          explanation:
            'Algebraic notation combines all these rules. 3 × a × a ÷ b is written 3a²/b — multiplication invisible, index for repeated variable, fraction for division.',
          checkpointQuestion: 'Which is the correct algebraic form of 2 × x × x ÷ y?',
          checkpointOptions: ['2x²/y', '2x/y²', 'x²/2y'],
          checkpointAnswer: '2x²/y',
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

  console.log('\n✅ ensured explanation routes for A1.1, A1.2');
}

main().catch(console.error).finally(() => prisma.$disconnect());
