import { describe, expect, it } from 'vitest';
import { summarizeQuestionQa } from '@/features/items/questionQa';

describe('summarizeQuestionQa', () => {
  it('detects label leaks and exposes a student display stem', () => {
    const summary = summarizeQuestionQa({
      question: '[Slide18-Q1a] 3 < 5',
      type: 'TRUE_FALSE',
      options: { choices: ['True', 'False'] },
      answer: 'True',
    });

    expect(summary.displayQuestion).toBe('3 < 5');
    expect(summary.issues.some((issue) => issue.code === 'label_leak')).toBe(true);
  });

  it('marks missing answer choices as an error', () => {
    const summary = summarizeQuestionQa({
      question: 'Which is greater: -3 or -8?',
      type: 'MCQ',
      options: { choices: ['-8', '-7'] },
      answer: '-3',
    });

    expect(summary.issues.some((issue) => issue.code === 'answer_missing_from_choices')).toBe(true);
  });

  it('shows fridge-magnet mode for legacy descending-order prompts', () => {
    const summary = summarizeQuestionQa({
      question: 'Which is the correct descending order for 90531, 95031, 91530, 95130, 95101?',
      type: 'SHORT_TEXT',
      options: {},
      answer: '95130 | 95101 | 95031 | 91530 | 90531',
    });

    expect(summary.answerType).toBe('ORDER');
    expect(summary.answerModeLabel).toBe('Drag-and-drop fridge magnets');
    expect(summary.choices).toEqual(['90531', '95031', '91530', '95130', '95101']);
  });
});
