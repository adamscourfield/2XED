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

  it('shows all magnets for order prompts with and-separated tails', () => {
    const summary = summarizeQuestionQa({
      question: 'Put these temperatures in order: -8°C, 12°C, 9°C, -15°C, 11°C, -7°C and 2°C.',
      type: 'SHORT_TEXT',
      options: {},
      answer: '-15°C | -8°C | -7°C | 2°C | 9°C | 11°C | 12°C',
    });

    expect(summary.answerType).toBe('ORDER');
    expect(summary.choices).toEqual(['-8°C', '12°C', '9°C', '-15°C', '11°C', '-7°C', '2°C']);
  });
});
