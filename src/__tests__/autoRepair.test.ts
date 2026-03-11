import { describe, expect, it } from 'vitest';
import { summarizeQuestionQa } from '@/features/items/questionQa';
import { applyAutoRepair, extractAutoQaIssueCode } from '@/features/qa/autoRepair';

describe('extractAutoQaIssueCode', () => {
  it('extracts supported AUTO_QA issue codes', () => {
    expect(extractAutoQaIssueCode('[AUTO_QA:label_leak] Remove internal label.')).toBe('label_leak');
    expect(extractAutoQaIssueCode('No auto code here')).toBeNull();
  });
});

describe('applyAutoRepair', () => {
  it('clears fixed choices from typed-answer items', () => {
    const result = applyAutoRepair(
      {
        question: '[Slide11-N1.2-ONB-01] Write 48 in words.',
        type: 'SHORT_TEXT',
        answer: 'forty-eight',
        options: { choices: ['forty-eight'] },
      },
      ['typed_question_has_choices']
    );

    expect(result.unresolvedReason).toBeUndefined();
    expect(result.item.options).toMatchObject({ choices: [] });
    expect(summarizeQuestionQa(result.item).issues.some((issue) => issue.code === 'typed_question_has_choices')).toBe(false);
  });

  it('converts ordering prompts to ORDER with draggable values', () => {
    const result = applyAutoRepair(
      {
        question: '[Slide48-N1.8-RT-01] Write these numbers in ascending order: 0.82, 0.082, 0.9, 0.807, 0.8',
        type: 'SHORT_TEXT',
        answer: '0.082, 0.8, 0.807, 0.82, 0.9',
        options: { choices: ['0.082, 0.8, 0.807, 0.82, 0.9'] },
      },
      ['typed_question_has_choices']
    );

    expect(result.unresolvedReason).toBeUndefined();
    expect(result.item.type).toBe('ORDER');
    expect(result.item.options).toMatchObject({
      choices: ['0.82', '0.082', '0.9', '0.807', '0.8'],
    });
  });

  it('strips label leaks from non-placeholder stems', () => {
    const result = applyAutoRepair(
      {
        question: '[Slide18-Q1a] 3 < 5',
        type: 'TRUE_FALSE',
        answer: 'True',
        options: { choices: ['True', 'False'] },
      },
      ['label_leak']
    );

    expect(result.unresolvedReason).toBeUndefined();
    expect(result.item.question).toBe('3 < 5');
    expect(summarizeQuestionQa(result.item).issues.some((issue) => issue.code === 'label_leak')).toBe(false);
  });

  it('skips placeholder label leaks that need human authoring', () => {
    const result = applyAutoRepair(
      {
        question: '[N1.1] Placeholder question 1 for: Decimal place value',
        type: 'MCQ',
        answer: '1',
        options: { choices: ['1', '2'] },
      },
      ['label_leak']
    );

    expect(result.unresolvedReason).toMatch(/human authoring/i);
  });

  it('keeps wrong-order explanation prompts as short text and clears fixed choices', () => {
    const result = applyAutoRepair(
      {
        question:
          '[Slide27-N1.4-RT-01] A pupil orders 321, 301, 312, 213, 212 as 321, 312, 301, 212, 213. Which two numbers have been put in the wrong order at the end?',
        type: 'SHORT_TEXT',
        answer: '212 and 213',
        options: { choices: ['212 and 213'], acceptedAnswers: ['212 and 213', '213 and 212'] },
      },
      ['typed_question_has_choices', 'label_leak']
    );

    expect(result.unresolvedReason).toBeUndefined();
    expect(result.item.type).toBe('SHORT_TEXT');
    expect(result.item.question.startsWith('[Slide')).toBe(false);
    expect(result.item.options).toMatchObject({
      choices: [],
      acceptedAnswers: ['212 and 213', '213 and 212'],
    });
  });
});
