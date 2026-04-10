/**
 * ensure-routes-n11-n13.ts
 *
 * Seeds explanation routes (A / B / C) for N1.1, N1.2 and N1.3
 * (Place value, writing integers, comparing numbers).
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-n11-n13.ts
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
  /* ────────────────────────────────────────────────────────────────── */
  /*  N1.1 — Recognise the place value of each digit in whole numbers  */
  /* ────────────────────────────────────────────────────────────────── */
  'N1.1': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students confuse the value a digit represents with the digit itself (e.g. the 4 in 4,200 is "4", not "4,000").',
      workedExample:
        'In 4,372: the 4 is in the thousands column, so its value is 4,000. The 3 is in the hundreds column → 300. The 7 → 70. The 2 → 2.',
      guidedPrompt: 'What is the value of the digit 6 in 36,504?',
      guidedAnswer: '6,000',
      steps: [
        {
          stepOrder: 1,
          title: 'Name each column',
          explanation:
            'Starting from the right, the columns are: ones, tens, hundreds, thousands, ten-thousands, hundred-thousands, millions. Write the number in a place-value table and label each column.',
          checkpointQuestion: 'In 5,280, which column does the digit 5 sit in?',
          checkpointOptions: ['Ones', 'Hundreds', 'Thousands', 'Ten-thousands'],
          checkpointAnswer: 'Thousands',
        },
        {
          stepOrder: 2,
          title: 'Digit × column value',
          explanation:
            'The value of a digit = the digit × the column value. E.g. 3 in the hundreds column has value 3 × 100 = 300.',
          checkpointQuestion: 'What is the value of the digit 7 in 7,049?',
          checkpointAnswer: '7,000',
        },
        {
          stepOrder: 3,
          title: 'Expand a full number',
          explanation:
            'Write a number as a sum of its digit values. 4,372 = 4,000 + 300 + 70 + 2.',
          checkpointQuestion: 'Write 23,506 in expanded form.',
          checkpointAnswer: '20,000 + 3,000 + 500 + 0 + 6',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students struggle with zeros as place holders and mis-read the number of digits.',
      workedExample:
        'In 3,040,002: the zero digits hold positions (hundred-thousands, ten-thousands, hundreds, tens) to keep the other digits in the correct columns. Without zeros the number would be unreadable.',
      guidedPrompt: 'What is the value of the digit 3 in 3,040,002?',
      guidedAnswer: '3,000,000',
      steps: [
        {
          stepOrder: 1,
          title: 'Zeros as place holders',
          explanation:
            'A zero in a column means there are no groups of that size. It still occupies the column to push other digits into their correct positions.',
          checkpointQuestion: 'How many zeros are in the number 4,000,060?',
          checkpointAnswer: '4',
        },
        {
          stepOrder: 2,
          title: 'Reading across columns with zeros',
          explanation:
            'Count digits from the right to find column names. In 4,000,060: digit 6 is in the tens column, digit 4 is in the millions column.',
          checkpointQuestion: 'What is the value of the digit 4 in 4,000,060?',
          checkpointAnswer: '4,000,000',
        },
        {
          stepOrder: 3,
          title: 'Large numbers up to millions',
          explanation:
            'Group digits in threes from the right: ones group (ones, tens, hundreds) and thousands group (thousands, ten-thousands, hundred-thousands), then millions.',
          checkpointQuestion: 'What is the value of the digit 9 in 9,030,500?',
          checkpointAnswer: '9,000,000',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students read the face value of a digit rather than its positional value, especially in multi-digit numbers.',
      workedExample:
        'In 254,031 a student says the 5 is worth "5". Correct: 5 is in the ten-thousands column, so its value is 50,000.',
      guidedPrompt: 'In 708,415, what is the value of the digit 8?',
      guidedAnswer: '8,000',
      steps: [
        {
          stepOrder: 1,
          title: 'Face value vs. place value',
          explanation:
            'Face value is the digit itself (e.g. 5). Place value is what the digit represents based on its position (e.g. 5 in the thousands column = 5,000). Always ask: which column is this digit in?',
          checkpointQuestion:
            'A student says the digit 3 in 3,742 is worth "3". Are they giving the face value or the place value?',
          checkpointOptions: ['Face value', 'Place value'],
          checkpointAnswer: 'Face value',
        },
        {
          stepOrder: 2,
          title: 'Locate the column, then multiply',
          explanation:
            'Count from the right to find the column. Then multiply the digit by its column value to get the place value.',
          checkpointQuestion: 'What is the place value of 4 in 64,823?',
          checkpointAnswer: '4,000',
        },
        {
          stepOrder: 3,
          title: 'Compare two digits in the same number',
          explanation:
            'Two different digits can have very different values depending on their columns. E.g. in 520, the 5 (hundreds) is worth 500, the 2 (tens) is worth 20.',
          checkpointQuestion:
            'In 356,190, which is larger: the value of the digit 5 or the digit 9?',
          checkpointOptions: ['Value of 5', 'Value of 9'],
          checkpointAnswer: 'Value of 5',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N1.2 — Write integers in words and figures                   */
  /* ────────────────────────────────────────────────────────────── */
  'N1.2': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students write "and" between every group or use it incorrectly (e.g. "four thousand and two hundred and six").',
      workedExample:
        'Write 4,206 in words. Split into groups: 4 thousands, 2 hundreds, 0 tens, 6 ones → "four thousand two hundred and six". "And" comes before the final two-digit (or one-digit) part if that part is less than 100.',
      guidedPrompt: 'Write 13,504 in words.',
      guidedAnswer: 'Thirteen thousand five hundred and four',
      steps: [
        {
          stepOrder: 1,
          title: 'Group into thousands and the remainder',
          explanation:
            'Split the number at the thousands comma. Write the left part followed by "thousand", then write the right part.',
          checkpointQuestion: 'How would you split 7,300 when writing it in words?',
          checkpointAnswer: '7 thousand, then 300',
        },
        {
          stepOrder: 2,
          title: 'Write each group in words',
          explanation:
            'Hundreds: "X hundred". Tens and ones: use the standard teen/twenty/thirty … rule. E.g. 206 → "two hundred and six".',
          checkpointQuestion: 'Write 406 in words.',
          checkpointAnswer: 'Four hundred and six',
        },
        {
          stepOrder: 3,
          title: 'Combine the groups',
          explanation:
            'Join the thousands part to the hundreds-and-below part. Use "and" only before the last section when it is less than 100.',
          checkpointQuestion: 'Write 25,030 in words.',
          checkpointAnswer: 'Twenty-five thousand and thirty',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students omit groups entirely when digits are zero (e.g. writing 2,005 as "two thousand five" without "and").',
      workedExample:
        '2,005: 2 thousands, 0 hundreds, 0 tens, 5 ones. The zero groups are not spoken. Write "two thousand and five". The "and" bridges to the small remainder.',
      guidedPrompt: 'Write 1,009 in words.',
      guidedAnswer: 'One thousand and nine',
      steps: [
        {
          stepOrder: 1,
          title: 'Zeros mean silence',
          explanation:
            'You do not say a group if its digit is 0. So 4,070 is "four thousand and seventy" — no hundreds are mentioned.',
          checkpointQuestion:
            'In 6,008, which groups are silent (not spoken)?',
          checkpointAnswer: 'The hundreds group and the tens group',
        },
        {
          stepOrder: 2,
          title: '"And" before a short remainder',
          explanation:
            'When the last spoken part is less than 100, use "and" to introduce it. E.g. 5,003 → "five thousand and three".',
          checkpointQuestion: 'Write 3,007 in words.',
          checkpointAnswer: 'Three thousand and seven',
        },
        {
          stepOrder: 3,
          title: 'Large numbers with zero groups',
          explanation:
            'For millions: say the millions, then thousands if non-zero, then the remainder. Zeros in between are just skipped.',
          checkpointQuestion: 'Write 2,000,050 in words.',
          checkpointAnswer: 'Two million and fifty',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students write words to figures incorrectly by adding extra zeros or misplacing digit groups.',
      workedExample:
        '"Forty-two thousand and sixteen" → 42,016. Four digits in the last group (0016) — the zero holds the hundreds place. Common error: writing 4,2016 or 42,160.',
      guidedPrompt:
        'Write the number: "three hundred and four thousand two hundred and nine" in figures.',
      guidedAnswer: '304,209',
      steps: [
        {
          stepOrder: 1,
          title: 'Identify each named group',
          explanation:
            'Read the words and pick out each group name (million, thousand, hundred). Write the digit or digits that precede each group name.',
          checkpointQuestion:
            'In "sixty thousand and five", what digit group follows "sixty"?',
          checkpointAnswer: 'Thousands — so 60 in the thousands position',
        },
        {
          stepOrder: 2,
          title: 'Use zeros to fill empty columns',
          explanation:
            'Each group must contribute 3 digits (except the millions group). If a group is missing, fill it with zeros. E.g. "sixty thousand and five" → 60,005.',
          checkpointQuestion: 'Write "forty thousand and three" in figures.',
          checkpointAnswer: '40,003',
        },
        {
          stepOrder: 3,
          title: 'Full conversion with millions',
          explanation:
            'For millions, write up to 7 digits total. "Two million three hundred thousand and twelve" → 2,300,012.',
          checkpointQuestion:
            'Write "five million and four hundred" in figures.',
          checkpointAnswer: '5,000,400',
        },
      ],
    },
  ],

  /* ────────────────────────────────────────────────────────────── */
  /*  N1.3 — Compare two numbers using =, ≠, <, >, ≤, ≥           */
  /* ────────────────────────────────────────────────────────────── */
  'N1.3': [
    {
      routeType: 'A',
      misconceptionSummary:
        'Students confuse < and > (pointing the wrong way) or misread which number is larger.',
      workedExample:
        'Compare 3,412 and 3,398. Align by place value. Thousands are equal (3 = 3). Hundreds: 4 > 3, so 3,412 > 3,398. The "open mouth" of > points to the larger number.',
      guidedPrompt: 'Insert <, > or = between 5,709 and 5,790.',
      guidedAnswer: '5,709 < 5,790',
      steps: [
        {
          stepOrder: 1,
          title: 'Align by place value',
          explanation:
            'Write both numbers under each other, aligning digits by column. Compare from the leftmost (largest) column first.',
          checkpointQuestion: 'Which column do you compare first in 7,284 vs 7,319?',
          checkpointOptions: ['Ones', 'Tens', 'Hundreds', 'Thousands'],
          checkpointAnswer: 'Thousands',
        },
        {
          stepOrder: 2,
          title: 'Find the first column where they differ',
          explanation:
            'Move right through columns until digits are different. The number with the larger digit in that column is the larger number.',
          checkpointQuestion: 'Compare 4,521 and 4,498. Which is larger?',
          checkpointAnswer: '4,521',
        },
        {
          stepOrder: 3,
          title: 'Write the correct symbol',
          explanation:
            'Use < (less than) or > (greater than). The open end of the symbol always faces the bigger number. If both numbers are equal, write =.',
          checkpointQuestion: 'Write a correct statement comparing 8,050 and 8,005.',
          checkpointAnswer: '8,050 > 8,005',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary:
        'Students do not know what ≤ and ≥ mean or when to use = versus < or >.',
      workedExample:
        '≤ means "less than or equal to". 5 ≤ 5 is true (equal). 4 ≤ 5 is also true (less than). ≥ means "greater than or equal to". Statements with ≤ or ≥ are true if either condition holds.',
      guidedPrompt:
        'Is the statement 12 ≥ 12 true or false?',
      guidedAnswer: 'True — 12 equals 12, and ≥ includes equality.',
      steps: [
        {
          stepOrder: 1,
          title: 'Meaning of ≤ and ≥',
          explanation:
            '≤ means "is less than or equal to". ≥ means "is greater than or equal to". Both allow the two sides to be equal.',
          checkpointQuestion: 'Is 7 ≤ 10 true or false?',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Equality as a special case',
          explanation:
            'When two numbers are equal, you may use =, ≤, or ≥ — all are correct. For example, 6 = 6, 6 ≤ 6 and 6 ≥ 6 are all true statements.',
          checkpointQuestion: 'Which symbols correctly compare 9 and 9?',
          checkpointOptions: ['=', '≤', '≥', '<'],
          checkpointAnswer: '=, ≤ and ≥ are all correct',
        },
        {
          stepOrder: 3,
          title: 'Choosing the most precise symbol',
          explanation:
            'In most contexts, use = when numbers are equal, < when strictly less than, > when strictly greater than. Use ≤ or ≥ when a condition must allow equality.',
          checkpointQuestion: 'A student says 15 ≥ 20. Is this true?',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary:
        'Students compare digits in the wrong order (e.g. from right to left) or focus on the number of digits rather than place value.',
      workedExample:
        'Compare 999 and 1,001. A student argues 999 > 1,001 because "9 is bigger than 1". Error: 1,001 has 4 digits, 999 has 3. More digits always means a larger number when leading zeros are absent.',
      guidedPrompt: 'Compare 87,654 and 9,999. Which is larger?',
      guidedAnswer: '87,654 — it has more digits (5 vs 4), so it is larger.',
      steps: [
        {
          stepOrder: 1,
          title: 'Count the digits first',
          explanation:
            'A number with more digits is always larger (assuming no leading zeros). Compare digit counts before looking at individual digits.',
          checkpointQuestion:
            'Without calculating, is 10,000 or 9,999 larger?',
          checkpointOptions: ['10,000', '9,999'],
          checkpointAnswer: '10,000',
        },
        {
          stepOrder: 2,
          title: 'Same number of digits: compare left to right',
          explanation:
            'If digit counts are equal, compare the leftmost digits. The first column where they differ decides which number is larger.',
          checkpointQuestion: 'Which is larger: 45,231 or 45,198?',
          checkpointAnswer: '45,231 (hundreds digit 2 > 1)',
        },
        {
          stepOrder: 3,
          title: 'Write the inequality',
          explanation:
            'Once you know which is larger, write the correct symbol. Remember: the symbol opens towards the bigger number.',
          checkpointQuestion: 'Write a correct inequality for 100,000 and 99,999.',
          checkpointAnswer: '100,000 > 99,999',
        },
      ],
    },
  ],
};

async function main() {
  const subject = await prisma.subject.findFirstOrThrow({
    where: { slug: 'ks3-maths' },
  });

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
          where: {
            explanationRouteId_stepOrder: {
              explanationRouteId: upserted.id,
              stepOrder: step.stepOrder,
            },
          },
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

  console.log('\n✅ ensured explanation routes for N1.1, N1.2, N1.3');
}

if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
