/**
 * ensure-routes-a1.ts
 *
 * Seeds explanation routes (A / B / C) for:
 *   A1.1 — Algebraic terminology
 *   A1.2 — Algebraic notation / basic collecting like terms
 *   A1.3 — Substitution into expressions
 *   A1.4 — Simplify expressions by collecting like terms
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

  /* ──────────────────────────────────────────────────────────────────────
   * A1.3 — Substitution into expressions
   *   e.g. find the value of 3a + 2 when a = 4
   * ────────────────────────────────────────────────────────────────────── */
  'A1.3': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students forget that a number next to a variable means multiplication, so they concatenate digits instead of multiplying (e.g. 2a when a = 3 becomes "23" instead of 6).',
      workedExample:
        'Find the value of 3a + 2 when a = 4. Replace a with 4: 3 × 4 + 2 = 12 + 2 = 14.',
      guidedPrompt: 'Find the value of 5b − 1 when b = 3.',
      guidedAnswer: '14',
      steps: [
        {
          stepOrder: 1,
          title: 'What does substitution mean?',
          explanation:
            'Substitution means replacing a variable (letter) with a given number. If a = 5, then everywhere you see a you write 5 instead.',
          checkpointQuestion: 'If x = 7, what do you replace x with?',
          checkpointOptions: ['0', '7', 'x'],
          checkpointAnswer: '7',
        },
        {
          stepOrder: 2,
          title: 'Remember invisible multiplication',
          explanation:
            'When a number is written next to a variable, it means multiply. So 3a means 3 × a. If a = 4, then 3a = 3 × 4 = 12. Do NOT write 34.',
          checkpointQuestion: 'What is the value of 2n when n = 6?',
          checkpointOptions: ['26', '12', '8'],
          checkpointAnswer: '12',
        },
        {
          stepOrder: 3,
          title: 'Substitute into a full expression',
          explanation:
            'Replace every variable, then follow the order of operations. For 4m + 3 when m = 2: replace m → 4 × 2 + 3 = 8 + 3 = 11.',
          checkpointQuestion: 'Find the value of 3x + 5 when x = 3.',
          checkpointOptions: ['11', '14', '35'],
          checkpointAnswer: '14',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not apply the correct order of operations after substituting, especially when the expression involves brackets or powers.',
      workedExample:
        'Find the value of 2(a + 3) when a = 5. Replace a: 2(5 + 3) = 2 × 8 = 16. Work out the bracket first, then multiply.',
      guidedPrompt: 'Find the value of 3(y − 2) when y = 6.',
      guidedAnswer: '12',
      steps: [
        {
          stepOrder: 1,
          title: 'Substitute then use BIDMAS',
          explanation:
            'After substituting, use the order of operations (BIDMAS): Brackets first, then Indices, then Division/Multiplication, then Addition/Subtraction.',
          checkpointQuestion: 'In 2(a + 1) when a = 4, what do you work out first?',
          checkpointOptions: ['2 × a', 'a + 1', '2 × 1'],
          checkpointAnswer: 'a + 1',
        },
        {
          stepOrder: 2,
          title: 'Substituting into expressions with powers',
          explanation:
            'a² means a × a. If a = 3, then a² = 3 × 3 = 9. Be careful: 2a² means 2 × a² = 2 × 9 = 18, not (2a)² = 36.',
          checkpointQuestion: 'What is the value of x² when x = 5?',
          checkpointOptions: ['10', '25', '52'],
          checkpointAnswer: '25',
        },
        {
          stepOrder: 3,
          title: 'Multi-variable substitution',
          explanation:
            'If an expression has more than one variable, replace each one with its given value. For 2a + 3b when a = 4 and b = 2: 2 × 4 + 3 × 2 = 8 + 6 = 14.',
          checkpointQuestion: 'Find the value of a + 2b when a = 5 and b = 3.',
          checkpointOptions: ['11', '8', '16'],
          checkpointAnswer: '11',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students concatenate the coefficient and the substituted value instead of multiplying (e.g. 2a with a = 3 → "23" instead of 6).',
      workedExample:
        'Common mistake: 2a when a = 3 → students write 23. Correct: 2a means 2 × a, so 2 × 3 = 6.',
      guidedPrompt: 'Find the value of 4p when p = 5. Show it means 4 × 5.',
      guidedAnswer: '20',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the mistake: concatenation',
          explanation:
            'A common error is joining digits: 2a when a = 3 → "23". This is wrong because 2a means 2 × a, so the answer is 2 × 3 = 6.',
          checkpointQuestion: 'A student says 5n = 54 when n = 4. What should it be?',
          checkpointOptions: ['54', '20', '9'],
          checkpointAnswer: '20',
        },
        {
          stepOrder: 2,
          title: 'Negative substitution pitfall',
          explanation:
            'When substituting a negative number, use brackets. If a = −2, then 3a = 3 × (−2) = −6. Without brackets you might lose the sign.',
          checkpointQuestion: 'What is 4x when x = −3?',
          checkpointOptions: ['12', '-12', '43'],
          checkpointAnswer: '-12',
        },
        {
          stepOrder: 3,
          title: 'Double-check with a real context',
          explanation:
            'The perimeter of a square is 4s. If s = 7 cm, the perimeter is 4 × 7 = 28 cm. Substitution always means multiply when a number is next to a letter.',
          checkpointQuestion: 'The perimeter of a square is 4s. What is the perimeter when s = 9?',
          checkpointOptions: ['49', '36', '13'],
          checkpointAnswer: '36',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.4 — Simplify expressions by collecting like terms
   *   e.g. 3a + 2b + 5a = 8a + 2b
   * ────────────────────────────────────────────────────────────────────── */
  'A1.4': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students do not correctly identify like terms — they add coefficients of terms with different variables (e.g. 3a + 2b = 5ab).',
      workedExample:
        'Simplify 3a + 2b + 5a. Like terms share the same variable: 3a and 5a are like terms. 3a + 5a = 8a. So the answer is 8a + 2b.',
      guidedPrompt: 'Simplify 4x + 3y + 2x.',
      guidedAnswer: '6x + 3y',
      steps: [
        {
          stepOrder: 1,
          title: 'What are like terms?',
          explanation:
            'Like terms have exactly the same variable(s). 3a and 5a are like terms. 3a and 2b are NOT like terms because the variables are different.',
          checkpointQuestion: 'Which pair are like terms?',
          checkpointOptions: ['3a and 2b', '4x and 7x', '5m and 5n'],
          checkpointAnswer: '4x and 7x',
        },
        {
          stepOrder: 2,
          title: 'Collecting like terms',
          explanation:
            'To simplify, add or subtract the coefficients of like terms. Keep the variable the same: 2y + 6y = 8y. Only combine terms with matching variables.',
          checkpointQuestion: 'Simplify 5p + 3p.',
          checkpointOptions: ['8p', '15p', '8p²'],
          checkpointAnswer: '8p',
        },
        {
          stepOrder: 3,
          title: 'Simplify a full expression',
          explanation:
            'Collect each group of like terms separately. For 3a + 4b + 2a + b: group a-terms → 3a + 2a = 5a; group b-terms → 4b + b = 5b. Result: 5a + 5b.',
          checkpointQuestion: 'Simplify 2m + 3n + 5m + n.',
          checkpointOptions: ['7m + 4n', '11mn', '7m + 3n'],
          checkpointAnswer: '7m + 4n',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students struggle with non-linear like terms — they may treat a² and a as like terms, or fail to recognise that a² and b² are unlike.',
      workedExample:
        'Simplify 2a² + 3a + a². a² and a are NOT like terms (different powers). Group a²-terms: 2a² + a² = 3a². Result: 3a² + 3a.',
      guidedPrompt: 'Simplify 4x² + 2x + x².',
      guidedAnswer: '5x² + 2x',
      steps: [
        {
          stepOrder: 1,
          title: 'Same variable, different power = unlike',
          explanation:
            'a and a² are NOT like terms. Like terms must have the same variable raised to the same power. 3a and 5a are like terms. 3a² and 5a² are like terms. 3a and 5a² are NOT.',
          checkpointQuestion: 'Are 2x and 4x² like terms?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Collecting non-linear terms',
          explanation:
            'Group terms by their variable and power. For 3a² + 2a + a² + 5a: a²-group → 3a² + a² = 4a²; a-group → 2a + 5a = 7a. Result: 4a² + 7a.',
          checkpointQuestion: 'Simplify 5y² + 3y + 2y².',
          checkpointOptions: ['10y³', '7y² + 3y', '7y + 5y²'],
          checkpointAnswer: '7y² + 3y',
        },
        {
          stepOrder: 3,
          title: 'Perimeter context: collecting like terms',
          explanation:
            'A rectangle has sides 3a and 2b. Perimeter = 3a + 2b + 3a + 2b. Collect like terms: 3a + 3a = 6a, 2b + 2b = 4b. Perimeter = 6a + 4b.',
          checkpointQuestion: 'A triangle has sides 2x, 3x and 5. What is the perimeter?',
          checkpointOptions: ['10x', '5x + 5', '5x + 10'],
          checkpointAnswer: '5x + 5',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students combine unlike terms into a single product (e.g. 3a + 2b = 5ab) or forget to carry the sign when collecting like terms.',
      workedExample:
        'Common mistake: 3a + 2b = 5ab. This is wrong — you cannot add unlike terms. 3a + 2b stays as 3a + 2b. Only like terms can be combined.',
      guidedPrompt: 'A student writes 4x + 3y = 7xy. Explain why this is wrong and give the correct answer.',
      guidedAnswer: '4x + 3y',
      steps: [
        {
          stepOrder: 1,
          title: 'You cannot add unlike terms',
          explanation:
            'A common mistake is to add 3a + 2b and get 5ab. This is wrong because a and b are different variables. 3a + 2b cannot be simplified further.',
          checkpointQuestion: 'Can 6m + 2n be simplified?',
          checkpointOptions: ['Yes, to 8mn', 'Yes, to 8m', 'No, it cannot be simplified'],
          checkpointAnswer: 'No, it cannot be simplified',
        },
        {
          stepOrder: 2,
          title: 'Watch the signs',
          explanation:
            'When collecting like terms, carry the sign. In 5a − 2a + 3b − b: a-terms → 5a − 2a = 3a; b-terms → 3b − b = 2b. Result: 3a + 2b.',
          checkpointQuestion: 'Simplify 7x − 3x.',
          checkpointOptions: ['4x', '10x', '4'],
          checkpointAnswer: '4x',
        },
        {
          stepOrder: 3,
          title: 'Putting it all together: spot and fix errors',
          explanation:
            'Check each step: identify like terms, group them, combine coefficients, and keep the sign. Never multiply coefficients of added terms.',
          checkpointQuestion: 'A student simplifies 2a + 3b + 4a as 9ab. What is the correct answer?',
          checkpointOptions: ['9ab', '6a + 3b', '6ab + 3b'],
          checkpointAnswer: '6a + 3b',
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

  console.log('\n✅ ensured explanation routes for A1.1, A1.2, A1.3, A1.4');
}

main().catch(console.error).finally(() => prisma.$disconnect());
