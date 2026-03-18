import { describe, expect, it } from 'vitest';

import { validateExplanationStepWrite } from '@/features/learn/explanationStepWriteGuard';

describe('validateExplanationStepWrite', () => {
  it('infers and sets questionType when omitted', () => {
    const out = validateExplanationStepWrite({
      checkpointQuestion: 'Which number is bigger?',
      checkpointOptions: ['9,041', '9,401', 'Equal', 'Not sure'],
      checkpointAnswer: '9,401',
    });

    expect(out.questionType).toBe('MCQ');
    expect(out.checkpointOptions.options).toHaveLength(4);
  });

  it('rejects MCQ writes where answer is not in options', () => {
    expect(() =>
      validateExplanationStepWrite({
        checkpointQuestion: 'Pick one',
        checkpointOptions: ['A', 'B', 'C', 'D'],
        checkpointAnswer: 'E',
        questionType: 'MCQ',
      })
    ).toThrow(/answer must be present in options/i);
  });

  it('rejects empty checkpointAnswer', () => {
    expect(() =>
      validateExplanationStepWrite({
        checkpointQuestion: 'What is the key idea?',
        checkpointAnswer: '',
        questionType: 'SHORT',
      })
    ).toThrow(/checkpointAnswer is required/i);
  });

  it('rejects whitespace-only checkpointAnswer', () => {
    expect(() =>
      validateExplanationStepWrite({
        checkpointQuestion: 'What is the key idea?',
        checkpointAnswer: '   ',
        questionType: 'SHORT',
      })
    ).toThrow(/checkpointAnswer is required/i);
  });

  it('rejects malformed TRUE_FALSE writes', () => {
    expect(() =>
      validateExplanationStepWrite({
        checkpointQuestion: 'True or false?',
        checkpointOptions: ['Yes', 'No'],
        checkpointAnswer: 'Yes',
        questionType: 'TRUE_FALSE',
      })
    ).toThrow(/TRUE_FALSE requires True\/False options and answer/i);
  });
});
