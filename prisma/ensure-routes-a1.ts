/**
 * ensure-routes-a1.ts
 *
 * Seeds explanation routes (A / B / C) for:
 *   A1.1  — Algebraic terminology
 *   A1.2  — Algebraic notation / basic collecting like terms
 *   A1.3  — Substitution into expressions
 *   A1.4  — Simplify expressions by collecting like terms
 *   A1.5  — Multiply a single term over a bracket (expand)
 *   A1.6  — Factorise by taking out a common factor
 *   A1.7  — Write expressions and formulae from worded descriptions
 *   A1.8  — Solve one-step linear equations
 *   A1.9  — Solve two-step linear equations
 *   A1.10 — Solve equations with unknowns on both sides
 *   A1.11 — Solve equations involving brackets
 *   A1.12 — Generate terms of a sequence from a term-to-term rule
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-a1.ts
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

  /* ──────────────────────────────────────────────────────────────────────
   * A1.5 — Multiply a single term over a bracket (expand)
   *   e.g. 3(x + 2) = 3x + 6
   * ────────────────────────────────────────────────────────────────────── */
  'A1.5': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students only multiply the term outside the bracket by the first term inside, forgetting to multiply the second term (e.g. 3(x + 2) = 3x + 2 instead of 3x + 6).',
      workedExample:
        'Expand 3(x + 2). Multiply 3 by each term inside the bracket: 3 × x = 3x, 3 × 2 = 6. So 3(x + 2) = 3x + 6.',
      guidedPrompt: 'Expand 4(y + 5).',
      guidedAnswer: '4y + 20',
      steps: [
        {
          stepOrder: 1,
          title: 'What does expanding mean?',
          explanation:
            'Expanding means removing brackets by multiplying the term outside by every term inside. In 3(x + 2), multiply 3 by x AND by 2.',
          checkpointQuestion: 'When you expand 5(a + 3), how many multiplications do you perform?',
          checkpointOptions: ['1', '2', '3'],
          checkpointAnswer: '2',
        },
        {
          stepOrder: 2,
          title: 'Multiply each term',
          explanation:
            'Expand 2(x + 4): 2 × x = 2x, then 2 × 4 = 8. Write them together: 2x + 8. The sign between the terms stays the same.',
          checkpointQuestion: 'Expand 3(a + 7).',
          checkpointOptions: ['3a + 7', '3a + 21', '3a + 10'],
          checkpointAnswer: '3a + 21',
        },
        {
          stepOrder: 3,
          title: 'Expanding with subtraction',
          explanation:
            'Expand 5(y − 3): 5 × y = 5y, then 5 × 3 = 15. Because the sign is minus, the result is 5y − 15.',
          checkpointQuestion: 'Expand 4(m − 2).',
          checkpointOptions: ['4m − 2', '4m + 8', '4m − 8'],
          checkpointAnswer: '4m − 8',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students lose or flip the sign when expanding brackets with negative terms, especially with expressions like −2(x − 3), getting −2x − 6 instead of −2x + 6.',
      workedExample:
        'Expand −2(x − 3). Multiply −2 by x = −2x. Multiply −2 by −3 = +6 (negative × negative = positive). So −2(x − 3) = −2x + 6.',
      guidedPrompt: 'Expand −3(a − 4).',
      guidedAnswer: '-3a + 12',
      steps: [
        {
          stepOrder: 1,
          title: 'Expanding with a negative outside',
          explanation:
            'When the term outside the bracket is negative, multiply each term by the negative number. Watch the sign rules: negative × positive = negative, negative × negative = positive.',
          checkpointQuestion: 'What is −2 × 5?',
          checkpointOptions: ['10', '-10', '7'],
          checkpointAnswer: '-10',
        },
        {
          stepOrder: 2,
          title: 'Negative × negative = positive',
          explanation:
            'In −4(x − 2): −4 × x = −4x, −4 × (−2) = +8. The second term becomes positive. So −4(x − 2) = −4x + 8.',
          checkpointQuestion: 'Expand −5(y − 1).',
          checkpointOptions: ['-5y − 5', '-5y + 5', '-5y − 1'],
          checkpointAnswer: '-5y + 5',
        },
        {
          stepOrder: 3,
          title: 'Expanding with a variable outside',
          explanation:
            'The term outside can also be a variable: x(x + 3) means x × x + x × 3 = x² + 3x. Multiply as normal, using index rules for x × x.',
          checkpointQuestion: 'Expand a(a + 5).',
          checkpointOptions: ['a² + 5', 'a² + 5a', '2a + 5'],
          checkpointAnswer: 'a² + 5a',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students partially expand, multiplying only the first term inside the bracket and leaving the second term unchanged (e.g. 3(x + 4) = 3x + 4 instead of 3x + 12).',
      workedExample:
        'Common mistake: 3(x + 4) = 3x + 4. The student only multiplied x by 3 and forgot to multiply 4 by 3. Correct: 3 × x = 3x, 3 × 4 = 12 → 3x + 12.',
      guidedPrompt: 'A student writes 2(a + 6) = 2a + 6. What is the correct expansion?',
      guidedAnswer: '2a + 12',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the partial-expansion mistake',
          explanation:
            'The most common error is only multiplying the first term: 2(x + 5) = 2x + 5. The 5 was not multiplied. Every term inside must be multiplied by the term outside.',
          checkpointQuestion: 'A student writes 4(n + 3) = 4n + 3. What did they forget?',
          checkpointOptions: ['To add 4 and n', 'To multiply 3 by 4', 'To square n'],
          checkpointAnswer: 'To multiply 3 by 4',
        },
        {
          stepOrder: 2,
          title: 'Sign errors with negatives',
          explanation:
            'Another mistake: −3(x − 2) = −3x − 6. The student treated −3 × −2 as negative. Remember: negative × negative = positive. Correct: −3x + 6.',
          checkpointQuestion: 'What is the correct expansion of −2(y − 4)?',
          checkpointOptions: ['-2y − 8', '-2y + 8', '-2y − 4'],
          checkpointAnswer: '-2y + 8',
        },
        {
          stepOrder: 3,
          title: 'Check by substitution',
          explanation:
            'You can check your expansion by substituting a value. For 3(x + 2): let x = 1. Bracket: 3(1 + 2) = 3 × 3 = 9. Expansion: 3(1) + 6 = 3 + 6 = 9. ✓ They match!',
          checkpointQuestion: 'Check: if x = 2, does 5(x + 1) = 5x + 5?',
          checkpointOptions: ['Yes — both give 15', 'No — they give different values'],
          checkpointAnswer: 'Yes — both give 15',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.6 — Factorise by taking out a common factor
   *   e.g. 6x + 9 = 3(2x + 3)
   * ────────────────────────────────────────────────────────────────────── */
  'A1.6': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students do not identify the highest common factor (HCF) of all terms — they may take out a factor that is too small, leaving a partially factorised expression.',
      workedExample:
        'Factorise 6x + 9. Find the HCF of 6 and 9 → HCF is 3. Divide each term: 6x ÷ 3 = 2x, 9 ÷ 3 = 3. Write as 3(2x + 3).',
      guidedPrompt: 'Factorise 8y + 12.',
      guidedAnswer: '4(2y + 3)',
      steps: [
        {
          stepOrder: 1,
          title: 'What does factorising mean?',
          explanation:
            'Factorising is the reverse of expanding. You find a common factor shared by every term and write it outside a bracket. What remains goes inside the bracket.',
          checkpointQuestion: 'Factorising is the reverse of which operation?',
          checkpointOptions: ['Simplifying', 'Expanding', 'Substituting'],
          checkpointAnswer: 'Expanding',
        },
        {
          stepOrder: 2,
          title: 'Find the HCF of the coefficients',
          explanation:
            'To factorise 10x + 15, find the HCF of 10 and 15 → HCF is 5. Divide each term by 5: 10x ÷ 5 = 2x, 15 ÷ 5 = 3. Result: 5(2x + 3).',
          checkpointQuestion: 'Factorise 12a + 18.',
          checkpointOptions: ['2(6a + 9)', '6(2a + 3)', '3(4a + 6)'],
          checkpointAnswer: '6(2a + 3)',
        },
        {
          stepOrder: 3,
          title: 'Factorising with variables as common factors',
          explanation:
            'If every term contains the same variable, include it in the common factor. For 4x² + 6x: HCF is 2x. 4x² ÷ 2x = 2x, 6x ÷ 2x = 3. Result: 2x(2x + 3).',
          checkpointQuestion: 'Factorise 3m² + 9m.',
          checkpointOptions: ['3(m² + 3m)', '3m(m + 3)', 'm(3m + 9)'],
          checkpointAnswer: '3m(m + 3)',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students forget to check their factorisation by re-expanding, so they do not catch errors such as missing terms or wrong signs inside the bracket.',
      workedExample:
        'Factorise 15a − 10. HCF of 15 and 10 is 5. 15a ÷ 5 = 3a, 10 ÷ 5 = 2. Keep the minus sign: 5(3a − 2). Check: 5 × 3a = 15a, 5 × (−2) = −10. ✓',
      guidedPrompt: 'Factorise 14b − 21.',
      guidedAnswer: '7(2b − 3)',
      steps: [
        {
          stepOrder: 1,
          title: 'Factorising as reverse expanding',
          explanation:
            'Expanding and factorising are opposites. 3(x + 4) expands to 3x + 12. Going backwards: 3x + 12 factorises to 3(x + 4). Always think: what was outside the bracket?',
          checkpointQuestion: 'If 5(a + 2) = 5a + 10, what does 5a + 10 factorise to?',
          checkpointOptions: ['5(a + 2)', '5(a + 10)', 'a(5 + 10)'],
          checkpointAnswer: '5(a + 2)',
        },
        {
          stepOrder: 2,
          title: 'Keep the minus sign',
          explanation:
            'When factorising subtraction expressions, the minus stays inside the bracket. 12x − 8: HCF is 4. 12x ÷ 4 = 3x, 8 ÷ 4 = 2. Result: 4(3x − 2).',
          checkpointQuestion: 'Factorise 20p − 15.',
          checkpointOptions: ['5(4p + 3)', '5(4p − 3)', '5(4p − 15)'],
          checkpointAnswer: '5(4p − 3)',
        },
        {
          stepOrder: 3,
          title: 'Check by re-expanding',
          explanation:
            'Always verify by expanding your answer. If you get 4(2x + 5), expand: 4 × 2x = 8x, 4 × 5 = 20. So 8x + 20. If this matches the original, you are correct.',
          checkpointQuestion: 'A student factorises 9x + 6 as 3(3x + 3). Check: does 3(3x + 3) expand to 9x + 6?',
          checkpointOptions: ['Yes', 'No — it gives 9x + 9'],
          checkpointAnswer: 'No — it gives 9x + 9',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students take out a common factor that is not the HCF, leaving an expression that is not fully factorised (e.g. 12x + 8 = 2(6x + 4) instead of 4(3x + 2)).',
      workedExample:
        'Common mistake: 12x + 8 = 2(6x + 4). The student took out 2 instead of 4. 6x + 4 can still be factorised further! Correct: HCF is 4, so 4(3x + 2).',
      guidedPrompt: 'A student factorises 18n + 12 as 2(9n + 6). What is the fully factorised form?',
      guidedAnswer: '6(3n + 2)',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot incomplete factorising',
          explanation:
            'If you can still find a common factor inside the bracket, you have not fully factorised. 2(6x + 4) → 6x and 4 still share a factor of 2. The HCF of 12 and 8 is 4, not 2.',
          checkpointQuestion: 'Is 3(6a + 9) fully factorised?',
          checkpointOptions: ['Yes', 'No — 6a and 9 share a factor of 3'],
          checkpointAnswer: 'No — 6a and 9 share a factor of 3',
        },
        {
          stepOrder: 2,
          title: 'Always use the HCF',
          explanation:
            'To fully factorise, you must use the highest common factor. For 24x + 16: factors of 24 are 1,2,3,4,6,8,12,24. Factors of 16 are 1,2,4,8,16. HCF is 8. Answer: 8(3x + 2).',
          checkpointQuestion: 'What is the HCF of 15 and 20?',
          checkpointOptions: ['3', '5', '10'],
          checkpointAnswer: '5',
        },
        {
          stepOrder: 3,
          title: 'Factorise variables fully too',
          explanation:
            'For 6x² + 4x, take out the HCF of both numbers AND variables. HCF of 6 and 4 is 2; both terms have at least one x. HCF = 2x. Result: 2x(3x + 2).',
          checkpointQuestion: 'Factorise 10y² + 5y fully.',
          checkpointOptions: ['5(2y² + y)', '5y(2y + 1)', 'y(10y + 5)'],
          checkpointAnswer: '5y(2y + 1)',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.7 — Write expressions and formulae from worded descriptions
   *   e.g. "I think of a number, double it and add 3" → 2n + 3
   * ────────────────────────────────────────────────────────────────────── */
  'A1.7': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students struggle to translate everyday language into algebraic expressions — they confuse the order of operations or use the wrong operation for words like "more than", "less than" and "product of".',
      workedExample:
        '"I think of a number n, multiply it by 4 and subtract 7." Multiply first: 4 × n = 4n. Then subtract 7: 4n − 7. So the expression is 4n − 7.',
      guidedPrompt: '"I think of a number n, triple it and add 5." Write an expression.',
      guidedAnswer: '3n + 5',
      steps: [
        {
          stepOrder: 1,
          title: 'Match words to operations',
          explanation:
            '"Add" means +, "subtract" means −, "multiply" or "times" means ×, "divide" or "share" means ÷. "Double" means × 2, "triple" means × 3, "halve" means ÷ 2.',
          checkpointQuestion: 'Which operation does the word "product" indicate?',
          checkpointOptions: ['Addition', 'Subtraction', 'Multiplication'],
          checkpointAnswer: 'Multiplication',
        },
        {
          stepOrder: 2,
          title: 'Build the expression step by step',
          explanation:
            '"Think of a number n, double it and add 6." Step 1: double n → 2n. Step 2: add 6 → 2n + 6. Work through each instruction in order.',
          checkpointQuestion: '"Think of a number n, multiply by 5 and subtract 2." Which expression is correct?',
          checkpointOptions: ['5n − 2', '5 − 2n', '2n − 5'],
          checkpointAnswer: '5n − 2',
        },
        {
          stepOrder: 3,
          title: 'Write a formula from a context',
          explanation:
            'A taxi charges £3 plus £2 per mile. If m = number of miles and C = total cost, the formula is C = 2m + 3. The variable part (2m) comes from the rate and the constant (3) is the fixed charge.',
          checkpointQuestion: 'A gym charges £10 joining fee plus £5 per visit. If v = visits and T = total cost, what is the formula?',
          checkpointOptions: ['T = 5v + 10', 'T = 10v + 5', 'T = 15v'],
          checkpointAnswer: 'T = 5v + 10',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students write the terms in the wrong order (e.g. n5 instead of 5n) or confuse when a situation requires addition versus multiplication, especially with phrases like "5 more than n" vs "5 times n".',
      workedExample:
        '"5 more than a number n" means n + 5 (not 5n). "5 times a number n" means 5n (not n + 5). The phrase "more than" signals addition; "times" signals multiplication.',
      guidedPrompt: 'Write an expression for "8 less than a number n".',
      guidedAnswer: 'n − 8',
      steps: [
        {
          stepOrder: 1,
          title: '"More than" versus "times"',
          explanation:
            '"3 more than n" → n + 3. "3 times n" → 3n. They look similar in English but are completely different operations. Read the key word carefully.',
          checkpointQuestion: 'What does "7 more than y" translate to?',
          checkpointOptions: ['7y', 'y + 7', 'y − 7'],
          checkpointAnswer: 'y + 7',
        },
        {
          stepOrder: 2,
          title: '"Less than" means subtract — but watch the order',
          explanation:
            '"4 less than n" means n − 4 (not 4 − n). The value we subtract FROM (n) comes first, then the amount we subtract (4) comes second. Think of it as: start with n, then take away 4.',
          checkpointQuestion: 'Write "6 less than p" as an expression.',
          checkpointOptions: ['6 − p', 'p − 6', 'p + 6'],
          checkpointAnswer: 'p − 6',
        },
        {
          stepOrder: 3,
          title: 'Combining operations in context',
          explanation:
            '"A number is doubled and then 3 is subtracted." Let the number be x. Doubled: 2x. Subtract 3: 2x − 3. Each instruction becomes one algebraic step.',
          checkpointQuestion: '"A number y is halved and then 4 is added." Write the expression.',
          checkpointOptions: ['y/2 + 4', '4y/2', 'y + 4/2'],
          checkpointAnswer: 'y/2 + 4',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students reverse the subtraction order (writing 5 − n instead of n − 5 for "5 less than n") or drop the constant term entirely, producing incomplete expressions.',
      workedExample:
        'Common mistake: "5 less than n" → 5 − n. This reverses the subtraction. Correct: start with n and subtract 5 → n − 5. Check: if n = 10, "5 less than 10" is 5, and 10 − 5 = 5. ✓',
      guidedPrompt: 'A student writes "3 less than m" as 3 − m. What is the correct expression?',
      guidedAnswer: 'm − 3',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the reversed subtraction',
          explanation:
            '"5 less than n" means start from n and go down by 5 → n − 5. A common error is writing 5 − n. Try n = 10: "5 less than 10" = 5, and 10 − 5 = 5. ✓ But 5 − 10 = −5. ✗',
          checkpointQuestion: 'A student writes "7 less than x" as 7 − x. What should it be?',
          checkpointOptions: ['7 − x', 'x − 7', 'x + 7'],
          checkpointAnswer: 'x − 7',
        },
        {
          stepOrder: 2,
          title: 'Dropping the constant',
          explanation:
            '"Double a number and add 3" → 2n + 3. Some students write just 2n, forgetting the "+ 3". Every part of the sentence must appear in the expression.',
          checkpointQuestion: '"Triple a number and subtract 1." Which expression is complete?',
          checkpointOptions: ['3n', '3n − 1', 'n − 1'],
          checkpointAnswer: '3n − 1',
        },
        {
          stepOrder: 3,
          title: 'Check by substitution',
          explanation:
            'You can always check an expression by substituting a value. "I think of 4, double it and add 3." Working: 2 × 4 + 3 = 11. Does 2n + 3 give 11 when n = 4? 2(4) + 3 = 11. ✓',
          checkpointQuestion: '"Think of a number, multiply by 3, subtract 2." If the number is 5, what should the answer be?',
          checkpointOptions: ['11', '13', '17'],
          checkpointAnswer: '13',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.8 — Solve one-step linear equations
   *   e.g. x + 5 = 12, 3x = 18, x/4 = 3
   * ────────────────────────────────────────────────────────────────────── */
  'A1.8': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students perform the inverse operation incorrectly — for example subtracting when they should divide, or applying the operation to only one side of the equation.',
      workedExample:
        'Solve x + 5 = 12. To isolate x, subtract 5 from both sides: x + 5 − 5 = 12 − 5 → x = 7. Check: 7 + 5 = 12. ✓',
      guidedPrompt: 'Solve x + 9 = 14.',
      guidedAnswer: 'x = 5',
      steps: [
        {
          stepOrder: 1,
          title: 'What does solving an equation mean?',
          explanation:
            'Solving means finding the value of the unknown that makes the equation true. In x + 5 = 12, we need the value of x so that the left side equals the right side.',
          checkpointQuestion: 'What does it mean to "solve" an equation?',
          checkpointOptions: [
            'Simplify the expression',
            'Find the value of the unknown',
            'Expand the brackets',
          ],
          checkpointAnswer: 'Find the value of the unknown',
        },
        {
          stepOrder: 2,
          title: 'Use the inverse operation',
          explanation:
            'Addition and subtraction are inverse operations. Multiplication and division are inverse operations. To undo "+ 5", subtract 5 from both sides. To undo "× 3", divide both sides by 3.',
          checkpointQuestion: 'Solve x − 4 = 10.',
          checkpointOptions: ['x = 6', 'x = 14', 'x = 40'],
          checkpointAnswer: 'x = 14',
        },
        {
          stepOrder: 3,
          title: 'Solve multiplication and division equations',
          explanation:
            'Solve 3x = 18. The inverse of × 3 is ÷ 3. Divide both sides: 3x ÷ 3 = 18 ÷ 3 → x = 6. Solve x/4 = 3. The inverse of ÷ 4 is × 4. Multiply both sides: x = 12.',
          checkpointQuestion: 'Solve 5x = 35.',
          checkpointOptions: ['x = 5', 'x = 7', 'x = 30'],
          checkpointAnswer: 'x = 7',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand the balance model of equations — they change one side without doing the same to the other, or they guess the answer without a systematic method.',
      workedExample:
        'Think of an equation as a balanced scale. x + 3 = 10. If you subtract 3 from the left, you must subtract 3 from the right to keep it balanced: x = 10 − 3 = 7.',
      guidedPrompt: 'Solve x − 6 = 11 using the balance method.',
      guidedAnswer: 'x = 17',
      steps: [
        {
          stepOrder: 1,
          title: 'The balance model',
          explanation:
            'An equation is like a set of scales in balance. Whatever you do to one side, you must do to the other. If you add 5 to the left, add 5 to the right too.',
          checkpointQuestion: 'If you subtract 3 from the left side of an equation, what must you do to the right side?',
          checkpointOptions: ['Add 3', 'Subtract 3', 'Multiply by 3'],
          checkpointAnswer: 'Subtract 3',
        },
        {
          stepOrder: 2,
          title: 'Visualise isolating the unknown',
          explanation:
            'In x + 4 = 9, imagine x and 4 on the left pan, 9 on the right. Remove 4 from both pans: left has x, right has 9 − 4 = 5. So x = 5.',
          checkpointQuestion: 'Solve x + 7 = 20 using the balance model.',
          checkpointOptions: ['x = 13', 'x = 27', 'x = 7'],
          checkpointAnswer: 'x = 13',
        },
        {
          stepOrder: 3,
          title: 'Balance with multiplication and division',
          explanation:
            'For 4x = 24, both sides are divided by 4 to keep the balance: x = 6. For x/5 = 3, multiply both sides by 5: x = 15. Always apply the same operation to both sides.',
          checkpointQuestion: 'Solve x/3 = 8.',
          checkpointOptions: ['x = 5', 'x = 11', 'x = 24'],
          checkpointAnswer: 'x = 24',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students apply the same operation instead of the inverse (e.g. adding 5 to both sides to solve x + 5 = 12 instead of subtracting 5), or only change one side of the equation.',
      workedExample:
        'Common mistake: x + 5 = 12 → add 5 → x + 10 = 17. The student added instead of subtracting. Correct: subtract 5 from both sides → x = 7. Check: 7 + 5 = 12. ✓',
      guidedPrompt: 'A student solves 2x = 10 by subtracting 2 from both sides, getting 2x − 2 = 8. What should they do instead?',
      guidedAnswer: 'Divide both sides by 2 to get x = 5',
      steps: [
        {
          stepOrder: 1,
          title: 'Same operation vs inverse operation',
          explanation:
            'To undo an operation you need its inverse — not the same operation again. The inverse of + is −. The inverse of × is ÷. So to solve x + 3 = 10, subtract 3 (don\'t add 3).',
          checkpointQuestion: 'What is the inverse of multiplication?',
          checkpointOptions: ['Addition', 'Subtraction', 'Division'],
          checkpointAnswer: 'Division',
        },
        {
          stepOrder: 2,
          title: 'Both sides must change',
          explanation:
            'A student writes x + 4 = 9 → x = 9. They subtracted 4 from the left but not the right. Correct: x + 4 − 4 = 9 − 4 → x = 5.',
          checkpointQuestion: 'A student writes x − 3 = 12 → x = 12. What did they forget?',
          checkpointOptions: [
            'To subtract 3 from the right side',
            'To add 3 to the right side',
            'To multiply both sides by 3',
          ],
          checkpointAnswer: 'To add 3 to the right side',
        },
        {
          stepOrder: 3,
          title: 'Always check your answer',
          explanation:
            'Substitute your answer back into the original equation. Solve x + 6 = 15 → x = 9. Check: 9 + 6 = 15. ✓ If it does not match, look for an error in your working.',
          checkpointQuestion: 'A student says x = 4 solves 3x = 15. Check: does 3 × 4 = 15?',
          checkpointOptions: ['Yes', 'No — 3 × 4 = 12'],
          checkpointAnswer: 'No — 3 × 4 = 12',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.9 — Solve two-step linear equations
   *   e.g. 2x + 3 = 11, 5x − 4 = 16, (x + 2)/3 = 5
   * ────────────────────────────────────────────────────────────────────── */
  'A1.9': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students perform the two inverse operations in the wrong order — dividing before subtracting the constant term, leading to incorrect answers.',
      workedExample:
        'Solve 2x + 3 = 11. Step 1: subtract 3 from both sides → 2x = 8. Step 2: divide both sides by 2 → x = 4. Check: 2(4) + 3 = 11. ✓',
      guidedPrompt: 'Solve 3x + 5 = 20.',
      guidedAnswer: 'x = 5',
      steps: [
        {
          stepOrder: 1,
          title: 'Deal with the constant first',
          explanation:
            'In 2x + 3 = 11, the two operations on x are "× 2" then "+ 3". To undo them, reverse the order: first undo the + 3 (subtract 3), then undo the × 2 (divide by 2).',
          checkpointQuestion: 'To solve 4x + 7 = 19, which step comes first?',
          checkpointOptions: ['Divide by 4', 'Subtract 7', 'Add 7'],
          checkpointAnswer: 'Subtract 7',
        },
        {
          stepOrder: 2,
          title: 'Complete both steps',
          explanation:
            'Solve 5x − 2 = 18. Step 1: add 2 to both sides → 5x = 20. Step 2: divide both sides by 5 → x = 4. Always perform two inverse operations in the correct order.',
          checkpointQuestion: 'Solve 3x − 1 = 14.',
          checkpointOptions: ['x = 5', 'x = 4', 'x = 15'],
          checkpointAnswer: 'x = 5',
        },
        {
          stepOrder: 3,
          title: 'Equations with division',
          explanation:
            'Solve (x + 2)/3 = 5. First undo ÷ 3: multiply both sides by 3 → x + 2 = 15. Then undo + 2: subtract 2 → x = 13. Check: (13 + 2)/3 = 15/3 = 5. ✓',
          checkpointQuestion: 'Solve (x − 4)/2 = 6.',
          checkpointOptions: ['x = 16', 'x = 8', 'x = 10'],
          checkpointAnswer: 'x = 16',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see a two-step equation as a "function machine in reverse" — they struggle to visualise which operation was applied first and therefore which to undo last.',
      workedExample:
        'Think of 2x + 3 = 11 as a function machine: input x → × 2 → + 3 → output 11. To reverse: 11 → − 3 = 8 → ÷ 2 = 4. So x = 4.',
      guidedPrompt: 'Use the function-machine method to solve 4x − 1 = 15.',
      guidedAnswer: 'x = 4',
      steps: [
        {
          stepOrder: 1,
          title: 'The function machine forwards',
          explanation:
            'For 3x + 2 = 17, the forwards machine is: x → × 3 → + 2 → 17. Draw the chain of operations applied to x from left to right.',
          checkpointQuestion: 'For 5x − 3 = 22, what is the first operation in the forwards machine?',
          checkpointOptions: ['Subtract 3', 'Multiply by 5', 'Divide by 5'],
          checkpointAnswer: 'Multiply by 5',
        },
        {
          stepOrder: 2,
          title: 'Reverse the machine',
          explanation:
            'To solve, run the machine backwards using inverse operations. For 3x + 2 = 17: start at 17, subtract 2 → 15, divide by 3 → 5. So x = 5.',
          checkpointQuestion: 'Reverse the machine for 2x + 7 = 19. What is x?',
          checkpointOptions: ['x = 6', 'x = 13', 'x = 5'],
          checkpointAnswer: 'x = 6',
        },
        {
          stepOrder: 3,
          title: 'Apply the method to subtraction equations',
          explanation:
            'Solve 4x − 5 = 11. Forwards: x → × 4 → − 5 → 11. Reverse: 11 → + 5 = 16 → ÷ 4 = 4. So x = 4. Check: 4(4) − 5 = 16 − 5 = 11. ✓',
          checkpointQuestion: 'Solve 6x − 3 = 33 using the function-machine method.',
          checkpointOptions: ['x = 5', 'x = 6', 'x = 36'],
          checkpointAnswer: 'x = 6',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students divide before dealing with the constant term (e.g. in 2x + 6 = 14 they divide everything by 2 first and get x + 6 = 7, which gives x = 1 instead of x = 4).',
      workedExample:
        'Common mistake: 2x + 6 = 14 → divide by 2 → x + 6 = 7 → x = 1. The error: they divided 14 by 2 but also needed to divide the 6 (which they forgot). Correct method: subtract 6 first → 2x = 8 → x = 4.',
      guidedPrompt: 'A student solves 3x + 9 = 21 by dividing both sides by 3 first and gets x + 9 = 7. What went wrong and what is the correct answer?',
      guidedAnswer: 'x = 4',
      steps: [
        {
          stepOrder: 1,
          title: 'Why order matters',
          explanation:
            'In 2x + 6 = 14, if you divide by 2 first you must divide every term: (2x + 6)/2 = 14/2 → x + 3 = 7 → x = 4. Many students forget to divide the 6, getting x + 6 = 7. The safer route is to subtract the constant first.',
          checkpointQuestion: 'What is the safest first step to solve 4x + 8 = 20?',
          checkpointOptions: ['Divide both sides by 4', 'Subtract 8 from both sides', 'Subtract 4 from both sides'],
          checkpointAnswer: 'Subtract 8 from both sides',
        },
        {
          stepOrder: 2,
          title: 'Forgetting to apply to both sides',
          explanation:
            'A student writes 5x + 10 = 30 → 5x = 30 − 10 = 20 → x = 4. Correct! But another student writes 5x + 10 = 30 → 5x = 20 → x = 20. They forgot to divide. Always complete both steps.',
          checkpointQuestion: 'Solve 3x + 6 = 18.',
          checkpointOptions: ['x = 4', 'x = 12', 'x = 6'],
          checkpointAnswer: 'x = 4',
        },
        {
          stepOrder: 3,
          title: 'Check by substituting back',
          explanation:
            'After solving, always substitute your answer back in. Solve 2x + 5 = 13 → 2x = 8 → x = 4. Check: 2(4) + 5 = 8 + 5 = 13. ✓ If it doesn\'t match, retrace your steps.',
          checkpointQuestion: 'A student says x = 3 solves 4x + 2 = 18. Check: does 4(3) + 2 = 18?',
          checkpointOptions: ['Yes', 'No — it gives 14'],
          checkpointAnswer: 'No — it gives 14',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.10 — Solve equations with unknowns on both sides
   *   e.g. 5x + 1 = 3x + 9
   * ────────────────────────────────────────────────────────────────────── */
  'A1.10': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students do not collect the variable terms on one side first — they try to solve by treating each side independently, or they subtract the x-terms incorrectly.',
      workedExample:
        'Solve 5x + 1 = 3x + 9. Step 1: subtract 3x from both sides → 2x + 1 = 9. Step 2: subtract 1 from both sides → 2x = 8. Step 3: divide by 2 → x = 4. Check: 5(4) + 1 = 21, 3(4) + 9 = 21. ✓',
      guidedPrompt: 'Solve 7x + 2 = 4x + 14.',
      guidedAnswer: 'x = 4',
      steps: [
        {
          stepOrder: 1,
          title: 'Get the variables on one side',
          explanation:
            'When there are x-terms on both sides, start by moving the smaller x-term to the other side. In 5x + 1 = 3x + 9, subtract 3x from both sides to get 2x + 1 = 9.',
          checkpointQuestion: 'To solve 6x + 3 = 2x + 15, what should you subtract from both sides first?',
          checkpointOptions: ['6x', '2x', '3'],
          checkpointAnswer: '2x',
        },
        {
          stepOrder: 2,
          title: 'Then solve the two-step equation',
          explanation:
            'After collecting x-terms: 4x + 3 = 15. This is now a two-step equation. Subtract 3 → 4x = 12. Divide by 4 → x = 3.',
          checkpointQuestion: 'Solve 8x + 5 = 3x + 25.',
          checkpointOptions: ['x = 4', 'x = 5', 'x = 6'],
          checkpointAnswer: 'x = 4',
        },
        {
          stepOrder: 3,
          title: 'Check both sides',
          explanation:
            'Always substitute back into both sides. If x = 4 and the equation is 5x + 1 = 3x + 9: Left = 5(4) + 1 = 21. Right = 3(4) + 9 = 21. Both equal 21 → correct!',
          checkpointQuestion: 'Does x = 3 solve 4x + 2 = 2x + 8? Check both sides.',
          checkpointOptions: ['Yes — both sides equal 14', 'No — left = 14, right = 12'],
          checkpointAnswer: 'Yes — both sides equal 14',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand why they need to collect terms on one side — they see "5x" and "3x" as unrelated quantities rather than the same unknown that can be combined.',
      workedExample:
        'Imagine a balance scale: 5 bags of x and 1 on the left, 3 bags of x and 9 on the right. Remove 3 bags from each side → 2 bags and 1 on the left, 9 on the right. Remove 1 from each side → 2 bags = 8 → each bag = 4.',
      guidedPrompt: 'Use the balance model to solve 6x + 4 = 2x + 20.',
      guidedAnswer: 'x = 4',
      steps: [
        {
          stepOrder: 1,
          title: 'Why collect variable terms?',
          explanation:
            'In 5x + 1 = 3x + 9, both "5x" and "3x" represent multiples of the same unknown. To find x, we need a simpler equation with x on only one side. Subtracting 3x from both sides achieves this.',
          checkpointQuestion: 'Why do we subtract 3x from both sides of 5x + 1 = 3x + 9?',
          checkpointOptions: [
            'To make the numbers smaller',
            'To get x-terms on one side only',
            'To remove the constant',
          ],
          checkpointAnswer: 'To get x-terms on one side only',
        },
        {
          stepOrder: 2,
          title: 'The balance-scale picture',
          explanation:
            '4x + 5 = x + 14. Picture 4 bags + 5 on the left, 1 bag + 14 on the right. Remove 1 bag from each side → 3 bags + 5 = 14. Remove 5 from each → 3 bags = 9. Each bag = 3.',
          checkpointQuestion: 'Solve 5x + 2 = 2x + 11 using the balance model.',
          checkpointOptions: ['x = 3', 'x = 4', 'x = 9'],
          checkpointAnswer: 'x = 3',
        },
        {
          stepOrder: 3,
          title: 'Choosing which side to collect on',
          explanation:
            'You can collect x-terms on either side — choose whichever keeps the coefficient positive. In 2x + 10 = 5x + 1, subtract 2x from both sides → 10 = 3x + 1 → 9 = 3x → x = 3.',
          checkpointQuestion: 'In 3x + 7 = 8x + 2, subtracting 3x from both sides gives?',
          checkpointOptions: ['7 = 5x + 2', '3x + 5 = 8x', '7 = 11x + 2'],
          checkpointAnswer: '7 = 5x + 2',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students subtract x-terms from one side only, or combine coefficients incorrectly (e.g. 5x − 3x = 15x or 5x − 3x = 2).',
      workedExample:
        'Common mistake: 5x + 1 = 3x + 9 → 5x − 3x = 15x. Wrong! When subtracting like terms, subtract the coefficients: 5x − 3x = (5 − 3)x = 2x. Also, subtract from both sides: 5x − 3x + 1 = 3x − 3x + 9 → 2x + 1 = 9.',
      guidedPrompt: 'A student writes 7x − 2x = 5. What did they do wrong?',
      guidedAnswer: '7x − 2x = 5x, not 5',
      steps: [
        {
          stepOrder: 1,
          title: 'Subtracting like terms correctly',
          explanation:
            '5x − 3x means "5 lots of x minus 3 lots of x" = 2 lots of x = 2x. You subtract the coefficients (5 − 3 = 2), keeping the x. It is NOT 2 (dropping the x) or 15x (multiplying instead of subtracting).',
          checkpointQuestion: 'What is 9x − 4x?',
          checkpointOptions: ['5', '5x', '36x'],
          checkpointAnswer: '5x',
        },
        {
          stepOrder: 2,
          title: 'Apply the subtraction to both sides',
          explanation:
            'In 6x + 3 = 4x + 11, subtract 4x from BOTH sides: 6x − 4x + 3 = 4x − 4x + 11 → 2x + 3 = 11. A common mistake is only removing 4x from the right.',
          checkpointQuestion: 'Subtract 2x from both sides of 5x + 1 = 2x + 7. What do you get?',
          checkpointOptions: ['5x + 1 = 7', '3x + 1 = 7', '3x = 7'],
          checkpointAnswer: '3x + 1 = 7',
        },
        {
          stepOrder: 3,
          title: 'Full worked example with check',
          explanation:
            'Solve 4x + 3 = x + 12. Subtract x: 3x + 3 = 12. Subtract 3: 3x = 9. Divide by 3: x = 3. Check: 4(3) + 3 = 15, 1(3) + 12 = 15. ✓',
          checkpointQuestion: 'Solve 6x + 2 = 3x + 11.',
          checkpointOptions: ['x = 3', 'x = 4', 'x = 9'],
          checkpointAnswer: 'x = 3',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.11 — Solve equations involving brackets
   * ────────────────────────────────────────────────────────────────────── */
  'A1.11': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students skip or incorrectly expand the bracket — for example writing 3(x + 4) = 3x + 4 instead of 3x + 12 — then solve the wrong equation.',
      workedExample:
        'Solve 3(x + 4) = 21. Step 1: expand the bracket → 3x + 12 = 21. Step 2: subtract 12 from both sides → 3x = 9. Step 3: divide by 3 → x = 3. Check: 3(3 + 4) = 3 × 7 = 21. ✓',
      guidedPrompt: 'Solve 4(x + 2) = 28.',
      guidedAnswer: 'x = 5',
      steps: [
        {
          stepOrder: 1,
          title: 'Expand the bracket first',
          explanation:
            'Multiply each term inside the bracket by the number outside. In 3(x + 4): 3 × x = 3x and 3 × 4 = 12, so 3(x + 4) = 3x + 12.',
          checkpointQuestion: 'Expand 5(x + 3).',
          checkpointOptions: ['5x + 3', '5x + 15', '5x + 8'],
          checkpointAnswer: '5x + 15',
        },
        {
          stepOrder: 2,
          title: 'Solve the resulting equation',
          explanation:
            'After expanding 3(x + 4) = 21 you get 3x + 12 = 21. Now solve: subtract 12 from both sides → 3x = 9, then divide by 3 → x = 3.',
          checkpointQuestion: 'Solve 2(x + 5) = 16.',
          checkpointOptions: ['x = 3', 'x = 8', 'x = 6'],
          checkpointAnswer: 'x = 3',
        },
        {
          stepOrder: 3,
          title: 'Check by substituting back',
          explanation:
            'Always substitute your answer back into the original bracket form. If x = 3: 3(3 + 4) = 3 × 7 = 21 ✓. If the sides do not match, recheck your expansion.',
          checkpointQuestion: 'Does x = 4 solve 5(x + 1) = 25?',
          checkpointOptions: ['Yes — 5(4 + 1) = 25', 'No — 5(4 + 1) = 20'],
          checkpointAnswer: 'Yes — 5(4 + 1) = 25',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand what the bracket means — they treat it as grouping decoration rather than a multiplication instruction, and fail to see each term must be multiplied.',
      workedExample:
        'Think of 3(x + 4) as 3 groups of (x + 4). Using an area model: a rectangle with width 3, split into two parts of length x and 4. Areas: 3 × x = 3x and 3 × 4 = 12, total area = 3x + 12.',
      guidedPrompt: 'Draw an area model for 4(x + 5) and write the expansion.',
      guidedAnswer: '4x + 20',
      steps: [
        {
          stepOrder: 1,
          title: 'Brackets mean multiply every term',
          explanation:
            '3(x + 4) means "3 lots of (x + 4)". Picture 3 identical envelopes, each containing x + 4. Altogether you have 3 × x + 3 × 4 = 3x + 12. Every term inside must be multiplied.',
          checkpointQuestion: 'What does 2(x + 7) mean in words?',
          checkpointOptions: [
            '2 lots of x plus 7',
            '2 lots of (x + 7)',
            '2 plus x plus 7',
          ],
          checkpointAnswer: '2 lots of (x + 7)',
        },
        {
          stepOrder: 2,
          title: 'The area-model picture',
          explanation:
            'Draw a rectangle with width 4 and length split into x and 3. Top area = 4x, bottom area = 12. So 4(x + 3) = 4x + 12. This shows why both terms are multiplied.',
          checkpointQuestion: 'Using an area model, expand 6(x + 2).',
          checkpointOptions: ['6x + 2', '6x + 12', 'x + 12'],
          checkpointAnswer: '6x + 12',
        },
        {
          stepOrder: 3,
          title: 'From model to solving',
          explanation:
            'Once you see that 4(x + 3) = 4x + 12, you can solve 4(x + 3) = 32: expand → 4x + 12 = 32, subtract 12 → 4x = 20, divide by 4 → x = 5.',
          checkpointQuestion: 'Solve 3(x + 6) = 27 by first expanding the bracket.',
          checkpointOptions: ['x = 3', 'x = 7', 'x = 9'],
          checkpointAnswer: 'x = 3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students only multiply the first term in the bracket (e.g. 3(x + 4) = 3x + 4) or incorrectly distribute a negative sign (e.g. −2(x − 3) = −2x − 6 instead of −2x + 6).',
      workedExample:
        'Common error: 3(x + 4) = 3x + 4. This is WRONG — you must multiply BOTH terms: 3 × x = 3x AND 3 × 4 = 12. Correct: 3x + 12. With negatives: −2(x − 3) = −2 × x + (−2) × (−3) = −2x + 6, NOT −2x − 6.',
      guidedPrompt: 'A student writes 4(x + 5) = 4x + 5. What is the correct expansion?',
      guidedAnswer: '4x + 20',
      steps: [
        {
          stepOrder: 1,
          title: 'Multiply EVERY term inside',
          explanation:
            'In 3(x + 4), you must multiply both x and 4 by 3. A common mistake is 3(x + 4) = 3x + 4, which only multiplies the first term. Correct: 3x + 12.',
          checkpointQuestion: 'What is 5(x + 2)?',
          checkpointOptions: ['5x + 2', '5x + 10', '5x + 7'],
          checkpointAnswer: '5x + 10',
        },
        {
          stepOrder: 2,
          title: 'Watch the negative sign',
          explanation:
            'In −2(x − 3): multiply both terms by −2. −2 × x = −2x. −2 × (−3) = +6 (negative × negative = positive). Result: −2x + 6, NOT −2x − 6.',
          checkpointQuestion: 'Expand −3(x − 4).',
          checkpointOptions: ['−3x − 12', '−3x + 12', '−3x − 4'],
          checkpointAnswer: '−3x + 12',
        },
        {
          stepOrder: 3,
          title: 'Solve after careful expansion',
          explanation:
            'Solve 2(x − 3) = 10. Expand correctly: 2x − 6 = 10. Add 6: 2x = 16. Divide by 2: x = 8. Check: 2(8 − 3) = 2 × 5 = 10 ✓.',
          checkpointQuestion: 'Solve 3(x − 2) = 15.',
          checkpointOptions: ['x = 5', 'x = 7', 'x = 3'],
          checkpointAnswer: 'x = 7',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * A1.12 — Generate terms of a sequence from a term-to-term rule
   * ────────────────────────────────────────────────────────────────────── */
  'A1.12': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students confuse "term-to-term" with "position-to-term" rules, or make arithmetic errors when applying the rule repeatedly to find successive terms.',
      workedExample:
        'First term = 3, rule: add 5. Term 1 = 3. Term 2 = 3 + 5 = 8. Term 3 = 8 + 5 = 13. Term 4 = 13 + 5 = 18. Each new term is found by adding 5 to the previous term.',
      guidedPrompt: 'First term = 7, rule: add 4. Find the first five terms.',
      guidedAnswer: '7, 11, 15, 19, 23',
      steps: [
        {
          stepOrder: 1,
          title: 'Start from the first term',
          explanation:
            'A term-to-term rule tells you how to get from one term to the next. You always need a starting term. Given first term = 3 and rule "add 5": Term 1 is 3, then add 5 each time.',
          checkpointQuestion: 'First term = 10, rule: add 3. What is the second term?',
          checkpointOptions: ['3', '13', '30'],
          checkpointAnswer: '13',
        },
        {
          stepOrder: 2,
          title: 'Apply the rule repeatedly',
          explanation:
            'To find more terms, keep applying the same rule to the most recent term. First term 4, rule "add 6": 4, 10, 16, 22, 28. Each term comes from adding 6 to the one before it.',
          checkpointQuestion: 'First term = 2, rule: add 7. What is the fourth term?',
          checkpointOptions: ['21', '23', '28'],
          checkpointAnswer: '23',
        },
        {
          stepOrder: 3,
          title: 'Rules that subtract or multiply',
          explanation:
            'Term-to-term rules can use any operation. First term 100, rule "subtract 8": 100, 92, 84, 76. First term 2, rule "multiply by 3": 2, 6, 18, 54.',
          checkpointQuestion: 'First term = 5, rule: multiply by 2. What are the first four terms?',
          checkpointOptions: ['5, 10, 20, 40', '5, 7, 9, 11', '5, 10, 15, 20'],
          checkpointAnswer: '5, 10, 20, 40',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see the connection between consecutive terms — they try to jump to an arbitrary position without building up from the previous term, or confuse the position number with the term value.',
      workedExample:
        'Imagine a chain of arrows: 3 →(+5) 8 →(+5) 13 →(+5) 18. Each arrow represents the same operation. To reach the 4th term you must follow the chain from the start — you cannot skip straight there with a term-to-term rule.',
      guidedPrompt: 'Draw an arrow diagram for first term = 6, rule: add 3, and find the first five terms.',
      guidedAnswer: '6, 9, 12, 15, 18',
      steps: [
        {
          stepOrder: 1,
          title: 'Term-to-term means "from one to the next"',
          explanation:
            'A term-to-term rule connects each term to its neighbour: T1 → T2 → T3. Think of stepping stones — you must step on each stone in order. The rule is the instruction for each step.',
          checkpointQuestion: 'In a term-to-term rule, how do you find the 5th term?',
          checkpointOptions: [
            'Multiply the rule by 5',
            'Apply the rule starting from the 4th term',
            'Add 5 to the first term',
          ],
          checkpointAnswer: 'Apply the rule starting from the 4th term',
        },
        {
          stepOrder: 2,
          title: 'Arrow diagrams',
          explanation:
            'First term 10, rule "subtract 4": draw arrows 10 →(−4) 6 →(−4) 2 →(−4) −2. Each arrow shows the same operation. The pattern is visible: the terms decrease by 4 each time.',
          checkpointQuestion: 'First term = 20, rule: subtract 5. What is the third term?',
          checkpointOptions: ['10', '15', '5'],
          checkpointAnswer: '10',
        },
        {
          stepOrder: 3,
          title: 'Why you cannot skip ahead',
          explanation:
            'With a term-to-term rule, you need every previous term to find the next one. First term 3, rule "multiply by 2": 3, 6, 12, 24. You cannot jump to the 4th term without knowing the 3rd.',
          checkpointQuestion: 'First term = 1, rule: multiply by 3. What is the 5th term?',
          checkpointOptions: ['15', '81', '27'],
          checkpointAnswer: '81',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students apply the rule to the position number instead of the previous term (e.g. for "add 4", they compute position × 4 instead of adding 4 to the last term), or they reverse/swap the operation.',
      workedExample:
        'Common error: first term = 5, rule "add 4". Student writes term 3 = 3 × 4 = 12 (using the position). Correct: term 1 = 5, term 2 = 5 + 4 = 9, term 3 = 9 + 4 = 13. You add 4 to the previous TERM, not to the position.',
      guidedPrompt: 'A student says term 4 of the sequence (first term = 2, add 3) is 12 because 4 × 3 = 12. What is the correct term 4?',
      guidedAnswer: '11',
      steps: [
        {
          stepOrder: 1,
          title: 'Apply the rule to the term, not the position',
          explanation:
            'First term = 5, rule "add 4". Term 2 = 5 + 4 = 9 (NOT 2 × 4 = 8). Term 3 = 9 + 4 = 13 (NOT 3 × 4 = 12). Always add to the previous term, not to the position number.',
          checkpointQuestion: 'First term = 3, rule: add 6. What is term 3?',
          checkpointOptions: ['18', '15', '9'],
          checkpointAnswer: '15',
        },
        {
          stepOrder: 2,
          title: 'Do not reverse the operation',
          explanation:
            'If the rule says "subtract 3", you subtract — not add. First term = 20, rule "subtract 3": 20, 17, 14, 11. A common mistake is writing 20, 23, 26, 29 (adding instead of subtracting).',
          checkpointQuestion: 'First term = 30, rule: subtract 7. What is the third term?',
          checkpointOptions: ['16', '23', '9'],
          checkpointAnswer: '16',
        },
        {
          stepOrder: 3,
          title: 'Check your sequence makes sense',
          explanation:
            'After writing your terms, check the difference (or ratio) between consecutive terms matches the rule. Sequence 2, 6, 18, 54 with rule "multiply by 3": 6 ÷ 2 = 3, 18 ÷ 6 = 3, 54 ÷ 18 = 3. ✓',
          checkpointQuestion: 'A student writes 4, 8, 12, 16 for first term = 4, rule "multiply by 2". Is this correct?',
          checkpointOptions: [
            'Yes — each term doubles',
            'No — the correct sequence is 4, 8, 16, 32',
          ],
          checkpointAnswer: 'No — the correct sequence is 4, 8, 16, 32',
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

  console.log('\n✅ ensured explanation routes for A1.1–A1.12');
}

// Only execute when run directly (not when imported by tests/other modules)
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
