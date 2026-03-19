/**
 * ensure-routes-n5.ts
 *
 * Seeds explanation routes (A / B / C) for N5.1–N5.12 (Fractions).
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-n5.ts
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
  /* ────────────────────────────────────────────────────────────── */
  /*  N5.1 — Concept of a fraction                                 */
  /* ────────────────────────────────────────────────────────────── */
  'N5.1': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students may confuse numerator and denominator or count total parts incorrectly when shading shapes.',
      workedExample: 'A rectangle is split into 5 equal parts and 2 are shaded. The fraction shaded is 2/5. The denominator (5) counts the total equal parts; the numerator (2) counts the shaded parts.',
      guidedPrompt: 'A circle is split into 8 equal parts. 3 are shaded. Write the fraction shaded.',
      guidedAnswer: '3/8',
      steps: [
        {
          stepOrder: 1,
          title: 'Denominator = total equal parts',
          explanation: 'Count all the equal parts the shape or bar is divided into. This number goes on the bottom of the fraction (the denominator).',
          checkpointQuestion: 'A bar is divided into 6 equal sections. What is the denominator?',
          checkpointOptions: ['3', '6', '12'],
          checkpointAnswer: '6',
        },
        {
          stepOrder: 2,
          title: 'Numerator = selected parts',
          explanation: 'Count the parts that are shaded, selected, or described. This number goes on the top of the fraction (the numerator). Write the fraction as numerator/denominator.',
          checkpointQuestion: 'A shape has 10 equal parts and 7 are shaded. Write the fraction shaded.',
          checkpointAnswer: '7/10',
        },
        {
          stepOrder: 3,
          title: 'Place a fraction on a number line',
          explanation: 'To place a fraction on a number line from 0 to 1, split the line into equal sections matching the denominator. Count along from 0 by the number of the numerator. For example, 3/5 means split into 5 sections and count 3 from 0.',
          checkpointQuestion: 'Where does 2/4 sit on a number line between 0 and 1?',
          checkpointOptions: ['One quarter of the way', 'Halfway', 'Three quarters of the way'],
          checkpointAnswer: 'Halfway',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students may not realise parts must be equal for the fraction to be valid.',
      workedExample: 'A bar model shows 4 equal sections. 1 section is shaded, so the fraction shaded is 1/4. If the sections were unequal, 1/4 would not represent a fixed amount.',
      guidedPrompt: 'Draw a bar model to represent 3/5. How many equal parts does the bar need?',
      guidedAnswer: '5 equal parts, with 3 of them shaded.',
      steps: [
        {
          stepOrder: 1,
          title: 'Equal parts matter',
          explanation: 'A fraction only makes sense when the whole is split into equal parts. A bar model helps you see this: each section must be the same width.',
          checkpointQuestion: 'True or false: a shape split into unequal parts can still show an accurate fraction.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Reading a bar model',
          explanation: 'A bar model is a rectangle divided into equal parts. To read the fraction: count the total parts (denominator) and the shaded parts (numerator).',
          checkpointQuestion: 'A bar model has 8 equal parts and 5 are shaded. What fraction is shaded?',
          checkpointAnswer: '5/8',
        },
        {
          stepOrder: 3,
          title: 'Connecting to a number line',
          explanation: 'A bar model and a number line both show the same fraction. The bar model shows area; the number line shows position. 3/8 shaded on a bar is at the same point as 3/8 on a number line.',
          checkpointQuestion: 'Which is further from 0 on a number line: 2/5 or 4/5?',
          checkpointOptions: ['2/5', '4/5'],
          checkpointAnswer: '4/5',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students count unshaded parts as the numerator, or write the fraction upside-down.',
      workedExample: 'A shape has 6 equal parts and 2 are shaded. A student writes 4/6 (counting unshaded). Correct: 2/6. Another writes 6/2 (swapping). Correct: 2/6.',
      guidedPrompt: 'A shape has 5 equal parts and 3 are shaded. A student writes 2/5. Explain the error.',
      guidedAnswer: 'The student counted the unshaded parts (2) instead of the shaded parts (3). The correct fraction is 3/5.',
      steps: [
        {
          stepOrder: 1,
          title: 'Counting the right parts',
          explanation: 'The numerator must match what the question asks about: if it says "shaded", count shaded parts. A common error is counting the unshaded parts instead.',
          checkpointQuestion: 'A circle has 8 equal parts and 5 are shaded. A student writes 3/8. What did they do wrong?',
          checkpointAnswer: 'They counted the unshaded parts (3) instead of the shaded parts (5). The correct answer is 5/8.',
        },
        {
          stepOrder: 2,
          title: 'Fraction not upside-down',
          explanation: 'The numerator (top) is the selected parts and the denominator (bottom) is the total parts. Writing them the wrong way round gives a completely different value, often greater than 1.',
          checkpointQuestion: 'Is 7/3 the same as 3/7?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 3,
          title: 'Sense-check with a number line',
          explanation: 'If you shade fewer than half the parts, the fraction should be less than 1/2 on the number line. Use this to spot errors.',
          checkpointQuestion: 'A bar has 10 parts and 3 are shaded. Should the fraction be more or less than 1/2?',
          checkpointOptions: ['More than 1/2', 'Less than 1/2'],
          checkpointAnswer: 'Less than 1/2',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.2 — Equivalent fractions                                  */
  /* ────────────────────────────────────────────────────────────── */
  'N5.2': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students add to numerator and denominator instead of multiplying to create equivalents.',
      workedExample: '2/3 = ?/12. Scale factor: 12 ÷ 3 = 4. Multiply numerator: 2 × 4 = 8. So 2/3 = 8/12.',
      guidedPrompt: 'Complete: 3/5 = ?/20',
      guidedAnswer: '12/20 (scale factor 20 ÷ 5 = 4, so 3 × 4 = 12)',
      steps: [
        {
          stepOrder: 1,
          title: 'Multiply both parts by the same number',
          explanation: 'To generate an equivalent fraction, multiply the numerator and denominator by the same whole number. This is the same as multiplying by 1 (e.g. 3/3 = 1).',
          checkpointQuestion: 'Complete: 1/4 = ?/12',
          checkpointAnswer: '3/12',
        },
        {
          stepOrder: 2,
          title: 'Find the scale factor',
          explanation: 'To find the missing numerator or denominator, divide the known new denominator by the original denominator to get the scale factor. Then multiply the numerator by that factor.',
          checkpointQuestion: 'Complete: 2/7 = ?/21',
          checkpointAnswer: '6/21',
        },
        {
          stepOrder: 3,
          title: 'Integers as fractions',
          explanation: 'Any integer can be written as a fraction with denominator 1. For example, 5 = 5/1. You can then create equivalents: 5/1 = 10/2 = 15/3.',
          checkpointQuestion: 'Write 3 as a fraction with denominator 4.',
          checkpointAnswer: '12/4',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not see that equivalent fractions represent the same amount.',
      workedExample: 'A bar split into 4 parts with 2 shaded (2/4) looks the same as a bar split into 2 parts with 1 shaded (1/2). Both cover the same area — they are equivalent.',
      guidedPrompt: 'Use a diagram to show why 3/6 = 1/2.',
      guidedAnswer: 'A bar split into 6 parts with 3 shaded covers the same area as a bar split into 2 parts with 1 shaded. Both are exactly half.',
      steps: [
        {
          stepOrder: 1,
          title: 'Same area, different pieces',
          explanation: 'Equivalent fractions cover the same portion of a whole. Imagine cutting a cake into more slices — you get more, smaller pieces, but the total amount is unchanged.',
          checkpointQuestion: 'True or false: 4/8 and 1/2 represent the same amount.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Showing equivalence on a number line',
          explanation: 'Place both fractions on a number line. If they land at the same point, they are equivalent. 2/6 and 1/3 both sit at the same position — one third of the way from 0 to 1.',
          checkpointQuestion: 'Which fraction is equivalent to 4/10?',
          checkpointOptions: ['1/3', '2/5', '3/7'],
          checkpointAnswer: '2/5',
        },
        {
          stepOrder: 3,
          title: 'Finding missing numbers',
          explanation: 'To find a missing numerator or denominator in an equivalence, determine what you multiplied or divided one part by, then apply the same operation to the other part.',
          checkpointQuestion: 'Complete: 5/? = 10/16',
          checkpointAnswer: '5/8',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students add the same number to top and bottom instead of multiplying.',
      workedExample: 'A student says 1/3 = 3/5 (added 2 to both). Check: 1 × 5 = 5 but 3 × 3 = 9, so 5 ≠ 9. They are not equivalent. Correct: 1/3 = 2/6 (multiplied by 2).',
      guidedPrompt: 'A student claims 2/5 = 4/7 by adding 2 to both parts. Explain the error.',
      guidedAnswer: 'Adding the same number changes the ratio. 2/5 = 0.4 but 4/7 ≈ 0.571. You must multiply: 2/5 = 4/10.',
      steps: [
        {
          stepOrder: 1,
          title: 'Why adding does not work',
          explanation: 'Adding the same number to numerator and denominator changes the value of the fraction. For example, 1/2 + 1 to both gives 2/3, but 1/2 ≠ 2/3.',
          checkpointQuestion: 'A student says 1/4 = 2/5. Is this correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Use multiplication instead',
          explanation: 'To create an equivalent fraction, always multiply (or divide) both numerator and denominator by the same number. This keeps the ratio the same.',
          checkpointQuestion: 'Complete: 3/4 = ?/16',
          checkpointAnswer: '12/16',
        },
        {
          stepOrder: 3,
          title: 'Cross-multiply to verify',
          explanation: 'To check if two fractions are equivalent, cross-multiply: a/b = c/d if and only if a × d = b × c.',
          checkpointQuestion: 'Are 3/8 and 9/24 equivalent? Use cross-multiplication.',
          checkpointAnswer: 'Yes. 3 × 24 = 72 and 8 × 9 = 72.',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.3 — Place, compare, and order fractions                   */
  /* ────────────────────────────────────────────────────────────── */
  'N5.3': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students compare fractions by looking at numerators or denominators alone without finding a common denominator.',
      workedExample: 'Compare 2/3 and 3/5. LCD = 15. 2/3 = 10/15, 3/5 = 9/15. Since 10 > 9, 2/3 > 3/5.',
      guidedPrompt: 'Which is larger: 3/4 or 5/6? Show your working.',
      guidedAnswer: 'LCD = 12. 3/4 = 9/12, 5/6 = 10/12. Since 10 > 9, 5/6 is larger.',
      steps: [
        {
          stepOrder: 1,
          title: 'Find a common denominator',
          explanation: 'To compare fractions, rewrite them with the same denominator. Find the Lowest Common Denominator (LCD) — the LCM of the two denominators.',
          checkpointQuestion: 'What is the LCD of 1/3 and 1/4?',
          checkpointAnswer: '12',
        },
        {
          stepOrder: 2,
          title: 'Rewrite and compare numerators',
          explanation: 'Once both fractions have the same denominator, the one with the larger numerator is the larger fraction.',
          checkpointQuestion: 'Which is larger: 2/5 or 3/10?',
          checkpointAnswer: '2/5 (because 2/5 = 4/10, and 4/10 > 3/10)',
        },
        {
          stepOrder: 3,
          title: 'Ordering more than two fractions',
          explanation: 'To order several fractions, convert them all to the same denominator, then arrange by numerator.',
          checkpointQuestion: 'Put these in order from smallest to largest: 1/2, 2/3, 1/4.',
          checkpointAnswer: '1/4, 1/2, 2/3',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students may think a larger denominator always means a larger fraction.',
      workedExample: 'On a number line, 1/3 is further from 0 than 1/5, even though 5 > 3. A larger denominator means each part is smaller.',
      guidedPrompt: 'Place 1/3 and 1/5 on a number line. Which is larger?',
      guidedAnswer: '1/3 is larger. The number line shows 1/3 further from 0 because thirds are bigger pieces than fifths.',
      steps: [
        {
          stepOrder: 1,
          title: 'Larger denominator = smaller pieces',
          explanation: 'When the numerator is the same, a larger denominator means smaller parts. 1/5 < 1/4 < 1/3 < 1/2.',
          checkpointQuestion: 'Which is larger: 1/6 or 1/8?',
          checkpointOptions: ['1/6', '1/8'],
          checkpointAnswer: '1/6',
        },
        {
          stepOrder: 2,
          title: 'Using a number line to compare',
          explanation: 'Place fractions on a number line between 0 and 1. The fraction further to the right is larger. This gives a visual way to compare without calculation.',
          checkpointQuestion: 'On a number line, is 3/8 to the left or right of 1/2?',
          checkpointOptions: ['Left (3/8 < 1/2)', 'Right (3/8 > 1/2)'],
          checkpointAnswer: 'Left (3/8 < 1/2)',
        },
        {
          stepOrder: 3,
          title: 'Comparing to benchmarks',
          explanation: 'Compare fractions to simple benchmarks like 0, 1/2, and 1. For example, 3/7 is less than 1/2 (since 3 < half of 7), and 5/8 is more than 1/2 (since 5 > half of 8).',
          checkpointQuestion: 'Is 4/9 more or less than 1/2?',
          checkpointOptions: ['More than 1/2', 'Less than 1/2'],
          checkpointAnswer: 'Less than 1/2',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students compare numerators alone (e.g. 3/8 > 2/3 because 3 > 2).',
      workedExample: 'A student says 3/8 > 2/3 because 3 > 2. Error: different denominators. Convert: 3/8 = 9/24, 2/3 = 16/24. Actually 2/3 > 3/8.',
      guidedPrompt: 'A student says 3/5 > 4/7 because "the denominators are close and 3 and 4 are close". Show the correct comparison.',
      guidedAnswer: 'LCD = 35. 3/5 = 21/35, 4/7 = 20/35. So 3/5 > 4/7 — the student got the right answer but used wrong reasoning.',
      steps: [
        {
          stepOrder: 1,
          title: 'Why you cannot just compare numerators',
          explanation: 'Numerators only compare directly when the denominators are the same. 3/8 and 2/3 have different denominators, so comparing 3 and 2 is meaningless.',
          checkpointQuestion: 'True or false: 5/12 > 3/7 because 5 > 3.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Convert then compare',
          explanation: 'Always convert to a common denominator before comparing. Then the numerators tell you the order.',
          checkpointQuestion: 'Which is larger: 5/12 or 3/7? Convert to a common denominator.',
          checkpointAnswer: '3/7 (5/12 = 35/84, 3/7 = 36/84, so 3/7 is larger)',
        },
        {
          stepOrder: 3,
          title: 'Check with a benchmark',
          explanation: 'As a quick check, compare each fraction to 1/2. If one is above 1/2 and the other below, the answer is immediate.',
          checkpointQuestion: 'Without converting, which is larger: 5/9 or 3/8?',
          checkpointOptions: ['5/9', '3/8'],
          checkpointAnswer: '5/9',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.4 — Simplify fractions                                    */
  /* ────────────────────────────────────────────────────────────── */
  'N5.4': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students partially simplify and stop, or do not find the HCF.',
      workedExample: 'Simplify 18/24. HCF(18, 24) = 6. 18 ÷ 6 = 3, 24 ÷ 6 = 4. So 18/24 = 3/4.',
      guidedPrompt: 'Simplify 20/30.',
      guidedAnswer: '2/3 (HCF = 10, so 20 ÷ 10 = 2 and 30 ÷ 10 = 3)',
      steps: [
        {
          stepOrder: 1,
          title: 'Find the HCF',
          explanation: 'List factors of numerator and denominator, or use prime factorisation. The HCF is the largest number that divides into both.',
          checkpointQuestion: 'What is the HCF of 12 and 18?',
          checkpointAnswer: '6',
        },
        {
          stepOrder: 2,
          title: 'Divide both parts by the HCF',
          explanation: 'Divide numerator and denominator by the HCF. This gives the simplest form in one step.',
          checkpointQuestion: 'Simplify 12/18.',
          checkpointAnswer: '2/3',
        },
        {
          stepOrder: 3,
          title: 'Confirm simplest form',
          explanation: 'A fraction is fully simplified when the HCF of numerator and denominator is 1. Check that no number other than 1 divides into both.',
          checkpointQuestion: 'Simplify 15/25.',
          checkpointAnswer: '3/5',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students think simplifying changes the value of the fraction.',
      workedExample: 'On a number line, 6/8 and 3/4 sit at exactly the same point — they represent the same amount. Simplifying just rewrites the fraction with smaller numbers.',
      guidedPrompt: 'Explain why 8/12 and 2/3 are the same fraction.',
      guidedAnswer: 'Both represent two thirds of the whole. 8/12 ÷ 4 top and bottom = 2/3. On a bar model, 8 out of 12 equal parts covers the same area as 2 out of 3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Simplifying preserves value',
          explanation: 'Dividing numerator and denominator by the same number is the same as dividing by 1 (e.g. 4/4 = 1). So the fraction keeps its value.',
          checkpointQuestion: 'True or false: 10/15 and 2/3 are equal in value.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Visualising with bar models',
          explanation: 'Draw two bars: one split into 12 parts with 8 shaded, one split into 3 parts with 2 shaded. The shaded area is the same — proving they are equivalent.',
          checkpointQuestion: 'Which fraction is equivalent to 9/12 in simplest form?',
          checkpointOptions: ['2/3', '3/4', '4/5'],
          checkpointAnswer: '3/4',
        },
        {
          stepOrder: 3,
          title: 'Why simplest form is useful',
          explanation: 'Simplest form makes fractions easier to compare and use in calculations. It is easier to see that 2/3 > 1/2 than to compare 8/12 and 6/12.',
          checkpointQuestion: 'Simplify 14/21.',
          checkpointAnswer: '2/3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students stop simplifying too early, before reaching simplest form.',
      workedExample: 'A student simplifies 24/36 to 12/18 (÷ 2) and stops. But 12/18 simplifies further: HCF(12, 18) = 6 → 2/3. Better: use HCF(24, 36) = 12 to get 2/3 in one step.',
      guidedPrompt: 'A student simplifies 16/24 to 8/12 and says they are done. What should they do?',
      guidedAnswer: '8/12 is not fully simplified. HCF(8, 12) = 4. 8 ÷ 4 = 2, 12 ÷ 4 = 3. Simplest form is 2/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Recognise incomplete simplification',
          explanation: 'After each simplification step, ask: do the new numerator and denominator share any common factor greater than 1? If yes, you have not finished.',
          checkpointQuestion: 'A student simplifies 20/30 to 10/15. Is this fully simplified?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Use the HCF for a one-step simplification',
          explanation: 'Rather than dividing by small factors repeatedly, find the HCF and divide by it once. This always reaches simplest form in a single step.',
          checkpointQuestion: 'Simplify 20/30 in one step using the HCF.',
          checkpointAnswer: '2/3',
        },
        {
          stepOrder: 3,
          title: 'Verify with HCF = 1',
          explanation: 'The fraction is fully simplified when the HCF of the numerator and denominator is 1.',
          checkpointQuestion: 'Is 5/9 fully simplified? How do you know?',
          checkpointAnswer: 'Yes — the HCF of 5 and 9 is 1.',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.5 — Express one quantity as a fraction of another         */
  /* ────────────────────────────────────────────────────────────── */
  'N5.5': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students put the quantities the wrong way round in the fraction, or forget to use the same units.',
      workedExample: 'Express 20 minutes as a fraction of 1 hour. Convert: 1 hour = 60 minutes. Fraction = 20/60 = 1/3.',
      guidedPrompt: 'Express 30 cm as a fraction of 1 metre.',
      guidedAnswer: '30/100 = 3/10',
      steps: [
        {
          stepOrder: 1,
          title: 'Part over whole',
          explanation: 'To express one quantity as a fraction of another, write: part / whole. The "part" is the smaller quantity you are describing; the "whole" is the quantity you are comparing to.',
          checkpointQuestion: 'Express 8 as a fraction of 20.',
          checkpointAnswer: '8/20',
        },
        {
          stepOrder: 2,
          title: 'Use the same units',
          explanation: 'Both quantities must be in the same units before writing the fraction. Convert if necessary (e.g. metres to centimetres, hours to minutes).',
          checkpointQuestion: 'Express 15 minutes as a fraction of 1 hour.',
          checkpointAnswer: '15/60',
        },
        {
          stepOrder: 3,
          title: 'Simplify the result',
          explanation: 'After writing the fraction, simplify it. 15/60 → HCF = 15 → 1/4.',
          checkpointQuestion: 'Express 15 minutes as a fraction of 1 hour. Give your answer in simplest form.',
          checkpointAnswer: '1/4',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students struggle to see a fraction as a comparison of two quantities.',
      workedExample: 'Think of a bar model: the whole bar is 60 minutes (1 hour). Shade 20 minutes. The shaded part is 20 out of 60, or 20/60 = 1/3.',
      guidedPrompt: 'Use a bar model to express 25 cm as a fraction of 1 metre.',
      guidedAnswer: 'Draw a bar of length 100 cm. Shade 25 cm. The fraction is 25/100 = 1/4.',
      steps: [
        {
          stepOrder: 1,
          title: 'The whole as a bar',
          explanation: 'Draw a bar to represent the total amount (the whole). Then shade the part you want to express as a fraction. The fraction is shaded / total.',
          checkpointQuestion: 'A bag has 40 sweets. 10 are red. What fraction are red?',
          checkpointAnswer: '10/40',
        },
        {
          stepOrder: 2,
          title: 'Converting units visually',
          explanation: 'If the units differ, relabel the bar. A 1-metre bar becomes 100 cm. Now both quantities use the same label.',
          checkpointQuestion: 'Express 200 g as a fraction of 1 kg. (1 kg = 1000 g)',
          checkpointAnswer: '200/1000',
        },
        {
          stepOrder: 3,
          title: 'Simplify for a cleaner answer',
          explanation: 'Always simplify the fraction at the end. 200/1000 = 1/5.',
          checkpointQuestion: 'Simplify 200/1000.',
          checkpointAnswer: '1/5',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students write the fraction upside-down (whole over part) or forget to convert units.',
      workedExample: 'Express 20 minutes as a fraction of 1 hour. A student writes 60/20 = 3. Error: the part goes on top. Correct: 20/60 = 1/3.',
      guidedPrompt: 'A student expresses 50 cm as a fraction of 2 metres by writing 50/2. Explain the error.',
      guidedAnswer: 'The student did not convert to the same units. 2 metres = 200 cm. Correct fraction: 50/200 = 1/4.',
      steps: [
        {
          stepOrder: 1,
          title: 'Part on top, whole on bottom',
          explanation: 'The quantity being described goes on top (numerator). The quantity you compare it to goes on the bottom (denominator). Getting this backwards gives a reciprocal.',
          checkpointQuestion: 'Express 5 as a fraction of 25. Which is correct: 5/25 or 25/5?',
          checkpointOptions: ['5/25', '25/5'],
          checkpointAnswer: '5/25',
        },
        {
          stepOrder: 2,
          title: 'Same units are essential',
          explanation: 'You cannot write 50 cm / 2 m directly. Convert both to the same unit first: 2 m = 200 cm, so the fraction is 50/200.',
          checkpointQuestion: 'Express 300 g as a fraction of 2 kg in simplest form.',
          checkpointAnswer: '3/20',
        },
        {
          stepOrder: 3,
          title: 'Check: is the answer reasonable?',
          explanation: '50 cm is a quarter of 200 cm, so 1/4 makes sense. If your answer were greater than 1, the part would be bigger than the whole — a sign of an error.',
          checkpointQuestion: 'A student says 40 minutes is 3/2 of an hour. Is this reasonable?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.6 — Mixed numbers and improper fractions                  */
  /* ────────────────────────────────────────────────────────────── */
  'N5.6': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students multiply the whole number by the numerator instead of the denominator when converting to improper fractions.',
      workedExample: 'Convert 2 3/4 to an improper fraction. Multiply whole × denominator: 2 × 4 = 8. Add numerator: 8 + 3 = 11. Keep denominator: 11/4.',
      guidedPrompt: 'Convert 3 2/5 to an improper fraction.',
      guidedAnswer: '17/5 (3 × 5 = 15, 15 + 2 = 17, denominator stays 5)',
      steps: [
        {
          stepOrder: 1,
          title: 'Mixed to improper: multiply and add',
          explanation: 'To convert a mixed number to an improper fraction: (1) multiply the whole number by the denominator, (2) add the numerator, (3) write over the original denominator.',
          checkpointQuestion: 'Convert 1 3/4 to an improper fraction.',
          checkpointAnswer: '7/4',
        },
        {
          stepOrder: 2,
          title: 'Improper to mixed: divide',
          explanation: 'To convert an improper fraction to a mixed number, divide numerator by denominator. The quotient is the whole number; the remainder is the new numerator.',
          checkpointQuestion: 'Convert 13/5 to a mixed number.',
          checkpointAnswer: '2 3/5',
        },
        {
          stepOrder: 3,
          title: 'Integers as fractions',
          explanation: 'Any integer can be written as a fraction with denominator 1: 4 = 4/1. Or with any denominator: 4 = 8/2 = 12/3 = 16/4.',
          checkpointQuestion: 'Write 6 as a fraction with denominator 3.',
          checkpointAnswer: '18/3',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not understand what a mixed number means visually.',
      workedExample: 'Draw 2 3/4: two full bars (each split into 4 parts, all shaded) plus a third bar with 3 out of 4 parts shaded. Total shaded: 8 + 3 = 11 quarter-parts → 11/4.',
      guidedPrompt: 'Draw a diagram to represent 1 2/3 and then convert it to an improper fraction.',
      guidedAnswer: 'One full bar (3/3) plus 2/3 of a second bar = 3 + 2 = 5 third-parts → 5/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Visualise the mixed number',
          explanation: 'A mixed number shows whole units plus a fractional part. Draw whole bars fully shaded and one partially shaded bar for the fraction.',
          checkpointQuestion: 'How many whole bars and how many extra parts does 3 1/2 show?',
          checkpointAnswer: '3 whole bars and 1 half-part',
        },
        {
          stepOrder: 2,
          title: 'Count all the parts',
          explanation: 'Each whole bar has (denominator) parts. Total parts = whole × denominator + numerator. This gives the improper fraction.',
          checkpointQuestion: 'Convert 2 1/3 to an improper fraction using a diagram.',
          checkpointAnswer: '7/3',
        },
        {
          stepOrder: 3,
          title: 'Splitting an improper fraction back',
          explanation: 'To convert back, group the parts into complete wholes. 11/4: every 4 parts make a whole → 2 wholes (8 parts) with 3 left over → 2 3/4.',
          checkpointQuestion: 'Convert 10/3 to a mixed number.',
          checkpointAnswer: '3 1/3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students multiply by the numerator instead of the denominator, or forget to add the numerator.',
      workedExample: 'Convert 3 2/5. Wrong: 3 × 2 = 6, then 6/5. Correct: 3 × 5 = 15, 15 + 2 = 17, so 17/5.',
      guidedPrompt: 'A student converts 2 3/7 and writes 6/7. Explain the error and give the correct answer.',
      guidedAnswer: 'The student multiplied 2 × 3 = 6 instead of 2 × 7 = 14. Correct: 14 + 3 = 17, so 17/7.',
      steps: [
        {
          stepOrder: 1,
          title: 'The multiplication error',
          explanation: 'A common mistake is multiplying the whole number by the numerator instead of the denominator. Remember: whole × denominator (bottom number), then add the numerator.',
          checkpointQuestion: 'A student converts 4 1/3 and writes 4/3. What did they forget?',
          checkpointAnswer: 'They forgot to multiply 4 × 3 = 12 and then add 1. The correct answer is 13/3.',
        },
        {
          stepOrder: 2,
          title: 'The addition step',
          explanation: 'After multiplying whole × denominator, you must add the numerator. Forgetting this step gives a whole number of parts but misses the fractional part.',
          checkpointQuestion: 'Convert 5 2/3 to an improper fraction.',
          checkpointAnswer: '17/3',
        },
        {
          stepOrder: 3,
          title: 'Check by converting back',
          explanation: 'Always verify by converting the improper fraction back to a mixed number. If you get the original mixed number, your answer is correct.',
          checkpointQuestion: 'Convert 23/4 to a mixed number to check.',
          checkpointAnswer: '5 3/4',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.7 — Add fractions                                         */
  /* ────────────────────────────────────────────────────────────── */
  'N5.7': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students add numerators and denominators separately (e.g. 1/3 + 1/4 = 2/7).',
      workedExample: '1/3 + 1/4: LCD = 12. 1/3 = 4/12, 1/4 = 3/12. 4/12 + 3/12 = 7/12.',
      guidedPrompt: 'Calculate 2/5 + 1/3.',
      guidedAnswer: 'LCD = 15. 2/5 = 6/15, 1/3 = 5/15. 6/15 + 5/15 = 11/15.',
      steps: [
        {
          stepOrder: 1,
          title: 'Same denominator: add numerators',
          explanation: 'When fractions have the same denominator, add the numerators and keep the denominator. For example, 2/7 + 3/7 = 5/7.',
          checkpointQuestion: 'Calculate 3/8 + 4/8.',
          checkpointAnswer: '7/8',
        },
        {
          stepOrder: 2,
          title: 'Different denominators: find the LCD',
          explanation: 'When denominators differ, find the Lowest Common Denominator (LCD) by finding the LCM of the denominators. Rewrite each fraction with the LCD.',
          checkpointQuestion: 'What is the LCD of 1/4 and 1/6?',
          checkpointAnswer: '12',
        },
        {
          stepOrder: 3,
          title: 'Rewrite, add, and simplify',
          explanation: 'Rewrite both fractions using the LCD, add the numerators, and simplify the result if possible.',
          checkpointQuestion: 'Calculate 1/4 + 1/6.',
          checkpointAnswer: '5/12',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not see why a common denominator is necessary for addition.',
      workedExample: 'Imagine two bars: one split into thirds (1/3 shaded) and one split into quarters (1/4 shaded). You cannot combine unlike pieces. Split both bars into twelfths: 4/12 + 3/12 = 7/12.',
      guidedPrompt: 'Use a diagram to explain why 1/2 + 1/3 is not 2/5.',
      guidedAnswer: 'A bar split into 2 with 1 shaded (1/2) and a bar split into 3 with 1 shaded (1/3): combined shading is more than 2/5 of a single bar. Common denominator 6: 3/6 + 2/6 = 5/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Why same-sized pieces matter',
          explanation: 'You can only add fractions when the pieces are the same size (same denominator). Think of it like adding different units — you cannot add 2 apples + 3 oranges and get 5 apples.',
          checkpointQuestion: 'True or false: you can add 1/3 + 2/5 directly without changing the denominators.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Visualise with equal pieces',
          explanation: 'Convert both fractions to the same size pieces. A bar split into 15ths lets you add fifths and thirds because 1/5 = 3/15 and 1/3 = 5/15.',
          checkpointQuestion: 'Rewrite 2/5 and 1/3 with denominator 15.',
          checkpointAnswer: '6/15 and 5/15',
        },
        {
          stepOrder: 3,
          title: 'Add and simplify',
          explanation: 'Once the pieces are the same size, add the numerators. Then simplify if possible.',
          checkpointQuestion: 'Calculate 2/5 + 1/3.',
          checkpointAnswer: '11/15',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students add both numerators and denominators (e.g. 1/4 + 2/3 = 3/7).',
      workedExample: 'Wrong: 1/4 + 2/3 = 3/7. Check: 3/7 ≈ 0.43, but 1/4 + 2/3 = 0.25 + 0.67 = 0.92. The error was adding denominators. Correct: LCD = 12 → 3/12 + 8/12 = 11/12.',
      guidedPrompt: 'A student says 1/3 + 1/5 = 2/8. Explain the error and find the correct answer.',
      guidedAnswer: 'You do not add denominators. LCD = 15. 1/3 = 5/15, 1/5 = 3/15. 5/15 + 3/15 = 8/15.',
      steps: [
        {
          stepOrder: 1,
          title: 'Never add the denominators',
          explanation: 'The denominator tells you the size of each piece. Adding denominators changes the piece size and gives a wrong answer. Only numerators are added (after finding a common denominator).',
          checkpointQuestion: 'A student writes 2/5 + 1/4 = 3/9. Is this correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Use the LCD correctly',
          explanation: 'Find the LCD, convert both fractions, then add only the numerators. Keep the denominator the same.',
          checkpointQuestion: 'Calculate 2/5 + 1/4 correctly.',
          checkpointAnswer: '13/20',
        },
        {
          stepOrder: 3,
          title: 'Estimate to check',
          explanation: 'Use decimals or benchmarks to estimate: 2/5 ≈ 0.4 and 1/4 = 0.25, so the answer ≈ 0.65. Check: 13/20 = 0.65. ✓',
          checkpointQuestion: 'Estimate 1/3 + 1/2 and then calculate exactly.',
          checkpointAnswer: '5/6 (estimate: about 0.83; exact: 2/6 + 3/6 = 5/6)',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.8 — Subtract fractions                                    */
  /* ────────────────────────────────────────────────────────────── */
  'N5.8': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students subtract both numerators and denominators, or subtract the larger numerator from the smaller regardless of order.',
      workedExample: '3/4 − 1/3: LCD = 12. 3/4 = 9/12, 1/3 = 4/12. 9/12 − 4/12 = 5/12.',
      guidedPrompt: 'Calculate 5/6 − 1/4.',
      guidedAnswer: 'LCD = 12. 5/6 = 10/12, 1/4 = 3/12. 10/12 − 3/12 = 7/12.',
      steps: [
        {
          stepOrder: 1,
          title: 'Same denominator: subtract numerators',
          explanation: 'When fractions share a denominator, subtract the numerators and keep the denominator. For example, 5/9 − 2/9 = 3/9 = 1/3.',
          checkpointQuestion: 'Calculate 7/10 − 3/10.',
          checkpointAnswer: '4/10',
        },
        {
          stepOrder: 2,
          title: 'Different denominators: find the LCD',
          explanation: 'Find the LCD, convert both fractions, then subtract the numerators.',
          checkpointQuestion: 'What is the LCD of 2/3 and 1/5?',
          checkpointAnswer: '15',
        },
        {
          stepOrder: 3,
          title: 'Subtract and simplify',
          explanation: 'After subtracting, simplify the result if possible.',
          checkpointQuestion: 'Calculate 2/3 − 1/5.',
          checkpointAnswer: '7/15',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not visualise subtraction as removing part of a shaded amount.',
      workedExample: 'Draw a bar for 3/4 (9 twelfths shaded). Remove 1/3 (4 twelfths). Remaining shaded: 5 twelfths = 5/12.',
      guidedPrompt: 'Use a bar model to show 2/3 − 1/4.',
      guidedAnswer: 'Bar of 12 parts: 2/3 = 8/12 shaded. Remove 1/4 = 3/12. Remaining: 5/12.',
      steps: [
        {
          stepOrder: 1,
          title: 'Subtraction as removing pieces',
          explanation: 'Subtracting fractions is like removing some shaded pieces from a bar. You start with the first fraction shaded and remove the amount shown by the second fraction.',
          checkpointQuestion: 'If 5/8 of a bar is shaded and you remove 2/8, what fraction remains shaded?',
          checkpointAnswer: '3/8',
        },
        {
          stepOrder: 2,
          title: 'Make the pieces the same size',
          explanation: 'To subtract fractions with different denominators, split the bar into smaller equal parts that work for both fractions (LCD).',
          checkpointQuestion: 'To subtract 1/2 − 1/3, what size pieces should you use?',
          checkpointOptions: ['Sixths', 'Fifths', 'Halves'],
          checkpointAnswer: 'Sixths',
        },
        {
          stepOrder: 3,
          title: 'Remove and count what remains',
          explanation: 'Convert, shade the first fraction, remove the second, and count what is left.',
          checkpointQuestion: 'Calculate 1/2 − 1/3.',
          checkpointAnswer: '1/6',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students subtract denominators as well as numerators (e.g. 3/4 − 1/3 = 2/1 = 2).',
      workedExample: 'Wrong: 3/4 − 1/3 = 2/1 = 2. Check: 3/4 < 1 so the answer cannot be 2. Correct: LCD = 12, 9/12 − 4/12 = 5/12.',
      guidedPrompt: 'A student says 5/6 − 1/2 = 4/4 = 1. Find the error and give the correct answer.',
      guidedAnswer: 'They subtracted denominators (6 − 2 = 4). Correct: LCD = 6. 5/6 − 3/6 = 2/6 = 1/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Never subtract the denominators',
          explanation: 'The denominator shows the piece size — subtracting it changes the piece size and gives a nonsensical answer. Only subtract the numerators after finding a common denominator.',
          checkpointQuestion: 'A student writes 4/5 − 1/3 = 3/2. Is this correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Correct method: LCD then subtract numerators',
          explanation: 'Find the LCD, rewrite both fractions, subtract only the numerators, and keep the common denominator.',
          checkpointQuestion: 'Calculate 4/5 − 1/3.',
          checkpointAnswer: '7/15',
        },
        {
          stepOrder: 3,
          title: 'Estimate to verify',
          explanation: 'Estimate: 4/5 ≈ 0.8, 1/3 ≈ 0.33. Difference ≈ 0.47. Check: 7/15 ≈ 0.47. ✓ If your answer were greater than the first fraction, something went wrong.',
          checkpointQuestion: 'Estimate 3/4 − 1/5 and then calculate exactly.',
          checkpointAnswer: '11/20 (estimate: 0.75 − 0.2 = 0.55; exact: 15/20 − 4/20 = 11/20)',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.9 — Add fractions with mixed numbers                      */
  /* ────────────────────────────────────────────────────────────── */
  'N5.9': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students add whole numbers and fractions separately without finding a common denominator for the fractional parts.',
      workedExample: '1 2/3 + 2 1/4: wholes = 1 + 2 = 3. Fractions: 2/3 + 1/4 = 8/12 + 3/12 = 11/12. Answer: 3 11/12.',
      guidedPrompt: 'Calculate 2 1/5 + 1 3/10.',
      guidedAnswer: 'Wholes: 2 + 1 = 3. Fractions: 1/5 + 3/10 = 2/10 + 3/10 = 5/10 = 1/2. Answer: 3 1/2.',
      steps: [
        {
          stepOrder: 1,
          title: 'Add the whole numbers',
          explanation: 'First, add the whole-number parts of the mixed numbers together.',
          checkpointQuestion: 'What are the whole-number parts of 3 1/4 + 2 2/3?',
          checkpointAnswer: '3 and 2, which add to 5',
        },
        {
          stepOrder: 2,
          title: 'Add the fractions (common denominator)',
          explanation: 'Find the LCD for the fractional parts. Rewrite and add the numerators.',
          checkpointQuestion: 'Add the fractional parts: 1/4 + 2/3.',
          checkpointAnswer: '11/12',
        },
        {
          stepOrder: 3,
          title: 'Combine and adjust for improper fractions',
          explanation: 'Combine whole number + fraction sum. If the fraction sum is improper (numerator ≥ denominator), convert the extra to a whole number. E.g. 5 + 11/12 = 5 11/12.',
          checkpointQuestion: 'Calculate 2 3/4 + 1 1/2.',
          checkpointAnswer: '4 1/4',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not understand what happens when the fractional parts add to more than 1.',
      workedExample: '2 3/4 + 1 1/2: wholes = 3. Fractions: 3/4 + 1/2 = 3/4 + 2/4 = 5/4 = 1 1/4. Total: 3 + 1 1/4 = 4 1/4.',
      guidedPrompt: 'Use a diagram to calculate 1 2/3 + 1 2/3.',
      guidedAnswer: 'Wholes: 2. Fractions: 2/3 + 2/3 = 4/3 = 1 1/3. Total: 2 + 1 1/3 = 3 1/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Visualise with bars',
          explanation: 'Draw bars for each mixed number. Shade whole bars fully and part of the last bar. To add, combine all the shaded pieces.',
          checkpointQuestion: 'True or false: when adding mixed numbers, the fractional parts can add up to more than 1.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Carrying over from fractions',
          explanation: 'When fractional parts exceed 1, convert the extra into a whole. E.g. 5/4 = 1 + 1/4, so add 1 to the whole number part.',
          checkpointQuestion: '3/5 + 4/5 = 7/5. Express as a mixed number.',
          checkpointAnswer: '1 2/5',
        },
        {
          stepOrder: 3,
          title: 'Put it all together',
          explanation: 'Add wholes, add fractions with LCD, carry over if needed, and simplify.',
          checkpointQuestion: 'Calculate 3 2/3 + 2 5/6.',
          checkpointAnswer: '6 1/2',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students add fractions without a common denominator or forget to carry over when the fractions sum to more than 1.',
      workedExample: 'Wrong: 1 2/3 + 2 1/4 = 3 3/7 (added numerators and denominators). Correct: LCD = 12. 2/3 = 8/12, 1/4 = 3/12. 8 + 3 = 11. Answer: 3 11/12.',
      guidedPrompt: 'A student says 2 3/4 + 1 3/4 = 3 6/4. Are they correct? If not, what should the final answer be?',
      guidedAnswer: '3 6/4 is not in proper form. 6/4 = 1 2/4 = 1 1/2. So the answer is 3 + 1 1/2 = 4 1/2.',
      steps: [
        {
          stepOrder: 1,
          title: 'Common denominator first',
          explanation: 'Before adding the fractional parts, find the LCD. Do not add numerators and denominators separately.',
          checkpointQuestion: 'A student writes 1/3 + 1/5 = 2/8. Is this correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Handle improper fractional sums',
          explanation: 'If the fractional parts add to an improper fraction (like 5/3), convert: 5/3 = 1 2/3 and add the extra 1 to the whole number.',
          checkpointQuestion: 'Convert 7/4 to a mixed number.',
          checkpointAnswer: '1 3/4',
        },
        {
          stepOrder: 3,
          title: 'Full example with carrying',
          explanation: 'Calculate 2 5/6 + 3 2/3: LCD = 6. 5/6 + 4/6 = 9/6 = 1 3/6 = 1 1/2. Total: 5 + 1 1/2 = 6 1/2.',
          checkpointQuestion: 'Calculate 1 3/4 + 2 5/8.',
          checkpointAnswer: '4 3/8',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.10 — Subtract fractions with mixed numbers                */
  /* ────────────────────────────────────────────────────────────── */
  'N5.10': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students subtract the smaller fraction from the larger regardless of which mixed number it belongs to, or fail to borrow.',
      workedExample: '3 1/4 − 1 2/3: Convert to improper fractions. 3 1/4 = 13/4, 1 2/3 = 5/3. LCD = 12: 39/12 − 20/12 = 19/12 = 1 7/12.',
      guidedPrompt: 'Calculate 4 1/3 − 2 3/4.',
      guidedAnswer: 'Convert: 4 1/3 = 13/3, 2 3/4 = 11/4. LCD = 12: 52/12 − 33/12 = 19/12 = 1 7/12.',
      steps: [
        {
          stepOrder: 1,
          title: 'Convert to improper fractions',
          explanation: 'When the fraction being subtracted is larger than the fraction you start with, convert both mixed numbers to improper fractions first. This avoids borrowing errors.',
          checkpointQuestion: 'Convert 3 2/5 to an improper fraction.',
          checkpointAnswer: '17/5',
        },
        {
          stepOrder: 2,
          title: 'Find LCD and subtract',
          explanation: 'Find the LCD of the two denominators, rewrite both improper fractions, then subtract the numerators.',
          checkpointQuestion: 'Calculate 5/3 − 3/4 using LCD = 12.',
          checkpointAnswer: '11/12',
        },
        {
          stepOrder: 3,
          title: 'Convert back to a mixed number',
          explanation: 'If the result is an improper fraction, convert it to a mixed number and simplify.',
          checkpointQuestion: 'Calculate 5 1/6 − 2 1/2.',
          checkpointAnswer: '2 2/3',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not understand borrowing when the fractional part is too small to subtract from.',
      workedExample: '4 1/4 − 1 3/4: you cannot do 1/4 − 3/4. Borrow 1 from the 4 → 3 5/4. Now 5/4 − 3/4 = 2/4 = 1/2. Answer: 3 − 1 + 1/2 = 2 1/2.',
      guidedPrompt: 'Explain using a diagram why 3 1/3 − 1 2/3 requires borrowing.',
      guidedAnswer: 'You have 3 wholes and 1/3. You need to take away 1 whole and 2/3. Since 1/3 < 2/3, borrow 1 whole: 2 wholes and 4/3. Now 4/3 − 2/3 = 2/3. Answer: 2 − 1 + 2/3 = 1 2/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'When borrowing is needed',
          explanation: 'If the fraction you are subtracting is larger than the fraction you start with (e.g. 1/4 − 3/4), you need to borrow 1 from the whole number and convert it to a fraction.',
          checkpointQuestion: 'In 5 1/6 − 2 5/6, do you need to borrow?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'Yes',
        },
        {
          stepOrder: 2,
          title: 'How to borrow',
          explanation: 'Take 1 from the whole number and add it to the fraction as denominator/denominator. For example, 5 1/6 becomes 4 7/6 (since 1 = 6/6 and 6/6 + 1/6 = 7/6).',
          checkpointQuestion: 'Rewrite 3 1/4 after borrowing 1 from the whole.',
          checkpointAnswer: '2 5/4',
        },
        {
          stepOrder: 3,
          title: 'Subtract after borrowing',
          explanation: 'Now subtract the whole numbers and the fractions separately.',
          checkpointQuestion: 'Calculate 5 1/6 − 2 5/6.',
          checkpointAnswer: '2 2/6 or 2 1/3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students swap the fractions to avoid a negative result, getting the wrong answer.',
      workedExample: 'Wrong: 3 1/5 − 1 3/5 → student does 3/5 − 1/5 = 2/5, then 3 − 1 = 2, gives 2 2/5. Correct: borrow → 2 6/5 − 1 3/5 = 1 3/5.',
      guidedPrompt: 'A student calculates 4 1/3 − 2 2/3 = 2 1/3 by subtracting 1/3 from 2/3. Explain the error.',
      guidedAnswer: 'The student reversed the fraction subtraction. Correct: borrow 1 → 3 4/3 − 2 2/3 = 1 2/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Do not swap the fractions',
          explanation: 'You must subtract the second fraction from the first, not the other way around. If the first fraction is smaller, borrow — do not swap.',
          checkpointQuestion: 'In 6 2/7 − 3 5/7, a student writes 5/7 − 2/7 = 3/7. Is this correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Borrow and subtract correctly',
          explanation: 'Rewrite 6 2/7 as 5 9/7 (borrow 1 = 7/7). Now 9/7 − 5/7 = 4/7. Whole numbers: 5 − 3 = 2. Answer: 2 4/7.',
          checkpointQuestion: 'Calculate 6 2/7 − 3 5/7.',
          checkpointAnswer: '2 4/7',
        },
        {
          stepOrder: 3,
          title: 'Alternative: use improper fractions',
          explanation: 'If borrowing feels tricky, convert both to improper fractions, find LCD, subtract, then convert back.',
          checkpointQuestion: 'Calculate 3 1/4 − 1 3/4 using improper fractions.',
          checkpointAnswer: '1 1/2',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.11 — Fractions with negatives (addition and subtraction)  */
  /* ────────────────────────────────────────────────────────────── */
  'N5.11': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students misapply sign rules when adding or subtracting negative fractions.',
      workedExample: '1/4 + (−3/4) = 1/4 − 3/4 = −2/4 = −1/2. Adding a negative is the same as subtracting.',
      guidedPrompt: 'Calculate −2/3 + 1/2.',
      guidedAnswer: 'LCD = 6. −4/6 + 3/6 = −1/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Adding a negative fraction',
          explanation: 'Adding a negative is the same as subtracting. a + (−b) = a − b. Apply this rule, then use the normal fraction subtraction method.',
          checkpointQuestion: 'Rewrite 3/5 + (−1/5) as a subtraction.',
          checkpointAnswer: '3/5 − 1/5',
        },
        {
          stepOrder: 2,
          title: 'Subtracting a negative fraction',
          explanation: 'Subtracting a negative is the same as adding. a − (−b) = a + b. The two negatives cancel.',
          checkpointQuestion: 'Calculate 1/4 − (−1/4).',
          checkpointAnswer: '1/2',
        },
        {
          stepOrder: 3,
          title: 'Different denominators with negatives',
          explanation: 'Find the LCD as usual, then apply the sign rules. Keep track of which fraction is negative.',
          checkpointQuestion: 'Calculate −2/3 + 1/2.',
          checkpointAnswer: '-1/6',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students cannot visualise negative fractions on a number line.',
      workedExample: 'On a number line, −1/2 is halfway between −1 and 0. Adding 3/4 moves right: −1/2 + 3/4 = −2/4 + 3/4 = 1/4. Land at 1/4.',
      guidedPrompt: 'Show −1/3 + 2/3 on a number line.',
      guidedAnswer: 'Start at −1/3 (one third to the left of 0). Move 2/3 to the right. Land at 1/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Negative fractions on the number line',
          explanation: 'Negative fractions sit to the left of 0 on a number line. −1/2 is halfway between −1 and 0; −3/4 is three quarters of the way from 0 to −1.',
          checkpointQuestion: 'Where is −2/5 on a number line?',
          checkpointAnswer: 'Two fifths of the way from 0 towards −1',
        },
        {
          stepOrder: 2,
          title: 'Adding moves right, subtracting moves left',
          explanation: 'Adding a positive fraction moves you right on the number line. Adding a negative (or subtracting a positive) moves you left.',
          checkpointQuestion: 'Start at −1/4. Add 3/4. Where do you end up?',
          checkpointAnswer: '1/2',
        },
        {
          stepOrder: 3,
          title: 'Crossing zero',
          explanation: 'When you add a fraction larger than the distance to 0, you cross zero. −2/5 + 3/5 = 1/5 (crossed from negative to positive).',
          checkpointQuestion: 'Calculate −3/8 + 5/8.',
          checkpointAnswer: '2/8 or 1/4',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students ignore the negative sign or always make the answer positive.',
      workedExample: 'Wrong: −2/3 + 1/4 = 2/3 + 1/4 = 11/12 (ignored negative). Correct: LCD = 12. −8/12 + 3/12 = −5/12.',
      guidedPrompt: 'A student says −1/2 + 1/3 = 5/6. Explain the error.',
      guidedAnswer: 'They ignored the negative sign on 1/2. Correct: LCD = 6. −3/6 + 2/6 = −1/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Keep the negative sign',
          explanation: 'A negative fraction stays negative through the calculation. When converting to a common denominator, the sign applies to the numerator: −2/3 = −8/12.',
          checkpointQuestion: 'Rewrite −3/4 with denominator 12.',
          checkpointAnswer: '-9/12',
        },
        {
          stepOrder: 2,
          title: 'Determine the sign of the answer',
          explanation: 'After converting, add the signed numerators. If the negative part is larger in magnitude, the answer is negative. E.g. −8/12 + 3/12 = −5/12.',
          checkpointQuestion: 'Calculate −5/6 + 1/3.',
          checkpointAnswer: '-1/2',
        },
        {
          stepOrder: 3,
          title: 'Double-negative: subtracting a negative',
          explanation: 'Subtracting a negative gives a positive change: −1/4 − (−3/4) = −1/4 + 3/4 = 2/4 = 1/2.',
          checkpointQuestion: 'Calculate −1/3 − (−2/3).',
          checkpointAnswer: '1/3',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N5.12 — Order of operations with fractions (+ and − only)    */
  /* ────────────────────────────────────────────────────────────── */
  'N5.12': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students ignore brackets and work left to right regardless, or apply BIDMAS multiplication rules to addition-only expressions.',
      workedExample: '1/2 + (3/4 − 1/4) = 1/2 + 2/4 = 1/2 + 1/2 = 1. Work brackets first, then add left to right.',
      guidedPrompt: 'Calculate (1/3 + 1/6) − 1/4.',
      guidedAnswer: 'Brackets first: 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2. Then 1/2 − 1/4 = 2/4 − 1/4 = 1/4.',
      steps: [
        {
          stepOrder: 1,
          title: 'Brackets first',
          explanation: 'In any expression, evaluate brackets first. Inside the brackets, use the normal method: find a common denominator, add or subtract.',
          checkpointQuestion: 'In the expression 1/5 + (2/5 − 1/5), what do you calculate first?',
          checkpointOptions: ['1/5 + 2/5', '2/5 − 1/5'],
          checkpointAnswer: '2/5 − 1/5',
        },
        {
          stepOrder: 2,
          title: 'Then work left to right',
          explanation: 'After evaluating brackets, work through the remaining additions and subtractions from left to right.',
          checkpointQuestion: 'Calculate 1/5 + (2/5 − 1/5).',
          checkpointAnswer: '2/5',
        },
        {
          stepOrder: 3,
          title: 'Multi-step expressions',
          explanation: 'For expressions with multiple operations, handle brackets first, then proceed left to right. Find a common denominator at each step if needed.',
          checkpointQuestion: 'Calculate (1/2 + 1/3) − 1/6.',
          checkpointAnswer: '2/3',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not see why the order matters when only addition and subtraction are present.',
      workedExample: 'Compare: 1/2 − 1/3 + 1/4 worked left to right = 1/6 + 1/4 = 2/12 + 3/12 = 5/12. If done right to left: 1/3 + 1/4 = 7/12, then 1/2 − 7/12 = 6/12 − 7/12 = −1/12. Different answers — order matters!',
      guidedPrompt: 'Show with a number line why brackets can change the result of 3/4 − (1/4 + 1/2).',
      guidedAnswer: 'Without brackets, left to right: 3/4 − 1/4 + 1/2 = 2/4 + 1/2 = 1. With brackets: 1/4 + 1/2 = 3/4, then 3/4 − 3/4 = 0. Brackets group operations differently.',
      steps: [
        {
          stepOrder: 1,
          title: 'Why order matters',
          explanation: 'With subtraction, changing the order gives different results. 5/6 − 1/3 = 3/6 = 1/2, but 1/3 − 5/6 = −3/6 = −1/2. Always follow the correct order: brackets first, then left to right.',
          checkpointQuestion: 'True or false: 1/2 − 1/3 gives the same result as 1/3 − 1/2.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Brackets override left-to-right',
          explanation: 'Brackets tell you to do that operation first, even if it appears later in the expression. This can change the final answer.',
          checkpointQuestion: 'Calculate 3/4 − (1/4 + 1/4).',
          checkpointAnswer: '1/4',
        },
        {
          stepOrder: 3,
          title: 'Combining multiple steps',
          explanation: 'For longer expressions, evaluate brackets first. Then process additions and subtractions left to right, finding common denominators as needed.',
          checkpointQuestion: 'Calculate 1/2 − (1/3 − 1/6).',
          checkpointAnswer: '1/3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students ignore brackets entirely and just work left to right, or apply multiplication/division rules to addition/subtraction.',
      workedExample: 'Wrong: 1/2 − (1/3 + 1/6) done as 1/2 − 1/3 + 1/6 = 1/6 + 1/6 = 2/6 = 1/3. Correct: brackets first → 1/3 + 1/6 = 1/2, then 1/2 − 1/2 = 0.',
      guidedPrompt: 'A student evaluates 2/3 − (1/6 + 1/3) as 2/3 − 1/6 + 1/3. Show the correct working.',
      guidedAnswer: 'Brackets first: 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2. Then 2/3 − 1/2 = 4/6 − 3/6 = 1/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Brackets change the meaning',
          explanation: 'Ignoring brackets changes which numbers are grouped together. a − (b + c) is NOT the same as a − b + c. The bracket means you subtract the entire sum (b + c).',
          checkpointQuestion: 'Is 5/6 − (1/6 + 2/6) the same as 5/6 − 1/6 + 2/6?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Evaluate the bracket first',
          explanation: 'Always compute the expression inside brackets before doing anything else. Then use the result in the remaining calculation.',
          checkpointQuestion: 'Calculate 5/6 − (1/6 + 2/6).',
          checkpointAnswer: '2/6 or 1/3',
        },
        {
          stepOrder: 3,
          title: 'Full worked example',
          explanation: 'Calculate (3/4 − 1/4) + (1/2 − 1/3): First bracket: 3/4 − 1/4 = 2/4 = 1/2. Second bracket: 1/2 − 1/3 = 3/6 − 2/6 = 1/6. Add results: 1/2 + 1/6 = 3/6 + 1/6 = 4/6 = 2/3.',
          checkpointQuestion: 'Calculate (3/4 − 1/4) + (1/2 − 1/3).',
          checkpointAnswer: '2/3',
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

  console.log(`\n✅ ensured explanation routes for N5.1–N5.12`);
}

// Only execute when run directly (not when imported by tests/other modules).
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
