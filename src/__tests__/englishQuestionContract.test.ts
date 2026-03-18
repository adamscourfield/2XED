import { describe, expect, it } from 'vitest';
import {
  deriveStoredItemFromMapping,
  getItemContractIssues,
  inferCanonicalQuestionFormat,
} from '@/features/content/questionContract';
import { getItemContent, getAnswerFormatHint } from '@/features/learn/itemContent';

describe('English question contract – MULTI_SELECT', () => {
  it('maps MULTI_SELECT format to MULTI_SELECT interaction type', () => {
    const derived = deriveStoredItemFromMapping({
      source: { question_ref: 'Y7-CON-03-Q3' },
      question: {
        stem: 'Which details suggest fear? Select all that apply.',
        format: 'MULTI_SELECT',
        options: ['trembling hands', 'loud laughter', 'avoiding eye contact', 'relaxed posture'],
        answer: 'trembling hands|avoiding eye contact',
      },
      skills: { primary_skill_code: 'Y7-CON-03' },
      marking: { accepted_answers: ['trembling hands|avoiding eye contact'] },
    });

    expect(derived.type).toBe('MULTI_SELECT');
    expect(derived.canonicalFormat).toBe('MULTI_SELECT');
    expect(derived.options.choices).toEqual([
      'trembling hands',
      'loud laughter',
      'avoiding eye contact',
      'relaxed posture',
    ]);
  });

  it('passes validation for well-formed multi_select items', () => {
    const issues = getItemContractIssues({
      question: 'Select all that apply.',
      type: 'MULTI_SELECT',
      answer: 'trembling hands|avoiding eye contact',
      options: {
        choices: ['trembling hands', 'loud laughter', 'avoiding eye contact', 'relaxed posture'],
        acceptedAnswers: ['trembling hands|avoiding eye contact'],
      },
    });

    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('flags multi_select items with fewer than 2 choices', () => {
    const issues = getItemContractIssues({
      question: 'Select all that apply.',
      type: 'MULTI_SELECT',
      answer: 'trembling hands',
      options: { choices: ['trembling hands'], acceptedAnswers: ['trembling hands'] },
    });

    expect(issues.some((i) => i.code === 'multi_select_min_choices')).toBe(true);
  });

  it('flags multi_select items when answer is missing from choices', () => {
    const issues = getItemContractIssues({
      question: 'Select all that apply.',
      type: 'MULTI_SELECT',
      answer: 'trembling hands|missing option',
      options: {
        choices: ['trembling hands', 'loud laughter', 'avoiding eye contact'],
        acceptedAnswers: ['trembling hands|missing option'],
      },
    });

    expect(issues.some((i) => i.code === 'multi_select_missing_answer')).toBe(true);
  });

  it('returns correct format hint for MULTI_SELECT', () => {
    const hint = getAnswerFormatHint('MULTI_SELECT', 'Select all that apply.');
    expect(hint).toBe('Select all correct answers.');
  });
});

describe('English question contract – MCQ (evidence_select)', () => {
  it('maps evidence_select questions as MCQ', () => {
    const derived = deriveStoredItemFromMapping({
      source: { question_ref: 'Y7-CON-03-Q2' },
      question: {
        stem: 'Which quotation best shows the character is controlling?',
        format: 'MCQ',
        options: [
          'She smiled warmly.',
          'She ordered them to sit silently.',
          'She looked tired.',
          'She walked slowly.',
        ],
        answer: 'She ordered them to sit silently.',
      },
      skills: { primary_skill_code: 'Y7-CON-03' },
      marking: { accepted_answers: ['She ordered them to sit silently.'] },
    });

    expect(derived.type).toBe('MCQ');
    expect(derived.options.choices).toContain('She ordered them to sit silently.');
    expect(derived.options.choices).toHaveLength(4);
  });
});

describe('English question contract – ORDER (ordering_tiles)', () => {
  it('maps ordering_tiles questions to ORDER', () => {
    const derived = deriveStoredItemFromMapping({
      source: { question_ref: 'Y7-CON-03-Q4' },
      question: {
        stem: 'Build the strongest explanation.\nArrange: Miss Slighcarp is presented as cruel | because she locks the door | This suggests she wants control over the children',
        format: 'ORDER_SEQUENCE',
        options: [
          'Miss Slighcarp is presented as cruel',
          'because she locks the door',
          'This suggests she wants control over the children',
        ],
        answer: 'Miss Slighcarp is presented as cruel|because she locks the door|This suggests she wants control over the children',
      },
      skills: { primary_skill_code: 'Y7-CON-03' },
      marking: {
        accepted_answers: [
          'Miss Slighcarp is presented as cruel|because she locks the door|This suggests she wants control over the children',
        ],
      },
    });

    expect(derived.type).toBe('ORDER');
    expect(derived.options.choices).toHaveLength(3);
  });
});

describe('English question contract – SHORT_TEXT (short_response / improve_rewrite)', () => {
  it('maps short_response questions to SHORT_TEXT', () => {
    const derived = deriveStoredItemFromMapping({
      source: { question_ref: 'Y7-CON-03-Q5' },
      question: {
        stem: 'What does this suggest about the character?',
        format: 'SHORT',
        answer: 'angry',
      },
      skills: { primary_skill_code: 'Y7-CON-03' },
      marking: { accepted_answers: ['angry', 'tense', 'defensive', 'resistant', 'frustrated'] },
    });

    expect(derived.type).toBe('SHORT_TEXT');
    expect(derived.options.acceptedAnswers).toContain('angry');
    expect(derived.options.acceptedAnswers).toContain('tense');
  });
});

describe('English question contract – getItemContent for MULTI_SELECT', () => {
  it('correctly infers MULTI_SELECT from item type', () => {
    const content = getItemContent({
      type: 'MULTI_SELECT',
      question: 'Which details suggest fear?',
      answer: 'trembling hands|avoiding eye contact',
      options: {
        choices: ['trembling hands', 'loud laughter', 'avoiding eye contact', 'relaxed posture'],
        acceptedAnswers: ['trembling hands|avoiding eye contact'],
      },
    });

    expect(content.type).toBe('MULTI_SELECT');
    expect(content.choices).toHaveLength(4);
  });
});
