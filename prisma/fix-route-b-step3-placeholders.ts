/**
 * fix-route-b-step3-placeholders.ts
 *
 * Replaces generic "Apply the concept" placeholder steps in Route B with
 * real skill-specific checkpoint questions and answers.
 *
 * Safe to re-run — only updates steps whose checkpointAnswer is still the
 * fallback "See explanation above." string.
 *
 * Run:
 *   DATABASE_URL="postgresql://anaxi:anaxi_secret@localhost:5432/anaxi_learn" \
 *   npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
 *   prisma/fix-route-b-step3-placeholders.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Real checkpoint content, keyed by "SKILL_CODE:STEP_ORDER" ──────────────

interface StepContent {
  title: string;
  explanation: string;
  checkpointQuestion: string;
  checkpointAnswer: string;
}

const STEP_CONTENT: Record<string, StepContent> = {

  // ── N1 Place Value ──────────────────────────────────────────────────────
  'N1.1:3': {
    title: 'Apply: place value in context',
    explanation: 'Place value tells us the worth of each digit. In 3,627: the 6 has value 600 (6 hundreds).',
    checkpointQuestion: 'What is the value of the digit 7 in the number 4,730?',
    checkpointAnswer: '700 (7 hundreds)',
  },
  'N1.2:3': {
    title: 'Apply: integers in words and figures',
    explanation: 'Read each group of digits separately: thousands, then hundreds, tens and units.',
    checkpointQuestion: 'Write 4,058 in words.',
    checkpointAnswer: 'Four thousand and fifty-eight',
  },
  'N1.3:3': {
    title: 'Apply: comparing integers',
    explanation: 'Compare column by column from left to right — find the first digit that differs.',
    checkpointQuestion: 'Insert < or > between: 7,302 ___ 7,320',
    checkpointAnswer: '7,302 < 7,320 (the tens digit: 0 < 2)',
  },
  'N1.7:3': {
    title: 'Apply: comparing decimals',
    explanation: 'Align decimal points, then compare digit by digit from left to right.',
    checkpointQuestion: 'Which is greater: 3.09 or 3.9?',
    checkpointAnswer: '3.9 — writing both with the same decimal places: 3.09 < 3.90',
  },
  'N1.9:3': {
    title: 'Apply: integers on a number line',
    explanation: 'On a number line, numbers increase to the right. The further right, the larger.',
    checkpointQuestion: 'Which is further from 0 on a number line: −2 or 5?',
    checkpointAnswer: '5 is further from 0 (distance 5 vs distance 2)',
  },
  'N1.10:3': {
    title: 'Apply: rounding integers',
    explanation: 'Look at the digit to the right of the rounding place. If 5 or more, round up.',
    checkpointQuestion: 'Round 4,756 to the nearest 100.',
    checkpointAnswer: '4,800 (tens digit is 5, so round up)',
  },
  'N1.11:3': {
    title: 'Apply: decimals on a number line',
    explanation: 'A decimal sits between two integers. Compare its distance to each to see which it is closer to.',
    checkpointQuestion: 'Which is closer to 1 on a number line: 0.7 or 1.2?',
    checkpointAnswer: '1.2 (distance 0.2 from 1; 0.7 is distance 0.3 from 1)',
  },
  'N1.12:3': {
    title: 'Apply: rounding to decimal places',
    explanation: 'Look at the next digit after the required place. If 5 or more, round the last kept digit up.',
    checkpointQuestion: 'Round 7.348 to 2 decimal places.',
    checkpointAnswer: '7.35 (third decimal 8 ≥ 5, so round up)',
  },
  'N1.13:3': {
    title: 'Apply: negative numbers on a number line',
    explanation: 'On a number line, negative numbers sit to the left of 0. The further left, the smaller the value.',
    checkpointQuestion: 'Which is greater: −4 or −1?',
    checkpointAnswer: '−1 (it is further right on the number line, closer to 0)',
  },
  'N1.14:3': {
    title: 'Apply: comparing negatives',
    explanation: 'Use the number line: further right = greater. −3 > −7 because −3 is to the right of −7.',
    checkpointQuestion: 'True or false: −8 > −3',
    checkpointAnswer: 'False. −8 < −3 (−8 is further left on the number line)',
  },
  'N1.16:3': {
    title: 'Apply: significant figures',
    explanation: 'Count significant figures from the first non-zero digit. Round at the required place.',
    checkpointQuestion: 'Round 0.004582 to 2 significant figures.',
    checkpointAnswer: '0.0046 (sig figs are 4 and 5; next digit 8 ≥ 5, round up)',
  },
  'N1.17:3': {
    title: 'Apply: powers of 10',
    explanation: 'Each zero added multiplies by 10 and increases the power by 1. 1,000 = 10³.',
    checkpointQuestion: 'Write 100,000 as a power of 10.',
    checkpointAnswer: '10⁵',
  },
  'N1.18:3': {
    title: 'Apply: standard form',
    explanation: 'Standard form: a × 10ⁿ where 1 ≤ a < 10. Move the decimal point until a is in range.',
    checkpointQuestion: 'Write 6,400 in standard form.',
    checkpointAnswer: '6.4 × 10³',
  },
  'N1.19:3': {
    title: 'Apply: negative powers of 10',
    explanation: '10⁻ⁿ = 1 ÷ 10ⁿ. Each negative power gives a smaller decimal place.',
    checkpointQuestion: 'Write 10⁻² as a decimal.',
    checkpointAnswer: '0.01 (= 1 ÷ 100)',
  },
  'N1.20:3': {
    title: 'Apply: beyond base 10',
    explanation: 'In binary (base 2), each position is a power of 2: 1, 2, 4, 8, 16, …',
    checkpointQuestion: 'Write the number 13 in binary (base 2).',
    checkpointAnswer: '1101₂ (8 + 4 + 0 + 1 = 13)',
  },

  // ── N2 Addition & Subtraction ───────────────────────────────────────────
  'N2.3:3': {
    title: 'Apply: commutative and associative laws',
    explanation: 'Rearrange numbers to find pairs that make easy totals (e.g., pairs summing to 100).',
    checkpointQuestion: 'Use the commutative and associative laws to calculate 47 + 83 + 53 mentally.',
    checkpointAnswer: '183 (rearrange: 47 + 53 + 83 = 100 + 83 = 183)',
  },
  'N2.4:3': {
    title: 'Apply: column addition of integers',
    explanation: 'Align digits in columns. Add from right to left, carrying into the next column as needed.',
    checkpointQuestion: 'Use column addition to calculate 3,847 + 2,156.',
    checkpointAnswer: '6,003',
  },
  'N2.5:3': {
    title: 'Apply: column addition of decimals',
    explanation: 'Align the decimal points, fill missing decimal places with zeros, then add column by column.',
    checkpointQuestion: 'Use column addition to calculate 4.73 + 2.8.',
    checkpointAnswer: '7.53 (align: 4.73 + 2.80)',
  },
  'N2.8:3': {
    title: 'Apply: money problems',
    explanation: 'Treat money as decimals: pounds and pence. Align the decimal points when adding or subtracting.',
    checkpointQuestion: 'A jacket costs £47.50 and trousers cost £32.75. What is the total cost?',
    checkpointAnswer: '£80.25',
  },
  'N2.9:3': {
    title: 'Apply: perimeter of irregular polygons',
    explanation: 'Perimeter = sum of all side lengths. List every side and add them carefully.',
    checkpointQuestion: 'An irregular pentagon has sides of 3 cm, 5 cm, 4 cm, 6 cm and 2 cm. Find the perimeter.',
    checkpointAnswer: '20 cm (3 + 5 + 4 + 6 + 2 = 20)',
  },
  'N2.10:3': {
    title: 'Apply: perimeter of regular shapes',
    explanation: 'A regular polygon has all sides equal, so perimeter = side length × number of sides.',
    checkpointQuestion: 'A regular hexagon has a side length of 4.5 cm. Find its perimeter.',
    checkpointAnswer: '27 cm (4.5 × 6 = 27)',
  },
  'N2.11:3': {
    title: 'Apply: perimeter of rectangles and parallelograms',
    explanation: 'Perimeter of a rectangle = 2 × (length + width). Opposite sides are equal.',
    checkpointQuestion: 'A rectangle is 8 cm long and 3.5 cm wide. Find its perimeter.',
    checkpointAnswer: '23 cm (2 × (8 + 3.5) = 2 × 11.5 = 23)',
  },
  'N2.12:3': {
    title: 'Apply: perimeter of isosceles triangles and trapeziums',
    explanation: 'In an isosceles shape, two sides are equal. Add all sides, using the equal pair twice.',
    checkpointQuestion: 'An isosceles triangle has two equal sides of 7 cm and a base of 4 cm. Find the perimeter.',
    checkpointAnswer: '18 cm (7 + 7 + 4 = 18)',
  },
  'N2.13:3': {
    title: 'Apply: perimeter of compound shapes',
    explanation: 'Identify all outer edges. Add only the edges on the boundary of the compound shape.',
    checkpointQuestion: 'A compound shape has outer boundary sides: 6 m, 4 m, 2 m, 1 m, 4 m, 3 m. Find the perimeter.',
    checkpointAnswer: '20 m (6 + 4 + 2 + 1 + 4 + 3 = 20)',
  },
  'N2.14:3': {
    title: 'Apply: timetable problems',
    explanation: 'Count the gap between times. For 09:25 to 10:08, count 35 min to 10:00, then add 8 min.',
    checkpointQuestion: 'A bus leaves at 09:25 and arrives at 10:08. How long is the journey?',
    checkpointAnswer: '43 minutes',
  },
  'N2.15:3': {
    title: 'Apply: frequency trees',
    explanation: 'Use the totals and given values in the frequency tree. Subtract to find unknowns.',
    checkpointQuestion: '60 students chose sport or art. 35 chose sport; 20 of those were girls. How many boys chose sport?',
    checkpointAnswer: '15 boys (35 − 20 = 15)',
  },
  'N2.16:3': {
    title: 'Apply: standard form addition and subtraction',
    explanation: 'Convert both numbers to the same power of 10 first, then add or subtract the values.',
    checkpointQuestion: 'Calculate (3.2 × 10⁴) + (4.5 × 10³). Give your answer in standard form.',
    checkpointAnswer: '3.65 × 10⁴ (= 32,000 + 4,500 = 36,500)',
  },

  // ── N3 Multiplication & Division ────────────────────────────────────────
  'N3.1:3': {
    title: 'Apply: properties of multiplication and division',
    explanation: 'The distributive law: a × (b + c) = a × b + a × c. Use it to break up hard multiplications.',
    checkpointQuestion: 'Use the distributive law to calculate 6 × 43.',
    checkpointAnswer: '258 (6 × 40 + 6 × 3 = 240 + 18 = 258)',
  },
  'N3.2:3': {
    title: 'Apply: mental multiplication and division',
    explanation: 'Look for ways to factor or halve/double to make the calculation simpler.',
    checkpointQuestion: 'Use a mental strategy to calculate 15 × 24.',
    checkpointAnswer: '360 (e.g., 15 × 24 = 15 × 4 × 6 = 60 × 6 = 360)',
  },
  'N3.3:3': {
    title: 'Apply: multiply and divide by powers of 10',
    explanation: 'Multiplying by 10, 100 or 1000 moves digits left. Dividing moves them right.',
    checkpointQuestion: 'Calculate 0.37 × 1000.',
    checkpointAnswer: '370 (digits move 3 places to the left)',
  },
  'N3.9:3': {
    title: 'Apply: order of operations',
    explanation: 'Use BIDMAS: Brackets → Indices → Division/Multiplication → Addition/Subtraction.',
    checkpointQuestion: 'Calculate: 3 + 4 × 5 − 2',
    checkpointAnswer: '21 (multiply first: 3 + 20 − 2 = 21)',
  },
  'N3.10:3': {
    title: 'Apply: multiples',
    explanation: 'Multiples of n are n, 2n, 3n, … — the times table for that number.',
    checkpointQuestion: 'List the first five multiples of 7.',
    checkpointAnswer: '7, 14, 21, 28, 35',
  },
  'N3.11:3': {
    title: 'Apply: factors',
    explanation: 'Factors come in pairs. For each factor f, n ÷ f also divides exactly.',
    checkpointQuestion: 'List all the factors of 24.',
    checkpointAnswer: '1, 2, 3, 4, 6, 8, 12, 24',
  },
  'N3.12:3': {
    title: 'Apply: lowest common multiple',
    explanation: 'LCM is the smallest number in both times tables. List multiples of each number until one matches.',
    checkpointQuestion: 'Find the LCM of 4 and 6.',
    checkpointAnswer: '12 (multiples of 4: 4, 8, 12 ✓ and multiples of 6: 6, 12 ✓)',
  },
  'N3.13:3': {
    title: 'Apply: highest common factor',
    explanation: 'HCF is the largest factor shared by both numbers. List all factors of each and pick the biggest match.',
    checkpointQuestion: 'Find the HCF of 18 and 24.',
    checkpointAnswer: '6 (factors of 18: 1,2,3,6,9,18 — factors of 24: 1,2,3,4,6,8,12,24)',
  },
  'N3.14:3': {
    title: 'Apply: converting metric units',
    explanation: 'Use the conversion factor: ×1000 for km→m, ×100 for m→cm, ×10 for cm→mm.',
    checkpointQuestion: 'Convert 3.5 km to metres.',
    checkpointAnswer: '3,500 m (3.5 × 1000 = 3500)',
  },
  'N3.15:1': {
    title: 'Key idea: decimal × integer',
    explanation: 'Multiplying a decimal by an integer: treat the decimal as a whole number, multiply, then replace the decimal point in the same position.',
    checkpointQuestion: 'What is the key idea when multiplying a decimal by an integer?',
    checkpointAnswer: 'Multiply ignoring the decimal point, then count decimal places in the question and place the point in the answer.',
  },
  'N3.15:3': {
    title: 'Apply: decimal × integer',
    explanation: 'Example: 3.7 × 8 → work out 37 × 8 = 296, then insert decimal point → 29.6',
    checkpointQuestion: 'Calculate 3.7 × 8.',
    checkpointAnswer: '29.6 (37 × 8 = 296; one decimal place → 29.6)',
  },
  'N3.16:1': {
    title: 'Key idea: decimal × decimal',
    explanation: 'Multiply the two numbers ignoring decimal points. Count the total number of decimal places in both factors and place the decimal point that many places from the right in the answer.',
    checkpointQuestion: 'What is the key idea when multiplying two decimals together?',
    checkpointAnswer: 'Multiply without decimal points, then count total decimal places in both numbers and insert the point from the right.',
  },
  'N3.16:3': {
    title: 'Apply: decimal × decimal',
    explanation: 'Example: 1.4 × 0.3 → 14 × 3 = 42; two decimal places in total → 0.42',
    checkpointQuestion: 'Calculate 1.4 × 0.3.',
    checkpointAnswer: '0.42 (14 × 3 = 42; two decimal places → 0.42)',
  },
  'N3.17:3': {
    title: 'Apply: multiply by 0.1 and 0.01',
    explanation: 'Multiplying by 0.1 is the same as dividing by 10; by 0.01 is the same as dividing by 100.',
    checkpointQuestion: 'Calculate 58 × 0.01.',
    checkpointAnswer: '0.58 (÷ 100: move digits two places right)',
  },
  'N3.20:3': {
    title: 'Apply: dividing decimals (challenge)',
    explanation: 'To divide by a decimal, multiply both numbers by a power of 10 to make the divisor a whole number.',
    checkpointQuestion: 'Calculate 7.2 ÷ 0.4.',
    checkpointAnswer: '18 (multiply both by 10: 72 ÷ 4 = 18)',
  },
  'N3.21:3': {
    title: 'Apply: find missing lengths from area',
    explanation: 'Area = length × width. To find a missing side: divide the area by the known side.',
    checkpointQuestion: 'A rectangle has area 48 cm² and length 8 cm. Find the width.',
    checkpointAnswer: '6 cm (48 ÷ 8 = 6)',
  },
  'N3.22:3': {
    title: 'Apply: using the mean',
    explanation: 'To find a missing value: multiply the mean by the count, then subtract the known values.',
    checkpointQuestion: 'The mean of 4 numbers is 9. Three numbers are 7, 10 and 12. Find the fourth.',
    checkpointAnswer: '7 (total = 4 × 9 = 36; 36 − 7 − 10 − 12 = 7)',
  },
  'N3.23:3': {
    title: 'Apply: squares, cubes and roots',
    explanation: '√81 asks "what number squared gives 81?". ∛27 asks "what number cubed gives 27?"',
    checkpointQuestion: 'Calculate √81 and ∛27.',
    checkpointAnswer: '√81 = 9 and ∛27 = 3',
  },
  'N3.24:3': {
    title: 'Apply: prime numbers',
    explanation: 'To test if a number is prime, check divisibility by primes up to its square root.',
    checkpointQuestion: 'Explain why 51 is not a prime number.',
    checkpointAnswer: '51 = 3 × 17, so it has factors other than 1 and itself',
  },

  // ── N4 Fractions, Decimals, Percentages ─────────────────────────────────
  'N4.4:3': {
    title: 'Apply: key FDP equivalences',
    explanation: 'Common equivalences to know: 1/4 = 0.25 = 25%, 1/2 = 0.5 = 50%, 3/4 = 0.75 = 75%.',
    checkpointQuestion: 'Write 3/4 as both a decimal and a percentage.',
    checkpointAnswer: '0.75 and 75%',
  },
  'N4.5:3': {
    title: 'Apply: decimal to fraction',
    explanation: 'Write the decimal as a fraction with a power of 10 denominator, then simplify.',
    checkpointQuestion: 'Write 0.35 as a fraction in its simplest form.',
    checkpointAnswer: '7/20 (0.35 = 35/100; HCF of 35 and 100 is 5; 35÷5=7, 100÷5=20)',
  },
  'N4.6:1': {
    title: 'Key idea: decimal ↔ percentage',
    explanation: 'Percentage means "out of 100". Multiply a decimal by 100 to get a percentage. Divide a percentage by 100 to get a decimal.',
    checkpointQuestion: 'What operation converts a decimal to a percentage, and what converts a percentage to a decimal?',
    checkpointAnswer: 'Decimal → percentage: multiply by 100. Percentage → decimal: divide by 100.',
  },
  'N4.6:3': {
    title: 'Apply: decimal ↔ percentage',
    explanation: '0.07 × 100 = 7%. 35% ÷ 100 = 0.35. Always move the decimal point two places.',
    checkpointQuestion: 'Write 0.07 as a percentage and 35% as a decimal.',
    checkpointAnswer: '0.07 = 7% and 35% = 0.35',
  },
  'N4.7:1': {
    title: 'Key idea: fraction to percentage',
    explanation: 'Convert the fraction to a decimal first (divide numerator by denominator), then multiply by 100. Or find an equivalent fraction out of 100.',
    checkpointQuestion: 'What are the two methods for converting a fraction to a percentage?',
    checkpointAnswer: '1) Divide numerator ÷ denominator to get decimal, × 100. 2) Find equivalent fraction over 100.',
  },
  'N4.7:3': {
    title: 'Apply: fraction to percentage',
    explanation: '3/8: 3 ÷ 8 = 0.375. Multiply by 100 → 37.5%.',
    checkpointQuestion: 'Write 3/8 as a percentage.',
    checkpointAnswer: '37.5% (3 ÷ 8 = 0.375; × 100 = 37.5)',
  },
  'N4.8:3': {
    title: 'Apply: ordering fractions, decimals, percentages',
    explanation: 'Convert all values to decimals, then compare. Put back in original form for the final answer.',
    checkpointQuestion: 'Arrange from smallest to largest: 3/4, 0.7, 72%, 4/5',
    checkpointAnswer: '0.7, 72%, 3/4, 4/5  (= 0.70, 0.72, 0.75, 0.80)',
  },
  'N4.9:1': {
    title: 'Key idea: percentage of an amount',
    explanation: 'Find 10% by dividing by 10. Build other percentages from this: 5% = half of 10%, 20% = double 10%, and so on.',
    checkpointQuestion: 'What is the key method for finding any percentage of an amount without a calculator?',
    checkpointAnswer: 'Find 10% by ÷10, then build the target percentage from multiples and halves of 10%.',
  },
  'N4.9:3': {
    title: 'Apply: percentage of an amount',
    explanation: '35% of £80: 10% = £8, 30% = £24, 5% = £4; 35% = £24 + £4 = £28.',
    checkpointQuestion: 'Find 35% of £80.',
    checkpointAnswer: '£28 (10% = £8, 30% = £24, 5% = £4, so 35% = £28)',
  },
};

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔧 Fixing Route B placeholder steps...\n');

  // Fetch all fallback steps in Route B
  const steps = await prisma.explanationStep.findMany({
    where: { checkpointAnswer: 'See explanation above.', route: { routeType: 'B' } },
    include: {
      route: { include: { skill: { select: { code: true } } } },
    },
    orderBy: [{ route: { skill: { code: 'asc' } } }, { stepOrder: 'asc' }],
  });

  console.log(`Found ${steps.length} placeholder steps to fix.\n`);

  let fixed = 0;
  let missing = 0;

  for (const step of steps) {
    const key = `${step.route.skill.code}:${step.stepOrder}`;
    const content = STEP_CONTENT[key];

    if (!content) {
      console.warn(`  ⚠️  No content defined for key: ${key}`);
      missing++;
      continue;
    }

    await prisma.explanationStep.update({
      where: { id: step.id },
      data: {
        title: content.title,
        explanation: content.explanation,
        checkpointQuestion: content.checkpointQuestion,
        checkpointAnswer: content.checkpointAnswer,
      },
    });

    console.log(`  ✅  ${key}`);
    fixed++;
  }

  console.log(`\nFixed: ${fixed}  |  Missing content: ${missing}`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
