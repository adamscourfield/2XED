export type RouteType = 'A' | 'B' | 'C';

export interface ReteachStep {
  title: string;
  explanation: string;
  checkpointQuestion: string;
  checkpointOptions: string[];
  checkpointAnswer: string;
}

export interface ReteachPlan {
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  steps: ReteachStep[];
}

const plans: Record<RouteType, ReteachPlan> = {
  A: {
    misconceptionSummary: 'You may be misreading place value columns when comparing or building numbers.',
    workedExample: 'Example: 3,540 has 3 thousands, 5 hundreds, 4 tens, 0 ones. So it is greater than 3,450.',
    guidedPrompt: 'Guided: In 6,204, what value does the 2 represent?',
    guidedAnswer: '200',
    steps: [
      {
        title: 'Step 1: Identify each column',
        explanation: 'Read digits from left to right: thousands, hundreds, tens, ones.',
        checkpointQuestion: 'In 4,381, what is the hundreds digit?',
        checkpointOptions: ['3', '8', '4', '1'],
        checkpointAnswer: '3',
      },
      {
        title: 'Step 2: Compare highest-value digits first',
        explanation: 'When comparing numbers, compare thousands first, then hundreds if needed.',
        checkpointQuestion: 'Which is greater?',
        checkpointOptions: ['5,203', '5,123', 'Same', 'Cannot tell'],
        checkpointAnswer: '5,203',
      },
      {
        title: 'Step 3: Check the tricky middle columns',
        explanation: 'Students often swap tens/hundreds. Pause and name each column before deciding.',
        checkpointQuestion: 'In 7,460, the 6 is worth…',
        checkpointOptions: ['6', '60', '600', '6000'],
        checkpointAnswer: '60',
      },
    ],
  },
  B: {
    misconceptionSummary: 'You may be applying a shortcut rule that breaks when digits are in different columns.',
    workedExample: 'Example: 2,908 vs 2,980. Compare thousands (same), hundreds (9 vs 9), tens (0 vs 8). So 2,980 is greater.',
    guidedPrompt: 'Guided: Which is greater: 8,307 or 8,370?',
    guidedAnswer: '8,370',
    steps: [
      {
        title: 'Step 1: Use a compare frame',
        explanation: 'Write numbers in a place-value table so each digit stays in its column.',
        checkpointQuestion: 'Which column should be checked first?',
        checkpointOptions: ['Ones', 'Tens', 'Hundreds', 'Thousands'],
        checkpointAnswer: 'Thousands',
      },
      {
        title: 'Step 2: Find first difference',
        explanation: 'Move left to right and stop at the first column that differs.',
        checkpointQuestion: 'First different column in 4,125 and 4,175?',
        checkpointOptions: ['Thousands', 'Hundreds', 'Tens', 'Ones'],
        checkpointAnswer: 'Tens',
      },
      {
        title: 'Step 3: Decide and justify',
        explanation: 'The number with the bigger digit at first difference is greater.',
        checkpointQuestion: 'Which is greater?',
        checkpointOptions: ['9,041', '9,401', 'Same', 'Cannot tell'],
        checkpointAnswer: '9,401',
      },
    ],
  },
  C: {
    misconceptionSummary: 'You may be reversing place value logic (treating smaller columns as more important).',
    workedExample: 'Example: 1,090 is greater than 1,009 because tens (9 tens) is greater than ones (9 ones).',
    guidedPrompt: 'Guided: In 5,072, is the 7 worth 7 or 70?',
    guidedAnswer: '70',
    steps: [
      {
        title: 'Step 1: Bigger column = bigger impact',
        explanation: 'A change in hundreds matters more than a change in tens or ones.',
        checkpointQuestion: 'Which change is bigger?',
        checkpointOptions: ['+1 one', '+1 ten', 'Same', 'Depends'],
        checkpointAnswer: '+1 ten',
      },
      {
        title: 'Step 2: Build numbers by value, not by digit appearance',
        explanation: 'The same digit means different values in different columns.',
        checkpointQuestion: 'In 3,604 the 6 is worth…',
        checkpointOptions: ['6', '60', '600', '6000'],
        checkpointAnswer: '600',
      },
      {
        title: 'Step 3: Test with near-miss pairs',
        explanation: 'Practice with pairs that look similar but differ by column place.',
        checkpointQuestion: 'Which is greater?',
        checkpointOptions: ['6,090', '6,009', 'Same', 'Cannot tell'],
        checkpointAnswer: '6,090',
      },
    ],
  },
};

export function getReteachPlan(routeType: RouteType): ReteachPlan {
  return plans[routeType];
}
