/**
 * ensure-routes-gaps.ts
 *
 * Seeds explanation routes (A / B / C) for skills that have items in the DB
 * but no explanation routes extracted from PPTX files.
 *
 * Skills covered:
 *   N1.6, N1.8, N1.15
 *   N2.1, N2.2, N2.6, N2.7
 *   N3.4, N3.5, N3.6, N3.7, N3.8, N3.18, N3.19
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-gaps.ts
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

  // ── N1.6: Decimal place value ───────────────────────────────────────────────
  'N1.6': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students confuse tenths with tens, or hundredths with hundreds.',
      workedExample: 'In 3.47: 3 ones, 4 tenths, 7 hundredths.',
      guidedPrompt: 'What is the value of 6 in 2.364?',
      guidedAnswer: '6 hundredths (0.06)',
      steps: [
        { stepOrder: 1, title: 'Decimal column names', explanation: 'After the decimal point: first column = tenths (÷10), second = hundredths (÷100), third = thousandths (÷1000).', checkpointQuestion: 'In 0.72, which digit is in the hundredths column?', checkpointAnswer: '2' },
        { stepOrder: 2, title: 'Value of a digit', explanation: 'The value of a digit = digit × column value. E.g. digit 4 in tenths column has value 4 × 0.1 = 0.4.', checkpointQuestion: 'What is the value of 5 in 3.58?', checkpointAnswer: '0.5 (5 tenths)' },
        { stepOrder: 3, title: 'Writing decimals in expanded form', explanation: 'Write each digit as a sum of its value: 3.47 = 3 + 0.4 + 0.07.', checkpointQuestion: 'Write 2.36 in expanded form.', checkpointAnswer: '2 + 0.3 + 0.06' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students think a longer decimal (more digits) is always larger.',
      workedExample: '0.9 > 0.85 because 9 tenths > 8 tenths, despite 0.85 having more digits.',
      guidedPrompt: 'Which is larger: 0.7 or 0.65? Explain.',
      guidedAnswer: '0.7, because 7 tenths > 6 tenths (regardless of number of decimal digits).',
      steps: [
        { stepOrder: 1, title: 'Place value not length', explanation: 'A decimal\'s size depends on place value, not the number of digits after the point. Compare column by column starting from tenths.', checkpointQuestion: 'True or false: 0.4 > 0.38.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'True' },
        { stepOrder: 2, title: 'Column-by-column comparison', explanation: 'Start at the tenths column. If those digits differ, the larger one wins. Only move to hundredths if tenths are equal.', checkpointQuestion: 'Which is larger: 0.52 or 0.6?', checkpointOptions: ['0.52', '0.6'], checkpointAnswer: '0.6' },
        { stepOrder: 3, title: 'Using zero as a placeholder', explanation: 'Write trailing zeros to make decimals the same length: 0.7 = 0.70. Now compare digit by digit.', checkpointQuestion: 'Compare 0.80 and 0.8. Which is larger?', checkpointOptions: ['0.80', '0.8', 'They are equal'], checkpointAnswer: 'They are equal' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students swap tens/tenths or hundreds/hundredths names.',
      workedExample: '3.47 — the 4 is in the TENTHS column (right of point), not TENS (left of point).',
      guidedPrompt: 'A student says the 4 in 3.47 is in the "tens" column. What is their error?',
      guidedAnswer: 'The 4 is to the right of the decimal point in the tenths column (0.4), not the tens column (40).',
      steps: [
        { stepOrder: 1, title: 'Left vs right of the decimal', explanation: 'Digits LEFT of the decimal point are whole-number columns (ones, tens, hundreds). Digits RIGHT of the decimal point are fractional columns (tenths, hundredths, thousandths).', checkpointQuestion: 'Is the tenths column left or right of the decimal point?', checkpointOptions: ['Left', 'Right'], checkpointAnswer: 'Right' },
        { stepOrder: 2, title: 'Naming the columns', explanation: 'tenths = 1/10 (first right), hundredths = 1/100 (second right). Do not confuse with tens (10×) and hundreds (100×) on the left.', checkpointQuestion: 'What is the place value of 3 in 1.03?', checkpointAnswer: 'Hundredths (0.03)' },
        { stepOrder: 3, title: 'Read a digit value', explanation: 'State the value of the digit: digit × column value. E.g. 7 in thousandths = 7 × 0.001 = 0.007.', checkpointQuestion: 'What is the value of 9 in 4.009?', checkpointAnswer: '0.009 (9 thousandths)' },
      ],
    },
  ],

  // ── N1.8: Order a list of decimals ─────────────────────────────────────────
  'N1.8': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students order by number of digits rather than by place value.',
      workedExample: 'Order 0.4, 0.38, 0.415: write as 0.400, 0.380, 0.415 → 0.38 < 0.4 < 0.415.',
      guidedPrompt: 'Order ascending: 0.7, 0.63, 0.72',
      guidedAnswer: '0.63, 0.7, 0.72',
      steps: [
        { stepOrder: 1, title: 'Line up decimal points', explanation: 'Write all decimals with the same number of decimal places (add trailing zeros). Then compare column by column.', checkpointQuestion: 'Write 0.4 and 0.38 with the same number of decimal places.', checkpointAnswer: '0.40 and 0.38' },
        { stepOrder: 2, title: 'Compare from left to right', explanation: 'Start at the tenths column. The number with the larger tenths digit is larger. Move right only if tenths digits are equal.', checkpointQuestion: 'Which is larger: 0.53 or 0.48?', checkpointOptions: ['0.53', '0.48'], checkpointAnswer: '0.53' },
        { stepOrder: 3, title: 'Write in order', explanation: 'Order the full list from smallest to largest (ascending) or largest to smallest (descending).', checkpointQuestion: 'Order ascending: 0.6, 0.59, 0.605', checkpointAnswer: '0.59, 0.6, 0.605' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students think 0.9 > 0.85 is wrong because 85 > 9 as integers.',
      workedExample: '0.9 = 0.90 > 0.85: 9 tenths > 8 tenths, so 0.9 is larger.',
      guidedPrompt: 'Explain why 0.9 > 0.85.',
      guidedAnswer: '0.9 = 0.90. In the tenths column, 9 > 8, so 0.9 is larger.',
      steps: [
        { stepOrder: 1, title: 'Don\'t compare as integers', explanation: 'Comparing 0.9 and 0.85 as if they were 9 and 85 is wrong. Decimals are compared by place value, not overall digit count.', checkpointQuestion: 'True or false: 0.9 > 0.85.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'True' },
        { stepOrder: 2, title: 'Pad with zeros', explanation: 'Rewrite 0.9 as 0.90. Now 0.90 vs 0.85: compare tenths (9 > 8), so 0.90 is larger.', checkpointQuestion: 'Rewrite 0.3 with two decimal places.', checkpointAnswer: '0.30' },
        { stepOrder: 3, title: 'Apply to a list', explanation: 'Pad all numbers to the same decimal length, then sort.', checkpointQuestion: 'Order descending: 0.5, 0.47, 0.503', checkpointAnswer: '0.503, 0.5, 0.47' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students forget to sort the whole list correctly, often misplacing numbers with equal leading digits.',
      workedExample: 'Order 0.32, 0.3, 0.321: tenths all = 3, compare hundredths: 2=2>0 → 0.3 < 0.32 < 0.321.',
      guidedPrompt: 'Order ascending: 0.31, 0.3, 0.312',
      guidedAnswer: '0.3, 0.31, 0.312',
      steps: [
        { stepOrder: 1, title: 'When tenths are equal', explanation: 'If the tenths digits are the same, move to the hundredths column. If those are also equal, move to thousandths, and so on.', checkpointQuestion: 'Which is larger: 0.34 or 0.342?', checkpointOptions: ['0.34', '0.342'], checkpointAnswer: '0.342' },
        { stepOrder: 2, title: 'Pad then compare', explanation: 'Pad 0.3 → 0.300, 0.31 → 0.310, 0.312 → 0.312. Compare: 300 < 310 < 312.', checkpointQuestion: 'Order ascending: 0.4, 0.42, 0.401', checkpointAnswer: '0.4, 0.401, 0.42' },
        { stepOrder: 3, title: 'Double-check your order', explanation: 'Read back the ordered list and verify each adjacent pair: left number should be smaller than right number.', checkpointQuestion: 'Is this order correct: 0.5, 0.52, 0.502?', checkpointOptions: ['Yes', 'No'], checkpointAnswer: 'No' },
      ],
    },
  ],

  // ── N1.15: Order any integers, negatives and decimals ──────────────────────
  'N1.15': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students treat all negatives as smaller than all positives but struggle ordering negatives relative to each other.',
      workedExample: 'Order -3, 0.5, -0.2, 2: use number line → -3 < -0.2 < 0.5 < 2.',
      guidedPrompt: 'Order ascending: -1.5, 0, -0.4, 2',
      guidedAnswer: '-1.5, -0.4, 0, 2',
      steps: [
        { stepOrder: 1, title: 'Negatives are less than zero', explanation: 'All negative numbers are less than 0. Among negatives, numbers further from zero (more negative) are smaller: -5 < -2.', checkpointQuestion: 'Which is smaller: -5 or -2?', checkpointOptions: ['-5', '-2'], checkpointAnswer: '-5' },
        { stepOrder: 2, title: 'Mixing negatives, zero and positives', explanation: 'Order: all negatives (most negative first), then 0, then all positives (smallest first).', checkpointQuestion: 'Order ascending: -3, 1, -1, 0', checkpointAnswer: '-3, -1, 0, 1' },
        { stepOrder: 3, title: 'Including decimals', explanation: 'Decimals fit between integers. Place them using place value: -0.5 is between -1 and 0.', checkpointQuestion: 'Order ascending: -1.5, 0.5, -0.5, 1', checkpointAnswer: '-1.5, -0.5, 0.5, 1' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students think -0.5 > -0.2 because 0.5 > 0.2.',
      workedExample: '-0.2 > -0.5 because -0.2 is closer to 0; on the number line it is further right.',
      guidedPrompt: 'Which is larger: -0.2 or -0.5? Explain.',
      guidedAnswer: '-0.2, because it is closer to zero (less negative).',
      steps: [
        { stepOrder: 1, title: 'Closer to zero = larger for negatives', explanation: 'For negative numbers, the one closest to zero has the greatest value. -0.2 is closer to 0 than -0.5, so -0.2 > -0.5.', checkpointQuestion: 'True or false: -0.3 > -0.7.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'True' },
        { stepOrder: 2, title: 'Use a number line', explanation: 'Place all numbers on a mental number line. Values increase from left to right. Ordering left to right gives ascending order.', checkpointQuestion: 'Order ascending: -2, -0.5, 0.5, -1', checkpointAnswer: '-2, -1, -0.5, 0.5' },
        { stepOrder: 3, title: 'Mixed types', explanation: 'Mix integers and decimals by placing each precisely: -1.5 is between -2 and -1.', checkpointQuestion: 'Order descending: -0.5, 1.5, -2, 0', checkpointAnswer: '1.5, 0, -0.5, -2' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students reverse the inequality when negatives are involved.',
      workedExample: '-4 < -1 (not -4 > -1). The further left on the number line, the smaller the value.',
      guidedPrompt: 'A student writes -4 > -1. What is their error?',
      guidedAnswer: '-4 is further from zero (more negative) so -4 < -1. On a number line -4 is to the left of -1.',
      steps: [
        { stepOrder: 1, title: 'Number line direction', explanation: 'On a horizontal number line, values increase from left to right. -4 is to the left of -1, so -4 < -1.', checkpointQuestion: 'True or false: -4 > -1.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'False' },
        { stepOrder: 2, title: 'Largest negative is closest to zero', explanation: 'Among negatives, the greatest value has the smallest absolute value: -1 > -4 because |-1| < |-4|.', checkpointQuestion: 'Which is the largest: -10, -1, -5?', checkpointOptions: ['-10', '-1', '-5'], checkpointAnswer: '-1' },
        { stepOrder: 3, title: 'Full mixed list', explanation: 'Order the entire list using number-line thinking: negatives (most negative first) → zero → positives.', checkpointQuestion: 'Order ascending: 3, -3, -0.3, 0.3', checkpointAnswer: '-3, -0.3, 0.3, 3' },
      ],
    },
  ],

  // ── N2.1: Properties of addition and subtraction ───────────────────────────
  'N2.1': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students think subtraction is commutative (e.g. 5 - 3 = 3 - 5).',
      workedExample: 'Addition is commutative (3+5=5+3) and associative. Subtraction is neither.',
      guidedPrompt: 'Is 8 - 3 the same as 3 - 8? Explain.',
      guidedAnswer: 'No. 8 - 3 = 5, but 3 - 8 = -5. Subtraction is not commutative.',
      steps: [
        { stepOrder: 1, title: 'Commutativity of addition', explanation: 'Addition is commutative: a + b = b + a. E.g. 4 + 7 = 7 + 4 = 11.', checkpointQuestion: 'True or false: 6 + 9 = 9 + 6.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'True' },
        { stepOrder: 2, title: 'Subtraction is NOT commutative', explanation: 'Subtraction is not commutative: a - b ≠ b - a (unless a = b). E.g. 10 - 4 = 6, but 4 - 10 = -6.', checkpointQuestion: 'True or false: subtraction is commutative.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'False' },
        { stepOrder: 3, title: 'Fact families', explanation: 'Addition and subtraction are inverse operations. From 3 + 5 = 8 we get: 5 + 3 = 8, 8 - 5 = 3, 8 - 3 = 5.', checkpointQuestion: 'Write two subtraction facts from: 6 + 9 = 15.', checkpointAnswer: '15 - 6 = 9 and 15 - 9 = 6.' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not recognise how bar models represent addition and subtraction relationships.',
      workedExample: 'Bar model: whole = 14, parts 9 and 5 → 9+5=14, 5+9=14, 14-9=5, 14-5=9.',
      guidedPrompt: 'A bar model shows a total of 12 split into 7 and 5. Write two addition and two subtraction facts.',
      guidedAnswer: '7+5=12, 5+7=12, 12-7=5, 12-5=7.',
      steps: [
        { stepOrder: 1, title: 'Bar model = part-whole', explanation: 'A bar model shows a whole split into parts. The whole is the sum of its parts.', checkpointQuestion: 'A bar model shows total 10 with parts 6 and 4. Write one addition fact.', checkpointAnswer: '6 + 4 = 10 (or 4 + 6 = 10).' },
        { stepOrder: 2, title: 'From bar model to subtraction', explanation: 'Subtraction gives a missing part: whole − one part = other part.', checkpointQuestion: 'From a bar with total 10, parts 6 and 4, write one subtraction fact.', checkpointAnswer: '10 - 6 = 4 (or 10 - 4 = 6).' },
        { stepOrder: 3, title: 'The four related facts', explanation: 'Each bar model generates 4 number facts (2 addition + 2 subtraction).', checkpointQuestion: 'How many number facts can you write from a bar model with total 15 and parts 9 and 6?', checkpointAnswer: '4 (9+6=15, 6+9=15, 15-9=6, 15-6=9).' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse addition and subtraction operations when reading word problems.',
      workedExample: '"How many more?" → subtraction. "How many altogether?" → addition.',
      guidedPrompt: 'Why does "How many more?" indicate subtraction?',
      guidedAnswer: 'We are finding the difference between two quantities, which is a subtraction operation.',
      steps: [
        { stepOrder: 1, title: 'Key words for each operation', explanation: '"Altogether", "total", "sum" → addition. "Difference", "more than", "less than", "how many left" → subtraction.', checkpointQuestion: 'Which operation: "Tom has 8 apples. He eats 3. How many are left?"', checkpointOptions: ['Addition', 'Subtraction'], checkpointAnswer: 'Subtraction' },
        { stepOrder: 2, title: 'Not commutative in context', explanation: 'For subtraction in context, the order matters: take away from the larger quantity.', checkpointQuestion: 'Sam has 15 cards and gives away 6. How many are left?', checkpointAnswer: '9' },
        { stepOrder: 3, title: 'Inverse check', explanation: 'Use addition to check subtraction: if 15 - 6 = 9, then 9 + 6 should equal 15.', checkpointQuestion: 'Check: 13 - 8 = 5. What addition confirms this?', checkpointAnswer: '5 + 8 = 13.' },
      ],
    },
  ],

  // ── N2.2: Mental strategies for addition and subtraction ───────────────────
  'N2.2': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students revert to column addition/subtraction for calculations that can be done mentally.',
      workedExample: '47 + 36: round 36 to 40, add → 87, adjust −4 → 83.',
      guidedPrompt: 'Calculate 54 + 38 mentally using rounding.',
      guidedAnswer: '92 (54 + 40 = 94, adjust −2 = 92).',
      steps: [
        { stepOrder: 1, title: 'Round and adjust', explanation: 'To add mentally: round one number to the nearest 10, add it, then adjust. E.g. 47 + 29 → 47 + 30 = 77, then −1 = 76.', checkpointQuestion: 'Calculate 63 + 29 mentally.', checkpointAnswer: '92' },
        { stepOrder: 2, title: 'Counting on for subtraction', explanation: 'For subtraction, count up from the smaller to the larger. E.g. 71 − 47: count 47 → 50 (+3), 50 → 71 (+21) → answer = 24.', checkpointQuestion: 'Calculate 83 − 56 by counting up.', checkpointAnswer: '27' },
        { stepOrder: 3, title: 'Partition into hundreds, tens, units', explanation: 'Partition both numbers and add each column separately. E.g. 134 + 52 = 100 + (30+50) + (4+2) = 186.', checkpointQuestion: 'Calculate 145 + 43 by partitioning.', checkpointAnswer: '188' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not know which mental strategy to choose for different number pairs.',
      workedExample: 'Near-doubles: 14+15 = 14+14+1 = 29. Near-10s: 26+9 = 26+10−1 = 35.',
      guidedPrompt: 'Which strategy would you use for 25 + 26? Explain.',
      guidedAnswer: 'Near-doubles: 25+25=50, +1=51.',
      steps: [
        { stepOrder: 1, title: 'Near-doubles', explanation: 'If both numbers are close: use a double and adjust. E.g. 13 + 14 = 13 + 13 + 1 = 27.', checkpointQuestion: 'Use near-doubles to calculate 18 + 19.', checkpointAnswer: '37' },
        { stepOrder: 2, title: 'Near-10 strategy', explanation: 'If one number is close to a multiple of 10, round it up, add, then adjust. E.g. 34 + 9 = 34 + 10 − 1 = 43.', checkpointQuestion: 'Calculate 47 + 19 mentally.', checkpointAnswer: '66' },
        { stepOrder: 3, title: 'Bridging through 10', explanation: 'Split one addend to make a multiple of 10 first. E.g. 37 + 8 = 37 + 3 + 5 = 40 + 5 = 45.', checkpointQuestion: 'Calculate 58 + 7 by bridging.', checkpointAnswer: '65' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students make errors with adjusting after rounding (off-by-one or off-by-ten errors).',
      workedExample: '53 − 29: 53 − 30 = 23, then adjust +1 = 24 (not +10).',
      guidedPrompt: 'Calculate 74 − 38 mentally using rounding, showing the adjustment step.',
      guidedAnswer: '74 − 40 = 34, adjust +2 = 36.',
      steps: [
        { stepOrder: 1, title: 'Direction of adjustment', explanation: 'When you round UP (add more than needed), you must adjust DOWN by the same amount. When you round DOWN, adjust UP.', checkpointQuestion: 'I calculate 63 − 29 as 63 − 30 = 33. What adjustment do I need?', checkpointAnswer: '+1, giving 34.' },
        { stepOrder: 2, title: 'Size of adjustment', explanation: 'The adjustment equals the amount you over- or under-compensated. E.g. rounding 29 to 30 is 1 too many → adjust back by 1.', checkpointQuestion: 'Calculate 82 − 48 mentally.', checkpointAnswer: '34 (82 − 50 = 32, +2 = 34).' },
        { stepOrder: 3, title: 'Check with inverse', explanation: 'After any mental calculation, add back to verify: 74 − 38 = 36 → check: 36 + 38 = 74 ✓.', checkpointQuestion: 'Verify: 53 − 27 = 26. What addition confirms this?', checkpointAnswer: '26 + 27 = 53.' },
      ],
    },
  ],

  // ── N2.6: Formal subtraction of integers ───────────────────────────────────
  'N2.6': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students subtract the smaller digit from the larger regardless of position, ignoring column borrowing.',
      workedExample: '742 − 365: borrow from tens to units (12−5=7), borrow from hundreds (13−6=7), then 6−3=3 → 377.',
      guidedPrompt: 'Calculate 853 − 476 using column subtraction.',
      guidedAnswer: '377',
      steps: [
        { stepOrder: 1, title: 'Set up column subtraction', explanation: 'Write digits in columns (hundreds, tens, units). Subtract units first, then tens, then hundreds.', checkpointQuestion: 'Set up 64 − 38 in columns. What is the units digit of the answer?', checkpointAnswer: '6 (after borrowing: 14 − 8 = 6).' },
        { stepOrder: 2, title: 'Borrowing (exchanging)', explanation: 'When the top digit is smaller, borrow 1 from the column to the left. The top digit gains 10; the left-column digit decreases by 1.', checkpointQuestion: 'Calculate 73 − 46 using column subtraction.', checkpointAnswer: '27' },
        { stepOrder: 3, title: 'Multi-step borrowing', explanation: 'Sometimes you need to borrow from two columns. Work right to left.', checkpointQuestion: 'Calculate 502 − 174.', checkpointAnswer: '328' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students subtract in the wrong order, taking the larger digit from the smaller without borrowing.',
      workedExample: '52 − 38: units column 2 < 8, so borrow: 12 − 8 = 4, then 4 − 3 = 1 → 14.',
      guidedPrompt: 'Why must we borrow in 52 − 38? Show the working.',
      guidedAnswer: 'In the units column 2 < 8, so we borrow 1 ten: 12 − 8 = 4, then 4 − 3 = 1, giving 14.',
      steps: [
        { stepOrder: 1, title: 'When to borrow', explanation: 'Borrow when the top digit is less than the bottom digit in any column. Always subtract bottom from top AFTER borrowing.', checkpointQuestion: 'In 61 − 34, do we need to borrow?', checkpointOptions: ['Yes', 'No'], checkpointAnswer: 'Yes' },
        { stepOrder: 2, title: 'The borrowing process', explanation: '1 borrow from the tens makes the units 10 bigger. The tens digit reduces by 1.', checkpointQuestion: 'Calculate 61 − 34.', checkpointAnswer: '27' },
        { stepOrder: 3, title: 'Check with addition', explanation: 'Add the answer back to the number subtracted: result + subtracted = original.', checkpointQuestion: 'Check 142 − 85 = 57. What addition confirms this?', checkpointAnswer: '57 + 85 = 142.' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students subtract the smaller digit from the larger in each column, ignoring borrowing.',
      workedExample: '83 − 46: student writes 8−4=4 and 6−3=3 → 43. Error: should borrow: 13−6=7, 7−4=3 → 37.',
      guidedPrompt: 'A student gets 83 − 46 = 43. Explain the mistake.',
      guidedAnswer: 'They subtracted the smaller digit from the larger in each column. Units: 6 > 3, must borrow. Correct: 13−6=7, 7−4=3 → 37.',
      steps: [
        { stepOrder: 1, title: 'Always work top minus bottom', explanation: 'In column subtraction, subtract the BOTTOM digit from the TOP digit (after borrowing if needed). Do NOT swap to subtract a smaller bottom from the top digit.', checkpointQuestion: 'True or false: in column subtraction, you can subtract the larger digit from the smaller one.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'False' },
        { stepOrder: 2, title: 'Identify when borrowing is needed', explanation: 'If TOP digit < BOTTOM digit in any column: borrow from the column to the left before subtracting.', checkpointQuestion: 'In 72 − 45, which column needs borrowing?', checkpointOptions: ['Units', 'Tens', 'Both'], checkpointAnswer: 'Units' },
        { stepOrder: 3, title: 'Full calculation', explanation: 'Apply borrowing carefully and check by adding the answer to the number subtracted.', checkpointQuestion: 'Calculate 91 − 47.', checkpointAnswer: '44' },
      ],
    },
  ],

  // ── N2.7: Formal subtraction of decimals ───────────────────────────────────
  'N2.7': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students misalign decimal points, causing place-value errors.',
      workedExample: '5.3 − 2.47: pad to 5.30 − 2.47, then column subtract → 2.83.',
      guidedPrompt: 'Calculate 6.2 − 3.58 using column subtraction.',
      guidedAnswer: '2.62',
      steps: [
        { stepOrder: 1, title: 'Align decimal points', explanation: 'Write both decimals with decimal points in the same column. Add trailing zeros so both have the same number of decimal places.', checkpointQuestion: 'Rewrite 4.5 and 2.37 ready for column subtraction (align decimal points and pad with zeros).', checkpointAnswer: '4.50 and 2.37' },
        { stepOrder: 2, title: 'Subtract column by column', explanation: 'Subtract hundredths, then tenths, then units. Borrow across the decimal point as needed.', checkpointQuestion: 'Calculate 4.50 − 2.37.', checkpointAnswer: '2.13' },
        { stepOrder: 3, title: 'Complement of a decimal (1 − p)', explanation: 'To find 1 − 0.37: treat as 1.00 − 0.37. Borrow from the ones: 0.63.', checkpointQuestion: 'Calculate 1 − 0.64.', checkpointAnswer: '0.36' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not add placeholder zeros before subtracting decimals of different lengths.',
      workedExample: '3.4 − 1.67: pad 3.4 → 3.40. Now 3.40 − 1.67 = 1.73.',
      guidedPrompt: 'Why do we write 3.4 as 3.40 before subtracting 1.67?',
      guidedAnswer: 'To align the hundredths column correctly and avoid misreading the place value.',
      steps: [
        { stepOrder: 1, title: 'Why padding is essential', explanation: 'If decimals have different numbers of decimal places, add trailing zeros to the shorter one. This keeps each digit in the correct column.', checkpointQuestion: 'True or false: 5.3 and 5.30 have the same value.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'True' },
        { stepOrder: 2, title: 'Pad then subtract', explanation: 'Rewrite with the same number of decimal places, then apply column subtraction with borrowing as needed.', checkpointQuestion: 'Calculate 7.5 − 4.83.', checkpointAnswer: '2.67' },
        { stepOrder: 3, title: 'Decimal complements', explanation: '1 − p is the decimal complement of p. Use borrowing: 1.00 − p. E.g. 1 − 0.45 = 0.55.', checkpointQuestion: 'Calculate 1 − 0.38.', checkpointAnswer: '0.62' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students make borrowing errors across the decimal point.',
      workedExample: '4.3 − 2.7: tenths column 3 < 7, borrow 1 from units: 13 − 7 = 6 tenths, units 3 − 2 = 1 → 1.6.',
      guidedPrompt: 'Calculate 3.2 − 1.8 showing the borrowing step.',
      guidedAnswer: 'Tenths: 2 < 8, borrow → 12 − 8 = 4. Units: 2 − 1 = 1. Answer: 1.4.',
      steps: [
        { stepOrder: 1, title: 'Borrowing across the decimal', explanation: 'The decimal point does not block borrowing. Borrow from the units column into the tenths column exactly as with integers.', checkpointQuestion: 'In 5.1 − 2.6, does the tenths column need borrowing?', checkpointOptions: ['Yes', 'No'], checkpointAnswer: 'Yes' },
        { stepOrder: 2, title: 'Carry through the working', explanation: 'Borrow 1 from units (making the tenths digit 10 larger), reduce the units digit by 1, then subtract.', checkpointQuestion: 'Calculate 5.1 − 2.6.', checkpointAnswer: '2.5' },
        { stepOrder: 3, title: 'Multi-place borrowing', explanation: 'For longer decimals, borrow across multiple columns as needed, working right to left.', checkpointQuestion: 'Calculate 8.04 − 3.78.', checkpointAnswer: '4.26' },
      ],
    },
  ],

  // ── N3.4: Multiplication without carrying ──────────────────────────────────
  'N3.4': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students forget to use zero placeholder when multiplying by tens digit.',
      workedExample: '24 × 13: 24×3=72; 24×10=240; 72+240=312.',
      guidedPrompt: 'Calculate 32 × 21 using long multiplication.',
      guidedAnswer: '672',
      steps: [
        { stepOrder: 1, title: 'Multiply by units digit', explanation: 'Multiply the top number by the units digit of the bottom number. Write the result on the first row.', checkpointQuestion: '23 × 3 = ?', checkpointAnswer: '69' },
        { stepOrder: 2, title: 'Multiply by tens digit', explanation: 'Multiply the top number by the tens digit. Place a zero placeholder in the units column before writing the result.', checkpointQuestion: '23 × 10 = ?', checkpointAnswer: '230' },
        { stepOrder: 3, title: 'Add the partial products', explanation: 'Add the two partial products to get the final answer.', checkpointQuestion: 'Calculate 23 × 13 using long multiplication.', checkpointAnswer: '299' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students use grid/area method but add partial products incorrectly.',
      workedExample: '24 × 12: grid → 20×10=200, 4×10=40, 20×2=40, 4×2=8 → 200+40+40+8=288.',
      guidedPrompt: 'Use the grid method to calculate 31 × 22.',
      guidedAnswer: '682',
      steps: [
        { stepOrder: 1, title: 'Set up the grid', explanation: 'Split each number into tens and units. Create a 2×2 grid with rows for each part.', checkpointQuestion: 'Split 34 into tens and units for a grid.', checkpointAnswer: '30 and 4' },
        { stepOrder: 2, title: 'Multiply each cell', explanation: 'Multiply each row-column pair and enter the result in the cell.', checkpointQuestion: 'What goes in the cell for 30 × 20?', checkpointAnswer: '600' },
        { stepOrder: 3, title: 'Sum all cells', explanation: 'Add all four cell values to find the total.', checkpointQuestion: 'Use the grid to calculate 21 × 13.', checkpointAnswer: '273' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students omit the zero placeholder when multiplying by tens digit in long multiplication.',
      workedExample: 'Missing zero: 23 × 12 → 23×2=46, 23×1=23 (wrong, should be 230) → 46+23=69 (wrong!). Correct: 46+230=276.',
      guidedPrompt: 'A student gets 23 × 12 = 69. What went wrong?',
      guidedAnswer: 'They wrote 23 in the second row without the zero placeholder. 23 × 10 = 230, not 23. Correct answer: 46 + 230 = 276.',
      steps: [
        { stepOrder: 1, title: 'The zero placeholder rule', explanation: 'When multiplying by the tens digit, always write a 0 in the units column before the partial product. This shifts the value into the tens.', checkpointQuestion: 'When multiplying 34 by the tens digit 2 (from 24), what placeholder goes in the units column?', checkpointAnswer: '0' },
        { stepOrder: 2, title: 'Why the placeholder matters', explanation: 'Multiplying 34 × 2 gives 68. But we are multiplying by 20, not 2. The placeholder zero makes it 680.', checkpointQuestion: '34 × 20 = ?', checkpointAnswer: '680' },
        { stepOrder: 3, title: 'Full example', explanation: 'Complete both rows then add.', checkpointQuestion: 'Calculate 32 × 12 using long multiplication.', checkpointAnswer: '384' },
      ],
    },
  ],

  // ── N3.5: Multiplication with carrying ─────────────────────────────────────
  'N3.5': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students forget to add the carry digit, or add it to the wrong column.',
      workedExample: '47 × 6: 7×6=42, write 2 carry 4; 4×6=24+4=28 → 282.',
      guidedPrompt: 'Calculate 58 × 7.',
      guidedAnswer: '406',
      steps: [
        { stepOrder: 1, title: 'Short multiplication', explanation: 'Multiply units digit first. If the product ≥ 10, write the units digit and carry the tens digit.', checkpointQuestion: 'In 47 × 6, what is 7 × 6 and what do you carry?', checkpointAnswer: '42; write 2, carry 4.' },
        { stepOrder: 2, title: 'Adding the carry', explanation: 'Multiply the next digit and add the carry: (4 × 6) + 4 = 28. Write 28.', checkpointQuestion: 'Complete: 47 × 6 = ?', checkpointAnswer: '282' },
        { stepOrder: 3, title: 'Longer numbers', explanation: 'Apply the same process for each digit from right to left, carrying as needed.', checkpointQuestion: 'Calculate 136 × 4.', checkpointAnswer: '544' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students confuse the carried digit value and add it before multiplying instead of after.',
      workedExample: '38 × 5: 8×5=40, write 0 carry 4; 3×5=15, +4=19 → 190.',
      guidedPrompt: 'Explain the order of steps in short multiplication.',
      guidedAnswer: 'Multiply the digit first, then add the carry. Do not add carry before multiplying.',
      steps: [
        { stepOrder: 1, title: 'Multiply first, then add carry', explanation: 'Always multiply the digit by the multiplier first. Add the carry digit AFTER multiplying, not before.', checkpointQuestion: 'In 38 × 5: multiply 3 × 5 first. What is it?', checkpointAnswer: '15' },
        { stepOrder: 2, title: 'Then add the carry', explanation: 'Then add the carry: 15 + 4 = 19.', checkpointQuestion: 'If 3 × 5 = 15 and carry = 4, what is the full value?', checkpointAnswer: '19' },
        { stepOrder: 3, title: 'Full calculation', explanation: 'Combine both steps to complete the multiplication.', checkpointQuestion: 'Calculate 78 × 4.', checkpointAnswer: '312' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students forget to write the carry, leading to digits that are too small.',
      workedExample: '67 × 4: 7×4=28 (write 8, carry 2); 6×4=24+2=26 → 268.',
      guidedPrompt: 'A student calculates 67 × 4 = 248. What error did they make?',
      guidedAnswer: 'They forgot the carry. 7×4=28 → carry 2. 6×4=24+2=26. Correct: 268.',
      steps: [
        { stepOrder: 1, title: 'Record the carry', explanation: 'Write the carry above the next column so you do not forget it. It is easy to lose when working mentally.', checkpointQuestion: 'In 67 × 4, what digit is carried from the units step?', checkpointAnswer: '2' },
        { stepOrder: 2, title: 'Use the carry', explanation: 'Add the carry to the product of the next digit. E.g. 6 × 4 = 24, + carry 2 = 26.', checkpointQuestion: 'Compute 67 × 4 with correct carrying.', checkpointAnswer: '268' },
        { stepOrder: 3, title: 'Verify', explanation: 'Estimate to check: 67 × 4 ≈ 70 × 4 = 280. Answer of 268 is close — 248 is too small, signalling a missing carry.', checkpointQuestion: 'Estimate 83 × 5 to check the answer 415 is reasonable.', checkpointAnswer: '80 × 5 = 400, so 415 is reasonable.' },
      ],
    },
  ],

  // ── N3.6: Area ─────────────────────────────────────────────────────────────
  'N3.6': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students confuse perimeter (adding sides) with area (multiplying).',
      workedExample: 'Rectangle 6cm × 4cm: area = 6 × 4 = 24 cm².',
      guidedPrompt: 'Find the area of a rectangle 8 cm long and 5 cm wide.',
      guidedAnswer: '40 cm²',
      steps: [
        { stepOrder: 1, title: 'Area = length × width', explanation: 'Area is the space inside a 2D shape. For a rectangle: Area = length × width. Units are squared (e.g. cm²).', checkpointQuestion: 'What is the area of a rectangle 7 cm × 3 cm?', checkpointAnswer: '21 cm²' },
        { stepOrder: 2, title: 'Area of a triangle', explanation: 'Area of a triangle = ½ × base × height.', checkpointQuestion: 'What is the area of a triangle with base 10 cm and height 6 cm?', checkpointAnswer: '30 cm²' },
        { stepOrder: 3, title: 'Area of a compound shape', explanation: 'Split the compound shape into rectangles/triangles. Find each area separately, then add (or subtract if one is removed).', checkpointQuestion: 'An L-shape is made from two rectangles: 4×6 and 2×3. What is the total area?', checkpointAnswer: '30 cm²' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students use wrong formula for triangle area (base × height without halving).',
      workedExample: 'Triangle base 8, height 5: area = ½ × 8 × 5 = 20 cm².',
      guidedPrompt: 'Explain why the formula for a triangle includes ÷2.',
      guidedAnswer: 'A triangle is half of a rectangle (or parallelogram). The area is half the rectangle formed by its base and height.',
      steps: [
        { stepOrder: 1, title: 'Triangle = half a rectangle', explanation: 'A right-angled triangle exactly fills half of a rectangle with the same base and height. So Area = ½ × base × height.', checkpointQuestion: 'True or false: the area of a triangle is base × height.', checkpointOptions: ['True', 'False'], checkpointAnswer: 'False' },
        { stepOrder: 2, title: 'Parallelogram area', explanation: 'Area of a parallelogram = base × perpendicular height (NOT the slant side).', checkpointQuestion: 'A parallelogram has base 9 cm and perpendicular height 4 cm. What is its area?', checkpointAnswer: '36 cm²' },
        { stepOrder: 3, title: 'Compound shapes', explanation: 'Identify each component shape, apply the correct formula to each, then combine.', checkpointQuestion: 'A shape consists of a 5×4 rectangle and a triangle with base 5 and height 3. What is the total area?', checkpointAnswer: '27.5 cm²' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students add sides instead of multiplying for area, or mix up cm and cm².',
      workedExample: 'Area = length × width (multiplication, not addition). Units: cm × cm = cm² (not cm).',
      guidedPrompt: 'A student calculates the area of a 5 cm × 3 cm rectangle as 16 cm. Identify both errors.',
      guidedAnswer: 'Error 1: They added 5+3+5+3=16 (perimeter, not area). Error 2: Units should be cm², not cm. Correct area: 5×3=15 cm².',
      steps: [
        { stepOrder: 1, title: 'Area vs perimeter', explanation: 'Perimeter = sum of all sides. Area = region inside the shape. For a rectangle: perimeter = 2(l+w), area = l×w.', checkpointQuestion: 'Find the area and perimeter of a 4×6 rectangle.', checkpointAnswer: 'Area: 24 cm². Perimeter: 20 cm.' },
        { stepOrder: 2, title: 'Correct units', explanation: 'Area is always in squared units (cm², m², mm²). Perimeter is in linear units (cm, m, mm).', checkpointQuestion: 'A rectangle has area 35 cm². What are the units of its perimeter?', checkpointAnswer: 'cm (not cm²).' },
        { stepOrder: 3, title: 'Full problem', explanation: 'For a compound shape, split into parts, multiply (not add) for each area, then combine.', checkpointQuestion: 'Find the area of an L-shape with a 6×4 top rectangle and a 2×3 lower extension.', checkpointAnswer: '30 cm²' },
      ],
    },
  ],

  // ── N3.7: Short division without remainder ─────────────────────────────────
  'N3.7': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students forget to carry remainders into the next column.',
      workedExample: '168 ÷ 4: 1÷4=0 r1, carry 1 → 16÷4=4, 8÷4=2 → 42.',
      guidedPrompt: 'Calculate 96 ÷ 4 using short division.',
      guidedAnswer: '24',
      steps: [
        { stepOrder: 1, title: 'Divide the first digit', explanation: 'Divide the first digit of the dividend by the divisor. If it does not divide exactly, carry the remainder to the next digit.', checkpointQuestion: 'In 84 ÷ 4, divide 8 by 4 first. What is 8 ÷ 4?', checkpointAnswer: '2' },
        { stepOrder: 2, title: 'Move to the next digit', explanation: 'Bring down or carry the remainder, combining it with the next digit. Divide the result by the divisor.', checkpointQuestion: 'In 96 ÷ 4, after 9 ÷ 4 = 2 r1, what digit does the carried 1 join?', checkpointAnswer: '6, making 16.' },
        { stepOrder: 3, title: 'Complete the division', explanation: 'Continue until all digits are used. Write each quotient digit above the corresponding dividend digit.', checkpointQuestion: 'Calculate 132 ÷ 4.', checkpointAnswer: '33' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not write a zero in the quotient when a digit divides to give 0.',
      workedExample: '306 ÷ 3: 3÷3=1, 0÷3=0 (write 0 above), 6÷3=2 → 102.',
      guidedPrompt: 'Calculate 408 ÷ 4 using short division.',
      guidedAnswer: '102',
      steps: [
        { stepOrder: 1, title: 'Zero in the quotient', explanation: 'If a digit is smaller than the divisor and there is no carry, write 0 in the quotient and carry 0 to the next digit.', checkpointQuestion: 'In 306 ÷ 3, what digit goes above the 0?', checkpointAnswer: '0' },
        { stepOrder: 2, title: 'Continue correctly', explanation: 'After writing 0, the next carry is 0, so the following digit divides normally.', checkpointQuestion: 'Calculate 204 ÷ 4.', checkpointAnswer: '51' },
        { stepOrder: 3, title: 'Verify', explanation: 'Check by multiplying: quotient × divisor = dividend.', checkpointQuestion: 'Verify 408 ÷ 4 = 102 by multiplying.', checkpointAnswer: '102 × 4 = 408 ✓' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students forget to carry the remainder into the next column, giving incorrect results.',
      workedExample: '136 ÷ 4: 1÷4=0 r1; carry 1 → 13÷4=3 r1; carry 1 → 16÷4=4 → 034 = 34.',
      guidedPrompt: 'A student gets 168 ÷ 4 = 42 but shows 1÷4=0, 6÷4=1 r2, 8÷4=2. Spot the error.',
      guidedAnswer: 'They did not carry the remainder from the first step into the second digit. 1÷4=0 r1 → carry 1 → 16÷4=4, 8÷4=2 → 42. (The answer happens to be correct but the working is wrong.)',
      steps: [
        { stepOrder: 1, title: 'Every remainder must be carried', explanation: 'When a digit does not divide exactly, the remainder MUST be carried to the next digit. Never discard it.', checkpointQuestion: 'In 252 ÷ 4, 2÷4=0 r2. What digit does the carried 2 join?', checkpointAnswer: '5, making 25.' },
        { stepOrder: 2, title: 'Check each step', explanation: 'After each step, verify: quotient × divisor + remainder = digit being divided.', checkpointQuestion: '25 ÷ 4 = 6 r1. Check: 6 × 4 + 1 = ?', checkpointAnswer: '25 ✓' },
        { stepOrder: 3, title: 'Complete division', explanation: 'Carry remainders correctly through all digits.', checkpointQuestion: 'Calculate 252 ÷ 4.', checkpointAnswer: '63' },
      ],
    },
  ],

  // ── N3.8: Short division with carrying ─────────────────────────────────────
  'N3.8': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not write the remainder as a fraction or decimal when needed.',
      workedExample: '17 ÷ 5 = 3 r2 = 3 and 2/5.',
      guidedPrompt: 'Calculate 23 ÷ 4. Write any remainder as a fraction.',
      guidedAnswer: '5 r3 = 5¾',
      steps: [
        { stepOrder: 1, title: 'Division with remainder', explanation: 'When a division does not go exactly, state the quotient and remainder. E.g. 17 ÷ 5 = 3 remainder 2.', checkpointQuestion: '19 ÷ 4 = ? remainder ?', checkpointAnswer: '4 remainder 3.' },
        { stepOrder: 2, title: 'Remainder as a fraction', explanation: 'Write remainder/divisor as the fractional part. E.g. 17 ÷ 5 = 3 r2 = 3 and 2/5.', checkpointQuestion: 'Write 19 ÷ 4 as a mixed number.', checkpointAnswer: '4 and 3/4.' },
        { stepOrder: 3, title: 'Multi-digit dividend', explanation: 'Apply short division across all digits, carrying remainders, then express the final remainder as a fraction.', checkpointQuestion: 'Calculate 37 ÷ 6 as a mixed number.', checkpointAnswer: '6 and 1/6.' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students confuse remainder with quotient.',
      workedExample: '25 ÷ 7 = 3 r4 (not 4 r3). The quotient is 3 (how many times 7 fits), remainder 4 is what is left over.',
      guidedPrompt: 'What is the quotient and remainder when 29 is divided by 6?',
      guidedAnswer: 'Quotient 4, remainder 5 (since 4×6=24, 29−24=5).',
      steps: [
        { stepOrder: 1, title: 'Quotient vs remainder', explanation: 'Quotient = how many times the divisor fits into the dividend. Remainder = what is left over after.', checkpointQuestion: 'In 25 ÷ 7: what is the quotient and the remainder?', checkpointAnswer: 'Quotient 3, remainder 4.' },
        { stepOrder: 2, title: 'Check using multiplication', explanation: 'Verify: quotient × divisor + remainder = dividend. E.g. 3 × 7 + 4 = 25 ✓.', checkpointQuestion: 'Check: 29 ÷ 6 = 4 r5. Verify with multiplication.', checkpointAnswer: '4 × 6 + 5 = 29 ✓' },
        { stepOrder: 3, title: 'Short division with carry', explanation: 'Perform short division across digits, carrying remainders at each step.', checkpointQuestion: 'Calculate 158 ÷ 6.', checkpointAnswer: '26 r2 (= 26 and 1/3).' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students get the remainder right but lose track of carrying in multi-digit examples.',
      workedExample: '185 ÷ 4: 1÷4=0r1, 18÷4=4r2, 25÷4=6r1 → 46r1.',
      guidedPrompt: 'Calculate 195 ÷ 7 using short division.',
      guidedAnswer: '27 r6.',
      steps: [
        { stepOrder: 1, title: 'Track remainders carefully', explanation: 'At each step, note the remainder and combine it with the next digit before dividing. Write the carry clearly above the next digit.', checkpointQuestion: 'In 185 ÷ 4: 1÷4=0 r1. The carried 1 joins the next digit 8 to make…?', checkpointAnswer: '18.' },
        { stepOrder: 2, title: 'Continue through all digits', explanation: '18÷4=4 r2; carry 2 to next digit: 25÷4=6 r1. Write 46 remainder 1.', checkpointQuestion: 'Complete: 185 ÷ 4 = ?', checkpointAnswer: '46 remainder 1.' },
        { stepOrder: 3, title: 'Verify', explanation: 'Check: 46 × 4 + 1 = 184 + 1 = 185 ✓.', checkpointQuestion: 'Verify 195 ÷ 7 = 27 r6.', checkpointAnswer: '27 × 7 + 6 = 189 + 6 = 195 ✓.' },
      ],
    },
  ],

  // ── N3.18: Short division with integer remainders ──────────────────────────
  'N3.18': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not adapt the remainder to the context (e.g. rounding up for real-world problems).',
      workedExample: '27 ÷ 4 = 6 r3. Context: "How many cars for 27 people, 4 per car?" → 7 cars (round up).',
      guidedPrompt: '43 stickers shared equally among 5 friends. How many each and how many left over?',
      guidedAnswer: '8 each, 3 left over.',
      steps: [
        { stepOrder: 1, title: 'Find quotient and remainder', explanation: 'Use short division to find the quotient and remainder. E.g. 43 ÷ 5 = 8 r3.', checkpointQuestion: '31 ÷ 4 = ? r ?', checkpointAnswer: '7 r 3.' },
        { stepOrder: 2, title: 'Interpret the remainder', explanation: 'The remainder tells you what is left over. In sharing problems, it is the amount that cannot be shared equally.', checkpointQuestion: '31 people need 4-person taxis. How many taxis are needed?', checkpointAnswer: '8 (7 full taxis + 1 for the 3 remaining).' },
        { stepOrder: 3, title: 'Context determines rounding', explanation: 'Sometimes round down (cannot complete another group); sometimes round up (need another container/vehicle).', checkpointQuestion: '29 biscuits packed 6 per bag. How many full bags?', checkpointAnswer: '4 full bags (remainder 5 is insufficient for another full bag).' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students write the remainder alone without recording it clearly in the working.',
      workedExample: '57 ÷ 4: 5÷4=1r1, 17÷4=4r1 → 14 remainder 1.',
      guidedPrompt: 'Calculate 73 ÷ 6.',
      guidedAnswer: '12 remainder 1.',
      steps: [
        { stepOrder: 1, title: 'Short division layout', explanation: 'Write divisor outside the bracket and dividend inside. Write the quotient digit above each dividend digit.', checkpointQuestion: 'Set up and begin 73 ÷ 6: 7 ÷ 6 = ?', checkpointAnswer: '1 r 1.' },
        { stepOrder: 2, title: 'Carry and continue', explanation: 'Carry the remainder 1 to join the next digit (3), making 13. Then 13 ÷ 6 = 2 r1.', checkpointQuestion: 'Complete: 73 ÷ 6 = ?', checkpointAnswer: '12 r 1.' },
        { stepOrder: 3, title: 'Verify', explanation: 'Check: 12 × 6 + 1 = 73 ✓.', checkpointQuestion: 'Verify 73 ÷ 6 = 12 r1 using multiplication.', checkpointAnswer: '12 × 6 + 1 = 72 + 1 = 73 ✓.' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students forget to carry the remainder into the next column in multi-digit divisions.',
      workedExample: '156 ÷ 7: 1÷7=0r1, 15÷7=2r1, 16÷7=2r2 → 22 r2.',
      guidedPrompt: 'A student calculates 156 ÷ 7 = 22 r0. What did they miss?',
      guidedAnswer: 'They dropped the remainder. 15÷7=2 r1, carry 1 to make 16. 16÷7=2 r2. Answer: 22 r2.',
      steps: [
        { stepOrder: 1, title: 'Never discard a remainder mid-calculation', explanation: 'Every intermediate remainder must be carried to the next digit. Dropping a remainder gives a wrong final answer.', checkpointQuestion: 'In 156 ÷ 7: 1÷7=0 r1. The 1 is carried to join which digit?', checkpointAnswer: '5, making 15.' },
        { stepOrder: 2, title: 'Continue with carries', explanation: '15÷7=2 r1; carry 1 → 16÷7=2 r2. Final answer: 22 remainder 2.', checkpointQuestion: 'Complete: 156 ÷ 7 = ?', checkpointAnswer: '22 r 2.' },
        { stepOrder: 3, title: 'Verification', explanation: '22 × 7 + 2 = 154 + 2 = 156 ✓.', checkpointQuestion: 'Verify 156 ÷ 7 = 22 r2.', checkpointAnswer: '22 × 7 + 2 = 156 ✓.' },
      ],
    },
  ],

  // ── N3.19: Short division giving a decimal answer ──────────────────────────
  'N3.19': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students stop at the remainder instead of continuing to decimal places.',
      workedExample: '9 ÷ 4 = 2.25 (not 2 r1): after remainder 1, add decimal point and a 0, continue: 10÷4=2, 20÷4=5.',
      guidedPrompt: 'Calculate 7 ÷ 4 giving a decimal answer.',
      guidedAnswer: '1.75',
      steps: [
        { stepOrder: 1, title: 'Add a decimal point and zeros', explanation: 'When you have a remainder, place a decimal point in the quotient and append a zero to the remainder. Continue dividing.', checkpointQuestion: 'After 7 ÷ 4 = 1 r3, add a decimal point. What does 30 ÷ 4 equal?', checkpointAnswer: '7 r2 (so far: 1.7...).' },
        { stepOrder: 2, title: 'Continue until no remainder', explanation: 'Append another zero and divide the new remainder. Repeat until the remainder is 0.', checkpointQuestion: 'Continuing: 20 ÷ 4 = ?', checkpointAnswer: '5. So 7 ÷ 4 = 1.75.' },
        { stepOrder: 3, title: 'Check', explanation: 'Multiply the decimal answer by the divisor to verify: 1.75 × 4 = 7 ✓.', checkpointQuestion: 'Calculate 9 ÷ 4 as a decimal.', checkpointAnswer: '2.25' },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students forget to place the decimal point in the quotient, giving answers like 225 instead of 2.25.',
      workedExample: '9 ÷ 4: integer part is 2; when we move past the decimal, write the decimal point in the quotient above.',
      guidedPrompt: 'Where does the decimal point go in the quotient when calculating 9 ÷ 4?',
      guidedAnswer: 'After the 2 (the integer part): 2.25.',
      steps: [
        { stepOrder: 1, title: 'Quotient decimal point placement', explanation: 'The decimal point in the quotient appears directly above the decimal point you add to the dividend when you continue past a remainder.', checkpointQuestion: 'In 15 ÷ 4, after the integer part (3), where does the decimal go?', checkpointAnswer: 'After the 3: 3.___.' },
        { stepOrder: 2, title: 'Continue and place correctly', explanation: 'Remainder 3 → 30 ÷ 4 = 7 r2 → 20 ÷ 4 = 5. Quotient: 3.75.', checkpointQuestion: 'Calculate 15 ÷ 4 as a decimal.', checkpointAnswer: '3.75' },
        { stepOrder: 3, title: 'Verify', explanation: 'Check: 3.75 × 4 = 15 ✓.', checkpointQuestion: 'Calculate 11 ÷ 4 as a decimal.', checkpointAnswer: '2.75' },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students attach the wrong number of zeros, producing an answer with wrong decimal precision.',
      workedExample: '3 ÷ 8: 3.000 ÷ 8: 30÷8=3r6, 60÷8=7r4, 40÷8=5 → 0.375.',
      guidedPrompt: 'Calculate 3 ÷ 8 as a decimal.',
      guidedAnswer: '0.375',
      steps: [
        { stepOrder: 1, title: 'When dividend < divisor', explanation: 'If the dividend is smaller than the divisor, the quotient starts with "0.". Append zeros to continue dividing.', checkpointQuestion: '3 ÷ 8: what is the integer part of the quotient?', checkpointAnswer: '0 (since 3 < 8).' },
        { stepOrder: 2, title: 'Extend as needed', explanation: 'Append zeros until the remainder is 0. 3.000 ÷ 8 → 0.375.', checkpointQuestion: 'Calculate 3 ÷ 8 step by step.', checkpointAnswer: '0.375' },
        { stepOrder: 3, title: 'Verify precision', explanation: '0.375 × 8 = 3 ✓. The answer has exactly 3 decimal places.', checkpointQuestion: 'Calculate 1 ÷ 8 as a decimal.', checkpointAnswer: '0.125' },
      ],
    },
  ],
};

async function main() {
  const subject = await prisma.subject.findFirstOrThrow({ where: { slug: 'ks3-maths' } });
  let totalRoutes = 0;

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
            checkpointQuestion: validated.checkpointQuestion,
            checkpointOptions: validated.checkpointOptions,
            checkpointAnswer: validated.checkpointAnswer,
            questionType: validated.questionType,
          },
        });
      }

      console.log(`  ✓ ${skillCode} Route ${route.routeType}`);
      totalRoutes++;
    }
  }

  console.log(`\n✅ ${totalRoutes} routes seeded for gap skills.`);
}

// Only execute when run directly (not when imported by tests/other modules).
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
