/**
 * ensure-routes-n6.ts
 *
 * Seeds explanation routes (A / B / C) for:
 *   N6.1 — Multiply a fraction by an integer
 *   N6.2 — Multiply a fraction by a fraction
 *   N6.3 — Divide a fraction by an integer
 *   N6.4 — Divide an integer by a fraction
 *   N6.5 — Divide a fraction by a fraction
 *   N6.6 — Multiply and divide with mixed numbers
 *   N6.7 — Order of operations with fractions (all four operations)
 *   N6.8 — Convert a recurring decimal to a fraction
 *   N6.9 — Recognise recurring decimals from fraction division
 *   N6.10 — Find a percentage of an amount (with a calculator)
 *   N6.11 — Express one quantity as a percentage of another
 *   N6.12 — Percentage increase and decrease
 *   N6.13 — Find the original value after a percentage change (reverse percentages)
 *   N6.14 — Repeated percentage change (compound interest, depreciation)
 *   N6.15 — Express one number as a fraction or percentage of another in context
 *   N6.16 — Use ratio notation; simplify ratios
 *   N6.17 — Share a quantity in a given ratio
 *   N6.18 — Use the unitary method for ratio and proportion problems
 *   N6.19 — Convert between fractions, decimals and percentages (including recurring)
 *   N6.20 — Solve problems involving FDP in context (best buy, discounts, profit/loss)
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-n6.ts
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
   * N6.1 — Multiply a fraction by an integer
   * ────────────────────────────────────────────────────────────────────── */
  'N6.1': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students multiply both the numerator and the denominator by the integer instead of multiplying only the numerator.',
      workedExample:
        '2/5 × 3: Multiply the numerator by 3 → 2 × 3 = 6. Keep the denominator → 6/5 = 1 1/5.',
      guidedPrompt: 'Work out 3/7 × 4.',
      guidedAnswer: '3 × 4 = 12, denominator stays 7 → 12/7 = 1 5/7.',
      steps: [
        {
          stepOrder: 1,
          title: 'Multiply the numerator only',
          explanation:
            'When multiplying a fraction by an integer, multiply the numerator by the integer and keep the denominator the same. For example, 2/5 × 3 = (2 × 3)/5 = 6/5. The denominator tells us the size of each part, and the integer tells us how many groups we have.',
          checkpointQuestion: 'What is the numerator of 4/9 × 2?',
          checkpointOptions: ['6', '8', '2', '4'],
          checkpointAnswer: '8',
        },
        {
          stepOrder: 2,
          title: 'Keep the denominator unchanged',
          explanation:
            'The denominator does not change because we are scaling the number of parts, not the size of each part. 3/8 × 5 = 15/8. The eighths stay the same size; we just have more of them.',
          checkpointQuestion: 'What is the denominator of 3/8 × 5?',
          checkpointOptions: ['8', '40', '15', '5'],
          checkpointAnswer: '8',
        },
        {
          stepOrder: 3,
          title: 'Simplify or convert to a mixed number',
          explanation:
            'After multiplying, simplify the fraction if possible or convert an improper fraction to a mixed number. For example, 5/6 × 4 = 20/6 = 10/3 = 3 1/3.',
          checkpointQuestion: 'Simplify the result of 5/6 × 4.',
          checkpointOptions: ['20/6', '10/3', '3 1/3', '3 2/6'],
          checkpointAnswer: '3 1/3',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see that multiplying a fraction by an integer is the same as repeated addition of that fraction.',
      workedExample:
        '2/5 × 3 means 2/5 + 2/5 + 2/5 = 6/5 = 1 1/5. Visualise three groups of 2/5 on a fraction bar.',
      guidedPrompt: 'Draw a bar model to show 3/4 × 2.',
      guidedAnswer: 'Two bars each split into 4 parts, with 3 parts shaded in each → 6/4 = 3/2 = 1 1/2.',
      steps: [
        {
          stepOrder: 1,
          title: 'Fraction × integer as repeated addition',
          explanation:
            'Multiplying a fraction by an integer is the same as adding that fraction repeatedly. For example, 1/3 × 4 = 1/3 + 1/3 + 1/3 + 1/3 = 4/3. This connects multiplication to the concept of "groups of".',
          checkpointQuestion: 'Write 2/7 × 3 as a repeated addition.',
          checkpointOptions: [
            '2/7 + 2/7 + 2/7',
            '2/7 + 3/7',
            '3/7 + 3/7',
          ],
          checkpointAnswer: '2/7 + 2/7 + 2/7',
        },
        {
          stepOrder: 2,
          title: 'Using a bar model',
          explanation:
            'A bar model makes the calculation visual. Draw the integer number of bars, each divided into the denominator number of equal parts, and shade the numerator in each bar. Count total shaded parts over the denominator. For 3/5 × 2: two bars of fifths, shade 3 in each → 6/5.',
          checkpointQuestion: 'Using a bar model for 3/4 × 3, how many quarter-parts are shaded in total?',
          checkpointOptions: ['9', '7', '12', '3'],
          checkpointAnswer: '9',
        },
        {
          stepOrder: 3,
          title: 'Convert and simplify from a bar model',
          explanation:
            'After counting shaded parts, write the improper fraction and convert. If 9 quarter-parts are shaded: 9/4 = 2 1/4. Always check: does the answer make sense? 3/4 × 3 should be a bit more than 2.',
          checkpointQuestion: 'What is 3/4 × 3 as a mixed number?',
          checkpointOptions: ['2 1/4', '2 3/4', '1 3/4', '3 1/4'],
          checkpointAnswer: '2 1/4',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students mistakenly multiply both numerator and denominator by the integer, e.g. 2/5 × 3 = 6/15 instead of 6/5.',
      workedExample:
        'Common error: 2/5 × 3 → student writes 6/15. Correct method: only the numerator is multiplied → 6/5.',
      guidedPrompt: 'A student says 4/9 × 2 = 8/18. What mistake have they made?',
      guidedAnswer: 'They multiplied the denominator as well. The correct answer is 8/9.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the common error',
          explanation:
            'The most common mistake is multiplying both numerator and denominator by the integer. This actually keeps the fraction equivalent (6/15 = 2/5), so the student has not changed the value at all. Only the numerator should be multiplied.',
          checkpointQuestion: 'A student writes 3/7 × 4 = 12/28. Is this correct?',
          checkpointOptions: ['Yes', 'No — the answer is 12/7'],
          checkpointAnswer: 'No — the answer is 12/7',
        },
        {
          stepOrder: 2,
          title: 'Why the denominator stays the same',
          explanation:
            'The denominator represents the size of each equal part. When we multiply by an integer, we are finding multiple groups of that fraction — the part size does not change. Think of 2/5 × 3 as "three lots of two-fifths".',
          checkpointQuestion: 'True or false: when multiplying a fraction by a whole number, the denominator changes.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 3,
          title: 'Correct and verify',
          explanation:
            'After spotting the error, recalculate correctly and verify. For 5/8 × 3: numerator = 5 × 3 = 15, denominator = 8 → 15/8 = 1 7/8. Check: 5/8 is just over half, so three lots should be about 1.9 — correct.',
          checkpointQuestion: 'What is 5/8 × 3?',
          checkpointOptions: ['15/8', '15/24', '5/24', '8/15'],
          checkpointAnswer: '15/8',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.2 — Multiply a fraction by a fraction
   * ────────────────────────────────────────────────────────────────────── */
  'N6.2': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students add numerators and denominators instead of multiplying them (e.g. 2/3 × 4/5 = 6/8 instead of 8/15).',
      workedExample:
        '2/3 × 4/5: Multiply numerators → 2 × 4 = 8. Multiply denominators → 3 × 5 = 15. Answer = 8/15.',
      guidedPrompt: 'Work out 3/4 × 2/7.',
      guidedAnswer: 'Numerators: 3 × 2 = 6. Denominators: 4 × 7 = 28. Answer = 6/28 = 3/14.',
      steps: [
        {
          stepOrder: 1,
          title: 'Multiply numerator by numerator',
          explanation:
            'To multiply two fractions, multiply the numerators together. For 2/3 × 4/5: 2 × 4 = 8. This gives the numerator of the answer.',
          checkpointQuestion: 'What is the numerator of 3/5 × 2/7?',
          checkpointOptions: ['6', '5', '14', '10'],
          checkpointAnswer: '6',
        },
        {
          stepOrder: 2,
          title: 'Multiply denominator by denominator',
          explanation:
            'Next, multiply the denominators together. For 2/3 × 4/5: 3 × 5 = 15. This gives the denominator of the answer. So 2/3 × 4/5 = 8/15.',
          checkpointQuestion: 'What is the denominator of 3/5 × 2/7?',
          checkpointOptions: ['12', '35', '10', '7'],
          checkpointAnswer: '35',
        },
        {
          stepOrder: 3,
          title: 'Simplify the result',
          explanation:
            'After multiplying, check if the answer can be simplified by finding the highest common factor (HCF). For example, 4/6 × 3/8 = 12/48 = 1/4. You can also simplify before multiplying by cross-cancelling common factors.',
          checkpointQuestion: 'Simplify 3/4 × 2/9.',
          checkpointOptions: ['6/36', '1/6', '5/13', '2/12'],
          checkpointAnswer: '1/6',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand that multiplying fractions finds "a fraction of a fraction" and expect the answer to be larger.',
      workedExample:
        '1/2 × 1/3 means "half of a third". Shade 1/3 of a bar, then take half of that → 1/6 of the whole bar.',
      guidedPrompt: 'Use an area model to show 2/3 × 3/4.',
      guidedAnswer: 'Draw a rectangle, divide into 3 columns (shade 2) and 4 rows (shade 3). Overlap = 6 out of 12 = 1/2.',
      steps: [
        {
          stepOrder: 1,
          title: 'Fraction of a fraction',
          explanation:
            '2/3 × 3/4 means "two-thirds of three-quarters". When you take a fraction of a fraction, the result is smaller than either starting fraction. This is different from multiplying whole numbers where the answer gets bigger.',
          checkpointQuestion: 'What does 1/2 × 1/4 mean in words?',
          checkpointOptions: [
            'Half of a quarter',
            'Half plus a quarter',
            'Half divided by a quarter',
          ],
          checkpointAnswer: 'Half of a quarter',
        },
        {
          stepOrder: 2,
          title: 'Area model for fraction multiplication',
          explanation:
            'Draw a rectangle. Divide it into columns for one denominator and rows for the other. Shade the relevant columns and rows. The overlap region gives the answer. For 2/3 × 1/2: 3 columns (shade 2), 2 rows (shade 1) → overlap = 2 squares out of 6 = 2/6 = 1/3.',
          checkpointQuestion: 'In an area model for 3/4 × 2/5, how many total small rectangles are there?',
          checkpointOptions: ['20', '9', '12', '15'],
          checkpointAnswer: '20',
        },
        {
          stepOrder: 3,
          title: 'Connect the area model to the algorithm',
          explanation:
            'The area model shows why we multiply numerators and denominators: total squares = product of denominators (4 × 5 = 20), shaded overlap = product of numerators (3 × 2 = 6). So 3/4 × 2/5 = 6/20 = 3/10.',
          checkpointQuestion: 'What is 3/4 × 2/5?',
          checkpointOptions: ['6/20', '3/10', '5/9', '6/9'],
          checkpointAnswer: '3/10',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students add the numerators and denominators instead of multiplying them, e.g. 2/3 × 4/5 = 6/8.',
      workedExample:
        'Error: 2/3 × 4/5 → student writes (2+4)/(3+5) = 6/8. Correct: (2×4)/(3×5) = 8/15.',
      guidedPrompt: 'A student says 1/4 × 2/3 = 3/7. What did they do wrong?',
      guidedAnswer: 'They added numerators (1+2=3) and denominators (4+3=7). Correct: (1×2)/(4×3) = 2/12 = 1/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Identify the addition error',
          explanation:
            'The most common mistake is adding numerators and denominators when the operation is multiplication. For fractions, × means "multiply across": numerator × numerator and denominator × denominator. Addition rules do not apply here.',
          checkpointQuestion: 'A student writes 3/5 × 1/4 = 4/9. What error did they make?',
          checkpointOptions: [
            'They added instead of multiplying',
            'They subtracted the fractions',
            'They inverted the second fraction',
          ],
          checkpointAnswer: 'They added instead of multiplying',
        },
        {
          stepOrder: 2,
          title: 'Apply the correct rule',
          explanation:
            'Multiply numerators together and denominators together. 3/5 × 1/4 = (3 × 1)/(5 × 4) = 3/20. A quick sense-check: 3/5 is less than 1, and 1/4 is less than 1, so the product must be less than both — 3/20 makes sense.',
          checkpointQuestion: 'What is 3/5 × 1/4?',
          checkpointOptions: ['3/20', '4/9', '3/9', '4/20'],
          checkpointAnswer: '3/20',
        },
        {
          stepOrder: 3,
          title: 'Verify with a sense-check',
          explanation:
            'After calculating, check the answer is reasonable. When both fractions are less than 1, the product must be smaller than either fraction. 2/3 × 4/5 = 8/15 ≈ 0.53, which is less than 4/5 = 0.8 and less than 2/3 ≈ 0.67. ✓',
          checkpointQuestion: 'Is 1/2 × 1/3 = 1/6 reasonable?',
          checkpointOptions: [
            'Yes — 1/6 is less than both 1/2 and 1/3',
            'No — it should be larger than 1/3',
          ],
          checkpointAnswer: 'Yes — 1/6 is less than both 1/2 and 1/3',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.3 — Divide a fraction by an integer
   * ────────────────────────────────────────────────────────────────────── */
  'N6.3': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students divide the numerator by the integer and also divide (or change) the denominator, instead of multiplying the denominator only.',
      workedExample:
        '4/5 ÷ 2: Keep the numerator → 4. Multiply the denominator by 2 → 5 × 2 = 10. Answer = 4/10 = 2/5.',
      guidedPrompt: 'Work out 6/7 ÷ 3.',
      guidedAnswer: 'Keep numerator 6, multiply denominator: 7 × 3 = 21 → 6/21 = 2/7.',
      steps: [
        {
          stepOrder: 1,
          title: 'Multiply the denominator by the integer',
          explanation:
            'Dividing a fraction by an integer means making each piece smaller. We multiply the denominator by the integer. For 3/4 ÷ 2: denominator becomes 4 × 2 = 8. Answer = 3/8. Alternatively, think of it as multiplying by the reciprocal: 3/4 × 1/2 = 3/8.',
          checkpointQuestion: 'What is the denominator of 5/6 ÷ 3?',
          checkpointOptions: ['18', '2', '9', '6'],
          checkpointAnswer: '18',
        },
        {
          stepOrder: 2,
          title: 'Keep the numerator the same',
          explanation:
            'The numerator stays unchanged because we are splitting the same number of parts into more groups. 5/6 ÷ 3 = 5/18. We still have 5 parts, but each part is now an eighteenth rather than a sixth.',
          checkpointQuestion: 'What is 5/6 ÷ 3?',
          checkpointOptions: ['5/18', '5/2', '15/6', '5/9'],
          checkpointAnswer: '5/18',
        },
        {
          stepOrder: 3,
          title: 'Simplify when possible',
          explanation:
            'Sometimes the numerator is divisible by the integer, giving a quicker route. For 6/7 ÷ 3: you can divide the numerator directly → 6 ÷ 3 = 2, so 6/7 ÷ 3 = 2/7. Both methods give the same answer.',
          checkpointQuestion: 'Work out 8/9 ÷ 4.',
          checkpointOptions: ['2/9', '8/36', '4/9', '8/13'],
          checkpointAnswer: '2/9',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see that dividing a fraction by an integer is the same as finding a unit fraction of that fraction.',
      workedExample:
        '3/4 ÷ 2 means "half of 3/4". On a fraction bar, shade 3/4 then split that region in half → 3/8.',
      guidedPrompt: 'Use a bar model to show 2/3 ÷ 4.',
      guidedAnswer: 'Shade 2/3 of a bar, split the shaded region into 4 equal pieces → each piece is 2/12 = 1/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Division as sharing equally',
          explanation:
            'Dividing a fraction by an integer means sharing it into equal groups. 3/5 ÷ 2 asks: "if I split three-fifths into 2 equal parts, how big is each part?" Each part = 3/10.',
          checkpointQuestion: 'What does 4/7 ÷ 2 mean in words?',
          checkpointOptions: [
            'Splitting four-sevenths into 2 equal parts',
            'Adding 2 to four-sevenths',
            'Multiplying four-sevenths by 2',
          ],
          checkpointAnswer: 'Splitting four-sevenths into 2 equal parts',
        },
        {
          stepOrder: 2,
          title: 'Bar model visualisation',
          explanation:
            'Draw a bar and shade the fraction. Then divide the shaded region into the required number of equal parts. For 2/5 ÷ 3: shade 2 fifths, split that shaded area into 3 equal pieces. Each piece is 2/15 of the whole bar.',
          checkpointQuestion: 'On a bar model for 6/8 ÷ 2, what fraction of the whole bar is one share?',
          checkpointOptions: ['6/16', '3/8', '3/4', '6/10'],
          checkpointAnswer: '3/8',
        },
        {
          stepOrder: 3,
          title: 'Connect the visual to the method',
          explanation:
            'The bar model shows that dividing by n multiplies the denominator by n (the bar is subdivided further). 6/8 ÷ 2 = 6/16 = 3/8. The visual and the algorithm agree.',
          checkpointQuestion: 'What is 4/5 ÷ 2?',
          checkpointOptions: ['4/10', '2/5', '4/7', '2/10'],
          checkpointAnswer: '2/5',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students incorrectly divide the denominator by the integer instead of multiplying it, e.g. 6/8 ÷ 2 = 6/4 instead of 6/16 = 3/8.',
      workedExample:
        'Error: 6/8 ÷ 2 → student writes 6/4. Correct: multiply denominator → 6/(8×2) = 6/16 = 3/8. Or divide numerator: 6 ÷ 2 = 3 → 3/8.',
      guidedPrompt: 'A student says 4/10 ÷ 2 = 4/5. What went wrong?',
      guidedAnswer: 'They divided the denominator by 2 (10÷2=5). Correct: 4/10 ÷ 2 = 4/20 = 1/5, or 4÷2 = 2 → 2/10 = 1/5.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the divide-the-denominator error',
          explanation:
            'Dividing the denominator makes the fraction larger, which is the opposite of what division should do. 6/8 ÷ 2 should give something smaller than 6/8, not larger. If a student gets 6/4, that is bigger than 6/8 — a clear sign of error.',
          checkpointQuestion: 'A student writes 3/6 ÷ 3 = 3/2. Is this correct?',
          checkpointOptions: ['Yes', 'No — the answer is 1/6'],
          checkpointAnswer: 'No — the answer is 1/6',
        },
        {
          stepOrder: 2,
          title: 'Apply the correct method',
          explanation:
            'To divide a fraction by an integer, multiply the denominator (or divide the numerator if it is divisible). 3/6 ÷ 3: numerator 3 ÷ 3 = 1, denominator stays 6 → 1/6. Check: 1/6 < 3/6, so division has made the fraction smaller. ✓',
          checkpointQuestion: 'What is 9/10 ÷ 3?',
          checkpointOptions: ['3/10', '9/30', '9/3', '3/30'],
          checkpointAnswer: '3/10',
        },
        {
          stepOrder: 3,
          title: 'Verify the answer is smaller',
          explanation:
            'After computing, always check that your answer is smaller than the original fraction (when dividing by a positive integer greater than 1). If it is larger, you likely made the divide-the-denominator error.',
          checkpointQuestion: 'Is the result of 2/3 ÷ 5 larger or smaller than 2/3?',
          checkpointOptions: ['Larger', 'Smaller'],
          checkpointAnswer: 'Smaller',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.4 — Divide an integer by a fraction
   * ────────────────────────────────────────────────────────────────────── */
  'N6.4': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students divide the integer by the numerator and ignore the denominator, instead of using the "keep, change, flip" method.',
      workedExample:
        '3 ÷ 1/4: Keep 3, change ÷ to ×, flip 1/4 to 4/1 → 3 × 4 = 12. There are 12 quarters in 3 wholes.',
      guidedPrompt: 'Work out 5 ÷ 1/3.',
      guidedAnswer: 'Keep 5, change ÷ to ×, flip 1/3 to 3/1 → 5 × 3 = 15.',
      steps: [
        {
          stepOrder: 1,
          title: 'Keep, change, flip',
          explanation:
            'To divide by a fraction, keep the first number, change ÷ to ×, and flip (take the reciprocal of) the fraction. 6 ÷ 2/3 becomes 6 × 3/2 = 18/2 = 9. This works because dividing by a fraction is the same as multiplying by its reciprocal.',
          checkpointQuestion: 'Rewrite 4 ÷ 1/5 as a multiplication.',
          checkpointOptions: ['4 × 5', '4 × 1/5', '1/5 × 4', '5 ÷ 4'],
          checkpointAnswer: '4 × 5',
        },
        {
          stepOrder: 2,
          title: 'Multiply by the reciprocal',
          explanation:
            'After flipping, carry out the multiplication. 4 ÷ 2/3 = 4 × 3/2 = 12/2 = 6. Always simplify at the end.',
          checkpointQuestion: 'What is 6 ÷ 3/4?',
          checkpointOptions: ['8', '6', '4', '2'],
          checkpointAnswer: '8',
        },
        {
          stepOrder: 3,
          title: 'Interpret the answer',
          explanation:
            'The answer tells you how many of the fraction fit into the integer. 3 ÷ 1/4 = 12 means there are 12 quarters in 3 whole items. This makes sense: each whole has 4 quarters, so 3 wholes have 12.',
          checkpointQuestion: 'How many thirds are there in 5?',
          checkpointOptions: ['15', '5', '3', '8'],
          checkpointAnswer: '15',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand why dividing by a fraction gives a larger answer and struggle with the concept of "how many fit inside".',
      workedExample:
        '2 ÷ 1/3: How many one-thirds fit into 2 wholes? Each whole has 3 thirds → 2 × 3 = 6 thirds.',
      guidedPrompt: 'Use a bar model to show 4 ÷ 1/2.',
      guidedAnswer: 'Four whole bars, each split in half → 8 half-pieces total. So 4 ÷ 1/2 = 8.',
      steps: [
        {
          stepOrder: 1,
          title: 'Division as "how many fit inside"',
          explanation:
            'Dividing an integer by a fraction asks: "how many of these fractional pieces fit into the whole?" 3 ÷ 1/5 means "how many fifths are in 3?" Since each whole has 5 fifths, 3 wholes have 15 fifths.',
          checkpointQuestion: 'What does 2 ÷ 1/4 ask?',
          checkpointOptions: [
            'How many quarters fit into 2',
            'What is 2 multiplied by 4',
            'What is a quarter of 2',
          ],
          checkpointAnswer: 'How many quarters fit into 2',
        },
        {
          stepOrder: 2,
          title: 'Bar model for integer ÷ unit fraction',
          explanation:
            'Draw the whole-number bars and split each into parts matching the denominator. Count total parts. For 3 ÷ 1/6: three bars, each split into 6 → 18 pieces. So 3 ÷ 1/6 = 18.',
          checkpointQuestion: 'Using a bar model, how many sixths are in 2?',
          checkpointOptions: ['12', '8', '6', '3'],
          checkpointAnswer: '12',
        },
        {
          stepOrder: 3,
          title: 'Extend to non-unit fractions',
          explanation:
            'For non-unit fractions, first find how many unit fractions fit, then group. 2 ÷ 2/5: there are 10 fifths in 2, and each group needs 2 fifths → 10 ÷ 2 = 5 groups. So 2 ÷ 2/5 = 5.',
          checkpointQuestion: 'What is 3 ÷ 3/4?',
          checkpointOptions: ['4', '9', '1', '12'],
          checkpointAnswer: '4',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students mistakenly multiply the integer by the fraction instead of by the reciprocal, e.g. 6 ÷ 2/3 = 6 × 2/3 = 4 instead of 9.',
      workedExample:
        'Error: 6 ÷ 2/3 → student computes 6 × 2/3 = 4. Correct: flip the fraction → 6 × 3/2 = 9.',
      guidedPrompt: 'A student says 4 ÷ 2/5 = 8/5. What mistake did they make?',
      guidedAnswer: 'They multiplied by 2/5 instead of flipping. Correct: 4 × 5/2 = 20/2 = 10.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the "forgot to flip" error',
          explanation:
            'If a student gets a smaller answer when dividing an integer by a proper fraction, they probably forgot to flip. Dividing by a fraction less than 1 always gives a result bigger than the starting integer.',
          checkpointQuestion: 'A student says 8 ÷ 1/2 = 4. Is this correct?',
          checkpointOptions: ['Yes', 'No — the answer is 16'],
          checkpointAnswer: 'No — the answer is 16',
        },
        {
          stepOrder: 2,
          title: 'Remember: flip the divisor',
          explanation:
            'The key step students forget is flipping the second fraction before multiplying. 8 ÷ 1/2 = 8 × 2/1 = 16. Without the flip, you get 8 × 1/2 = 4, which is "half of 8" — a completely different question.',
          checkpointQuestion: 'What is the reciprocal of 3/7?',
          checkpointOptions: ['7/3', '3/7', '1/3', '7/1'],
          checkpointAnswer: '7/3',
        },
        {
          stepOrder: 3,
          title: 'Check: answer should be bigger',
          explanation:
            'When you divide by a proper fraction (less than 1), the answer is always bigger than the starting number. Use this as a quick check: 5 ÷ 2/3 should give something bigger than 5. 5 × 3/2 = 15/2 = 7.5 ✓.',
          checkpointQuestion: 'What is 5 ÷ 2/3?',
          checkpointOptions: ['15/2', '10/3', '5/6', '2/15'],
          checkpointAnswer: '15/2',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.5 — Divide a fraction by a fraction
   * ────────────────────────────────────────────────────────────────────── */
  'N6.5': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students try to divide numerators and denominators separately (e.g. 4/5 ÷ 2/3 = 2/ (5/3)) instead of multiplying by the reciprocal.',
      workedExample:
        '3/4 ÷ 1/2: Keep 3/4, change ÷ to ×, flip 1/2 to 2/1 → 3/4 × 2/1 = 6/4 = 3/2 = 1 1/2.',
      guidedPrompt: 'Work out 2/3 ÷ 4/5.',
      guidedAnswer: 'Keep 2/3, flip 4/5 → 2/3 × 5/4 = 10/12 = 5/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Keep, change, flip',
          explanation:
            'To divide a fraction by a fraction: keep the first fraction, change ÷ to ×, and flip the second fraction (take its reciprocal). 3/4 ÷ 1/2 becomes 3/4 × 2/1.',
          checkpointQuestion: 'Rewrite 5/6 ÷ 2/3 as a multiplication.',
          checkpointOptions: ['5/6 × 3/2', '5/6 × 2/3', '6/5 × 2/3', '2/3 × 5/6'],
          checkpointAnswer: '5/6 × 3/2',
        },
        {
          stepOrder: 2,
          title: 'Multiply and simplify',
          explanation:
            'After rewriting as multiplication, multiply across: numerator × numerator, denominator × denominator, then simplify. 5/6 × 3/2 = 15/12 = 5/4 = 1 1/4.',
          checkpointQuestion: 'What is 5/6 ÷ 2/3?',
          checkpointOptions: ['5/4', '15/12', '10/18', '1 1/4'],
          checkpointAnswer: '1 1/4',
        },
        {
          stepOrder: 3,
          title: 'Sense-check the result',
          explanation:
            'If the divisor is less than 1, the answer is larger than the dividend. If the divisor is greater than the dividend, the answer is less than 1. 2/3 ÷ 4/5: since 4/5 > 2/3 the answer should be less than 1. 2/3 × 5/4 = 10/12 = 5/6 < 1 ✓.',
          checkpointQuestion: 'Is 2/3 ÷ 4/5 more or less than 1?',
          checkpointOptions: ['More than 1', 'Less than 1', 'Exactly 1'],
          checkpointAnswer: 'Less than 1',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand what it means to divide a fraction by a fraction and cannot connect the algorithm to a visual model.',
      workedExample:
        '1/2 ÷ 1/4 asks "how many quarters fit into a half?" Since 1/2 = 2/4, two quarters fit → answer is 2.',
      guidedPrompt: 'Use a bar model to show 3/4 ÷ 1/8.',
      guidedAnswer: '3/4 = 6/8 on the bar. Each piece is 1/8, so 6 pieces fit → 3/4 ÷ 1/8 = 6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Fraction ÷ fraction as "how many fit"',
          explanation:
            'Dividing a fraction by a fraction asks: "how many of the divisor fit into the dividend?" 1/2 ÷ 1/6 means "how many sixths fit into one-half?" Since 1/2 = 3/6, the answer is 3.',
          checkpointQuestion: 'What does 3/4 ÷ 1/4 ask?',
          checkpointOptions: [
            'How many quarters fit into three-quarters',
            'What is three-quarters minus one-quarter',
            'What is three-quarters multiplied by one-quarter',
          ],
          checkpointAnswer: 'How many quarters fit into three-quarters',
        },
        {
          stepOrder: 2,
          title: 'Common-denominator approach',
          explanation:
            'Convert both fractions to the same denominator, then divide the numerators. 2/3 ÷ 1/6: convert to sixths → 4/6 ÷ 1/6. Now ask: how many 1s fit into 4? Answer = 4. So 2/3 ÷ 1/6 = 4.',
          checkpointQuestion: 'Work out 3/4 ÷ 1/8 using common denominators.',
          checkpointOptions: ['6', '3', '24', '8'],
          checkpointAnswer: '6',
        },
        {
          stepOrder: 3,
          title: 'Connect to the keep-change-flip rule',
          explanation:
            'The common-denominator method shows why "keep, change, flip" works. 2/3 ÷ 1/6 = 2/3 × 6/1 = 12/3 = 4. Both approaches give the same answer; the algorithm is a shortcut for the reasoning.',
          checkpointQuestion: 'What is 1/2 ÷ 1/6?',
          checkpointOptions: ['3', '1/12', '6', '1/3'],
          checkpointAnswer: '3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students flip the wrong fraction (the dividend instead of the divisor), e.g. 2/3 ÷ 4/5 → 3/2 × 4/5 instead of 2/3 × 5/4.',
      workedExample:
        'Error: 2/3 ÷ 4/5 → student flips 2/3 to get 3/2 × 4/5 = 12/10 = 6/5. Correct: flip 4/5 → 2/3 × 5/4 = 10/12 = 5/6.',
      guidedPrompt: 'A student says 3/5 ÷ 1/2 = 5/3 × 1/2 = 5/6. What went wrong?',
      guidedAnswer: 'They flipped the first fraction instead of the second. Correct: 3/5 × 2/1 = 6/5 = 1 1/5.',
      steps: [
        {
          stepOrder: 1,
          title: 'Which fraction gets flipped?',
          explanation:
            'Only the divisor (the fraction after the ÷ sign) gets flipped. The dividend (first fraction) stays exactly the same. In A ÷ B, we flip B to get A × (1/B).',
          checkpointQuestion: 'In 7/8 ÷ 3/4, which fraction is flipped?',
          checkpointOptions: ['3/4', '7/8', 'Both', 'Neither'],
          checkpointAnswer: '3/4',
        },
        {
          stepOrder: 2,
          title: 'Correct the flipped-wrong-fraction error',
          explanation:
            'If a student flips the dividend: 2/3 ÷ 4/5 → 3/2 × 4/5 = 12/10 = 6/5. The correct working: 2/3 × 5/4 = 10/12 = 5/6. The wrong answer (6/5 > 1) is too large because 2/3 < 4/5 so the answer should be less than 1.',
          checkpointQuestion: 'What is 2/3 ÷ 4/5?',
          checkpointOptions: ['5/6', '6/5', '8/15', '10/12'],
          checkpointAnswer: '5/6',
        },
        {
          stepOrder: 3,
          title: 'Use a sense-check to catch the error',
          explanation:
            'After computing, ask: "does the answer make sense?" If the divisor is bigger than the dividend, the answer should be less than 1. If it is smaller, the answer should be greater than 1. This quickly catches flipped-fraction errors.',
          checkpointQuestion: 'A student computes 1/3 ÷ 2/3 = 2. Is this reasonable?',
          checkpointOptions: [
            'No — 1/3 is smaller than 2/3, so the answer should be less than 1',
            'Yes — dividing always gives a bigger answer',
          ],
          checkpointAnswer: 'No — 1/3 is smaller than 2/3, so the answer should be less than 1',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.6 — Multiply and divide with mixed numbers
   * ────────────────────────────────────────────────────────────────────── */
  'N6.6': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students try to multiply or divide mixed numbers without converting to improper fractions first.',
      workedExample:
        '1 1/2 × 2/3: Convert 1 1/2 = 3/2. Then 3/2 × 2/3 = 6/6 = 1.',
      guidedPrompt: 'Work out 2 1/4 ÷ 3/4.',
      guidedAnswer: 'Convert 2 1/4 = 9/4. Then 9/4 ÷ 3/4 = 9/4 × 4/3 = 36/12 = 3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Convert a mixed number to an improper fraction',
          explanation:
            'Multiply the whole number by the denominator, then add the numerator. For example, 2 1/3: whole × denominator = 2 × 3 = 6, then add the numerator: 6 + 1 = 7. So 2 1/3 = 7/3. This lets us use normal fraction multiplication and division rules.',
          checkpointQuestion: 'Convert 3 2/5 to an improper fraction.',
          checkpointOptions: ['17/5', '15/5', '6/5', '11/5'],
          checkpointAnswer: '17/5',
        },
        {
          stepOrder: 2,
          title: 'Multiply with mixed numbers',
          explanation:
            'Convert every mixed number to an improper fraction first, then multiply numerators and denominators as normal. For example, 1 1/2 × 2/3: convert to 3/2 × 2/3 = 6/6 = 1. Always simplify the result or convert back to a mixed number.',
          checkpointQuestion: 'What is 1 1/3 × 3/4?',
          checkpointOptions: ['1', '4/3', '3/4', '1 1/12'],
          checkpointAnswer: '1',
        },
        {
          stepOrder: 3,
          title: 'Divide with mixed numbers',
          explanation:
            'Convert to improper fractions, then flip the divisor and multiply. For example, 2 1/4 ÷ 3/4: convert to 9/4 ÷ 3/4, flip to get 9/4 × 4/3 = 36/12 = 3.',
          checkpointQuestion: 'What is 1 1/2 ÷ 1/4?',
          checkpointOptions: ['6', '3/8', '3/4', '2'],
          checkpointAnswer: '6',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand that a mixed number represents a whole-number part plus a fractional part.',
      workedExample:
        '2 1/3 means 2 whole ones plus 1/3. On a number line it sits between 2 and 3, closer to 2.',
      guidedPrompt: 'Place 1 3/4 on a number line and estimate 1 3/4 × 2.',
      guidedAnswer: '1 3/4 is between 1 and 2. Doubling gives about 3.5. Exact: 7/4 × 2 = 14/4 = 3 1/2.',
      steps: [
        {
          stepOrder: 1,
          title: 'What a mixed number means on a number line',
          explanation:
            'A mixed number like 1 3/4 sits 3/4 of the way from 1 to 2 on the number line. It tells us "1 whole and 3 out of 4 equal parts more". This helps us estimate answers before calculating.',
          checkpointQuestion: 'Between which two whole numbers does 2 3/5 sit on a number line?',
          checkpointOptions: ['2 and 3', '1 and 2', '3 and 4', '0 and 1'],
          checkpointAnswer: '2 and 3',
        },
        {
          stepOrder: 2,
          title: 'Area model for mixed-number multiplication',
          explanation:
            'To visualise 1 1/2 × 1 1/3, draw a rectangle with sides 1 1/2 and 1 1/3. Split into four regions: 1 × 1 = 1, 1 × 1/3 = 1/3, 1/2 × 1 = 1/2, 1/2 × 1/3 = 1/6. Total = 1 + 1/3 + 1/2 + 1/6 = 2. This shows why we need all four parts.',
          checkpointQuestion: 'In the area model of 1 1/2 × 1 1/3, what is the area of the small corner rectangle (1/2 × 1/3)?',
          checkpointOptions: ['1/6', '1/5', '1/3', '1/2'],
          checkpointAnswer: '1/6',
        },
        {
          stepOrder: 3,
          title: 'Estimate to check your answer',
          explanation:
            'Before or after calculating, estimate to catch errors. For 2 1/4 × 1 1/3: roughly 2 × 1 = 2, so the answer should be around 2–3. The exact answer is 9/4 × 4/3 = 36/12 = 3. Since 2 1/4 > 2 and 1 1/3 > 1, getting 3 makes sense.',
          checkpointQuestion: 'Which is the best estimate for 3 1/2 × 1 1/5?',
          checkpointOptions: ['About 4', 'About 1', 'About 7', 'About 10'],
          checkpointAnswer: 'About 4',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students mistakenly multiply or divide the whole-number part and the fraction part separately instead of converting to an improper fraction first.',
      workedExample:
        'Common error: 1 1/2 × 2 1/3 → student writes 1 × 2 = 2 and 1/2 × 1/3 = 1/6 → 2 1/6. Correct: 3/2 × 7/3 = 21/6 = 3 1/2.',
      guidedPrompt: 'A student says 2 1/3 × 1 1/2 = 2 1/6. What mistake have they made?',
      guidedAnswer: 'They multiplied whole parts (2 × 1 = 2) and fractions (1/3 × 1/2 = 1/6) separately. Correct: 7/3 × 3/2 = 21/6 = 3 1/2.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the separate-multiplication error',
          explanation:
            'Some students split the mixed number and handle the whole number and fraction independently. For example, 1 1/2 × 2 1/3: they write 1 × 2 = 2 and 1/2 × 1/3 = 1/6, getting 2 1/6. This is wrong because it ignores the cross-products (1 × 1/3 and 1/2 × 2).',
          checkpointQuestion: 'A student says 1 1/4 × 2 1/3 = 2 1/12. Is this correct?',
          checkpointOptions: ['No — they multiplied whole and fraction parts separately', 'Yes — that is correct'],
          checkpointAnswer: 'No — they multiplied whole and fraction parts separately',
        },
        {
          stepOrder: 2,
          title: 'Why separate multiplication gives the wrong answer',
          explanation:
            'When you expand (1 + 1/2)(2 + 1/3) you get 1 × 2 + 1 × 1/3 + 1/2 × 2 + 1/2 × 1/3 = 2 + 1/3 + 1 + 1/6 = 3 1/2. The separate method misses two of the four terms. Converting to improper fractions avoids this mistake entirely.',
          checkpointQuestion: 'What is 1 1/2 × 2 1/3 calculated correctly?',
          checkpointOptions: ['3 1/2', '2 1/6', '2 5/6', '4'],
          checkpointAnswer: '3 1/2',
        },
        {
          stepOrder: 3,
          title: 'Practice the correct conversion method',
          explanation:
            'Always convert mixed numbers to improper fractions before multiplying or dividing. For 2 1/4 × 1 1/3: convert to 9/4 × 4/3 = 36/12 = 3. Then check: 2 1/4 is a bit more than 2 and 1 1/3 is a bit more than 1, so an answer of 3 is reasonable.',
          checkpointQuestion: 'What is 2 1/4 × 1 1/3?',
          checkpointOptions: ['3', '2 1/12', '2 7/12', '3 1/4'],
          checkpointAnswer: '3',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.7 — Order of operations with fractions (all four operations)
   * ────────────────────────────────────────────────────────────────────── */
  'N6.7': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students work left to right and do not apply BIDMAS/BODMAS when fractions are involved.',
      workedExample:
        '1/2 + 1/3 × 3/4: Do multiplication first → 1/3 × 3/4 = 3/12 = 1/4. Then add → 1/2 + 1/4 = 3/4.',
      guidedPrompt: 'Work out 2/3 + 1/4 × 2/5.',
      guidedAnswer: 'Multiplication first: 1/4 × 2/5 = 2/20 = 1/10. Then 2/3 + 1/10 = 20/30 + 3/30 = 23/30.',
      steps: [
        {
          stepOrder: 1,
          title: 'Brackets first with fractions',
          explanation:
            'When a fraction expression has brackets, always work out the bracket first. For example, (1/2 + 1/3) × 3/5: first 1/2 + 1/3 = 3/6 + 2/6 = 5/6, then 5/6 × 3/5 = 15/30 = 1/2.',
          checkpointQuestion: 'What is (1/4 + 1/2) × 2/3?',
          checkpointOptions: ['1/2', '7/12', '5/12', '3/4'],
          checkpointAnswer: '1/2',
        },
        {
          stepOrder: 2,
          title: 'Multiplication and division before addition and subtraction',
          explanation:
            'Without brackets, do multiplication and division before addition and subtraction. In 1/2 + 1/3 × 3/4: multiply first → 1/3 × 3/4 = 1/4. Then add → 1/2 + 1/4 = 3/4. Do not add 1/2 + 1/3 first.',
          checkpointQuestion: 'What is 3/4 − 1/2 × 1/3?',
          checkpointOptions: ['7/12', '1/12', '1/4', '5/12'],
          checkpointAnswer: '7/12',
        },
        {
          stepOrder: 3,
          title: 'Multi-step fraction problems',
          explanation:
            'For expressions with multiple operations, apply BIDMAS step by step. For (1/2 + 1/6) × 3 − 1/4: brackets first → 1/2 + 1/6 = 3/6 + 1/6 = 4/6 = 2/3. Multiply → 2/3 × 3 = 2. Subtract → 2 − 1/4 = 1 3/4.',
          checkpointQuestion: 'What is (1/3 + 1/6) × 2?',
          checkpointOptions: ['1', '2/3', '1/2', '5/6'],
          checkpointAnswer: '1',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand why the order of operations matters when fractions are involved.',
      workedExample:
        'Compare: 1/2 + 1/3 × 3/4 done correctly = 3/4 vs done left-to-right = 5/8. Different orders give different results.',
      guidedPrompt: 'Show that 1/2 + 1/4 × 2 gives a different result if you add first vs multiply first.',
      guidedAnswer: 'Correct (multiply first): 1/2 + 1/2 = 1. Wrong (add first): 3/4 × 2 = 3/2. Different answers.',
      steps: [
        {
          stepOrder: 1,
          title: 'Different orders give different results',
          explanation:
            'Consider 1/2 + 1/3 × 6. If we multiply first: 1/3 × 6 = 2, then 1/2 + 2 = 2 1/2. If we add first: 1/2 + 1/3 = 5/6, then 5/6 × 6 = 5. Two different answers — that is why we need agreed rules.',
          checkpointQuestion: 'If we incorrectly add first in 1/4 + 1/2 × 2, we get 3/2. What is the correct answer (multiplying first)?',
          checkpointOptions: ['1 1/4', '3/2', '3/4', '1/2'],
          checkpointAnswer: '1 1/4',
        },
        {
          stepOrder: 2,
          title: 'Build expressions step by step',
          explanation:
            'Think of 1/3 × 3/4 as one "chunk". In the expression 1/2 + 1/3 × 3/4, the multiplication 1/3 × 3/4 = 1/4 is a single value. Then 1/2 + 1/4 = 3/4. Grouping multiplications mentally helps follow BIDMAS.',
          checkpointQuestion: 'In 3/5 + 1/2 × 2/5, what is the value of the multiplication "chunk"?',
          checkpointOptions: ['1/5', '2/10', '11/10', '2/5'],
          checkpointAnswer: '1/5',
        },
        {
          stepOrder: 3,
          title: 'Combining operations correctly',
          explanation:
            'After evaluating multiplication/division chunks, combine with addition/subtraction. For 1/2 × 2/3 + 1/4 × 2: chunk 1 = 1/3, chunk 2 = 1/2. Then 1/3 + 1/2 = 2/6 + 3/6 = 5/6.',
          checkpointQuestion: 'What is 1/2 × 2/3 + 1/4 × 2?',
          checkpointOptions: ['5/6', '1/3', '2/3', '1'],
          checkpointAnswer: '5/6',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students forget to apply BIDMAS and instead add or subtract fractions before multiplying when there are no brackets.',
      workedExample:
        'Error: 1/2 + 1/3 × 3/4 → student adds first: 5/6 × 3/4 = 15/24 = 5/8. Correct: multiply first → 1/4, then 1/2 + 1/4 = 3/4.',
      guidedPrompt: 'A student says 1/4 + 1/2 × 2/3 = 1/2. What went wrong?',
      guidedAnswer: 'They added 1/4 + 1/2 = 3/4 first, then multiplied 3/4 × 2/3 = 1/2. Correct: 1/2 × 2/3 = 1/3, then 1/4 + 1/3 = 7/12.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the BIDMAS error',
          explanation:
            'A common mistake is working left to right without respecting BIDMAS. In 1/2 + 1/3 × 3/4, a student may first compute 1/2 + 1/3 = 5/6, then 5/6 × 3/4 = 5/8. The correct approach is to multiply first: 1/3 × 3/4 = 1/4, then 1/2 + 1/4 = 3/4.',
          checkpointQuestion: 'A student works out 1/4 + 1/2 × 2/3 = 1/2. What should the answer be?',
          checkpointOptions: ['7/12', '1/2', '5/12', '2/3'],
          checkpointAnswer: '7/12',
        },
        {
          stepOrder: 2,
          title: 'Correct the working',
          explanation:
            'To fix the error, underline or circle the multiplication/division first. In 3/4 − 1/2 × 1/4: circle 1/2 × 1/4 = 1/8. Then compute 3/4 − 1/8 = 6/8 − 1/8 = 5/8. Training yourself to scan for × and ÷ first prevents this mistake.',
          checkpointQuestion: 'What is 3/4 − 1/2 × 1/4?',
          checkpointOptions: ['5/8', '1/16', '1/4', '1/8'],
          checkpointAnswer: '5/8',
        },
        {
          stepOrder: 3,
          title: 'Practice correct order with fractions',
          explanation:
            'Work through: 1/3 + 2/3 × 1/2. Multiplication first: 2/3 × 1/2 = 2/6 = 1/3. Then 1/3 + 1/3 = 2/3. Check: if we had wrongly added first, we would get 1 × 1/2 = 1/2 — a different answer.',
          checkpointQuestion: 'What is 1/3 + 2/3 × 1/2?',
          checkpointOptions: ['2/3', '1/2', '1/3', '5/6'],
          checkpointAnswer: '2/3',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.8 — Convert a recurring decimal to a fraction
   * ────────────────────────────────────────────────────────────────────── */
  'N6.8': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students do not know the algebraic method for converting a recurring decimal to a fraction.',
      workedExample:
        'Let x = 0.333... → 10x = 3.333... → 10x − x = 3 → 9x = 3 → x = 3/9 = 1/3.',
      guidedPrompt: 'Convert 0.666... to a fraction.',
      guidedAnswer: 'Let x = 0.666... → 10x = 6.666... → 9x = 6 → x = 6/9 = 2/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Set up the equation',
          explanation:
            'Let x equal the recurring decimal. For example, let x = 0.333... This gives us a starting equation to work with. The key idea is that multiplying by a power of 10 will shift the decimal point so the recurring part lines up.',
          checkpointQuestion: 'To convert 0.444... to a fraction, what is the first step?',
          checkpointOptions: ['Let x = 0.444...', 'Divide 0.444 by 9', 'Round to 0.4', 'Write 4/10'],
          checkpointAnswer: 'Let x = 0.444...',
        },
        {
          stepOrder: 2,
          title: 'Multiply and subtract to remove the recurring part',
          explanation:
            'Multiply both sides by 10 (for one recurring digit). If x = 0.333..., then 10x = 3.333... Now subtract: 10x − x = 3.333... − 0.333... → 9x = 3. The recurring part cancels out.',
          checkpointQuestion: 'If x = 0.777..., what is 10x − x?',
          checkpointOptions: ['7', '0.7', '70', '77'],
          checkpointAnswer: '7',
        },
        {
          stepOrder: 3,
          title: 'Solve and simplify',
          explanation:
            'After subtracting, solve for x. From 9x = 3, we get x = 3/9 = 1/3. Always simplify the fraction by dividing numerator and denominator by their highest common factor.',
          checkpointQuestion: 'Convert 0.222... to a fraction in its simplest form.',
          checkpointOptions: ['2/9', '1/5', '2/10', '22/100'],
          checkpointAnswer: '2/9',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not recognise common recurring-decimal-to-fraction equivalences.',
      workedExample:
        '1/3 = 0.333..., 1/9 = 0.111..., 2/9 = 0.222... — noticing the pattern helps convert quickly.',
      guidedPrompt: 'Using the pattern that 1/9 = 0.111..., write 0.555... as a fraction.',
      guidedAnswer: '0.555... = 5 × 0.111... = 5 × 1/9 = 5/9.',
      steps: [
        {
          stepOrder: 1,
          title: 'Recognise key fraction–decimal pairs',
          explanation:
            'Some recurring decimals are easy to spot: 1/3 = 0.333..., 2/3 = 0.666..., 1/9 = 0.111..., 1/11 = 0.090909... Learning these helps you recognise recurring decimals quickly and convert them to fractions.',
          checkpointQuestion: 'What fraction is equivalent to 0.111...?',
          checkpointOptions: ['1/9', '1/10', '1/11', '1/8'],
          checkpointAnswer: '1/9',
        },
        {
          stepOrder: 2,
          title: 'Build fractions from known patterns',
          explanation:
            'Since 1/9 = 0.111..., you can multiply to get other ninths: 4/9 = 0.444..., 7/9 = 0.777..., 8/9 = 0.888... This pattern works because 9 × 0.111... = 1.',
          checkpointQuestion: 'What is 0.777... as a fraction?',
          checkpointOptions: ['7/9', '7/10', '77/100', '7/11'],
          checkpointAnswer: '7/9',
        },
        {
          stepOrder: 3,
          title: 'Verify by dividing',
          explanation:
            'Always check your answer by dividing. If 0.555... = 5/9, then 5 ÷ 9 should give 0.555... Using short division: 5.000 ÷ 9 = 0.555... ✓ This confirms the conversion is correct.',
          checkpointQuestion: 'How can you verify that 0.444... = 4/9?',
          checkpointOptions: ['Divide 4 by 9 and check you get 0.444...', 'Multiply 4 by 9', 'Add 4 and 9', 'Subtract 4 from 9'],
          checkpointAnswer: 'Divide 4 by 9 and check you get 0.444...',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students do not multiply by the correct power of 10 and incorrectly use × 10 for all recurring decimals regardless of the number of recurring digits.',
      workedExample:
        'Error: For 0.121212..., student uses × 10 → 1.21212... − 0.12121... = 1.09... (messy). Correct: use × 100 → 12.1212... − 0.1212... = 12, so 99x = 12 → x = 12/99 = 4/33.',
      guidedPrompt: 'A student tries to convert 0.363636... by multiplying by 10. Why is this wrong?',
      guidedAnswer: 'Two digits recur (36), so multiply by 100: 100x − x = 36, giving 99x = 36, x = 36/99 = 4/11.',
      steps: [
        {
          stepOrder: 1,
          title: 'The number of recurring digits determines the multiplier',
          explanation:
            'If one digit recurs (e.g. 0.333...), multiply by 10. If two digits recur (e.g. 0.121212...), multiply by 100. If three recur, multiply by 1000. The multiplier must shift the decimal so the recurring blocks line up perfectly.',
          checkpointQuestion: 'What should you multiply by if the recurring block is 0.454545...?',
          checkpointOptions: ['100', '10', '1000', '45'],
          checkpointAnswer: '100',
        },
        {
          stepOrder: 2,
          title: 'Common error with two-digit recurrence',
          explanation:
            'For 0.121212..., using × 10 gives 1.21212... Subtracting: 1.21212... − 0.12121... does not cancel cleanly. Using × 100: 12.1212... − 0.1212... = 12 exactly. So 99x = 12 and x = 12/99 = 4/33.',
          checkpointQuestion: 'Convert 0.272727... to a fraction.',
          checkpointOptions: ['3/11', '27/100', '27/99', '27/10'],
          checkpointAnswer: '3/11',
        },
        {
          stepOrder: 3,
          title: 'Practice choosing the right multiplier',
          explanation:
            'Count the digits in the recurring block to pick the multiplier: 0.888... → 1 digit → × 10. 0.363636... → 2 digits → × 100. 0.142857142857... → 6 digits → × 1 000 000. Getting this right makes the subtraction step work cleanly.',
          checkpointQuestion: 'For 0.153153153..., what power of 10 do you multiply by?',
          checkpointOptions: ['1000', '100', '10', '153'],
          checkpointAnswer: '1000',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.9 — Recognise recurring decimals from fraction division
   * ────────────────────────────────────────────────────────────────────── */
  'N6.9': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students stop the division too early and do not recognise when remainders start to repeat.',
      workedExample:
        '1 ÷ 7 = 0.142857142857... — the remainder cycle (1, 3, 2, 6, 4, 5) repeats, giving a recurring block of 6 digits.',
      guidedPrompt: 'Use short division to write 2/11 as a decimal.',
      guidedAnswer: '2 ÷ 11 = 0.181818... The remainders 2, 9, 2, 9 repeat, giving 0.18 recurring.',
      steps: [
        {
          stepOrder: 1,
          title: 'Perform short division and watch the remainders',
          explanation:
            'Divide the numerator by the denominator using short division. Track each remainder. For 1 ÷ 3: 1.000 ÷ 3 gives 0.333... The remainder is always 1, so the digit 3 keeps repeating. When a remainder appears that you have seen before, the digits will repeat from that point.',
          checkpointQuestion: 'When dividing 1 by 6, the first two decimal digits are 0.16. What is the repeating digit?',
          checkpointOptions: ['6', '1', '16', '0'],
          checkpointAnswer: '6',
        },
        {
          stepOrder: 2,
          title: 'Write recurring decimal notation using dots',
          explanation:
            'Place a dot over the first and last digits of the repeating block. For 1/3 = 0.333... write a dot over the 3. For 1/7 = 0.142857142857... place a dot over the 1 and the 7 to show the whole block 142857 repeats.',
          checkpointQuestion: 'How do you write 0.363636... in recurring decimal notation?',
          checkpointOptions: [
            'Dot over the 3 and dot over the 6',
            'Dot over the 3 only',
            'Dot over the 6 only',
            'Write 0.36 and stop',
          ],
          checkpointAnswer: 'Dot over the 3 and dot over the 6',
        },
        {
          stepOrder: 3,
          title: 'Predict whether a fraction terminates or recurs',
          explanation:
            'A fraction in simplest form terminates if the denominator has only 2 and 5 as prime factors. Otherwise it recurs. For example, 3/8 terminates (8 = 2³) but 1/7 recurs (7 is not 2 or 5). This saves you doing the full division.',
          checkpointQuestion: 'Will 7/20 terminate or recur?',
          checkpointOptions: ['Terminate', 'Recur'],
          checkpointAnswer: 'Terminate',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand why certain denominators produce terminating decimals and others produce recurring decimals.',
      workedExample:
        '1/4 = 0.25 (terminates, because 4 = 2²). 1/3 = 0.333... (recurs, because 3 has no factors of 2 or 5).',
      guidedPrompt: 'Explain why 1/8 terminates but 1/9 does not.',
      guidedAnswer: '8 = 2³ → only factor 2 → terminates as 0.125. 9 = 3² → factor other than 2 or 5 → recurs as 0.111...',
      steps: [
        {
          stepOrder: 1,
          title: 'Denominators with only factors of 2 and 5 terminate',
          explanation:
            'Our number system is base-10, and 10 = 2 × 5. A fraction terminates when the denominator (in simplest form) can be written using only 2s and 5s. For example, 1/8 = 1/2³ = 0.125 and 3/20 = 3/(2² × 5) = 0.15.',
          checkpointQuestion: 'Which fraction terminates: 1/6 or 3/25?',
          checkpointOptions: ['3/25', '1/6', 'Both', 'Neither'],
          checkpointAnswer: '3/25',
        },
        {
          stepOrder: 2,
          title: 'Other denominators produce recurring decimals',
          explanation:
            'If the denominator has a prime factor other than 2 or 5, the decimal will recur. For 1/3: 3 is prime and not 2 or 5, so 1/3 = 0.333... For 1/7: 7 is prime and not 2 or 5, so 1/7 = 0.142857...',
          checkpointQuestion: 'Does 5/12 terminate or recur? (12 = 2² × 3)',
          checkpointOptions: ['Recur', 'Terminate'],
          checkpointAnswer: 'Recur',
        },
        {
          stepOrder: 3,
          title: 'Connect to place value',
          explanation:
            'Decimal places represent tenths, hundredths, thousandths — all powers of 10. Since 10 = 2 × 5, a fraction whose denominator divides a power of 10 can be written exactly. 1/4 = 25/100 = 0.25. But 1/3 cannot be written as a whole number over a power of 10.',
          checkpointQuestion: 'Why does 1/5 terminate as 0.2?',
          checkpointOptions: [
            'Because 5 is a factor of 10, so 1/5 = 2/10 = 0.2',
            'Because 5 is an odd number',
            'Because 1 divided by 5 has no remainder',
          ],
          checkpointAnswer: 'Because 5 is a factor of 10, so 1/5 = 2/10 = 0.2',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students confuse terminating and recurring decimals or write the recurring notation incorrectly, placing the dot over the wrong digits.',
      workedExample:
        'Error: student writes 1/6 = 0.16 (terminating). Correct: 1/6 = 0.1666... = 0.16̇ — only the 6 recurs, not the 1.',
      guidedPrompt: 'A student writes 1/6 = 0.16. What mistake have they made?',
      guidedAnswer: 'They stopped too early. 1/6 = 0.1666... The 6 recurs, so the dot goes over the 6 only.',
      steps: [
        {
          stepOrder: 1,
          title: 'Dot notation errors',
          explanation:
            'The dot must go over the first and last digit of the repeating block only. For 1/6 = 0.1666..., only the 6 repeats, so the dot goes over the 6. For 1/11 = 0.090909..., the block 09 repeats, so dots go over the 0 and 9.',
          checkpointQuestion: 'In 0.1666..., which digit gets a dot above it?',
          checkpointOptions: ['Only the 6', 'The 1 and the 6', 'Only the 1', 'No dots needed'],
          checkpointAnswer: 'Only the 6',
        },
        {
          stepOrder: 2,
          title: 'Confusing terminating and recurring decimals',
          explanation:
            'A terminating decimal stops (e.g. 0.25). A recurring decimal goes on forever in a repeating pattern. Students sometimes mistake a long terminating decimal (0.125) for recurring, or stop a recurring decimal too early (writing 0.33 instead of 0.333...).',
          checkpointQuestion: 'Is 3/8 = 0.375 terminating or recurring?',
          checkpointOptions: ['Terminating', 'Recurring'],
          checkpointAnswer: 'Terminating',
        },
        {
          stepOrder: 3,
          title: 'Practice correct recurring notation',
          explanation:
            'Write the following in dot notation: 2/3 = 0.666... → dot over the 6. 5/11 = 0.454545... → dot over 4 and 5. 1/7 = 0.142857142857... → dot over 1 and 7. Always do enough division to be sure which digits repeat.',
          checkpointQuestion: 'How many digits are in the recurring block of 1/7 = 0.142857142857...?',
          checkpointOptions: ['6', '3', '1', '7'],
          checkpointAnswer: '6',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.10 — Find a percentage of an amount (with a calculator)
   * ────────────────────────────────────────────────────────────────────── */
  'N6.10': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students struggle with the order of operations: they divide by the percentage instead of dividing by 100 first.',
      workedExample:
        'Find 35% of 240: divide by 100 → 240 ÷ 100 = 2.4. Multiply by 35 → 2.4 × 35 = 84.',
      guidedPrompt: 'Find 17% of 350.',
      guidedAnswer: '350 ÷ 100 = 3.5. Then 3.5 × 17 = 59.5.',
      steps: [
        {
          stepOrder: 1,
          title: 'Find 1% by dividing by 100',
          explanation:
            '1% means "one hundredth". To find 1% of any amount, divide it by 100. For example, 1% of 450 = 450 ÷ 100 = 4.5. This gives us a building block to find any percentage.',
          checkpointQuestion: 'What is 1% of 320?',
          checkpointOptions: ['3.2', '32', '0.32', '320'],
          checkpointAnswer: '3.2',
        },
        {
          stepOrder: 2,
          title: 'Scale up to find the required percentage',
          explanation:
            'Once you have 1%, multiply by the percentage you need. To find 23% of 600: 1% = 6, so 23% = 6 × 23 = 138. You can also split: 20% = 120 and 3% = 18, total 138.',
          checkpointQuestion: 'Find 15% of 200.',
          checkpointOptions: ['30', '15', '300', '13.33'],
          checkpointAnswer: '30',
        },
        {
          stepOrder: 3,
          title: 'Multi-step percentage problems',
          explanation:
            'Sometimes you need to find a percentage and then use the result. For example, a £450 TV is reduced by 20%. Reduction = 450 × 20 ÷ 100 = 90. New price = 450 − 90 = 360. Always check: 20% off means you pay 80%, and 80% of 450 = 360. ✓',
          checkpointQuestion: 'A jacket costs £80 and is reduced by 15%. What is the sale price?',
          checkpointOptions: ['£68', '£65', '£12', '£92'],
          checkpointAnswer: '£68',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see the connection between percentages, fractions and proportions.',
      workedExample:
        '25% of 60: 25% = 25/100 = 1/4. So 1/4 of 60 = 15. A bar split into 4 parts, each 15.',
      guidedPrompt: 'Use a bar model to find 30% of 150.',
      guidedAnswer: 'Split bar into 10 equal parts, each 15 (10% each). 30% = 3 parts = 45.',
      steps: [
        {
          stepOrder: 1,
          title: 'A percentage is a fraction out of 100',
          explanation:
            'Percent means "per hundred". 40% = 40/100 = 2/5. This fraction form helps you understand what part of the whole you are finding. Seeing percentages as fractions connects them to work you already know.',
          checkpointQuestion: 'Write 35% as a fraction in simplest form.',
          checkpointOptions: ['7/20', '35/10', '7/10', '1/35'],
          checkpointAnswer: '7/20',
        },
        {
          stepOrder: 2,
          title: 'Partition a bar to find percentages',
          explanation:
            'Draw a bar representing the whole amount. Split it into 10 equal sections (each = 10%). To find 30%, shade 3 sections. If the total is 200, each section = 20, so 30% = 60.',
          checkpointQuestion: 'Using a bar model with 10 equal parts, what is 40% of 350?',
          checkpointOptions: ['140', '35', '175', '40'],
          checkpointAnswer: '140',
        },
        {
          stepOrder: 3,
          title: 'Build up from known percentages',
          explanation:
            'Find easy percentages first, then combine. For 35% of 240: 10% = 24, 5% = 12, 30% = 72, 35% = 72 + 12 = 84. Breaking it into 10%, 5% and 1% blocks works for any percentage.',
          checkpointQuestion: 'Using build-up: what is 45% of 600?',
          checkpointOptions: ['270', '275', '245', '300'],
          checkpointAnswer: '270',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students incorrectly divide the amount by the percentage instead of dividing by 100 and multiplying by the percentage.',
      workedExample:
        'Error: "Find 20% of 150" → student computes 150 ÷ 20 = 7.5. Correct: 150 ÷ 100 × 20 = 30.',
      guidedPrompt: 'A student says 25% of 80 is 3.2. What mistake have they made?',
      guidedAnswer: 'They divided 80 by 25 instead of finding 1/4 of 80 = 20. The correct answer is 20.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the division error',
          explanation:
            'A common mistake is dividing the amount by the percentage: e.g. "25% of 80" → 80 ÷ 25 = 3.2. The student divides by the percentage number instead of dividing by 100 first. The correct method: 80 ÷ 100 × 25 = 20.',
          checkpointQuestion: 'A student says 10% of 90 = 9. Is this correct?',
          checkpointOptions: ['Yes — 90 ÷ 10 = 9 and 90 ÷ 100 × 10 = 9 both give 9', 'No — the answer should be 0.9'],
          checkpointAnswer: 'Yes — 90 ÷ 10 = 9 and 90 ÷ 100 × 10 = 9 both give 9',
        },
        {
          stepOrder: 2,
          title: 'Understand the correct direction',
          explanation:
            '"Find 20% of 150" means multiply 150 by 20/100. That gives 150 × 0.2 = 30. Dividing 150 ÷ 20 = 7.5 answers a different question ("how many 20s fit in 150?"). Always think: percentage ÷ 100 × amount.',
          checkpointQuestion: 'What is 40% of 250?',
          checkpointOptions: ['100', '6.25', '62.5', '40'],
          checkpointAnswer: '100',
        },
        {
          stepOrder: 3,
          title: 'Practice finding percentages correctly',
          explanation:
            'Step 1: Divide amount by 100 to find 1%. Step 2: Multiply by the required percentage. For 12% of 350: 1% = 3.5, so 12% = 3.5 × 12 = 42. Check: 10% = 35, 2% = 7, total = 42. ✓',
          checkpointQuestion: 'What is 18% of 500?',
          checkpointOptions: ['90', '27.78', '9', '180'],
          checkpointAnswer: '90',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.11 — Express one quantity as a percentage of another
   * ────────────────────────────────────────────────────────────────────── */
  'N6.11': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students divide the wrong way round (whole ÷ part instead of part ÷ whole) when converting to a percentage.',
      workedExample:
        'Express 18 out of 45 as a percentage: 18 ÷ 45 = 0.4, then 0.4 × 100 = 40%.',
      guidedPrompt: 'Express 12 out of 30 as a percentage.',
      guidedAnswer: '12 ÷ 30 = 0.4, then × 100 = 40%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Identify the part and the whole',
          explanation:
            'The "part" is the quantity you are expressing as a percentage. The "whole" is the total or the amount it is compared to. For "15 out of 60 students passed", 15 is the part and 60 is the whole. Getting these the right way round is essential.',
          checkpointQuestion: 'In "scored 32 out of 80", which number is the whole?',
          checkpointOptions: ['80', '32', '112', '48'],
          checkpointAnswer: '80',
        },
        {
          stepOrder: 2,
          title: 'Form the fraction and convert to a percentage',
          explanation:
            'Write the part over the whole as a fraction: 15/60. Divide: 15 ÷ 60 = 0.25. Multiply by 100: 0.25 × 100 = 25%. So 15 is 25% of 60.',
          checkpointQuestion: 'Express 9 out of 36 as a percentage.',
          checkpointOptions: ['25%', '36%', '9%', '4%'],
          checkpointAnswer: '25%',
        },
        {
          stepOrder: 3,
          title: 'Apply to different contexts',
          explanation:
            'The same method works in many situations. If a shirt costs £24 and is reduced by £6, the discount as a percentage: 6 ÷ 24 = 0.25 = 25%. If you score 42 out of 60 on a test: 42 ÷ 60 = 0.7 = 70%.',
          checkpointQuestion: 'A team wins 21 out of 28 games. What percentage did they win?',
          checkpointOptions: ['75%', '70%', '21%', '133%'],
          checkpointAnswer: '75%',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not connect "out of" language to fractions and proportional reasoning.',
      workedExample:
        '"24 out of 60" = 24/60 = 2/5. Since 1/5 = 20%, then 2/5 = 40%.',
      guidedPrompt: 'Using equivalent fractions, express 15 out of 25 as a percentage.',
      guidedAnswer: '15/25 = 3/5 = 60/100 = 60%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Understand "out of" as a fraction',
          explanation:
            '"12 out of 50" means 12/50. This fraction tells you the proportion. To express as a percentage, you need to write this fraction with a denominator of 100 or convert using division.',
          checkpointQuestion: 'Write "18 out of 30" as a fraction.',
          checkpointOptions: ['18/30', '30/18', '18/100', '30/100'],
          checkpointAnswer: '18/30',
        },
        {
          stepOrder: 2,
          title: 'Scale the fraction to "out of 100"',
          explanation:
            'If the denominator divides neatly into 100, you can scale up. 15/25: multiply top and bottom by 4 to get 60/100 = 60%. For 3/20: multiply both by 5 to get 15/100 = 15%.',
          checkpointQuestion: 'Express 7/20 as a percentage.',
          checkpointOptions: ['35%', '7%', '20%', '70%'],
          checkpointAnswer: '35%',
        },
        {
          stepOrder: 3,
          title: 'Use equivalence for tricky denominators',
          explanation:
            'When the denominator does not divide neatly into 100, simplify first or use division. For 12/32: simplify to 3/8. Then 3 ÷ 8 = 0.375. Multiply by 100: 37.5%. Simplifying first makes the numbers easier.',
          checkpointQuestion: 'Express 5 out of 8 as a percentage.',
          checkpointOptions: ['62.5%', '58%', '50%', '80%'],
          checkpointAnswer: '62.5%',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students swap the part and the whole, dividing the wrong way round — e.g. dividing the whole by the part instead of part by whole.',
      workedExample:
        'Error: "Express 12 out of 48 as a %" → student writes 48 ÷ 12 = 4 → "400%". Correct: 12 ÷ 48 = 0.25 = 25%.',
      guidedPrompt: 'A student says "15 out of 60 is 400%". What error have they made?',
      guidedAnswer: 'They computed 60 ÷ 15 = 4 = 400%. They should compute 15 ÷ 60 = 0.25 = 25%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot which is the part and which is the whole',
          explanation:
            'The part is the smaller quantity being compared (usually after "express" or before "out of"). The whole is the total. In "express 8 out of 40", 8 is the part and 40 is the whole. Mixing these up gives an answer greater than 100%, which is usually a clue.',
          checkpointQuestion: 'A student says "20 out of 50 is 250%". What did they do wrong?',
          checkpointOptions: [
            'They divided 50 by 20 instead of 20 by 50',
            'They forgot to multiply by 100',
            'They added 20 and 50',
          ],
          checkpointAnswer: 'They divided 50 by 20 instead of 20 by 50',
        },
        {
          stepOrder: 2,
          title: 'Show how swapping gives the wrong answer',
          explanation:
            'If part = 12 and whole = 48, the correct calculation is 12 ÷ 48 = 0.25 = 25%. Swapping gives 48 ÷ 12 = 4 = 400%. If the part is smaller than the whole, the answer must be under 100%. Use this as a quick check.',
          checkpointQuestion: 'Express 8 out of 32 as a percentage.',
          checkpointOptions: ['25%', '400%', '32%', '8%'],
          checkpointAnswer: '25%',
        },
        {
          stepOrder: 3,
          title: 'Practice identifying part and whole correctly',
          explanation:
            'Read the question carefully. "What percentage of 80 is 20?" → part = 20, whole = 80, answer = 25%. "Express 6 as a percentage of 24" → part = 6, whole = 24, answer = 25%. The word "of" usually comes before the whole.',
          checkpointQuestion: 'What percentage of 200 is 50?',
          checkpointOptions: ['25%', '400%', '50%', '150%'],
          checkpointAnswer: '25%',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.12 — Percentage increase and decrease
   * ────────────────────────────────────────────────────────────────────── */
  'N6.12': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students find the percentage amount but forget to add or subtract it from the original value.',
      workedExample:
        'Increase 240 by 15%: 15% of 240 = 36. New amount = 240 + 36 = 276.',
      guidedPrompt: 'Decrease 180 by 20%.',
      guidedAnswer: '20% of 180 = 36. New amount = 180 − 36 = 144.',
      steps: [
        {
          stepOrder: 1,
          title: 'Calculate the percentage amount',
          explanation:
            'First, find the percentage of the original amount. For example, to increase 240 by 15%: 240 ÷ 100 × 15 = 36. This gives you the amount of the change, not the final answer yet.',
          checkpointQuestion: 'What is 25% of 360?',
          checkpointOptions: ['90', '36', '9', '250'],
          checkpointAnswer: '90',
        },
        {
          stepOrder: 2,
          title: 'Add for increase, subtract for decrease',
          explanation:
            'For a percentage increase, add the amount to the original: 240 + 36 = 276. For a percentage decrease, subtract: 240 − 36 = 204. The word "increase" or "decrease" in the question tells you which operation to use.',
          checkpointQuestion: 'Decrease 500 by 12%. What is the new amount?',
          checkpointOptions: ['440', '560', '60', '488'],
          checkpointAnswer: '440',
        },
        {
          stepOrder: 3,
          title: 'Multi-step percentage problems',
          explanation:
            'Sometimes you need multiple steps. For example, a £600 computer has 20% off, then 5% sales tax on the reduced price. Reduction: 600 × 0.20 = 120 → £480. Tax: 480 × 0.05 = 24 → final price £504.',
          checkpointQuestion: 'A £200 bike is reduced by 10%, then a further 5% is taken off the sale price. What is the final price?',
          checkpointOptions: ['£171', '£170', '£175', '£180'],
          checkpointAnswer: '£171',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand the connection between percentage change and decimal multipliers.',
      workedExample:
        'Increase by 20% → multiply by 1.20. Decrease by 15% → multiply by 0.85. One-step method.',
      guidedPrompt: 'Use a multiplier to increase 350 by 8%.',
      guidedAnswer: 'Multiplier = 1.08. 350 × 1.08 = 378.',
      steps: [
        {
          stepOrder: 1,
          title: 'A percentage increase as a multiplier',
          explanation:
            'Increasing by 20% means you end up with 100% + 20% = 120% of the original. 120% as a decimal is 1.20. So "increase 150 by 20%" becomes 150 × 1.20 = 180. This one-step method is quick and avoids forgetting to add.',
          checkpointQuestion: 'What multiplier represents a 35% increase?',
          checkpointOptions: ['1.35', '0.35', '0.65', '35'],
          checkpointAnswer: '1.35',
        },
        {
          stepOrder: 2,
          title: 'A percentage decrease as a multiplier',
          explanation:
            'Decreasing by 15% means you keep 100% − 15% = 85% of the original. 85% as a decimal is 0.85. So "decrease 400 by 15%" becomes 400 × 0.85 = 340. The multiplier is always 1 minus the decimal for a decrease.',
          checkpointQuestion: 'What multiplier represents a 30% decrease?',
          checkpointOptions: ['0.70', '1.30', '0.30', '70'],
          checkpointAnswer: '0.70',
        },
        {
          stepOrder: 3,
          title: 'Why multipliers work',
          explanation:
            'Multiplying by 1.20 is the same as finding 120/100 of the amount, which is the original plus 20%. For a decrease of 25%, multiplying by 0.75 gives 75/100 of the amount — the original minus 25%. Using a multiplier combines finding the percentage and adding/subtracting into one step.',
          checkpointQuestion: 'Increase 80 by 5% using a multiplier.',
          checkpointOptions: ['84', '85', '76', '80.5'],
          checkpointAnswer: '84',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students add the percentage number itself instead of calculating the percentage of the amount — e.g. "increase 80 by 25%" → they write 80 + 25 = 105.',
      workedExample:
        'Error: "Increase 80 by 25%" → 80 + 25 = 105. Correct: 25% of 80 = 20, so 80 + 20 = 100.',
      guidedPrompt: 'A student says "Increase 60 by 30%" is 90. What went wrong?',
      guidedAnswer: 'They added 30 to 60. Correct: 30% of 60 = 18, so 60 + 18 = 78.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the common error',
          explanation:
            'A frequent mistake is treating the percentage number as the amount to add or subtract. For example, "increase 80 by 25%": the student writes 80 + 25 = 105. They add 25 instead of finding 25% of 80. The correct answer is 80 + 20 = 100.',
          checkpointQuestion: 'A student says "increase 120 by 10%" is 130. Is this correct?',
          checkpointOptions: ['No — the answer is 132', 'Yes — that is correct'],
          checkpointAnswer: 'No — the answer is 132',
        },
        {
          stepOrder: 2,
          title: 'Show the correct calculation',
          explanation:
            'To increase 200 by 15%, you must first find 15% of 200: 200 × 15 ÷ 100 = 30. Then add: 200 + 30 = 230. The percentage tells you what fraction of the original amount to add, not a flat number.',
          checkpointQuestion: 'Increase 400 by 20%. What is the correct answer?',
          checkpointOptions: ['480', '420', '500', '380'],
          checkpointAnswer: '480',
        },
        {
          stepOrder: 3,
          title: 'Practice percentage increase and decrease',
          explanation:
            'Decrease 150 by 40%: find 40% of 150 = 60. Subtract: 150 − 60 = 90. Not 150 − 40 = 110. Always remember: the percentage operates on the amount, it is not a number to add or subtract directly.',
          checkpointQuestion: 'Decrease 250 by 20%. What is the answer?',
          checkpointOptions: ['200', '230', '50', '270'],
          checkpointAnswer: '200',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.13 — Find the original value after a percentage change (reverse percentages)
   * ────────────────────────────────────────────────────────────────────── */
  'N6.13': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students find the percentage of the new amount instead of dividing by the multiplier to reverse the change.',
      workedExample:
        'An item costs £84 after a 20% increase. Original = £84 ÷ 1.20 = £70.',
      guidedPrompt: 'A price is £68 after a 15% decrease. Find the original price.',
      guidedAnswer: 'Multiplier for 15% decrease = 0.85. Original = £68 ÷ 0.85 = £80.',
      steps: [
        {
          stepOrder: 1,
          title: 'Identify the multiplier from the percentage change',
          explanation:
            'A percentage increase of 20% means the new value is 120% of the original, so the multiplier is 1.20. A 15% decrease means 85% of the original remains, giving a multiplier of 0.85. Write the change as a decimal multiplier before doing any calculation.',
          checkpointQuestion: 'What multiplier represents a 25% increase?',
          checkpointOptions: ['1.25', '0.25', '0.75', '25'],
          checkpointAnswer: '1.25',
        },
        {
          stepOrder: 2,
          title: 'Divide by the multiplier to find the original',
          explanation:
            'If the new price is £84 after a 20% increase, then £84 = original × 1.20. To find the original, divide: £84 ÷ 1.20 = £70. You reverse the multiplication by dividing. Think of it as undoing the percentage change.',
          checkpointQuestion: 'An item costs £84 after a 20% increase. What was the original price?',
          checkpointOptions: ['£70', '£67.20', '£64', '£80'],
          checkpointAnswer: '£70',
        },
        {
          stepOrder: 3,
          title: 'Apply reverse percentages to decreases',
          explanation:
            'For a decrease, the multiplier is less than 1. If a sale price is £68 after a 15% discount, the multiplier is 0.85. Original = £68 ÷ 0.85 = £80. After a 30% increase the amount is £91: original = £91 ÷ 1.30 = £70.',
          checkpointQuestion: 'After a 30% increase, an amount is £91. What was the original?',
          checkpointOptions: ['£70', '£63.70', '£61', '£91.30'],
          checkpointAnswer: '£70',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see that the new amount represents more or fewer than 100 parts, making division necessary.',
      workedExample:
        'If the new value is £84 after a 20% increase, picture a bar model where 120% = £84. One percent = £84 ÷ 120 = £0.70. Original (100%) = £0.70 × 100 = £70.',
      guidedPrompt: 'Use a bar model to find the original when the price is £68 after a 15% decrease.',
      guidedAnswer: 'The bar model shows 85% = £68. One percent = £68 ÷ 85 = £0.80. Original (100%) = £0.80 × 100 = £80.',
      steps: [
        {
          stepOrder: 1,
          title: 'Draw a bar model for the new amount',
          explanation:
            'After a 20% increase, the new amount represents 120 equal parts out of 100 original parts. Draw a bar model and label the whole bar as 120%. The bar equals £84. Each 1% = £84 ÷ 120 = £0.70.',
          checkpointQuestion: 'After a 20% increase, a value is £84. What does each 1% equal?',
          checkpointOptions: ['£0.70', '£0.84', '£4.20', '£1.20'],
          checkpointAnswer: '£0.70',
        },
        {
          stepOrder: 2,
          title: 'Scale back to 100% to find the original',
          explanation:
            'Once you know 1% = £0.70, multiply by 100 to get the original: £0.70 × 100 = £70. The bar model makes it clear that the original is 100 parts, not 120 parts. This visual approach helps you see why dividing is the correct step.',
          checkpointQuestion: 'If 1% = £0.80 and the original is 100%, what is the original value?',
          checkpointOptions: ['£80', '£8', '£0.80', '£800'],
          checkpointAnswer: '£80',
        },
        {
          stepOrder: 3,
          title: 'Visualise a decrease using the bar model',
          explanation:
            'For a 15% decrease, the new value represents 85% of the original. Draw a bar model labelled 85% = £68. Find 1%: £68 ÷ 85 = £0.80. Original (100%) = £0.80 × 100 = £80. The model shows the missing 15% that was removed.',
          checkpointQuestion: 'A sale price is £68 after a 15% decrease. What was the original price?',
          checkpointOptions: ['£80', '£78.20', '£57.80', '£83'],
          checkpointAnswer: '£80',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students incorrectly find the percentage of the new amount and add or subtract it, instead of dividing by the multiplier to reverse the change.',
      workedExample:
        'Error: "£84 after a 20% increase → 20% of 84 = 16.80 → 84 − 16.80 = £67.20". Correct: £84 ÷ 1.20 = £70.',
      guidedPrompt: 'A student says the original price before a 15% decrease to £68 is £78.20. What did they do wrong?',
      guidedAnswer: 'They found 15% of £68 = £10.20 and added it: £68 + £10.20 = £78.20. They should divide: £68 ÷ 0.85 = £80.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the reverse percentage mistake',
          explanation:
            'The most common error is to find the percentage of the new value. For example, "£84 after a 20% increase" — the student calculates 20% of £84 = £16.80 and subtracts to get £67.20. This is wrong because 20% of the original is not the same as 20% of the new amount.',
          checkpointQuestion: 'A student says the original before a 20% increase to £84 is £67.20. Is this correct?',
          checkpointOptions: ['No — the answer is £70', 'Yes — that is correct', 'No — the answer is £80', 'No — the answer is £64'],
          checkpointAnswer: 'No — the answer is £70',
        },
        {
          stepOrder: 2,
          title: 'Show why the shortcut fails',
          explanation:
            'If the original is £70 and you increase by 20%, you get £70 × 1.20 = £84. But 20% of £84 is £16.80, not £14. The percentage of the new amount is larger because the new amount is larger. You must divide by the multiplier, not subtract a percentage of the result.',
          checkpointQuestion: 'After a 30% increase, an amount is £91. What is the original?',
          checkpointOptions: ['£70', '£63.70', '£61', '£91.30'],
          checkpointAnswer: '£70',
        },
        {
          stepOrder: 3,
          title: 'Practice correcting the error',
          explanation:
            'A sale reduces a price by 15% to £68. Wrong method: 15% of £68 = £10.20, then £68 + £10.20 = £78.20. Correct method: divide by the multiplier: £68 ÷ 0.85 = £80. Always ask: "What multiplier produced this new value?" then divide.',
          checkpointQuestion: 'A price is £68 after a 15% decrease. What was the original price?',
          checkpointOptions: ['£80', '£78.20', '£57.80', '£83'],
          checkpointAnswer: '£80',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.14 — Repeated percentage change (compound interest, depreciation)
   * ────────────────────────────────────────────────────────────────────── */
  'N6.14': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students multiply the percentage by the number of years and apply it once, instead of applying the multiplier repeatedly.',
      workedExample:
        '£1000 at 5% interest for 2 years: multiply by 1.05 twice. £1000 × 1.05 × 1.05 = £1000 × 1.05² = £1102.50.',
      guidedPrompt: 'A car worth £12 000 depreciates by 10% per year for 2 years. What is it worth?',
      guidedAnswer: 'Multiplier = 0.90. Value = £12 000 × 0.90² = £12 000 × 0.81 = £9720.',
      steps: [
        {
          stepOrder: 1,
          title: 'Write the multiplier for one period',
          explanation:
            'For a 5% increase, the multiplier is 1.05. For a 10% decrease (depreciation), the multiplier is 0.90. Write this down first before thinking about how many times to apply it.',
          checkpointQuestion: 'What is the multiplier for a 10% decrease each year?',
          checkpointOptions: ['0.90', '0.10', '1.10', '10'],
          checkpointAnswer: '0.90',
        },
        {
          stepOrder: 2,
          title: 'Apply the multiplier for each year',
          explanation:
            '£1000 at 5% for 2 years: Year 1 = £1000 × 1.05 = £1050. Year 2 = £1050 × 1.05 = £1102.50. This is the same as £1000 × 1.05² = £1102.50. Each year the interest is calculated on the new, larger amount.',
          checkpointQuestion: '£1000 is invested at 5% compound interest for 2 years. What is the final amount?',
          checkpointOptions: ['£1102.50', '£1100', '£1050', '£1110'],
          checkpointAnswer: '£1102.50',
        },
        {
          stepOrder: 3,
          title: 'Extend to more than two periods',
          explanation:
            '£500 at 10% compound interest for 3 years: multiply by 1.10 three times. £500 × 1.10³ = £500 × 1.331 = £665.50. For depreciation: a £12 000 car losing 10% per year for 2 years = £12 000 × 0.90² = £9720.',
          checkpointQuestion: '£500 is invested at 10% compound interest for 3 years. What is the final amount?',
          checkpointOptions: ['£665.50', '£650', '£655', '£550'],
          checkpointAnswer: '£665.50',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see why compound growth differs from simple growth; they treat each year as the same flat amount.',
      workedExample:
        'Simple interest on £1000 at 5% for 2 years = £100. Compound interest = £1000 × 1.05² = £1102.50. The extra £2.50 comes from earning interest on interest.',
      guidedPrompt: 'Explain with a bar model why £1000 at 5% compound interest for 2 years gives more than £1100.',
      guidedAnswer: 'Year 1: bar grows by 5% of £1000 = £50 → £1050. Year 2: bar grows by 5% of £1050 = £52.50 → £1102.50. The second bar is bigger because you earn interest on the £50 from Year 1.',
      steps: [
        {
          stepOrder: 1,
          title: 'Visualise one year of growth',
          explanation:
            'Draw a bar model for £1000. After one year at 5%, the bar grows by 5% of £1000 = £50. The new bar is £1050. This first step looks the same as simple interest.',
          checkpointQuestion: 'What is £1000 after one year at 5% interest?',
          checkpointOptions: ['£1050', '£1005', '£1500', '£50'],
          checkpointAnswer: '£1050',
        },
        {
          stepOrder: 2,
          title: 'Show the second year is different',
          explanation:
            'In year 2, you earn 5% on £1050 (not £1000). 5% of £1050 = £52.50. New total = £1102.50. The extra £2.50 compared to simple interest comes from earning interest on the £50 earned in year 1. This is the compound effect.',
          checkpointQuestion: 'How much interest is earned in the second year on £1050 at 5%?',
          checkpointOptions: ['£52.50', '£50', '£55', '£105'],
          checkpointAnswer: '£52.50',
        },
        {
          stepOrder: 3,
          title: 'Visualise depreciation over two years',
          explanation:
            'A car worth £12 000 loses 10% each year. Year 1: bar shrinks by £1200 → £10 800. Year 2: bar shrinks by 10% of £10 800 = £1080 → £9720. Each year the amount lost is smaller because the car is worth less.',
          checkpointQuestion: 'A £12 000 car depreciates by 10% per year for 2 years. What is it worth?',
          checkpointOptions: ['£9720', '£9600', '£10 800', '£10 000'],
          checkpointAnswer: '£9720',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students incorrectly double the percentage for two years instead of multiplying by the multiplier twice — e.g. 5% for 2 years becomes 10% applied once.',
      workedExample:
        'Error: "£1000 at 5% for 2 years → 10% of 1000 = 100 → £1100". Correct: £1000 × 1.05² = £1102.50.',
      guidedPrompt: 'A student says £500 at 10% for 3 years is £650. What mistake did they make?',
      guidedAnswer: 'They calculated 10% × 3 = 30%, then 30% of £500 = £150, giving £650. Correct: £500 × 1.10³ = £665.50.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the doubling error',
          explanation:
            'A common mistake is to multiply the percentage by the number of years and apply it once. For example, 5% for 2 years → "10% of £1000 = £100, total = £1100". This gives the simple interest answer but ignores that each year builds on the previous total.',
          checkpointQuestion: 'A student says £1000 at 5% for 2 years = £1100. Is this correct?',
          checkpointOptions: ['No — the answer is £1102.50', 'Yes — that is correct', 'No — the answer is £1050', 'No — the answer is £1110'],
          checkpointAnswer: 'No — the answer is £1102.50',
        },
        {
          stepOrder: 2,
          title: 'Show why the flat method is wrong',
          explanation:
            'With compound growth, each year the base amount changes. Year 1: 5% of £1000 = £50. Year 2: 5% of £1050 = £52.50. Total interest = £102.50, not £100. The error grows larger with more years and higher rates.',
          checkpointQuestion: '£12 000 depreciates by 10% per year for 2 years. What is the value?',
          checkpointOptions: ['£9720', '£9600', '£10 800', '£10 200'],
          checkpointAnswer: '£9720',
        },
        {
          stepOrder: 3,
          title: 'Practice the correct compound method',
          explanation:
            '£500 at 10% for 3 years: do not do 30% of £500. Instead use the multiplier: £500 × 1.10 × 1.10 × 1.10 = £500 × 1.331 = £665.50. Always multiply by the single-year multiplier once for each year.',
          checkpointQuestion: '£500 is invested at 10% compound interest for 3 years. What is the final amount?',
          checkpointOptions: ['£665.50', '£650', '£655', '£550'],
          checkpointAnswer: '£665.50',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.15 — Express one number as a fraction or percentage of another in context
   * ────────────────────────────────────────────────────────────────────── */
  'N6.15': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students swap the part and the whole, or forget to simplify the fraction before converting to a percentage.',
      workedExample:
        '30 out of 120 students passed. Fraction = 30/120 = 1/4. Percentage = 1/4 × 100 = 25%.',
      guidedPrompt: '£15 out of £60 was spent on food. Express this as a fraction and a percentage.',
      guidedAnswer: 'Fraction = 15/60 = 1/4. Percentage = 1/4 × 100 = 25%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Write the fraction: part over whole',
          explanation:
            'Put the part (the smaller quantity being described) as the numerator and the whole (the total) as the denominator. "30 out of 120 students" → 30/120. Always check: which number is the part and which is the whole?',
          checkpointQuestion: '£15 out of £60 is spent. What fraction is this?',
          checkpointOptions: ['15/60', '60/15', '15/100', '45/60'],
          checkpointAnswer: '15/60',
        },
        {
          stepOrder: 2,
          title: 'Simplify the fraction',
          explanation:
            'Find the highest common factor of the numerator and denominator and divide both. 30/120: HCF = 30, so 30 ÷ 30 = 1 and 120 ÷ 30 = 4, giving 1/4. Simplified fractions are easier to convert to percentages.',
          checkpointQuestion: 'Simplify 30/120.',
          checkpointOptions: ['1/4', '3/12', '1/3', '6/24'],
          checkpointAnswer: '1/4',
        },
        {
          stepOrder: 3,
          title: 'Convert the fraction to a percentage',
          explanation:
            'To convert a fraction to a percent, multiply by 100. 1/4 × 100 = 25%. Another example: 18 correct out of 24 = 18/24 = 3/4. As a percentage: 3/4 × 100 = 75%.',
          checkpointQuestion: '18 out of 24 questions are correct. What percentage is this?',
          checkpointOptions: ['75%', '25%', '18%', '72%'],
          checkpointAnswer: '75%',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not connect the fraction, decimal and percentage representations of the same proportion.',
      workedExample:
        '30 out of 120 = 30/120 = 0.25 = 25%. Draw a bar model: shade 30 out of 120 equal parts — one quarter is shaded.',
      guidedPrompt: 'Use a bar model to show that £15 out of £60 is 25%.',
      guidedAnswer: 'The bar has 60 equal parts. Shade 15 parts. That is 15/60 = 1/4 of the bar. On a percent scale, 1/4 = 25%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Draw a bar model for part and whole',
          explanation:
            'Draw a bar representing the whole (120 students). Shade the part (30 students). Visually you can see 30 is one quarter of 120. The bar model makes the fraction easy to see.',
          checkpointQuestion: 'If a bar of 120 has 30 shaded, what fraction is shaded?',
          checkpointOptions: ['1/4', '1/3', '3/10', '30/100'],
          checkpointAnswer: '1/4',
        },
        {
          stepOrder: 2,
          title: 'Link the fraction to a decimal',
          explanation:
            'Divide the numerator by the denominator to get a decimal. 30 ÷ 120 = 0.25. This tells you the part is 0.25 of the whole. On the bar model, mark 0.25 along the bottom. Fraction, decimal and bar model all show the same proportion.',
          checkpointQuestion: 'What is 15 ÷ 60 as a decimal?',
          checkpointOptions: ['0.25', '4', '0.15', '0.60'],
          checkpointAnswer: '0.25',
        },
        {
          stepOrder: 3,
          title: 'Convert the decimal to a percentage',
          explanation:
            'Multiply the decimal by 100 to get the percentage. 0.25 × 100 = 25%. Another example: 18 out of 24 → 18 ÷ 24 = 0.75 → 0.75 × 100 = 75%. Percent means "per hundred", so you are finding how many hundredths.',
          checkpointQuestion: '18 out of 24 questions correct. What percentage is this?',
          checkpointOptions: ['75%', '25%', '0.75%', '18%'],
          checkpointAnswer: '75%',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students confuse the part and the whole, dividing the whole by the part — e.g. writing 60 ÷ 15 instead of 15 ÷ 60.',
      workedExample:
        'Error: "£15 out of £60 → 60 ÷ 15 = 4 → 400%". Correct: 15 ÷ 60 = 0.25 = 25%.',
      guidedPrompt: 'A student says "30 out of 120 is 400%". What mistake did they make?',
      guidedAnswer: 'They divided 120 by 30 instead of 30 by 120. Correct: 30 ÷ 120 = 0.25 = 25%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Identify the wrong-way-round error',
          explanation:
            'When a student gets an answer above 100% for a part that is smaller than the whole, they have likely divided the wrong way round. "30 out of 120 → 120 ÷ 30 = 4 → 400%". The part must go on top (numerator), the whole on the bottom (denominator).',
          checkpointQuestion: 'A student says "15 out of 60 = 400%". What error did they make?',
          checkpointOptions: [
            'They divided 60 by 15 instead of 15 by 60',
            'They forgot to multiply by 100',
            'They subtracted instead of dividing',
            'They added the numbers together',
          ],
          checkpointAnswer: 'They divided 60 by 15 instead of 15 by 60',
        },
        {
          stepOrder: 2,
          title: 'Correct the calculation',
          explanation:
            'The right way: part ÷ whole. £15 out of £60 → 15 ÷ 60 = 0.25. Multiply by 100 → 25%. If the part is smaller than the whole, the answer must be under 100%. Use this as a quick check for your answer.',
          checkpointQuestion: 'Express 30 out of 120 as a percentage.',
          checkpointOptions: ['25%', '400%', '30%', '120%'],
          checkpointAnswer: '25%',
        },
        {
          stepOrder: 3,
          title: 'Practice identifying part and whole in context',
          explanation:
            'Read carefully: "18 out of 24 questions were correct." Part = 18, whole = 24. Fraction = 18/24 = 3/4 = 75%. "What percentage of 24 is 18?" means the same thing. The word "of" usually comes before the whole.',
          checkpointQuestion: 'What percentage of 24 is 18?',
          checkpointOptions: ['75%', '133%', '18%', '24%'],
          checkpointAnswer: '75%',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.16 — Use ratio notation; simplify ratios
   * ────────────────────────────────────────────────────────────────────── */
  'N6.16': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students divide only one side of the ratio when simplifying, or cannot find the highest common factor of both parts.',
      workedExample:
        'Simplify 12 : 18. HCF of 12 and 18 is 6. Divide both: 12 ÷ 6 = 2, 18 ÷ 6 = 3. Simplified ratio = 2 : 3.',
      guidedPrompt: 'Simplify 250 ml : 1 litre.',
      guidedAnswer: 'Convert to the same unit: 250 : 1000. HCF = 250. 250 ÷ 250 = 1, 1000 ÷ 250 = 4. Ratio = 1 : 4.',
      steps: [
        {
          stepOrder: 1,
          title: 'Ensure both quantities use the same unit',
          explanation:
            'Before simplifying, convert to the same unit. For 250 ml : 1 litre, convert 1 litre to 1000 ml. Now you have 250 : 1000. Without matching units, the ratio has no meaning.',
          checkpointQuestion: 'Write 250 ml : 1 litre as a ratio with the same units.',
          checkpointOptions: ['250 : 1000', '250 : 1', '1 : 250', '25 : 1'],
          checkpointAnswer: '250 : 1000',
        },
        {
          stepOrder: 2,
          title: 'Find the HCF and divide both parts',
          explanation:
            'To simplify 12 : 18, find the highest common factor. Factors of 12: 1, 2, 3, 4, 6, 12. Factors of 18: 1, 2, 3, 6, 9, 18. HCF = 6. Divide both: 12 ÷ 6 = 2 and 18 ÷ 6 = 3. Result: 2 : 3.',
          checkpointQuestion: 'Simplify 12 : 18.',
          checkpointOptions: ['2 : 3', '6 : 9', '4 : 6', '3 : 2'],
          checkpointAnswer: '2 : 3',
        },
        {
          stepOrder: 3,
          title: 'Simplify ratios involving fractions',
          explanation:
            'To simplify 2/3 : 4/5, multiply both fractions by the lowest common multiple of the denominators (3 and 5 → LCM = 15). 2/3 × 15 = 10, 4/5 × 15 = 12. Ratio = 10 : 12. Simplify: HCF = 2, so 5 : 6.',
          checkpointQuestion: 'Simplify the ratio 2/3 : 4/5.',
          checkpointOptions: ['5 : 6', '2 : 4', '10 : 12', '3 : 5'],
          checkpointAnswer: '5 : 6',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand that a ratio compares relative sizes and that both parts must be scaled by the same factor.',
      workedExample:
        'In a class of 30, there are 12 boys and 18 girls. Bar model: draw 12 equal parts for boys and 18 for girls. Simplify by grouping into sets of 6: 2 groups of boys, 3 groups of girls → 2 : 3.',
      guidedPrompt: 'Use a bar model to show that 250 ml : 1000 ml simplifies to 1 : 4.',
      guidedAnswer: 'Draw a bar split into 250 ml sections. You get 1 section vs 4 sections, so the ratio is 1 : 4.',
      steps: [
        {
          stepOrder: 1,
          title: 'What a ratio tells you',
          explanation:
            'A ratio compares the relative sizes of two or more quantities. 12 : 18 means "for every 12 of one, there are 18 of the other". The colon replaces the word "to". A ratio does not tell you the actual amounts, only how they compare.',
          checkpointQuestion: 'In a bag there are 12 red sweets and 18 blue sweets. What is the ratio red to blue?',
          checkpointOptions: ['12 : 18', '18 : 12', '12 / 18', '30'],
          checkpointAnswer: '12 : 18',
        },
        {
          stepOrder: 2,
          title: 'Use a bar model to simplify',
          explanation:
            'Draw 12 small squares for boys and 18 for girls. Circle groups of 6: you get 2 groups of boys and 3 groups of girls. Simplified ratio = 2 : 3. The bar model shows that both sides are divided by the same number.',
          checkpointQuestion: 'Simplify 12 : 18 using groups of 6.',
          checkpointOptions: ['2 : 3', '6 : 6', '1 : 3', '4 : 6'],
          checkpointAnswer: '2 : 3',
        },
        {
          stepOrder: 3,
          title: 'Visualise unit conversion in a ratio',
          explanation:
            'For 250 ml : 1 litre, first convert to 250 : 1000. Draw a bar of 1000 split into 250 ml blocks — that gives 4 blocks. The first quantity fills 1 block, the second fills 4. Ratio = 1 : 4.',
          checkpointQuestion: 'Simplify 250 : 1000.',
          checkpointOptions: ['1 : 4', '1 : 250', '25 : 100', '250 : 4'],
          checkpointAnswer: '1 : 4',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students forget to convert units before simplifying, or only divide one part of the ratio — a common mistake that gives a wrong simplified ratio.',
      workedExample:
        'Error: "250 ml : 1 litre → divide both by 250 → 1 : 1/250". Correct: convert first → 250 : 1000 → divide by 250 → 1 : 4.',
      guidedPrompt: 'A student writes 250 ml : 1 litre = 250 : 1. What error did they make?',
      guidedAnswer: 'They did not convert to the same unit. 1 litre = 1000 ml, so the ratio is 250 : 1000 = 1 : 4.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the missing unit conversion',
          explanation:
            'A frequent mistake is to ignore different units. "250 ml : 1 litre" is not 250 : 1. You must convert: 1 litre = 1000 ml, so the ratio is 250 : 1000. Only then can you simplify.',
          checkpointQuestion: 'A student writes 250 ml : 1 litre as 250 : 1. What should it be?',
          checkpointOptions: ['250 : 1000', '250 : 1', '1 : 250', '25 : 1'],
          checkpointAnswer: '250 : 1000',
        },
        {
          stepOrder: 2,
          title: 'Show the error of dividing one side only',
          explanation:
            'To simplify 12 : 18, you must divide both parts by the same number. A student who writes 12 ÷ 6 = 2 but leaves 18 unchanged gets 2 : 18, which is wrong. Correct: 12 ÷ 6 = 2 and 18 ÷ 6 = 3 → 2 : 3.',
          checkpointQuestion: 'Simplify 12 : 18.',
          checkpointOptions: ['2 : 3', '2 : 18', '12 : 3', '1 : 18'],
          checkpointAnswer: '2 : 3',
        },
        {
          stepOrder: 3,
          title: 'Practice with fractions in a ratio',
          explanation:
            'To simplify 2/3 : 4/5, multiply both by 15 (LCM of 3 and 5) to clear the fractions: 2/3 × 15 = 10, 4/5 × 15 = 12. Then simplify 10 : 12 → HCF = 2 → 5 : 6. Do not forget to simplify after clearing fractions.',
          checkpointQuestion: 'Simplify the ratio 2/3 : 4/5.',
          checkpointOptions: ['5 : 6', '10 : 12', '2 : 4', '3 : 5'],
          checkpointAnswer: '5 : 6',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.17 — Share a quantity in a given ratio
   * ────────────────────────────────────────────────────────────────────── */
  'N6.17': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students divide by just one of the ratio numbers instead of finding the total number of parts first.',
      workedExample:
        'Share £120 in the ratio 3 : 5. Total parts = 3 + 5 = 8. One part = £120 ÷ 8 = £15. Amounts: 3 × £15 = £45 and 5 × £15 = £75.',
      guidedPrompt: 'Share 200 g in the ratio 2 : 3 : 5.',
      guidedAnswer: 'Total parts = 2 + 3 + 5 = 10. One part = 200 ÷ 10 = 20 g. Amounts: 40 g, 60 g, 100 g.',
      steps: [
        {
          stepOrder: 1,
          title: 'Add the ratio parts to find the total',
          explanation:
            'The ratio 3 : 5 means there are 3 + 5 = 8 equal parts in total. For 2 : 3 : 5 the total is 2 + 3 + 5 = 10 parts. This total tells you how many equal shares the quantity is split into.',
          checkpointQuestion: 'What is the total number of parts in the ratio 3 : 5?',
          checkpointOptions: ['8', '5', '3', '15'],
          checkpointAnswer: '8',
        },
        {
          stepOrder: 2,
          title: 'Find the value of one part',
          explanation:
            'Divide the total quantity by the number of parts. £120 ÷ 8 = £15 per part. This is the unitary step — once you know one part you can find any number of parts.',
          checkpointQuestion: 'Share £120 in the ratio 3 : 5. What is the value of one part?',
          checkpointOptions: ['£15', '£40', '£24', '£60'],
          checkpointAnswer: '£15',
        },
        {
          stepOrder: 3,
          title: 'Multiply to find each share',
          explanation:
            'Multiply one part by each number in the ratio. For 3 : 5 with one part = £15: first share = 3 × 15 = £45, second share = 5 × 15 = £75. Check: £45 + £75 = £120. For 2 : 3 : 5 sharing 200 g: 40 g + 60 g + 100 g = 200 g.',
          checkpointQuestion: 'Share 200 g in the ratio 2 : 3 : 5. What is the largest share?',
          checkpointOptions: ['100 g', '60 g', '40 g', '80 g'],
          checkpointAnswer: '100 g',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see the connection between the ratio and the fraction of the total that each person receives.',
      workedExample:
        'Share £120 in ratio 3 : 5. Bar model: draw 8 equal parts — shade 3 for person A, 5 for person B. Each part = £120 ÷ 8 = £15. Person A = £45, Person B = £75.',
      guidedPrompt: 'Use a bar model to share 360° in the ratio 1 : 2 : 3.',
      guidedAnswer: 'Total parts = 6. One part = 360° ÷ 6 = 60°. Shares: 60°, 120°, 180°. The bar has 6 sections: 1 + 2 + 3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Draw a bar model for the ratio',
          explanation:
            'For ratio 3 : 5, draw a bar split into 8 equal pieces. Shade 3 pieces one colour (Person A) and 5 another colour (Person B). This shows that Person A gets 3/8 of the total and Person B gets 5/8.',
          checkpointQuestion: 'In the ratio 3 : 5, what fraction does the first person receive?',
          checkpointOptions: ['3/8', '3/5', '5/8', '1/3'],
          checkpointAnswer: '3/8',
        },
        {
          stepOrder: 2,
          title: 'Find each share using the bar model',
          explanation:
            'The full bar = £120. Each of the 8 sections = £120 ÷ 8 = £15. Count the shaded sections: Person A = 3 × £15 = £45, Person B = 5 × £15 = £75. The bar model makes it visual.',
          checkpointQuestion: 'Divide 360° in the ratio 1 : 2 : 3. What is the middle share?',
          checkpointOptions: ['120°', '60°', '180°', '72°'],
          checkpointAnswer: '120°',
        },
        {
          stepOrder: 3,
          title: 'Check your answer adds up',
          explanation:
            'Always check: do the shares add up to the original total? £45 + £75 = £120 ✓. For 360° in ratio 1 : 2 : 3: 60° + 120° + 180° = 360° ✓. If they do not add up, go back and check your working.',
          checkpointQuestion: 'Share 200 g in ratio 2 : 3 : 5. What are the three shares?',
          checkpointOptions: ['40 g, 60 g, 100 g', '20 g, 30 g, 50 g', '80 g, 60 g, 60 g', '50 g, 50 g, 100 g'],
          checkpointAnswer: '40 g, 60 g, 100 g',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students forget to add the ratio parts and instead divide the quantity by only one number in the ratio — a common mistake that gives the wrong share.',
      workedExample:
        'Error: "Share £120 in ratio 3 : 5 → 120 ÷ 3 = 40 and 120 ÷ 5 = 24". Correct: total parts = 8, one part = £15, shares = £45 and £75.',
      guidedPrompt: 'A student divides £120 by 3 and by 5 separately. What went wrong?',
      guidedAnswer: 'They did not find the total parts (3 + 5 = 8). They should divide £120 by 8 = £15 per part, then multiply: £45 and £75.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the error of dividing by each ratio number',
          explanation:
            'A student sharing £120 in ratio 3 : 5 writes: £120 ÷ 3 = £40 and £120 ÷ 5 = £24. The shares total £64, not £120. This mistake happens when students divide by each part separately instead of finding the total number of parts first.',
          checkpointQuestion: 'A student says £120 shared in ratio 3 : 5 gives £40 and £24. Is this correct?',
          checkpointOptions: ['No — the shares are £45 and £75', 'Yes — that is correct', 'No — the shares are £60 and £60', 'No — the shares are £36 and £84'],
          checkpointAnswer: 'No — the shares are £45 and £75',
        },
        {
          stepOrder: 2,
          title: 'Show the correct method step by step',
          explanation:
            'Step 1: total parts = 3 + 5 = 8. Step 2: one part = £120 ÷ 8 = £15. Step 3: Person A = 3 × £15 = £45, Person B = 5 × £15 = £75. Check: £45 + £75 = £120 ✓.',
          checkpointQuestion: 'Share £120 in ratio 3 : 5. What does Person A receive?',
          checkpointOptions: ['£45', '£40', '£75', '£24'],
          checkpointAnswer: '£45',
        },
        {
          stepOrder: 3,
          title: 'Practice with a three-part ratio',
          explanation:
            'Divide 360° in ratio 1 : 2 : 3. Total parts = 1 + 2 + 3 = 6. One part = 360° ÷ 6 = 60°. Shares: 60°, 120°, 180°. Always add the ratio numbers first, then divide the quantity by the total.',
          checkpointQuestion: 'Divide 360° in ratio 1 : 2 : 3. What is the largest angle?',
          checkpointOptions: ['180°', '120°', '60°', '360°'],
          checkpointAnswer: '180°',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.18 — Use the unitary method for ratio and proportion problems
   * ────────────────────────────────────────────────────────────────────── */
  'N6.18': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students try to scale directly without first finding the value for one unit, leading to incorrect proportional reasoning.',
      workedExample:
        '5 pens cost £3.50. Find the cost of 8 pens. One pen = £3.50 ÷ 5 = £0.70. 8 pens = 8 × £0.70 = £5.60.',
      guidedPrompt: 'A recipe for 4 people uses 300 g of flour. How much flour for 6 people?',
      guidedAnswer: 'Flour per person = 300 ÷ 4 = 75 g. For 6 people = 75 × 6 = 450 g.',
      steps: [
        {
          stepOrder: 1,
          title: 'Find the value for one unit',
          explanation:
            'The unitary method means finding the value for one item or one person first. If 5 pens cost £3.50, divide by 5 to find the cost of one pen: £3.50 ÷ 5 = £0.70. This is the key step.',
          checkpointQuestion: '5 pens cost £3.50. What does one pen cost?',
          checkpointOptions: ['£0.70', '£3.50', '£1.50', '£0.50'],
          checkpointAnswer: '£0.70',
        },
        {
          stepOrder: 2,
          title: 'Multiply to find the new amount',
          explanation:
            'Once you know one pen = £0.70, multiply by the number you need. 8 pens = 8 × £0.70 = £5.60. The unitary method always has two steps: divide to find one, then multiply to find the required amount.',
          checkpointQuestion: '5 pens cost £3.50. What do 8 pens cost?',
          checkpointOptions: ['£5.60', '£6.50', '£4.80', '£28.00'],
          checkpointAnswer: '£5.60',
        },
        {
          stepOrder: 3,
          title: 'Apply the unitary method to recipes',
          explanation:
            'A recipe for 4 uses 300 g flour. Per person: 300 ÷ 4 = 75 g. For 6 people: 75 × 6 = 450 g. Always find the amount for one, then scale up or down.',
          checkpointQuestion: 'A recipe for 4 uses 300 g flour. How much flour for 6 people?',
          checkpointOptions: ['450 g', '500 g', '350 g', '600 g'],
          checkpointAnswer: '450 g',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not understand why dividing first and then multiplying gives the correct proportional amount.',
      workedExample:
        'Draw a bar model: 5 equal bars = £3.50. Each bar = £0.70. To find 8 pens, draw 8 bars × £0.70 = £5.60.',
      guidedPrompt: 'Use a bar model to show why 300 g for 4 people means 450 g for 6 people.',
      guidedAnswer: 'Draw 4 bars, each = 300 ÷ 4 = 75 g. For 6 people, draw 6 bars of 75 g = 450 g.',
      steps: [
        {
          stepOrder: 1,
          title: 'Visualise the known amount with a bar model',
          explanation:
            'Draw 5 equal bars side by side, labelled "£3.50 total". Each bar represents one pen. The width of one bar is £3.50 ÷ 5 = £0.70. The bar model shows why dividing by 5 gives the unit cost.',
          checkpointQuestion: 'In a bar model of 5 pens costing £3.50, what is the width of one bar?',
          checkpointOptions: ['£0.70', '£3.50', '£0.50', '£1.00'],
          checkpointAnswer: '£0.70',
        },
        {
          stepOrder: 2,
          title: 'Extend the bar model to the new amount',
          explanation:
            'Now draw 8 bars, each £0.70 wide. Total = 8 × £0.70 = £5.60. The model shows you are copying the unit bar the required number of times. This is why the unitary method works: scale down to one, then scale up.',
          checkpointQuestion: 'If one pen costs £0.70, what do 8 pens cost?',
          checkpointOptions: ['£5.60', '£7.00', '£8.00', '£6.30'],
          checkpointAnswer: '£5.60',
        },
        {
          stepOrder: 3,
          title: 'Apply to inverse proportion',
          explanation:
            'Sometimes more of one thing means less of another. 3 workers take 12 days → total work = 3 × 12 = 36 worker-days. For 4 workers: 36 ÷ 4 = 9 days. The bar model shows the total stays the same but is shared among more workers.',
          checkpointQuestion: '3 workers take 12 days. How long for 4 workers?',
          checkpointOptions: ['9 days', '16 days', '12 days', '3 days'],
          checkpointAnswer: '9 days',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students incorrectly multiply instead of dividing first, or confuse which number to divide by — a common mistake in proportion problems.',
      workedExample:
        'Error: "5 pens cost £3.50, so 8 pens cost £3.50 × 8 = £28.00". Correct: first find one pen = £3.50 ÷ 5 = £0.70, then 8 × £0.70 = £5.60.',
      guidedPrompt: 'A student says 8 pens cost £28. What went wrong?',
      guidedAnswer: 'They multiplied £3.50 by 8 without dividing by 5 first. One pen = £0.70, so 8 pens = £5.60.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the missing division step',
          explanation:
            'The most common error is to skip the "find one" step. "5 pens = £3.50, so 8 pens = £3.50 × 8 = £28." This multiplies the total for 5 pens by 8, as if each group of 5 were bought 8 times. The correct first step is £3.50 ÷ 5 = £0.70.',
          checkpointQuestion: 'A student says 8 pens cost £28 (given 5 pens for £3.50). Is this correct?',
          checkpointOptions: ['No — the answer is £5.60', 'Yes — that is correct', 'No — the answer is £7.00', 'No — the answer is £4.80'],
          checkpointAnswer: 'No — the answer is £5.60',
        },
        {
          stepOrder: 2,
          title: 'Show the correct two-step method',
          explanation:
            'Step 1: Divide the total by the known quantity. £3.50 ÷ 5 = £0.70 per pen. Step 2: Multiply by the new quantity. £0.70 × 8 = £5.60. Always divide first, then multiply.',
          checkpointQuestion: 'A recipe for 4 uses 300 g flour. How much for 6 people?',
          checkpointOptions: ['450 g', '1800 g', '300 g', '500 g'],
          checkpointAnswer: '450 g',
        },
        {
          stepOrder: 3,
          title: 'Practice with inverse proportion',
          explanation:
            'Inverse proportion flips the operation. 3 workers take 12 days. For 4 workers, do not do 12 × 4. Instead: total work = 3 × 12 = 36 worker-days. Time = 36 ÷ 4 = 9 days. More workers means fewer days, not more.',
          checkpointQuestion: '3 workers take 12 days. How long for 4 workers?',
          checkpointOptions: ['9 days', '48 days', '16 days', '12 days'],
          checkpointAnswer: '9 days',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.19 — Convert between fractions, decimals and percentages (including recurring)
   * ────────────────────────────────────────────────────────────────────── */
  'N6.19': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students cannot fluently move between fraction, decimal and percentage forms, especially with non-obvious denominators.',
      workedExample:
        '3/8 as a decimal: 3 ÷ 8 = 0.375. As a percentage: 0.375 × 100 = 37.5%.',
      guidedPrompt: 'Convert 0.35 to a fraction in its simplest form.',
      guidedAnswer: '0.35 = 35/100. Simplify: HCF = 5, so 35 ÷ 5 = 7 and 100 ÷ 5 = 20. Fraction = 7/20.',
      steps: [
        {
          stepOrder: 1,
          title: 'Convert a fraction to a decimal',
          explanation:
            'Divide the numerator by the denominator. 3/8: do 3 ÷ 8 = 0.375. If the division terminates you get a terminating decimal. If it repeats, you get a recurring decimal.',
          checkpointQuestion: 'What is 3/8 as a decimal?',
          checkpointOptions: ['0.375', '0.38', '0.83', '2.667'],
          checkpointAnswer: '0.375',
        },
        {
          stepOrder: 2,
          title: 'Convert a decimal to a fraction',
          explanation:
            'Write the decimal over a power of 10. 0.35 = 35/100. Simplify by dividing numerator and denominator by their HCF (5): 35 ÷ 5 = 7, 100 ÷ 5 = 20. So 0.35 = 7/20.',
          checkpointQuestion: 'What is 0.35 as a fraction in simplest form?',
          checkpointOptions: ['7/20', '35/100', '7/10', '35/10'],
          checkpointAnswer: '7/20',
        },
        {
          stepOrder: 3,
          title: 'Convert a fraction to a percentage',
          explanation:
            'Method 1: Convert to a decimal first, then multiply by 100. 7/20 = 0.35, and 0.35 × 100 = 35%. Method 2: Multiply the fraction by 100 directly. 7/20 × 100 = 700/20 = 35%.',
          checkpointQuestion: 'What is 7/20 as a percentage?',
          checkpointOptions: ['35%', '72%', '7.2%', '20%'],
          checkpointAnswer: '35%',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not see fractions, decimals and percentages as three ways to write the same number on a number line.',
      workedExample:
        'Place 3/8 on a number line between 0 and 1. Divide the interval into 8 equal parts; 3/8 lands on the third mark. As a decimal this is 0.375, and as a percentage 37.5%.',
      guidedPrompt: 'Show on a number line that 7/20, 0.35 and 35% are all the same value.',
      guidedAnswer: 'Mark 0 and 1. Divide into 20 equal parts. 7/20 is the 7th mark. 0.35 sits at the same point (35 hundredths). 35% is 35 per 100, the same point again.',
      steps: [
        {
          stepOrder: 1,
          title: 'Place a fraction on a number line',
          explanation:
            'To place 3/8 on a number line, divide the segment from 0 to 1 into 8 equal parts. Count 3 parts from zero. This point is 3/8. The fraction tells you how many equal parts of the whole.',
          checkpointQuestion: 'Where does 3/8 sit on a 0-to-1 number line divided into 8 parts?',
          checkpointOptions: ['At the 3rd mark', 'At the 8th mark', 'At the 5th mark', 'At the halfway mark'],
          checkpointAnswer: 'At the 3rd mark',
        },
        {
          stepOrder: 2,
          title: 'See the decimal at the same point',
          explanation:
            '3 ÷ 8 = 0.375. On the number line, 0.375 is the same point as 3/8. You can verify: 0.375 is between 0.3 and 0.4, and 3/8 is between 2/8 (0.25) and 4/8 (0.5). Both are at 37.5 hundredths along the line.',
          checkpointQuestion: 'What is 3/8 as a decimal?',
          checkpointOptions: ['0.375', '0.38', '3.8', '0.83'],
          checkpointAnswer: '0.375',
        },
        {
          stepOrder: 3,
          title: 'See the percentage at the same point',
          explanation:
            '0.375 × 100 = 37.5%. Percent means "per hundred". So 37.5% means 37.5 out of 100. On the number line, this is the same location as 3/8 and 0.375. All three are different names for the same position.',
          checkpointQuestion: 'What is 0.35 as a percentage?',
          checkpointOptions: ['35%', '3.5%', '0.35%', '350%'],
          checkpointAnswer: '35%',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students incorrectly multiply or divide by the wrong power of 10 when converting — e.g. they confuse dividing by 10 with dividing by 100, or forget to simplify.',
      workedExample:
        'Error: "0.35 as a fraction = 35/10". Correct: 0.35 has two decimal places, so it is 35/100 = 7/20.',
      guidedPrompt: 'A student writes 0.35 = 35/10. What mistake did they make?',
      guidedAnswer: 'They divided by 10 instead of 100. Two decimal places means hundredths: 0.35 = 35/100 = 7/20.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the wrong denominator error',
          explanation:
            'A common mistake is using the wrong power of 10 as the denominator. 0.35 has two decimal places, so the denominator must be 100 (not 10). Writing 35/10 = 3.5, which is not 0.35. Always count the decimal places to choose the correct denominator.',
          checkpointQuestion: 'A student writes 0.35 = 35/10. What should the denominator be?',
          checkpointOptions: ['100', '10', '1000', '50'],
          checkpointAnswer: '100',
        },
        {
          stepOrder: 2,
          title: 'Correct the conversion and simplify',
          explanation:
            '0.35 = 35/100. Now simplify: HCF of 35 and 100 is 5. 35 ÷ 5 = 7, 100 ÷ 5 = 20. So 0.35 = 7/20. Forgetting to simplify is another common error — always check if the fraction can be reduced.',
          checkpointQuestion: 'What is 0.35 as a fully simplified fraction?',
          checkpointOptions: ['7/20', '35/100', '35/10', '7/10'],
          checkpointAnswer: '7/20',
        },
        {
          stepOrder: 3,
          title: 'Practice converting fractions to percentages',
          explanation:
            'To convert 7/20 to a percent, multiply by 100: (7 × 100) ÷ 20 = 700 ÷ 20 = 35%. A mistake is to multiply only the numerator by 10 instead of 100, giving 3.5%. Always multiply the fraction by 100 for a percentage.',
          checkpointQuestion: 'What is 7/20 as a percentage?',
          checkpointOptions: ['35%', '3.5%', '72%', '14%'],
          checkpointAnswer: '35%',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * N6.20 — Solve problems involving FDP in context (best buy, discounts, profit/loss)
   * ────────────────────────────────────────────────────────────────────── */
  'N6.20': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students compare total prices instead of finding the unit price, so they cannot identify the best buy correctly.',
      workedExample:
        'Pack A: 6 items for £2.40 → £2.40 ÷ 6 = 40p each. Pack B: 10 items for £3.50 → £3.50 ÷ 10 = 35p each. Pack B is better value.',
      guidedPrompt: 'A 20% discount is applied to £45, then a further 10% off the reduced price. What is the final price?',
      guidedAnswer: '£45 × 0.80 = £36. Then £36 × 0.90 = £32.40.',
      steps: [
        {
          stepOrder: 1,
          title: 'Find the unit price for best-buy problems',
          explanation:
            'To compare value, find the price per item. Pack A: £2.40 ÷ 6 = 40p each. Pack B: £3.50 ÷ 10 = 35p each. The lower unit price is the better deal. Always divide the total cost by the number of items.',
          checkpointQuestion: 'Pack A: 6 for £2.40. Pack B: 10 for £3.50. Which is better value?',
          checkpointOptions: ['Pack B (35p each)', 'Pack A (40p each)', 'They are the same', 'Cannot tell'],
          checkpointAnswer: 'Pack B (35p each)',
        },
        {
          stepOrder: 2,
          title: 'Apply successive percentage discounts',
          explanation:
            'A 20% discount on £45: multiply by 0.80 → £45 × 0.80 = £36. Then 10% off the reduced price: £36 × 0.90 = £32.40. Important: the second discount applies to the already reduced price, not the original.',
          checkpointQuestion: '20% off £45 then 10% off the sale price. What is the final price?',
          checkpointOptions: ['£32.40', '£31.50', '£36', '£30'],
          checkpointAnswer: '£32.40',
        },
        {
          stepOrder: 3,
          title: 'Calculate percentage profit or loss',
          explanation:
            'Percentage profit = (profit ÷ cost price) × 100. Buy for £80, sell for £100: profit = £20. Percentage profit = (20 ÷ 80) × 100 = 25%. Always divide by the cost price, not the selling price.',
          checkpointQuestion: 'Buy for £80, sell for £100. What is the percentage profit?',
          checkpointOptions: ['25%', '20%', '80%', '125%'],
          checkpointAnswer: '25%',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not connect real-life contexts (shopping, profit, discount) with the fraction, decimal and percentage skills they have learned.',
      workedExample:
        'Bar model: draw a bar for £45. Shade 80% (after 20% off) = £36. Then shade 90% of the new bar (after 10% off) = £32.40. Two bars show two separate discounts.',
      guidedPrompt: 'Use a bar model to find the percentage profit when buying at £80 and selling at £100.',
      guidedAnswer: 'Bar = £80 (cost). Profit = £20 sits on top. Fraction of bar = 20/80 = 1/4 = 25%. So percentage profit is 25%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Model a best-buy problem with bar models',
          explanation:
            'Draw two bars: one for Pack A (6 items, £2.40) and one for Pack B (10 items, £3.50). Divide each bar into equal parts for each item. Pack A parts are 40p wide, Pack B parts are 35p wide. The narrower part is the better buy.',
          checkpointQuestion: 'Pack A: 6 for £2.40 (40p each). Pack B: 10 for £3.50 (35p each). Which bar has narrower parts?',
          checkpointOptions: ['Pack B', 'Pack A', 'They are equal', 'Cannot tell'],
          checkpointAnswer: 'Pack B',
        },
        {
          stepOrder: 2,
          title: 'Visualise successive discounts',
          explanation:
            'Start with a £45 bar. After 20% off, shade 80% of the bar → £36. Draw a new bar of £36. After 10% off, shade 90% of this bar → £32.40. Two separate bars show that the second discount is smaller because it applies to a smaller amount.',
          checkpointQuestion: '20% off £45, then 10% off the result. What is the final price?',
          checkpointOptions: ['£32.40', '£31.50', '£36', '£30'],
          checkpointAnswer: '£32.40',
        },
        {
          stepOrder: 3,
          title: 'Visualise percentage profit',
          explanation:
            'Draw a bar for the cost price (£80). The selling price (£100) extends £20 beyond the bar. The profit fraction = 20/80 = 1/4 = 25%. The bar model shows the profit as a portion of the cost, not of the selling price.',
          checkpointQuestion: 'Buy for £80, sell for £100. What is the percentage profit?',
          checkpointOptions: ['25%', '20%', '80%', '100%'],
          checkpointAnswer: '25%',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students incorrectly add successive discounts together instead of applying them one at a time, or confuse cost price with selling price when calculating percentage profit.',
      workedExample:
        'Error: "20% off then 10% off = 30% off → £45 × 0.70 = £31.50". Correct: £45 × 0.80 = £36, then £36 × 0.90 = £32.40.',
      guidedPrompt: 'A student says 20% off then 10% off £45 is £31.50. What mistake did they make?',
      guidedAnswer: 'They added 20% + 10% = 30% and found 30% off £45. Correct: apply each discount in turn — £45 × 0.80 = £36, then £36 × 0.90 = £32.40.',
      steps: [
        {
          stepOrder: 1,
          title: 'Spot the combined-discount error',
          explanation:
            'A common mistake is to add the discount percentages: "20% + 10% = 30% off". This gives £45 × 0.70 = £31.50. But the 10% discount applies to the reduced price, not the original. The correct answer is £32.40, not £31.50.',
          checkpointQuestion: 'A student adds 20% + 10% = 30% and gets £31.50 off £45. Is this correct?',
          checkpointOptions: ['No — the answer is £32.40', 'Yes — that is correct', 'No — the answer is £36', 'No — the answer is £30'],
          checkpointAnswer: 'No — the answer is £32.40',
        },
        {
          stepOrder: 2,
          title: 'Show the correct successive-discount method',
          explanation:
            'Apply each discount in order. First: £45 × 0.80 = £36. Second: £36 × 0.90 = £32.40. The combined multiplier is 0.80 × 0.90 = 0.72, not 0.70. So the effective discount is 28%, not 30%.',
          checkpointQuestion: 'What is the combined multiplier for 20% off then 10% off?',
          checkpointOptions: ['0.72', '0.70', '0.30', '0.80'],
          checkpointAnswer: '0.72',
        },
        {
          stepOrder: 3,
          title: 'Correct the percentage profit error',
          explanation:
            'When finding percentage profit, divide profit by cost price, not selling price. Buy for £80, sell for £100. Profit = £20. Correct: 20 ÷ 80 × 100 = 25%. Wrong: 20 ÷ 100 × 100 = 20%. The cost price is always the base for profit calculations.',
          checkpointQuestion: 'Buy for £80, sell for £100. What is the percentage profit?',
          checkpointOptions: ['25%', '20%', '80%', '100%'],
          checkpointAnswer: '25%',
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

  console.log('\n✅ ensured explanation routes for N6.1–N6.20');
}

// Only execute when run directly (not when imported by tests/other modules).
// We guard on DATABASE_URL rather than require.main because vitest transforms
// to ESM where CommonJS module globals are unavailable.
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
