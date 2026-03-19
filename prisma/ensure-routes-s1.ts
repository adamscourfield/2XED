/**
 * ensure-routes-s1.ts
 *
 * Seeds explanation routes (A / B / C) for S1.1–S1.12 (Probability & Venn Diagrams).
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-s1.ts
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
  /* ──────────────────────────────────────────────────────────────
   * S1.1 — Use the vocabulary of probability and the probability scale
   * ────────────────────────────────────────────────────────────── */
  'S1.1': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students confuse everyday language (likely, unlikely) with precise probability values on the 0-to-1 scale.',
      workedExample: 'Impossible = 0, unlikely = close to 0, even chance = 0.5, likely = close to 1, certain = 1. Rolling a 6 on a fair die → probability = 1/6 ≈ 0.17 → unlikely.',
      guidedPrompt: 'Place these events on the probability scale: getting heads on a fair coin; rolling a 7 on a standard die; picking any day from the week.',
      guidedAnswer: 'Heads on a fair coin = 0.5 (even chance). Rolling a 7 = 0 (impossible). Picking any day from the week = 1 (certain).',
      steps: [
        {
          stepOrder: 1,
          title: 'The probability scale',
          explanation: 'Probability is measured on a scale from 0 to 1. A probability of 0 means impossible, 0.5 means even chance, and 1 means certain. All probabilities must fall within this range.',
          checkpointQuestion: 'What probability does an impossible event have?',
          checkpointOptions: ['0', '0.5', '1', '-1'],
          checkpointAnswer: '0',
        },
        {
          stepOrder: 2,
          title: 'Key vocabulary',
          explanation: 'Impossible = 0, very unlikely = close to 0, unlikely = below 0.5, even chance = 0.5, likely = above 0.5, very likely = close to 1, certain = 1.',
          checkpointQuestion: 'Which word best describes an event with a probability of 0.5?',
          checkpointOptions: ['Impossible', 'Unlikely', 'Even chance', 'Certain'],
          checkpointAnswer: 'Even chance',
        },
        {
          stepOrder: 3,
          title: 'Placing events on the scale',
          explanation: 'To place an event on the probability scale, decide how likely it is and assign it a position between 0 and 1. Compare it with known reference points like 0, 0.5, and 1.',
          checkpointQuestion: 'A bag has 1 red and 9 blue counters. Where on the scale would you place "picking a red counter"?',
          checkpointOptions: ['Close to 0', 'At 0.5', 'Close to 1'],
          checkpointAnswer: 'Close to 0',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students struggle to connect the probability scale to a number line diagram.',
      workedExample: 'Draw a number line from 0 to 1. Mark 0 as impossible, 0.5 as even chance, 1 as certain. Place "rolling an even number on a fair die" at 3/6 = 0.5.',
      guidedPrompt: 'Draw a probability scale and mark where "picking a vowel from A, E, I, O, U, B, C, D" would go.',
      guidedAnswer: '5 vowels out of 8 letters = 5/8 = 0.625. This sits between 0.5 and 1, closer to 0.5 — so it is "likely".',
      steps: [
        {
          stepOrder: 1,
          title: 'Probability as a number line',
          explanation: 'Think of the probability scale as a number line from 0 to 1. Every event maps to a single point on this line. The further right the point, the more likely the event.',
          checkpointQuestion: 'True or false: a probability of 0.8 is further right on the scale than 0.3.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Reference points on the scale',
          explanation: 'Three key reference points: 0 (impossible), 0.5 (even chance), 1 (certain). Use these anchors to judge where other events fall.',
          checkpointQuestion: 'An event has probability 0.9. Is it closer to "even chance" or "certain"?',
          checkpointOptions: ['Even chance', 'Certain'],
          checkpointAnswer: 'Certain',
        },
        {
          stepOrder: 3,
          title: 'Comparing events on the scale',
          explanation: 'When two events are plotted on the scale, the one further right is more likely. You can compare probabilities by comparing their positions.',
          checkpointQuestion: 'Event A has probability 1/4. Event B has probability 3/4. Which is more likely?',
          checkpointOptions: ['Event A', 'Event B'],
          checkpointAnswer: 'Event B',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students believe probability can be greater than 1 or less than 0.',
      workedExample: 'A student says "the probability of rain is 1.2". This is wrong because no probability can exceed 1. The maximum is 1 (certain).',
      guidedPrompt: 'A student says the probability of picking a red card from a standard deck is 26/52 = 1/2, but then writes it as 1.5. Explain their error.',
      guidedAnswer: 'They confused 1/2 with 1.5. The correct decimal is 0.5. Probabilities cannot exceed 1.',
      steps: [
        {
          stepOrder: 1,
          title: 'Probability must be between 0 and 1',
          explanation: 'A common mistake is writing a probability greater than 1 or less than 0. This is always wrong. Check: if your answer is outside 0–1, revisit your calculation.',
          checkpointQuestion: 'A student calculates a probability of 1.3. What should they conclude?',
          checkpointOptions: ['The answer is correct', 'They have made an error'],
          checkpointAnswer: 'They have made an error',
        },
        {
          stepOrder: 2,
          title: 'Confusing fractions and decimals',
          explanation: 'Be careful converting fractions to decimals. 1/2 = 0.5 (not 1.5). 1/4 = 0.25 (not 1.25). Always divide the numerator by the denominator.',
          checkpointQuestion: 'Convert the probability 3/4 to a decimal.',
          checkpointAnswer: '0.75',
        },
        {
          stepOrder: 3,
          title: 'Impossible does not mean negative',
          explanation: 'Impossible events have a probability of exactly 0, not a negative number. Probability is never negative.',
          checkpointQuestion: 'True or false: a probability of -0.1 is valid.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.2 — Understand that probabilities sum to 1
   * ────────────────────────────────────────────────────────────── */
  'S1.2': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students forget that all probabilities for a complete set of outcomes must add up to 1.',
      workedExample: 'A spinner has 3 sections: P(red) = 0.4, P(blue) = 0.35, P(green) = ? → P(green) = 1 − 0.4 − 0.35 = 0.25.',
      guidedPrompt: 'A bag has red, blue and green counters. P(red) = 1/3, P(blue) = 1/2. Find P(green).',
      guidedAnswer: 'P(green) = 1 − 1/3 − 1/2 = 1 − 2/6 − 3/6 = 1/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Probabilities sum to 1',
          explanation: 'When you list every possible outcome of an experiment, their probabilities must add up to exactly 1 (or 100%). This is because one of the outcomes must happen.',
          checkpointQuestion: 'A coin has P(heads) = 0.5. What is P(tails)?',
          checkpointAnswer: '0.5',
        },
        {
          stepOrder: 2,
          title: 'Finding a missing probability',
          explanation: 'If you know the probabilities of all outcomes except one, subtract the known probabilities from 1 to find the missing one.',
          checkpointQuestion: 'A spinner has P(red) = 0.3 and P(blue) = 0.5. Find P(yellow) if these are the only colours.',
          checkpointAnswer: '0.2',
        },
        {
          stepOrder: 3,
          title: 'Using fractions and percentages',
          explanation: 'The rule works with any form: fractions (sum to 1), decimals (sum to 1), or percentages (sum to 100%). Convert to a common form before subtracting.',
          checkpointQuestion: 'A bag has P(red) = 25% and P(blue) = 45%. What is P(green) as a percentage?',
          checkpointAnswer: '30%',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not see that "probabilities sum to 1" is a consequence of the whole being divided into parts.',
      workedExample: 'Think of a pie chart: all slices fill the full circle (360°). Similarly, all probabilities fill the interval from 0 to 1.',
      guidedPrompt: 'Use a pie chart analogy to explain why probabilities must sum to 1.',
      guidedAnswer: 'A pie chart represents the whole (100%). Each slice is an outcome. Since the slices fill the whole chart, the probabilities (proportions) must add up to 1.',
      steps: [
        {
          stepOrder: 1,
          title: 'Whole = 1',
          explanation: 'Probability "1" represents the whole — something is certain to happen. Every possible outcome occupies a portion of this whole, like slices of a pie.',
          checkpointQuestion: 'True or false: the total probability of all outcomes of a fair die roll is 1.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Fractions, decimals and percentages all work',
          explanation: 'You can express probabilities as fractions (summing to 1), decimals (summing to 1.0), or percentages (summing to 100%). Choose whichever form makes the calculation easiest.',
          checkpointQuestion: 'Convert P = 3/10 to a percentage.',
          checkpointAnswer: '30%',
        },
        {
          stepOrder: 3,
          title: 'Checking your answer',
          explanation: 'After finding all probabilities, add them up. If they do not equal 1 (or 100%), there is an error somewhere.',
          checkpointQuestion: 'P(A) = 0.4, P(B) = 0.35, P(C) = 0.3. Do these probabilities form a valid set of outcomes?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students add probabilities of overlapping events and get a total greater than 1, not realising outcomes must be mutually exclusive for the sum-to-1 rule.',
      workedExample: 'On a die: P(even) = 3/6 and P(less than 4) = 3/6 do NOT sum to 1 because the events overlap (2 is both even and less than 4). The sum-to-1 rule only applies to a complete list of mutually exclusive outcomes.',
      guidedPrompt: 'A student says P(even) + P(odd) + P(prime) = 3/6 + 3/6 + 3/6 = 9/6 on a fair die. What is wrong?',
      guidedAnswer: '"Prime" overlaps with both "even" and "odd" (e.g. 2 is even and prime). The sum-to-1 rule applies only to mutually exclusive, exhaustive outcomes like {1, 2, 3, 4, 5, 6}.',
      steps: [
        {
          stepOrder: 1,
          title: 'Mutually exclusive outcomes',
          explanation: 'The sum-to-1 rule applies only when outcomes do not overlap. "Mutually exclusive" means two events cannot happen at the same time.',
          checkpointQuestion: 'Are "rolling a 3" and "rolling a 5" on a die mutually exclusive?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'Yes',
        },
        {
          stepOrder: 2,
          title: 'Exhaustive outcomes',
          explanation: 'The outcomes must also be exhaustive — they must cover every possibility. Together, mutually exclusive and exhaustive outcomes always sum to 1.',
          checkpointQuestion: 'For a fair die, list a set of mutually exclusive and exhaustive outcomes.',
          checkpointAnswer: '{1, 2, 3, 4, 5, 6}',
        },
        {
          stepOrder: 3,
          title: 'Spotting overlapping events',
          explanation: 'If your probabilities sum to more than 1, you may have counted overlapping events. Check whether any outcome belongs to more than one category.',
          checkpointQuestion: 'P(red) = 0.5, P(blue) = 0.4, P(green) = 0.2. What should you conclude?',
          checkpointOptions: ['The probabilities are correct', 'There is an error because they sum to 1.1'],
          checkpointAnswer: 'There is an error because they sum to 1.1',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.3 — Calculate the probability of a single event
   * ────────────────────────────────────────────────────────────── */
  'S1.3': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students confuse the number of favourable outcomes with the total number of outcomes.',
      workedExample: 'A bag contains 3 red and 7 blue counters. P(red) = number of red / total = 3/10.',
      guidedPrompt: 'A box contains 5 green, 3 yellow and 2 white balls. Find P(yellow).',
      guidedAnswer: 'Total = 5 + 3 + 2 = 10. P(yellow) = 3/10.',
      steps: [
        {
          stepOrder: 1,
          title: 'The probability formula',
          explanation: 'P(event) = number of favourable outcomes ÷ total number of equally likely outcomes. Both counts must be correct for the formula to work.',
          checkpointQuestion: 'A fair die is rolled. What is P(rolling a 4)?',
          checkpointAnswer: '1/6',
        },
        {
          stepOrder: 2,
          title: 'Counting outcomes carefully',
          explanation: 'Count the total number of outcomes first, then count how many of those match the event you want. Make sure every outcome is equally likely.',
          checkpointQuestion: 'A bag has 4 red and 6 blue marbles. What is P(blue)?',
          checkpointAnswer: '6/10',
        },
        {
          stepOrder: 3,
          title: 'Simplifying the probability',
          explanation: 'Once you write the fraction, simplify if possible. P(blue) = 6/10 = 3/5. Simplified fractions, decimals, or percentages are all acceptable.',
          checkpointQuestion: 'Simplify P(blue) = 6/10.',
          checkpointAnswer: '3/5',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not connect probability to the proportion of favourable outcomes in a visual model.',
      workedExample: 'Imagine 10 counters in a bag: 3 red, 7 blue. If you "see" them lined up, 3 out of 10 are red → P(red) = 3/10.',
      guidedPrompt: 'Draw 8 counters: 2 green, 6 yellow. Use the picture to explain P(green).',
      guidedAnswer: '2 out of 8 counters are green → P(green) = 2/8 = 1/4.',
      steps: [
        {
          stepOrder: 1,
          title: 'Probability as proportion',
          explanation: 'Probability measures what proportion of all equally likely outcomes are favourable. If 3 out of 10 counters are red, the proportion (and probability) is 3/10.',
          checkpointQuestion: 'In a class of 25 students, 10 wear glasses. What is the probability a randomly chosen student wears glasses?',
          checkpointAnswer: '10/25',
        },
        {
          stepOrder: 2,
          title: 'Visual models',
          explanation: 'Drawing counters, cards, or spinners helps you see the proportion at a glance. The shaded area on a spinner directly shows the probability.',
          checkpointQuestion: 'A spinner is split into 4 equal sections: 1 red, 2 blue, 1 green. What is P(blue)?',
          checkpointAnswer: '2/4',
        },
        {
          stepOrder: 3,
          title: 'Connecting to fractions',
          explanation: 'Probability is simply a fraction where the numerator is "what you want" and the denominator is "everything possible".',
          checkpointQuestion: 'A standard deck has 52 cards, 13 of which are hearts. What is P(heart)?',
          checkpointAnswer: '13/52',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students put the total on top and the favourable outcomes on the bottom (inverting the fraction).',
      workedExample: 'A bag has 2 red and 8 blue. A student writes P(red) = 10/2 = 5. This is wrong. Correct: P(red) = 2/10 = 1/5.',
      guidedPrompt: 'A student writes P(rolling a 3 on a die) = 6/1. Explain their error.',
      guidedAnswer: 'They inverted the fraction. It should be favourable/total = 1/6, not 6/1.',
      steps: [
        {
          stepOrder: 1,
          title: 'Numerator = favourable',
          explanation: 'The numerator (top) is always the number of outcomes you want. The denominator (bottom) is the total number of equally likely outcomes. Never swap them.',
          checkpointQuestion: 'A jar has 5 red and 15 blue sweets. What is P(red)?',
          checkpointAnswer: '5/20',
        },
        {
          stepOrder: 2,
          title: 'Check: probability ≤ 1',
          explanation: 'If your answer is greater than 1, you have almost certainly inverted the fraction. A probability can never exceed 1.',
          checkpointQuestion: 'A student writes P(even on a die) = 6/3 = 2. Is this correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 3,
          title: 'Correct the inversion',
          explanation: 'If you spot an inverted fraction, simply flip it: 6/3 → 3/6 = 1/2. Then simplify if possible.',
          checkpointQuestion: 'Correct the error: P(prime on a die) = 6/3. What is the right answer?',
          checkpointAnswer: '3/6',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.4 — Construct sample space diagrams for two events
   * ────────────────────────────────────────────────────────────── */
  'S1.4': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students miss outcomes when listing combinations of two events, or duplicate some.',
      workedExample: 'Two coins: list outcomes as (H,H), (H,T), (T,H), (T,T). A two-way table with Coin 1 across the top and Coin 2 down the side gives all 4 outcomes.',
      guidedPrompt: 'A coin is flipped and a die is rolled. How many outcomes are there? List the first few.',
      guidedAnswer: '2 × 6 = 12 outcomes. (H,1), (H,2), (H,3), (H,4), (H,5), (H,6), (T,1), (T,2), (T,3), (T,4), (T,5), (T,6).',
      steps: [
        {
          stepOrder: 1,
          title: 'What is a sample space diagram?',
          explanation: 'A sample space diagram lists every possible outcome when two events happen together. It is often drawn as a two-way table (grid) with one event along each axis.',
          checkpointQuestion: 'How many outcomes are there when you flip a coin and roll a die?',
          checkpointAnswer: '12',
        },
        {
          stepOrder: 2,
          title: 'Drawing the grid',
          explanation: 'Put all outcomes of Event 1 along the top and all outcomes of Event 2 down the side. Fill in each cell with the combined outcome.',
          checkpointQuestion: 'A spinner has sections 1, 2, 3 and a coin has H, T. How many cells does the sample space grid have?',
          checkpointAnswer: '6',
        },
        {
          stepOrder: 3,
          title: 'Checking completeness',
          explanation: 'The total number of outcomes = (number of outcomes for Event 1) × (number of outcomes for Event 2). Use this to check you have not missed any.',
          checkpointQuestion: 'Two dice are rolled. How many outcomes should the sample space contain?',
          checkpointAnswer: '36',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students cannot see why a grid captures all outcomes systematically.',
      workedExample: 'Flipping two coins: draw a 2×2 grid. Row headings: H, T. Column headings: H, T. Each cell is one outcome → (H,H), (H,T), (T,H), (T,T).',
      guidedPrompt: 'Explain why a grid guarantees you list every outcome for two dice.',
      guidedAnswer: 'Each row represents a fixed result for die 1 and each column a result for die 2. Every combination appears in exactly one cell, so nothing is missed or repeated.',
      steps: [
        {
          stepOrder: 1,
          title: 'Systematic listing',
          explanation: 'A grid is systematic because it pairs every outcome of Event 1 with every outcome of Event 2. This guarantees nothing is missed or double-counted.',
          checkpointQuestion: 'True or false: a sample space diagram can help prevent missed outcomes.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Reading combined outcomes from a grid',
          explanation: 'Each cell in the grid represents one combined outcome. The row tells you the result of Event 1 and the column tells you the result of Event 2.',
          checkpointQuestion: 'In a coin-die grid, the cell in row H, column 4 represents which outcome?',
          checkpointAnswer: '(H, 4)',
        },
        {
          stepOrder: 3,
          title: 'Using totals for sums',
          explanation: 'For two dice, you can write the sum of the dice in each cell. This makes it easy to see how many ways each total can occur.',
          checkpointQuestion: 'In a two-dice sample space, how many cells show a sum of 7?',
          checkpointAnswer: '6',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students treat (H,T) and (T,H) as the same outcome, halving the sample space.',
      workedExample: 'Two coins: (H,T) means coin 1 = H, coin 2 = T. (T,H) means coin 1 = T, coin 2 = H. These are different outcomes even though both have "one head and one tail".',
      guidedPrompt: 'A student says there are only 3 outcomes for two coins: 2 heads, 1 head, 0 heads. Explain their error.',
      guidedAnswer: 'They grouped (H,T) and (T,H) into "1 head". The sample space has 4 equally likely outcomes: HH, HT, TH, TT. P(one head) = 2/4, not 1/3.',
      steps: [
        {
          stepOrder: 1,
          title: 'Order matters in sample spaces',
          explanation: 'When listing outcomes for two events, (H,T) and (T,H) are different. The first position is Event 1 and the second is Event 2.',
          checkpointQuestion: 'True or false: when flipping two coins, (H,T) and (T,H) are the same outcome.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Why grouping changes probability',
          explanation: 'If you group outcomes, each "group" may not be equally likely. HH (1 way), one H one T (2 ways), TT (1 way) — the middle group is twice as likely.',
          checkpointQuestion: 'What is P(exactly one head) when flipping two fair coins?',
          checkpointAnswer: '2/4',
        },
        {
          stepOrder: 3,
          title: 'Use the grid to avoid this error',
          explanation: 'A two-way grid forces you to separate each ordered pair, so you will not accidentally merge distinct outcomes.',
          checkpointQuestion: 'How many outcomes are in the full sample space for two coins?',
          checkpointOptions: ['3', '4'],
          checkpointAnswer: '4',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.5 — Calculate probabilities from sample space diagrams
   * ────────────────────────────────────────────────────────────── */
  'S1.5': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students count favourable cells incorrectly or use the wrong total when reading a sample space diagram.',
      workedExample: 'Two dice: P(sum = 5). The grid has 36 cells. Cells with sum 5: (1,4),(2,3),(3,2),(4,1) → 4 cells. P(sum = 5) = 4/36 = 1/9.',
      guidedPrompt: 'Using a two-dice sample space, find P(sum = 9).',
      guidedAnswer: 'Cells: (3,6),(4,5),(5,4),(6,3) → 4 cells. P(sum = 9) = 4/36 = 1/9.',
      steps: [
        {
          stepOrder: 1,
          title: 'Count favourable outcomes',
          explanation: 'Identify which cells in the sample space diagram match the event. Count those cells carefully.',
          checkpointQuestion: 'Two dice are rolled. How many outcomes give a sum of 2?',
          checkpointAnswer: '1',
        },
        {
          stepOrder: 2,
          title: 'Find the total outcomes',
          explanation: 'The total number of outcomes is the total number of cells in the grid. For two dice this is 6 × 6 = 36.',
          checkpointQuestion: 'A coin and a die are used. What is the total number of outcomes?',
          checkpointAnswer: '12',
        },
        {
          stepOrder: 3,
          title: 'Write and simplify the probability',
          explanation: 'P(event) = favourable cells ÷ total cells. Simplify the fraction if possible.',
          checkpointQuestion: 'Two dice: P(double) = ?/36. Fill in the numerator and simplify.',
          checkpointAnswer: '6/36',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students cannot visualise which region of a sample space diagram corresponds to the event.',
      workedExample: 'Two dice sum grid: highlight all cells where the sum is 7. They form a diagonal stripe across the grid. Count the highlighted cells: 6.',
      guidedPrompt: 'In a two-dice grid, shade all cells where both dice show the same number. What pattern do you see?',
      guidedAnswer: 'The doubles (1,1), (2,2), … (6,6) form a diagonal from top-left to bottom-right. There are 6 such cells.',
      steps: [
        {
          stepOrder: 1,
          title: 'Highlighting favourable outcomes',
          explanation: 'Shade or circle the cells that match your event. This makes it easy to count them and see patterns.',
          checkpointQuestion: 'In a two-dice grid, how many cells have both numbers less than 3?',
          checkpointAnswer: '4',
        },
        {
          stepOrder: 2,
          title: 'Patterns in sample spaces',
          explanation: 'Events like "sum = 7" form diagonals. "Both dice even" forms a block. Recognising patterns helps you count faster.',
          checkpointQuestion: 'Two dice: how many cells give a sum of 12?',
          checkpointAnswer: '1',
        },
        {
          stepOrder: 3,
          title: 'From pattern to probability',
          explanation: 'Once you have counted the favourable cells and the total cells, write the fraction. P(event) = shaded cells / total cells.',
          checkpointQuestion: 'P(sum = 7) for two dice is 6/36. Simplify this fraction.',
          checkpointAnswer: '1/6',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students think each possible sum is equally likely because there are 11 possible sums (2–12).',
      workedExample: 'P(sum = 7) = 6/36 but P(sum = 2) = 1/36. The sums are NOT equally likely — some can be made in more ways than others.',
      guidedPrompt: 'A student says P(sum = 7) = 1/11 because there are 11 sums from 2 to 12. Explain their error.',
      guidedAnswer: 'The 11 sums are not equally likely. Sum 7 can be made 6 ways but sum 2 only 1 way. You must use the 36-cell grid, giving P(sum = 7) = 6/36 = 1/6.',
      steps: [
        {
          stepOrder: 1,
          title: 'Not all sums are equally likely',
          explanation: 'When rolling two dice, there are 36 equally likely outcomes. Some sums can be made in many ways (7 = 6 ways) and some in few (2 = 1 way).',
          checkpointQuestion: 'How many ways can you make a sum of 6 with two dice?',
          checkpointAnswer: '5',
        },
        {
          stepOrder: 2,
          title: 'Use outcomes, not sums',
          explanation: 'The denominator must be the total equally likely outcomes (36), not the number of possible sums (11).',
          checkpointQuestion: 'What should the denominator be when finding P(sum = 8) for two dice?',
          checkpointOptions: ['11', '36'],
          checkpointAnswer: '36',
        },
        {
          stepOrder: 3,
          title: 'Check with the grid',
          explanation: 'Always build the grid to confirm. The most common sum is 7 (6/36 = 1/6). The rarest sums are 2 and 12 (each 1/36).',
          checkpointQuestion: 'What is P(sum = 11) for two dice?',
          checkpointAnswer: '2/36',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.6 — Identify and represent sets
   * ────────────────────────────────────────────────────────────── */
  'S1.6': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students confuse sets with sequences or do not use correct notation (curly braces, commas).',
      workedExample: 'Let A = {2, 4, 6, 8, 10} (even numbers from 1 to 10). Elements are listed inside curly braces, separated by commas, with no repeats.',
      guidedPrompt: 'Write the set of prime numbers less than 20.',
      guidedAnswer: '{2, 3, 5, 7, 11, 13, 17, 19}',
      steps: [
        {
          stepOrder: 1,
          title: 'What is a set?',
          explanation: 'A set is a well-defined collection of distinct objects called elements (or members). Sets are written with curly braces: A = {1, 2, 3}.',
          checkpointQuestion: 'Which uses correct set notation?',
          checkpointOptions: ['A = (1, 2, 3)', 'A = {1, 2, 3}', 'A = [1, 2, 3]'],
          checkpointAnswer: 'A = {1, 2, 3}',
        },
        {
          stepOrder: 2,
          title: 'Membership of a set',
          explanation: 'We write 3 ∈ A to mean "3 is an element of set A" and 5 ∉ A to mean "5 is not in A".',
          checkpointQuestion: 'If B = {1, 3, 5, 7}, is 4 ∈ B?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 3,
          title: 'No repeats in a set',
          explanation: 'Sets do not contain duplicate elements. If you list {1, 2, 2, 3}, the set is simply {1, 2, 3}.',
          checkpointQuestion: 'Write the set: {5, 3, 5, 7, 3} without duplicates.',
          checkpointAnswer: '{3, 5, 7}',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students struggle to describe a set using a rule (set-builder notation or description).',
      workedExample: 'A = {x : x is an even number, 1 ≤ x ≤ 10} is the same as A = {2, 4, 6, 8, 10}. The rule describes which elements belong.',
      guidedPrompt: 'Describe the set {1, 4, 9, 16, 25} in words.',
      guidedAnswer: 'The set of perfect squares from 1 to 25 (or: square numbers less than or equal to 25).',
      steps: [
        {
          stepOrder: 1,
          title: 'Listing vs describing',
          explanation: 'A set can be shown by listing all elements (roster form) or by describing a rule. For example, {even numbers less than 10} = {2, 4, 6, 8}.',
          checkpointQuestion: 'List the set: "multiples of 3 between 1 and 15".',
          checkpointAnswer: '{3, 6, 9, 12, 15}',
        },
        {
          stepOrder: 2,
          title: 'The universal set',
          explanation: 'The universal set (ξ or U) contains all elements under consideration. Every set you work with is a subset of the universal set.',
          checkpointQuestion: 'If ξ = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10} and A = {even numbers in ξ}, list set A.',
          checkpointAnswer: '{2, 4, 6, 8, 10}',
        },
        {
          stepOrder: 3,
          title: 'Empty and equal sets',
          explanation: 'The empty set {} (or ∅) has no elements. Two sets are equal if they contain exactly the same elements, regardless of order.',
          checkpointQuestion: 'True or false: {1, 2, 3} = {3, 1, 2}.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse the number of elements in a set with the elements themselves, or list elements with repeats.',
      workedExample: 'A student writes A = {1, 2, 2, 3} and says A has 4 elements. Correction: A = {1, 2, 3} with 3 elements.',
      guidedPrompt: 'A student says {1, 2, 3} and {1, 2, 3, 3} are different sets. Explain why they are wrong.',
      guidedAnswer: 'Sets ignore duplicates. Both represent {1, 2, 3} with exactly 3 elements.',
      steps: [
        {
          stepOrder: 1,
          title: 'Sets have distinct elements only',
          explanation: 'Repeating an element does not add anything to a set. {1, 2, 2, 3} is the same as {1, 2, 3}.',
          checkpointQuestion: 'How many elements are in the set {5, 5, 5}?',
          checkpointAnswer: '1',
        },
        {
          stepOrder: 2,
          title: 'Order does not matter',
          explanation: 'The order of elements in a set is irrelevant. {a, b, c} = {c, a, b}.',
          checkpointQuestion: 'True or false: {3, 1, 2} = {1, 2, 3}.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 3,
          title: 'Counting elements (cardinality)',
          explanation: 'The number of distinct elements in set A is written n(A) or |A|. For A = {2, 4, 6}, n(A) = 3.',
          checkpointQuestion: 'If B = {a, b, c, d, e}, what is n(B)?',
          checkpointAnswer: '5',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.7 — Create Venn diagrams where all information is given
   * ────────────────────────────────────────────────────────────── */
  'S1.7': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students place elements in the wrong region of the Venn diagram.',
      workedExample: 'ξ = {1,2,3,4,5,6,7,8,9,10}, A = {even} = {2,4,6,8,10}, B = {>5} = {6,7,8,9,10}. Intersection A∩B = {6,8,10}. Place 6,8,10 in the overlap; 2,4 in A only; 7,9 in B only; 1,3,5 outside both.',
      guidedPrompt: 'ξ = {1–10}, A = {multiples of 3}, B = {odd numbers}. Draw the Venn diagram.',
      guidedAnswer: 'A = {3,6,9}, B = {1,3,5,7,9}. A∩B = {3,9}. A only = {6}. B only = {1,5,7}. Outside = {2,4,8,10}.',
      steps: [
        {
          stepOrder: 1,
          title: 'Start with the intersection',
          explanation: 'Always find the elements that belong to both sets first (A ∩ B). Place these in the overlapping region.',
          checkpointQuestion: 'A = {1,2,3,4}, B = {3,4,5,6}. What goes in the intersection?',
          checkpointAnswer: '{3, 4}',
        },
        {
          stepOrder: 2,
          title: 'Fill A only and B only',
          explanation: 'Next, place elements that are in A but not B in the A-only region, and elements in B but not A in the B-only region.',
          checkpointQuestion: 'Using A = {1,2,3,4}, B = {3,4,5,6}: what goes in A only?',
          checkpointAnswer: '{1, 2}',
        },
        {
          stepOrder: 3,
          title: 'Place remaining elements outside',
          explanation: 'Any elements from ξ that are not in A or B go outside both circles but inside the rectangle.',
          checkpointQuestion: 'ξ = {1,2,3,4,5,6,7,8}, A = {1,2,3,4}, B = {3,4,5,6}. Which elements go outside both circles?',
          checkpointAnswer: '{7, 8}',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not understand that the rectangle represents the universal set.',
      workedExample: 'The rectangle encloses all elements in ξ. The circles inside represent sets A and B. Every element of ξ must appear exactly once in the diagram.',
      guidedPrompt: 'Explain why a rectangle is drawn around the circles in a Venn diagram.',
      guidedAnswer: 'The rectangle represents the universal set ξ. All elements — even those not in A or B — must be placed inside the rectangle.',
      steps: [
        {
          stepOrder: 1,
          title: 'The rectangle = universal set',
          explanation: 'In a Venn diagram, the outer rectangle represents the universal set ξ. Everything inside the rectangle is part of ξ.',
          checkpointQuestion: 'What does the rectangle in a Venn diagram represent?',
          checkpointOptions: ['Set A', 'Set B', 'The universal set', 'The intersection'],
          checkpointAnswer: 'The universal set',
        },
        {
          stepOrder: 2,
          title: 'Every element appears once',
          explanation: 'Each element of ξ appears in exactly one region: A only, B only, A ∩ B, or outside both circles.',
          checkpointQuestion: 'True or false: an element can appear in two different regions of a Venn diagram.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 3,
          title: 'Checking your diagram',
          explanation: 'Count all the elements in every region. The total should equal n(ξ). If not, you have placed something incorrectly.',
          checkpointQuestion: 'ξ has 20 elements. The regions contain 5, 3, 7, and 4 elements. Is the diagram complete?',
          checkpointOptions: ['Yes — total is 19, close enough', 'No — total is 19, one element is missing'],
          checkpointAnswer: 'No — total is 19, one element is missing',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students double-count elements that belong to both sets by placing them in A and in B instead of only in the intersection.',
      workedExample: 'If 3 ∈ A and 3 ∈ B, put 3 in the overlap only — not in A-only AND B-only. Double-counting inflates the total.',
      guidedPrompt: 'A student draws a Venn diagram and places the number 6 in both the A-only region and the B-only region. What is their error?',
      guidedAnswer: 'If 6 is in both sets, it belongs in the intersection only. Placing it in both regions counts it twice.',
      steps: [
        {
          stepOrder: 1,
          title: 'Intersection means "both"',
          explanation: 'If an element is in A AND B, it goes only in the overlap (intersection). It must not appear in A-only or B-only as well.',
          checkpointQuestion: 'Element x is in both A and B. Where should it be placed?',
          checkpointOptions: ['A only', 'B only', 'The intersection', 'Outside both'],
          checkpointAnswer: 'The intersection',
        },
        {
          stepOrder: 2,
          title: 'Count check',
          explanation: 'n(A) = elements in A-only + elements in intersection. If your A-only + intersection exceeds n(A), you have double-counted.',
          checkpointQuestion: 'n(A) = 5, n(A ∩ B) = 2. How many elements are in A only?',
          checkpointAnswer: '3',
        },
        {
          stepOrder: 3,
          title: 'Total check',
          explanation: 'Add all four regions: A only + B only + intersection + outside. This must equal n(ξ).',
          checkpointQuestion: 'A only = 4, B only = 3, intersection = 2, outside = 6. What is n(ξ)?',
          checkpointAnswer: '15',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.8 — Interpret Venn diagrams where all information is given
   * ────────────────────────────────────────────────────────────── */
  'S1.8': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students cannot read which elements belong to a specific set from a Venn diagram.',
      workedExample: 'From a Venn diagram: A-only = {2,4}, intersection = {6,8}, B-only = {7,9}. So A = {2,4,6,8} and B = {6,7,8,9}.',
      guidedPrompt: 'A Venn diagram shows: A only = {1,5}, A∩B = {3,7}, B only = {9}. List the elements of set A.',
      guidedAnswer: 'A = A only ∪ (A ∩ B) = {1, 3, 5, 7}.',
      steps: [
        {
          stepOrder: 1,
          title: 'Reading set A',
          explanation: 'Set A contains all elements inside circle A: those in the A-only region plus those in the intersection.',
          checkpointQuestion: 'A only = {2, 4}, A ∩ B = {6}. List all elements in A.',
          checkpointAnswer: '{2, 4, 6}',
        },
        {
          stepOrder: 2,
          title: 'Reading set B',
          explanation: 'Set B contains all elements inside circle B: those in the B-only region plus those in the intersection.',
          checkpointQuestion: 'B only = {5, 9}, A ∩ B = {6}. List all elements in B.',
          checkpointAnswer: '{5, 6, 9}',
        },
        {
          stepOrder: 3,
          title: 'Reading "not in A or B"',
          explanation: 'Elements outside both circles are in ξ but not in A or B. These are elements not belonging to either set.',
          checkpointQuestion: 'A = {1,2,3}, B = {3,4,5}, ξ = {1,2,3,4,5,6,7}. Which elements are outside both circles?',
          checkpointAnswer: '{6, 7}',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students cannot extract the number of elements in each region from given totals.',
      workedExample: 'n(A) = 10, n(B) = 8, n(A ∩ B) = 3, n(ξ) = 20. A only = 10 − 3 = 7, B only = 8 − 3 = 5, outside = 20 − 7 − 3 − 5 = 5.',
      guidedPrompt: 'n(A) = 15, n(B) = 12, n(A ∩ B) = 5, n(ξ) = 30. Find the number in each region.',
      guidedAnswer: 'A only = 15 − 5 = 10, B only = 12 − 5 = 7, intersection = 5, outside = 30 − 10 − 5 − 7 = 8.',
      steps: [
        {
          stepOrder: 1,
          title: 'Start with the intersection',
          explanation: 'The intersection n(A ∩ B) is usually given. Write this number in the overlap first.',
          checkpointQuestion: 'n(A) = 8, n(A ∩ B) = 3. How many elements are in A only?',
          checkpointAnswer: '5',
        },
        {
          stepOrder: 2,
          title: 'Find A only and B only',
          explanation: 'A only = n(A) − n(A ∩ B). B only = n(B) − n(A ∩ B).',
          checkpointQuestion: 'n(B) = 12, n(A ∩ B) = 4. How many are in B only?',
          checkpointAnswer: '8',
        },
        {
          stepOrder: 3,
          title: 'Find the outside region',
          explanation: 'Outside = n(ξ) − A only − intersection − B only.',
          checkpointQuestion: 'n(ξ) = 25, A only = 6, intersection = 4, B only = 8. How many are outside both?',
          checkpointAnswer: '7',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students think n(A) refers only to the A-only region, forgetting that A includes the intersection.',
      workedExample: 'n(A) = 10 means there are 10 elements in the entire circle A: A-only + intersection. If n(A ∩ B) = 4, then A-only = 10 − 4 = 6, not 10.',
      guidedPrompt: 'A student says A only = 10 when n(A) = 10 and n(A ∩ B) = 4. Explain the error.',
      guidedAnswer: 'n(A) = 10 includes the 4 elements in the intersection. A only = 10 − 4 = 6.',
      steps: [
        {
          stepOrder: 1,
          title: 'n(A) includes the intersection',
          explanation: 'n(A) counts all elements in circle A, which is the A-only region plus the intersection. To find A only, subtract n(A ∩ B).',
          checkpointQuestion: 'n(A) = 12, n(A ∩ B) = 5. What is A only?',
          checkpointAnswer: '7',
        },
        {
          stepOrder: 2,
          title: 'Avoid double-counting',
          explanation: 'If you use n(A) as the A-only value, you double-count the intersection when adding regions. This gives a total greater than n(ξ).',
          checkpointQuestion: 'n(A) = 9, n(B) = 7, n(A ∩ B) = 3, n(ξ) = 20. A student adds 9 + 7 + outside and gets 20. What did they forget?',
          checkpointOptions: ['To subtract the intersection', 'To add the intersection'],
          checkpointAnswer: 'To subtract the intersection',
        },
        {
          stepOrder: 3,
          title: 'The inclusion-exclusion principle',
          explanation: 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B). This formula corrects for double-counting the intersection.',
          checkpointQuestion: 'n(A) = 10, n(B) = 8, n(A ∩ B) = 3. What is n(A ∪ B)?',
          checkpointAnswer: '15',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.9 — Understand the intersection of sets to interpret and create Venn diagrams
   * ────────────────────────────────────────────────────────────── */
  'S1.9': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students confuse intersection (∩) with union (∪), treating "and" as "or".',
      workedExample: 'A = {1,2,3,4,5}, B = {3,4,5,6,7}. A ∩ B = elements in BOTH A and B = {3,4,5}.',
      guidedPrompt: 'A = {2,4,6,8,10}, B = {1,2,3,4,5}. Find A ∩ B.',
      guidedAnswer: 'A ∩ B = {2, 4} — the elements that appear in both sets.',
      steps: [
        {
          stepOrder: 1,
          title: 'Definition of intersection',
          explanation: 'A ∩ B (read "A intersection B") is the set of elements that belong to both A and B. Think "AND".',
          checkpointQuestion: 'A = {1,2,3}, B = {2,3,4}. What is A ∩ B?',
          checkpointAnswer: '{2, 3}',
        },
        {
          stepOrder: 2,
          title: 'Finding the intersection step by step',
          explanation: 'Go through each element of A and check if it is also in B. If yes, it belongs to A ∩ B.',
          checkpointQuestion: 'A = {a, b, c, d}, B = {c, d, e, f}. What is A ∩ B?',
          checkpointAnswer: '{c, d}',
        },
        {
          stepOrder: 3,
          title: 'Intersection on a Venn diagram',
          explanation: 'On a Venn diagram, A ∩ B is the overlapping region where the two circles meet.',
          checkpointQuestion: 'In a Venn diagram, which region represents A ∩ B?',
          checkpointOptions: ['The entire circle A', 'The overlap of both circles', 'Everything outside both circles'],
          checkpointAnswer: 'The overlap of both circles',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students cannot see why the overlap in a Venn diagram represents elements common to both sets.',
      workedExample: 'Circle A covers all elements of A. Circle B covers all elements of B. The area where both circles overlap covers elements in A AND B — the intersection.',
      guidedPrompt: 'Use a diagram to explain why A ∩ B is the overlapping part of two circles.',
      guidedAnswer: 'The overlap is the only region inside both circles simultaneously. So any element in that region satisfies being in A AND in B.',
      steps: [
        {
          stepOrder: 1,
          title: 'Circles as containers',
          explanation: 'Think of each circle as a container for the elements of a set. The overlap is where both containers cover the same space — shared elements.',
          checkpointQuestion: 'If two sets share no elements, what does their Venn diagram look like?',
          checkpointOptions: ['Circles overlap', 'Circles do not overlap', 'One circle is inside the other'],
          checkpointAnswer: 'Circles do not overlap',
        },
        {
          stepOrder: 2,
          title: 'Disjoint sets',
          explanation: 'If A ∩ B = ∅ (empty set), the sets are disjoint — they have no elements in common. The circles do not overlap.',
          checkpointQuestion: 'A = {1,3,5}, B = {2,4,6}. Are A and B disjoint?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'Yes',
        },
        {
          stepOrder: 3,
          title: 'Subset and intersection',
          explanation: 'If A ⊂ B (A is a subset of B), then A ∩ B = A, because every element of A is already in B.',
          checkpointQuestion: 'A = {2,4}, B = {1,2,3,4,5}. What is A ∩ B?',
          checkpointAnswer: '{2, 4}',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students list elements from A or B (union) instead of only those in both (intersection).',
      workedExample: 'A = {1,2,3}, B = {3,4,5}. A student writes A ∩ B = {1,2,3,4,5}. This is A ∪ B (union). The correct intersection is {3}.',
      guidedPrompt: 'A student says A ∩ B = {1,2,3,4,5,6} for A = {1,2,3} and B = {4,5,6}. Explain their mistake.',
      guidedAnswer: 'They found the union, not the intersection. A ∩ B = elements in BOTH sets = ∅ (empty set).',
      steps: [
        {
          stepOrder: 1,
          title: '∩ means AND, not OR',
          explanation: '∩ means "and" — an element must be in A AND in B. ∪ means "or" — in A OR B (or both). Mixing them up is a common error.',
          checkpointQuestion: 'A = {1,2,3}, B = {2,3,4}. A student writes A ∩ B = {1,2,3,4}. What operation did they actually perform?',
          checkpointOptions: ['Intersection', 'Union'],
          checkpointAnswer: 'Union',
        },
        {
          stepOrder: 2,
          title: 'Test each element',
          explanation: 'For intersection, test each element: "Is it in A? AND is it in B?" Only include it if both answers are yes.',
          checkpointQuestion: 'A = {5,10,15}, B = {10,20,30}. What is A ∩ B?',
          checkpointAnswer: '{10}',
        },
        {
          stepOrder: 3,
          title: 'Quick check: intersection ≤ smallest set',
          explanation: 'A ∩ B can never have more elements than the smaller of A or B. If your answer is bigger, you probably found the union.',
          checkpointQuestion: 'n(A) = 4, n(B) = 6. Can n(A ∩ B) = 7?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.10 — Understand the union of sets to interpret and create Venn diagrams
   * ────────────────────────────────────────────────────────────── */
  'S1.10': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students double-count elements in the intersection when finding the union.',
      workedExample: 'A = {1,2,3}, B = {2,3,4}. A ∪ B = all elements in A or B = {1,2,3,4}. Do not list 2 and 3 twice.',
      guidedPrompt: 'A = {a,b,c,d}, B = {c,d,e,f}. Find A ∪ B.',
      guidedAnswer: 'A ∪ B = {a, b, c, d, e, f}.',
      steps: [
        {
          stepOrder: 1,
          title: 'Definition of union',
          explanation: 'A ∪ B (read "A union B") is the set of elements in A or B or both. Think "OR". Every element that appears in at least one set is included.',
          checkpointQuestion: 'A = {1,3,5}, B = {2,4,6}. What is A ∪ B?',
          checkpointAnswer: '{1, 2, 3, 4, 5, 6}',
        },
        {
          stepOrder: 2,
          title: 'Avoid double-counting',
          explanation: 'When combining A and B, list each element only once. Even if an element is in both sets, it appears once in the union.',
          checkpointQuestion: 'A = {1,2,3}, B = {3,4,5}. A student writes A ∪ B = {1,2,3,3,4,5}. Correct it.',
          checkpointAnswer: '{1, 2, 3, 4, 5}',
        },
        {
          stepOrder: 3,
          title: 'Union on a Venn diagram',
          explanation: 'On a Venn diagram, A ∪ B is everything inside either circle (including the overlap).',
          checkpointQuestion: 'Which region on a Venn diagram represents A ∪ B?',
          checkpointOptions: ['Only the overlap', 'Everything inside at least one circle', 'Only outside both circles'],
          checkpointAnswer: 'Everything inside at least one circle',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not link the union formula n(A ∪ B) = n(A) + n(B) − n(A ∩ B) to the Venn diagram regions.',
      workedExample: 'n(A) = 10, n(B) = 8, n(A ∩ B) = 3. n(A ∪ B) = 10 + 8 − 3 = 15. Subtracting removes the double-count of the overlap.',
      guidedPrompt: 'Use the Venn diagram to explain why we subtract n(A ∩ B) in the union formula.',
      guidedAnswer: 'n(A) already includes the intersection, and so does n(B). Adding them counts the intersection twice. Subtracting it once corrects this.',
      steps: [
        {
          stepOrder: 1,
          title: 'Why subtract the intersection?',
          explanation: 'When you add n(A) + n(B), elements in the overlap are counted twice (once in A, once in B). Subtract n(A ∩ B) to count them only once.',
          checkpointQuestion: 'n(A) = 7, n(B) = 5, n(A ∩ B) = 2. What is n(A ∪ B)?',
          checkpointAnswer: '10',
        },
        {
          stepOrder: 2,
          title: 'Connecting to the diagram',
          explanation: 'A ∪ B covers three regions: A only, intersection, B only. n(A ∪ B) = A only + intersection + B only = (n(A) − n(A∩B)) + n(A∩B) + (n(B) − n(A∩B)) = n(A) + n(B) − n(A∩B).',
          checkpointQuestion: 'A only = 5, intersection = 3, B only = 4. What is n(A ∪ B)?',
          checkpointAnswer: '12',
        },
        {
          stepOrder: 3,
          title: 'Finding elements outside the union',
          explanation: 'Elements outside A ∪ B = n(ξ) − n(A ∪ B). These are elements in neither set.',
          checkpointQuestion: 'n(ξ) = 20, n(A ∪ B) = 15. How many elements are outside both sets?',
          checkpointAnswer: '5',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse union and intersection, writing A ∪ B when they mean A ∩ B.',
      workedExample: 'A = {1,2,3}, B = {3,4,5}. A ∪ B = {1,2,3,4,5} (all). A ∩ B = {3} (shared). Students who write ∪ but calculate ∩ get the wrong answer.',
      guidedPrompt: 'A student is asked for A ∪ B and writes {3}. A = {1,2,3}, B = {3,4,5}. Explain the error.',
      guidedAnswer: 'They found A ∩ B instead of A ∪ B. The union should include everything: {1,2,3,4,5}.',
      steps: [
        {
          stepOrder: 1,
          title: '∪ is bigger, ∩ is smaller',
          explanation: 'The union (∪) always contains at least as many elements as either set. The intersection (∩) contains at most as many as the smaller set.',
          checkpointQuestion: 'If n(A) = 5, can n(A ∪ B) be 3?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 2,
          title: 'Memory aid: ∪ = cup = collects everything',
          explanation: 'Think of ∪ as a cup that collects everything from both sets. Think of ∩ as a narrow passage where only shared elements can pass.',
          checkpointQuestion: 'Which symbol means "elements in at least one set"?',
          checkpointOptions: ['∩', '∪'],
          checkpointAnswer: '∪',
        },
        {
          stepOrder: 3,
          title: 'Check your answer size',
          explanation: 'If asked for ∪ and your answer is smaller than A or B alone, you probably found the intersection by mistake.',
          checkpointQuestion: 'A = {2,4,6,8}, B = {6,8,10}. What is A ∪ B?',
          checkpointAnswer: '{2, 4, 6, 8, 10}',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.11 — Calculate probability from Venn diagrams
   * ────────────────────────────────────────────────────────────── */
  'S1.11': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students use n(A) instead of n(ξ) as the denominator when calculating probability from a Venn diagram.',
      workedExample: 'From a Venn diagram: A only = 5, A∩B = 3, B only = 4, outside = 8. n(ξ) = 20. P(A) = (5+3)/20 = 8/20 = 2/5.',
      guidedPrompt: 'Venn diagram: A only = 7, A∩B = 2, B only = 5, outside = 6. Find P(B).',
      guidedAnswer: 'n(ξ) = 7 + 2 + 5 + 6 = 20. n(B) = 2 + 5 = 7. P(B) = 7/20.',
      steps: [
        {
          stepOrder: 1,
          title: 'Find n(ξ)',
          explanation: 'Add all four regions: A only + intersection + B only + outside = n(ξ). This is your denominator.',
          checkpointQuestion: 'Regions: 4, 3, 6, 7. What is n(ξ)?',
          checkpointAnswer: '20',
        },
        {
          stepOrder: 2,
          title: 'Count the favourable region(s)',
          explanation: 'Identify which region(s) correspond to the event. P(A) uses A only + intersection. P(A ∩ B) uses just the intersection.',
          checkpointQuestion: 'A only = 4, intersection = 3, B only = 6, outside = 7. What is P(A ∩ B)?',
          checkpointAnswer: '3/20',
        },
        {
          stepOrder: 3,
          title: 'Write the probability',
          explanation: 'P(event) = favourable region total ÷ n(ξ). Simplify if possible.',
          checkpointQuestion: 'A only = 4, intersection = 3, B only = 6, outside = 7. What is P(A ∪ B)?',
          checkpointAnswer: '13/20',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students cannot connect shaded regions on a Venn diagram to probability questions.',
      workedExample: 'If the question says "P(not in A)", shade everything outside circle A. Count those elements and divide by n(ξ).',
      guidedPrompt: 'On a Venn diagram with A only = 6, intersection = 2, B only = 4, outside = 8, find P(not in B).',
      guidedAnswer: '"Not in B" = A only + outside = 6 + 8 = 14. n(ξ) = 20. P(not in B) = 14/20 = 7/10.',
      steps: [
        {
          stepOrder: 1,
          title: 'Shade the correct region',
          explanation: 'Read the event carefully and identify which regions of the Venn diagram are included. "A only" is different from "A" (which includes the intersection).',
          checkpointQuestion: 'Which regions make up "in A but not in B"?',
          checkpointOptions: ['A only', 'A only + intersection', 'Intersection only'],
          checkpointAnswer: 'A only',
        },
        {
          stepOrder: 2,
          title: 'P(not in A)',
          explanation: '"Not in A" means everything outside circle A: B only + outside.',
          checkpointQuestion: 'A only = 5, intersection = 3, B only = 4, outside = 8. What is P(not in A)?',
          checkpointAnswer: '12/20',
        },
        {
          stepOrder: 3,
          title: 'P(A or B but not both)',
          explanation: 'This means A only + B only (excluding the intersection).',
          checkpointQuestion: 'A only = 5, intersection = 3, B only = 4, outside = 8. What is P(in A or B but not both)?',
          checkpointAnswer: '9/20',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students use n(A) as the denominator instead of n(ξ), giving a conditional probability by mistake.',
      workedExample: 'A only = 6, intersection = 4, B only = 5, outside = 5. P(A ∩ B) = 4/20 (not 4/10). The denominator is always n(ξ) = 20.',
      guidedPrompt: 'A student writes P(A ∩ B) = 4/10 using n(A) = 10 as the denominator. Explain the error.',
      guidedAnswer: 'The denominator for basic probability is n(ξ), not n(A). P(A ∩ B) = 4/20 = 1/5, not 4/10.',
      steps: [
        {
          stepOrder: 1,
          title: 'Denominator = n(ξ)',
          explanation: 'For probability from a Venn diagram, the denominator is always the total number of elements, n(ξ). Using n(A) or n(B) is a different calculation (conditional probability).',
          checkpointQuestion: 'n(ξ) = 30, n(A) = 12, n(A ∩ B) = 5. What is P(A ∩ B)?',
          checkpointAnswer: '5/30',
        },
        {
          stepOrder: 2,
          title: 'Common mistake: wrong denominator',
          explanation: 'If your denominator is n(A), you are finding "the probability of B given A" — a conditional probability. Standard probability uses n(ξ).',
          checkpointQuestion: 'True or false: P(A) = n(A) / n(ξ).',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 3,
          title: 'Always check the total',
          explanation: 'Before calculating, add all regions to find n(ξ). Use this as your denominator for every probability.',
          checkpointQuestion: 'Regions: A only = 8, intersection = 2, B only = 6, outside = 4. What denominator should you use?',
          checkpointAnswer: '20',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────
   * S1.12 — The complement of a set
   * ────────────────────────────────────────────────────────────── */
  'S1.12': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not understand that A′ (complement) contains everything in ξ that is NOT in A.',
      workedExample: 'ξ = {1,2,3,4,5,6,7,8,9,10}, A = {2,4,6,8,10}. A′ = ξ − A = {1,3,5,7,9}.',
      guidedPrompt: 'ξ = {1,2,3,4,5,6,7,8,9,10}, A = {1,3,5,7}. Find A′.',
      guidedAnswer: 'A′ = {2, 4, 6, 8, 9, 10}.',
      steps: [
        {
          stepOrder: 1,
          title: 'Definition of complement',
          explanation: 'The complement of A, written A′ (or Aᶜ), is the set of all elements in ξ that are NOT in A.',
          checkpointQuestion: 'ξ = {1,2,3,4,5}, A = {2,4}. What is A′?',
          checkpointAnswer: '{1, 3, 5}',
        },
        {
          stepOrder: 2,
          title: 'Finding the complement step by step',
          explanation: 'Go through each element of ξ. If it is NOT in A, include it in A′.',
          checkpointQuestion: 'ξ = {a,b,c,d,e,f}, A = {a,c,e}. List A′.',
          checkpointAnswer: '{b, d, f}',
        },
        {
          stepOrder: 3,
          title: 'Complement on a Venn diagram',
          explanation: 'On a Venn diagram, A′ is everything outside circle A but inside the rectangle (universal set).',
          checkpointQuestion: 'On a Venn diagram with two sets A and B, which regions make up A′?',
          checkpointOptions: ['B only + outside', 'B only + outside + intersection', 'B only + intersection'],
          checkpointAnswer: 'B only + outside',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not see the relationship between a set and its complement: n(A) + n(A′) = n(ξ).',
      workedExample: 'If n(ξ) = 20 and n(A) = 8, then n(A′) = 20 − 8 = 12. Together, A and A′ partition ξ.',
      guidedPrompt: 'Explain why P(A) + P(A′) = 1 using a Venn diagram.',
      guidedAnswer: 'A and A′ together cover the entire universal set with no overlap. So n(A) + n(A′) = n(ξ), and dividing by n(ξ) gives P(A) + P(A′) = 1.',
      steps: [
        {
          stepOrder: 1,
          title: 'A and A′ partition ξ',
          explanation: 'Every element in ξ is either in A or in A′, never both. Together they account for all of ξ.',
          checkpointQuestion: 'n(ξ) = 30, n(A) = 12. What is n(A′)?',
          checkpointAnswer: '18',
        },
        {
          stepOrder: 2,
          title: 'P(A) + P(A′) = 1',
          explanation: 'Since n(A) + n(A′) = n(ξ), dividing by n(ξ): P(A) + P(A′) = 1. This means P(A′) = 1 − P(A).',
          checkpointQuestion: 'P(A) = 0.35. What is P(A′)?',
          checkpointAnswer: '0.65',
        },
        {
          stepOrder: 3,
          title: 'Using complements to solve problems',
          explanation: 'Sometimes it is easier to find P(A′) first and subtract from 1 to get P(A). This is useful when A′ is simpler to count.',
          checkpointQuestion: 'P(not raining) = 0.7. What is P(raining)?',
          checkpointAnswer: '0.3',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students think A′ means "the opposite of every element" rather than "elements not in A".',
      workedExample: 'ξ = {1,2,3,4,5}, A = {1,2}. A student writes A′ = {-1,-2}. This is wrong. A′ = {3,4,5} — elements of ξ not in A.',
      guidedPrompt: 'A student says if A = {even numbers in ξ}, then A′ = {negative numbers}. Explain the error.',
      guidedAnswer: 'A′ is not "opposite" elements — it is the elements of ξ that are NOT in A. If ξ = {1–10}, then A = {2,4,6,8,10} and A′ = {1,3,5,7,9}.',
      steps: [
        {
          stepOrder: 1,
          title: 'Complement depends on ξ',
          explanation: 'A′ always depends on the universal set ξ. It includes only elements from ξ that are not in A — not "opposite" values.',
          checkpointQuestion: 'ξ = {1,2,3,4,5,6}, A = {1,2,3}. What is A′?',
          checkpointAnswer: '{4, 5, 6}',
        },
        {
          stepOrder: 2,
          title: 'A′ cannot contain elements outside ξ',
          explanation: 'The complement only draws from ξ. If 7 is not in ξ, then 7 cannot be in A′ — even if 7 is not in A.',
          checkpointQuestion: 'ξ = {1,2,3,4,5}, A = {1,3,5}. Is 6 in A′?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 3,
          title: 'Verification: n(A) + n(A′) = n(ξ)',
          explanation: 'After finding A′, check: n(A) + n(A′) should equal n(ξ). If not, you have made an error.',
          checkpointQuestion: 'n(ξ) = 15, n(A) = 9, n(A′) = 5. Is this correct?',
          checkpointOptions: ['Yes', 'No — they should add to 15'],
          checkpointAnswer: 'No — they should add to 15',
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

  console.log(`\n✅ ensured explanation routes for S1.1–S1.12`);
}

// Only execute when run directly (not when imported by tests/other modules).
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
