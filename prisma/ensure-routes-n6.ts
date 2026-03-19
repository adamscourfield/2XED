/**
 * ensure-routes-n6.ts
 *
 * Seeds explanation routes (A / B / C) for:
 *   N6.1 — Multiply a fraction by an integer
 *   N6.2 — Multiply a fraction by a fraction
 *   N6.3 — Divide a fraction by an integer
 *   N6.4 — Divide an integer by a fraction
 *   N6.5 — Divide a fraction by a fraction
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

  console.log('\n✅ ensured explanation routes for N6.1–N6.5');
}

// Only execute when run directly (not when imported by tests/other modules).
// We guard on DATABASE_URL rather than require.main because vitest transforms
// to ESM where CommonJS module globals are unavailable.
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
