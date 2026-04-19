/**
 * ensure-routes-n4-4-to-n4-9.ts
 *
 * Seeds explanation routes (A / B / C) for N4.4 through N4.9.
 * Source: N6 FDP PPTX (Year 7) slides 4–32.
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-n4-4-to-n4-9.ts
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
  /* ─────────────────────────────────────────────────────────────────────
   * N4.4 — Convert a fraction to a decimal (terminating decimals)
   * ───────────────────────────────────────────────────────────────────── */
  'N4.4': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not know which fractions can be converted using equivalent fractions and default to guessing.',
      workedExample: '3/4 → denominator 4 × 25 = 100 → 75/100 → 0.75.',
      guidedPrompt: 'Convert 7/20 to a decimal using an equivalent fraction.',
      guidedAnswer: '0.35',
      steps: [
        {
          stepOrder: 1,
          title: 'Find a power-of-10 denominator',
          explanation: 'If the denominator is a factor of 10, 100 or 1000, multiply numerator and denominator by the same number to reach that power of 10. For example, 4 × 25 = 100, so multiply 3/4 by 25/25.',
          checkpointQuestion: 'What do you multiply 4 by to reach 100?',
          checkpointAnswer: '25',
        },
        {
          stepOrder: 2,
          title: 'Scale the numerator',
          explanation: 'Whatever you multiply the denominator by, multiply the numerator by the same number. 3/4 → multiply both by 25 → 75/100.',
          checkpointQuestion: 'Convert 3/4 to an equivalent fraction with denominator 100.',
          checkpointAnswer: '75/100',
        },
        {
          stepOrder: 3,
          title: 'Read off the decimal',
          explanation: 'A fraction with denominator 100 is hundredths: 75/100 = 0.75. A fraction with denominator 10 is tenths: 3/10 = 0.3.',
          checkpointQuestion: 'Convert 7/20 to a decimal.',
          checkpointAnswer: '0.35',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not recognise that a fraction is a division and can always be evaluated using short division.',
      workedExample: '3/4 means 3 ÷ 4. Using short division: 3.000 ÷ 4 = 0.75.',
      guidedPrompt: 'Use short division to convert 3/8 to a decimal.',
      guidedAnswer: '0.375',
      steps: [
        {
          stepOrder: 1,
          title: 'Fractions are division',
          explanation: 'Any fraction a/b means a ÷ b. So 3/4 = 3 ÷ 4. This means you can always convert a fraction to a decimal using division.',
          checkpointQuestion: 'What division calculation is equivalent to 5/8?',
          checkpointAnswer: '5 ÷ 8',
        },
        {
          stepOrder: 2,
          title: 'Set up short division',
          explanation: 'Write 3 ÷ 4. Since 4 does not go into 3, write 0. and divide 30 ÷ 4 = 7 remainder 2, then 20 ÷ 4 = 5. Result: 0.75.',
          checkpointQuestion: 'Use short division to find 1 ÷ 4.',
          checkpointAnswer: '0.25',
        },
        {
          stepOrder: 3,
          title: 'Terminating decimals stop',
          explanation: 'A terminating decimal has a finite number of digits after the decimal point. Fractions whose denominator (in lowest terms) has only factors of 2 and 5 always give terminating decimals.',
          checkpointQuestion: 'Does 3/8 give a terminating decimal? Why?',
          checkpointOptions: ['Yes — 8 = 2³, only factor of 2', 'No — it goes on forever'],
          checkpointAnswer: 'Yes — 8 = 2³, only factor of 2',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students write the numerator and denominator as digits of a decimal (e.g. 3/4 → 3.4) instead of dividing.',
      workedExample: '3/4 ≠ 3.4. Correct: 3/4 = 3 ÷ 4 = 0.75.',
      guidedPrompt: 'A student writes 3/4 = 3.4. Explain the error and give the correct answer.',
      guidedAnswer: 'They wrote the digits as a decimal instead of dividing. 3/4 means 3 ÷ 4 = 0.75.',
      steps: [
        {
          stepOrder: 1,
          title: 'The digits-as-decimal error',
          explanation: 'A common mistake is to read 3/4 as "3 point 4". This is wrong — fractions involve division, not concatenation of digits.',
          checkpointQuestion: 'A student says 1/5 = 1.5. Is this correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Always divide',
          explanation: 'To convert 3/4 to a decimal, calculate 3 ÷ 4. Use an equivalent fraction (/100) or short division. 3 ÷ 4 = 0.75.',
          checkpointQuestion: 'What is 1/5 as a decimal?',
          checkpointAnswer: '0.2',
        },
        {
          stepOrder: 3,
          title: 'Sanity-check the size',
          explanation: 'A fraction less than 1 must give a decimal less than 1. If you get a number greater than 1 (like 3.4 for 3/4), you know something went wrong.',
          checkpointQuestion: 'True or false: 3/4 as a decimal must be less than 1.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
      ],
    },
  ],

  /* ─────────────────────────────────────────────────────────────────────
   * N4.5 — Convert a decimal to a fraction (simple/terminating)
   * ───────────────────────────────────────────────────────────────────── */
  'N4.5': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students use the wrong power-of-10 denominator (e.g. /10 for a 2-decimal-place number).',
      workedExample: '0.35: two decimal places → /100 → 35/100 → simplify → 7/20.',
      guidedPrompt: 'Convert 0.6 to a fraction in its simplest form.',
      guidedAnswer: '3/5',
      steps: [
        {
          stepOrder: 1,
          title: 'Count the decimal places',
          explanation: 'The number of decimal places tells you the denominator: 1 place → /10, 2 places → /100, 3 places → /1000.',
          checkpointQuestion: 'What denominator should you use for 0.47?',
          checkpointOptions: ['10', '100', '1000'],
          checkpointAnswer: '100',
        },
        {
          stepOrder: 2,
          title: 'Write the fraction',
          explanation: 'Place the digits after the decimal point over the power of 10. 0.47 = 47/100. 0.6 = 6/10.',
          checkpointQuestion: 'Write 0.9 as a fraction (before simplifying).',
          checkpointAnswer: '9/10',
        },
        {
          stepOrder: 3,
          title: 'Simplify',
          explanation: 'Find the HCF of numerator and denominator and divide both. 6/10 → HCF = 2 → 3/5.',
          checkpointQuestion: 'Simplify 35/100.',
          checkpointAnswer: '7/20',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not connect decimal place value (tenths, hundredths) to fraction denominators.',
      workedExample: '0.3 = 3 tenths = 3/10. 0.07 = 7 hundredths = 7/100.',
      guidedPrompt: 'Explain why 0.3 has denominator 10 but 0.03 has denominator 100.',
      guidedAnswer: 'The 3 in 0.3 is in the tenths column, but the 3 in 0.03 is in the hundredths column.',
      steps: [
        {
          stepOrder: 1,
          title: 'Place value columns',
          explanation: 'After the decimal point: 1st column = tenths, 2nd = hundredths, 3rd = thousandths. The column of the last significant digit gives the denominator.',
          checkpointQuestion: 'Which column is the 4 in for 0.04?',
          checkpointOptions: ['Tenths', 'Hundredths', 'Thousandths'],
          checkpointAnswer: 'Hundredths',
        },
        {
          stepOrder: 2,
          title: 'Reading the fraction directly',
          explanation: '0.35 = 35 hundredths = 35/100. The place value of the last digit gives the denominator.',
          checkpointQuestion: 'Write 0.125 as a fraction (unsimplified).',
          checkpointAnswer: '125/1000',
        },
        {
          stepOrder: 3,
          title: 'Simplifying does not change the value',
          explanation: 'Simplifying 35/100 to 7/20 keeps the same value — both equal 0.35. Simplest form just uses smaller numbers.',
          checkpointQuestion: 'True or false: 35/100 and 7/20 are equal in value.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students forget to simplify, leaving answers like 75/100 instead of 3/4.',
      workedExample: '0.75 = 75/100 → HCF(75,100) = 25 → 3/4.',
      guidedPrompt: 'A student writes 0.75 = 75/100 and stops. What should they do next?',
      guidedAnswer: 'Simplify: HCF(75, 100) = 25, so 75/100 = 3/4.',
      steps: [
        {
          stepOrder: 1,
          title: 'Always check for simplification',
          explanation: 'After writing the fraction over a power of 10, check whether numerator and denominator share a common factor greater than 1.',
          checkpointQuestion: 'Is 75/100 in its simplest form?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Find the HCF',
          explanation: 'HCF(75, 100) = 25. Divide both parts by 25.',
          checkpointQuestion: 'What is the HCF of 75 and 100?',
          checkpointAnswer: '25',
        },
        {
          stepOrder: 3,
          title: 'Divide both parts',
          explanation: '75 ÷ 25 = 3 and 100 ÷ 25 = 4, so 75/100 = 3/4. HCF(3,4) = 1 confirms it is fully simplified.',
          checkpointQuestion: 'Convert 0.75 to a fraction in its simplest form.',
          checkpointAnswer: '3/4',
        },
      ],
    },
  ],

  /* ─────────────────────────────────────────────────────────────────────
   * N4.6 — Convert a decimal to a percentage and a percentage to a decimal
   * ───────────────────────────────────────────────────────────────────── */
  'N4.6': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students multiply or divide by 10 instead of 100 when converting.',
      workedExample: '0.47 × 100 = 47%. 63% ÷ 100 = 0.63.',
      guidedPrompt: 'Convert 0.08 to a percentage and 35% to a decimal.',
      guidedAnswer: '8% and 0.35',
      steps: [
        {
          stepOrder: 1,
          title: 'Decimal to percentage: × 100',
          explanation: 'To convert a decimal to a percentage, multiply by 100. Move the digits two places to the left: 0.47 → 47%.',
          checkpointQuestion: 'Convert 0.3 to a percentage.',
          checkpointAnswer: '30%',
        },
        {
          stepOrder: 2,
          title: 'Percentage to decimal: ÷ 100',
          explanation: 'To convert a percentage to a decimal, divide by 100. Move the digits two places to the right: 63% → 0.63.',
          checkpointQuestion: 'Convert 45% to a decimal.',
          checkpointAnswer: '0.45',
        },
        {
          stepOrder: 3,
          title: 'Watch for small percentages',
          explanation: 'For percentages less than 10%, the decimal has a zero in the tenths column: 8% ÷ 100 = 0.08, not 0.8.',
          checkpointQuestion: 'Convert 5% to a decimal.',
          checkpointAnswer: '0.05',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not understand why the conversion factor is 100.',
      workedExample: '"Per cent" means per hundred. So 47% = 47 per 100 = 47/100 = 0.47.',
      guidedPrompt: 'Explain why converting a decimal to a percentage involves multiplying by 100.',
      guidedAnswer: '"Percent" means out of 100. Multiplying by 100 scales the decimal to show how many parts per 100.',
      steps: [
        {
          stepOrder: 1,
          title: 'What "per cent" means',
          explanation: '"Per cent" comes from Latin meaning "per hundred". So 47% literally means 47 out of every 100. This is why percentages and hundredths are linked.',
          checkpointQuestion: 'What does "per cent" mean?',
          checkpointOptions: ['Per ten', 'Per hundred', 'Per thousand'],
          checkpointAnswer: 'Per hundred',
        },
        {
          stepOrder: 2,
          title: 'Decimals as fractions of 1',
          explanation: '0.47 = 47/100 = 47 per hundred = 47%. The conversion ×100 just rescales from "parts of 1" to "parts of 100".',
          checkpointQuestion: 'True or false: 0.5 = 50%.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 3,
          title: 'Both directions',
          explanation: 'Going decimal → %: multiply by 100. Going % → decimal: divide by 100. Both operations move the decimal point two places.',
          checkpointQuestion: 'Which operation converts a percentage to a decimal?',
          checkpointOptions: ['Multiply by 100', 'Divide by 100', 'Multiply by 10'],
          checkpointAnswer: 'Divide by 100',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students multiply or divide by 10 rather than 100, getting answers like 4.7% or 4.7 instead of 47% or 0.47.',
      workedExample: '0.47 × 10 = 4.7 (wrong). Correct: 0.47 × 100 = 47%.',
      guidedPrompt: 'A student says 0.6 = 6% by multiplying by 10. What is the correct answer?',
      guidedAnswer: '0.6 × 100 = 60%.',
      steps: [
        {
          stepOrder: 1,
          title: 'The factor-of-10 error',
          explanation: 'Multiplying by 10 only moves one decimal place — it converts to "per ten", not "per hundred". Always multiply by 100 for percentages.',
          checkpointQuestion: 'What is 0.6 as a percentage?',
          checkpointOptions: ['6%', '60%', '0.6%'],
          checkpointAnswer: '60%',
        },
        {
          stepOrder: 2,
          title: 'Move two places',
          explanation: 'The decimal point moves two places to the right when converting decimal → %. 0.06 → 6%, 0.6 → 60%, 6 → 600%.',
          checkpointQuestion: 'Convert 0.08 to a percentage.',
          checkpointAnswer: '8%',
        },
        {
          stepOrder: 3,
          title: 'Sanity check',
          explanation: 'A decimal between 0 and 1 should give a percentage between 0% and 100%. If your answer is outside this range, recheck.',
          checkpointQuestion: 'True or false: a decimal of 0.35 should give a percentage between 0% and 100%.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
      ],
    },
  ],

  /* ─────────────────────────────────────────────────────────────────────
   * N4.7 — Convert a fraction to a percentage
   * ───────────────────────────────────────────────────────────────────── */
  'N4.7': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not know which method to use when the denominator is not a factor of 100.',
      workedExample: '3/4: denominator 4 × 25 = 100 → 75/100 → 75%. For 3/8: 3 ÷ 8 = 0.375 → × 100 = 37.5%.',
      guidedPrompt: 'Convert 7/20 to a percentage.',
      guidedAnswer: '35%',
      steps: [
        {
          stepOrder: 1,
          title: 'Method 1: equivalent fraction over 100',
          explanation: 'If the denominator divides into 100, find an equivalent fraction with denominator 100. The numerator is the percentage. 3/4 → ×25 → 75/100 → 75%.',
          checkpointQuestion: 'Convert 3/5 to a percentage using an equivalent fraction over 100.',
          checkpointAnswer: '60%',
        },
        {
          stepOrder: 2,
          title: 'Method 2: decimal bridge',
          explanation: 'Convert the fraction to a decimal first, then multiply by 100. 3/8 = 0.375 → × 100 = 37.5%. Use this when the denominator is not a factor of 100.',
          checkpointQuestion: 'Convert 1/8 to a percentage.',
          checkpointAnswer: '12.5%',
        },
        {
          stepOrder: 3,
          title: 'Choose the right method',
          explanation: 'If the denominator is 2, 4, 5, 10, 20, 25, or 50, use Method 1 (×to get /100). Otherwise, convert to decimal first.',
          checkpointQuestion: 'Which method is easiest for 7/20?',
          checkpointOptions: ['Equivalent fraction over 100', 'Decimal bridge'],
          checkpointAnswer: 'Equivalent fraction over 100',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not see why "out of 100" gives the percentage directly.',
      workedExample: 'Per cent = per hundred. 3/4 = 75/100 = 75 per hundred = 75%.',
      guidedPrompt: 'Explain why converting 3/4 to 75/100 immediately tells you the percentage.',
      guidedAnswer: 'Per cent means per hundred. 75/100 means 75 per hundred, which is exactly 75%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Percent = per hundred',
          explanation: 'A percentage is a fraction with denominator 100. Once you have a fraction over 100, the numerator IS the percentage.',
          checkpointQuestion: 'What percentage is 63/100?',
          checkpointAnswer: '63%',
        },
        {
          stepOrder: 2,
          title: 'Using equivalence',
          explanation: 'Find a fraction equivalent to the given fraction but with denominator 100. The numerator of that equivalent fraction is the percentage.',
          checkpointQuestion: 'Complete: 2/5 = ?/100. What is the percentage?',
          checkpointAnswer: '40/100, so 40%',
        },
        {
          stepOrder: 3,
          title: 'The decimal bridge explains it too',
          explanation: 'A decimal like 0.375 already means 375 thousandths. Multiplying by 100 rescales it to hundredths: 37.5 per hundred = 37.5%.',
          checkpointQuestion: 'True or false: 0.6 × 100 = 60, so 0.6 = 60%.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students read the numerator of the original fraction as the percentage without converting the denominator to 100.',
      workedExample: '3/4 ≠ 3%. Correct: 3/4 = 75/100 = 75%.',
      guidedPrompt: 'A student says 3/4 = 3%. What error have they made?',
      guidedAnswer: 'They read the numerator as the percentage. The fraction must be converted to /100 first: 3/4 = 75/100 = 75%.',
      steps: [
        {
          stepOrder: 1,
          title: 'The numerator-as-percent error',
          explanation: 'The numerator only equals the percentage when the denominator is already 100. 3/4 has denominator 4, not 100, so the percentage is not 3%.',
          checkpointQuestion: 'A student says 1/4 = 1%. Is this correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Convert denominator to 100 first',
          explanation: '1/4: denominator 4 × 25 = 100 → 25/100 → 25%. The numerator of the /100 fraction is the percentage.',
          checkpointQuestion: 'What is 1/4 as a percentage?',
          checkpointAnswer: '25%',
        },
        {
          stepOrder: 3,
          title: 'Reasonableness check',
          explanation: '3/4 is three quarters, which is clearly close to 100%. The answer 75% is reasonable; 3% is not.',
          checkpointQuestion: 'Is 75% a more reasonable answer for 3/4 than 3%? Why?',
          checkpointOptions: ['Yes — 3/4 is close to 1 whole, so close to 100%', 'No — 3% is correct'],
          checkpointAnswer: 'Yes — 3/4 is close to 1 whole, so close to 100%',
        },
      ],
    },
  ],

  /* ─────────────────────────────────────────────────────────────────────
   * N4.8 — Compare and order fractions, decimals and percentages
   * ───────────────────────────────────────────────────────────────────── */
  'N4.8': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students try to compare values in different forms without converting them first.',
      workedExample: 'Compare 0.4, 1/3, 38%: → 0.4, 0.333…, 0.38 → order: 1/3 < 38% < 0.4.',
      guidedPrompt: 'Write 3/5, 0.65 and 58% in ascending order.',
      guidedAnswer: '58%, 3/5, 0.65 (i.e. 0.58, 0.6, 0.65)',
      steps: [
        {
          stepOrder: 1,
          title: 'Convert everything to decimals',
          explanation: 'The easiest common form is decimals. Convert fractions using division and percentages by dividing by 100.',
          checkpointQuestion: 'Convert 3/4, 70% and 0.8 to decimals.',
          checkpointAnswer: '0.75, 0.70, 0.80',
        },
        {
          stepOrder: 2,
          title: 'Order the decimals',
          explanation: 'Compare decimal values in order. Align decimal points if helpful. 0.70 < 0.75 < 0.80.',
          checkpointQuestion: 'Write 0.75, 0.70, 0.80 in ascending order.',
          checkpointAnswer: '0.70, 0.75, 0.80',
        },
        {
          stepOrder: 3,
          title: 'Re-label in original form',
          explanation: 'Give the final answer using the original forms. Ascending: 70% < 3/4 < 0.8.',
          checkpointQuestion: 'Write 3/4, 70% and 0.8 in ascending order using their original forms.',
          checkpointAnswer: '70%, 3/4, 0.8',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not understand why different representations must be converted before comparing.',
      workedExample: '1/4 and 22%: face values 1 and 22 look like 22 > 1, but 1/4 = 25% > 22%.',
      guidedPrompt: 'Explain why you cannot compare 1/4 and 22% without converting.',
      guidedAnswer: 'They are in different forms. 1/4 looks small but equals 25%, which is bigger than 22%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Different forms are not directly comparable',
          explanation: 'Fractions, decimals and percentages represent the same quantities but in different scales. Comparing them directly by their digits is meaningless — you must first convert to a common form.',
          checkpointQuestion: 'True or false: you can directly compare 0.5 and 45% without converting.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Decimals as a universal language',
          explanation: 'Decimals work as a common form because percentages divide by 100 and fractions use division — both give decimals. 45% = 0.45, 0.5 stays as 0.5, so 0.5 > 45%.',
          checkpointQuestion: 'Which is larger: 0.5 or 45%?',
          checkpointOptions: ['0.5', '45%'],
          checkpointAnswer: '0.5',
        },
        {
          stepOrder: 3,
          title: 'Apply to a mixed list',
          explanation: 'For any mixed list, convert all values to decimals, order the decimals, then re-label using original forms.',
          checkpointQuestion: 'Put in order (ascending): 1/2, 40%, 0.45.',
          checkpointAnswer: '40%, 0.45, 1/2',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students compare face values across different forms (e.g. thinking 1/4 < 22% because 1 < 22).',
      workedExample: '1/4 vs 22%: 1/4 = 25% > 22%. The face value 1 is misleading — always convert.',
      guidedPrompt: 'A student says 1/4 < 22% because 1 < 22. What is wrong?',
      guidedAnswer: '1/4 = 25%, which is greater than 22%. The numerator 1 cannot be compared directly to 22%.',
      steps: [
        {
          stepOrder: 1,
          title: 'Face values mislead',
          explanation: 'The digit "1" in 1/4 and "22" in 22% are in completely different units. 1/4 means one out of four, which equals 25 out of 100.',
          checkpointQuestion: 'Is 1/4 greater than 22%?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'Yes',
        },
        {
          stepOrder: 2,
          title: 'Convert before comparing',
          explanation: '1/4 = 25%. Now both values are percentages: 25% vs 22%. Clearly 25% > 22%.',
          checkpointQuestion: 'Convert 1/4 to a percentage.',
          checkpointAnswer: '25%',
        },
        {
          stepOrder: 3,
          title: 'Always convert first',
          explanation: 'Whenever you see a comparison with mixed forms (fraction, decimal, percentage), convert everything to the same form before making any comparison.',
          checkpointQuestion: 'Which is smaller: 3/10 or 28%?',
          checkpointAnswer: '28% (3/10 = 30% > 28%)',
        },
      ],
    },
  ],

  /* ─────────────────────────────────────────────────────────────────────
   * N4.9 — Find a percentage of an amount (non-calculator)
   * ───────────────────────────────────────────────────────────────────── */
  'N4.9': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not know how to find percentages other than 50% and 10% without a calculator.',
      workedExample: '35% of 240: 10% = 24, so 30% = 72; 5% = 12; 35% = 72 + 12 = 84.',
      guidedPrompt: 'Find 35% of 60.',
      guidedAnswer: '21',
      steps: [
        {
          stepOrder: 1,
          title: 'Find 10% and 1%',
          explanation: '10% of any amount = amount ÷ 10. 1% = amount ÷ 100. These are the building blocks for all other percentages.',
          checkpointQuestion: 'Find 10% of 80.',
          checkpointAnswer: '8',
        },
        {
          stepOrder: 2,
          title: 'Build the target percentage',
          explanation: 'Combine multiples of 10% and 1%. For 35%: 30% = 3 × 10% = 24; 5% = half of 10% = 4; 35% = 24 + 4 = 28. (Example uses 80.)',
          checkpointQuestion: 'Find 35% of 80 using 10% and 5%.',
          checkpointAnswer: '28',
        },
        {
          stepOrder: 3,
          title: 'Use benchmarks for speed',
          explanation: '50% = ÷2. 25% = ÷4. 75% = ÷4 × 3. Use these alongside 10%/1% to reach any percentage efficiently.',
          checkpointQuestion: 'Find 25% of 60.',
          checkpointAnswer: '15',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not connect percentage to fraction multiplication (e.g. 25% = 1/4 of the amount).',
      workedExample: '25% of 60 = 1/4 of 60 = 15. 50% of 60 = 1/2 of 60 = 30.',
      guidedPrompt: 'Explain why 25% of an amount is the same as dividing by 4.',
      guidedAnswer: '25% = 25/100 = 1/4. Finding 1/4 of something means dividing by 4.',
      steps: [
        {
          stepOrder: 1,
          title: 'Percentage as a fraction',
          explanation: 'Any percentage can be written as a fraction: 50% = 1/2, 25% = 1/4, 10% = 1/10, 20% = 1/5. "Of" means multiply.',
          checkpointQuestion: 'What fraction is equivalent to 20%?',
          checkpointOptions: ['1/5', '1/4', '1/2'],
          checkpointAnswer: '1/5',
        },
        {
          stepOrder: 2,
          title: 'Use known fractions',
          explanation: '25% of 60 = 1/4 × 60 = 60 ÷ 4 = 15. 20% of 60 = 1/5 × 60 = 12. These fraction equivalents make mental calculation faster.',
          checkpointQuestion: 'Find 20% of 60 using the fraction 1/5.',
          checkpointAnswer: '12',
        },
        {
          stepOrder: 3,
          title: 'Combine methods',
          explanation: 'For percentages without a simple fraction, use 10%/1% building blocks. For benchmarks (25%, 50%, 75%), use fractions. Pick whichever is quicker.',
          checkpointQuestion: 'Find 75% of 80.',
          checkpointAnswer: '60',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students add the percentage number to the original amount rather than calculating a fraction of it.',
      workedExample: '20% of 50 ≠ 50 + 20 = 70. Correct: 10% of 50 = 5, so 20% = 10.',
      guidedPrompt: 'A student says 20% of 50 = 70. Explain the error.',
      guidedAnswer: 'They added 20 to 50. 20% of 50 means 1/5 of 50 = 10, not 70.',
      steps: [
        {
          stepOrder: 1,
          title: 'Percent of ≠ add the percent',
          explanation: '"20% of 50" means find 20% of the quantity 50. It does NOT mean 50 + 20. The percentage is applied to the amount, not added to it.',
          checkpointQuestion: 'A student says 10% of 40 = 50. What did they do wrong?',
          checkpointOptions: ['They added 10 to 40', 'They divided 40 by 10'],
          checkpointAnswer: 'They added 10 to 40',
        },
        {
          stepOrder: 2,
          title: 'Calculate using 10%',
          explanation: '10% of 40 = 40 ÷ 10 = 4. 20% = 2 × 4 = 8. The answer must be smaller than the original amount when the percentage is less than 100%.',
          checkpointQuestion: 'Find 10% of 40.',
          checkpointAnswer: '4',
        },
        {
          stepOrder: 3,
          title: 'Reasonableness check',
          explanation: 'If the percentage is less than 100%, the answer must be less than the original amount. 20% of 50 should be less than 50 — so 70 cannot be right.',
          checkpointQuestion: 'True or false: 20% of 50 must be less than 50.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
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

  console.log(`\n✅ ensured explanation routes for N4.4, N4.5, N4.6, N4.7, N4.8, N4.9`);
}

// Only execute when run directly (not when imported by tests/other modules).
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
