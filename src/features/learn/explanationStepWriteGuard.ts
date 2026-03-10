export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT' | 'SHORT_TEXT' | 'SHORT_NUMERIC';

type ExplanationStepWriteInput = {
  checkpointQuestion: string;
  checkpointOptions?: unknown;
  checkpointAnswer: string;
  questionType?: string | null;
};

type ExplanationStepWriteOutput = {
  checkpointQuestion: string;
  checkpointOptions: { options: string[]; stepType: 'checkpoint' };
  checkpointAnswer: string;
  questionType: QuestionType;
};

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => clean(v)).filter(Boolean);
  }

  if (raw && typeof raw === 'object') {
    const maybe = raw as Record<string, unknown>;
    const arr = Array.isArray(maybe.options)
      ? maybe.options
      : Array.isArray(maybe.choices)
        ? maybe.choices
        : [];
    return arr.map((v) => clean(v)).filter(Boolean);
  }

  return [];
}

function normalizeQuestionType(input?: string | null, options: string[] = []): QuestionType {
  const raw = clean(input).toUpperCase();
  if (raw === 'MCQ' || raw === 'TRUE_FALSE' || raw === 'SHORT' || raw === 'SHORT_TEXT' || raw === 'SHORT_NUMERIC') {
    return raw;
  }

  const optionSet = new Set(options.map((o) => o.toLowerCase()));
  const isBooleanSet = optionSet.has('true') && optionSet.has('false');
  if (isBooleanSet) return 'TRUE_FALSE';
  if (options.length >= 2) return 'MCQ';
  return 'SHORT';
}

export function validateExplanationStepWrite(input: ExplanationStepWriteInput): ExplanationStepWriteOutput {
  const checkpointQuestion = clean(input.checkpointQuestion);
  const checkpointAnswer = clean(input.checkpointAnswer);
  const options = parseOptions(input.checkpointOptions);
  const questionType = normalizeQuestionType(input.questionType, options);

  if (!checkpointQuestion) throw new Error('ExplanationStep write rejected: checkpointQuestion is required');
  if (!checkpointAnswer) throw new Error('ExplanationStep write rejected: checkpointAnswer is required');

  if (questionType === 'MCQ' || questionType === 'TRUE_FALSE') {
    if (options.length < 2) {
      throw new Error(`ExplanationStep write rejected: ${questionType} requires at least 2 options`);
    }

    const optionSet = new Set(options.map((o) => o.toLowerCase()));
    if (!optionSet.has(checkpointAnswer.toLowerCase())) {
      throw new Error(`ExplanationStep write rejected: answer must be present in options for ${questionType}`);
    }
  }

  if (questionType === 'TRUE_FALSE') {
    const optionSet = new Set(options.map((o) => o.toLowerCase()));
    const hasBoolPair = optionSet.has('true') && optionSet.has('false');
    const answerIsBool = checkpointAnswer.toLowerCase() === 'true' || checkpointAnswer.toLowerCase() === 'false';
    if (!hasBoolPair || !answerIsBool) {
      throw new Error('ExplanationStep write rejected: TRUE_FALSE requires True/False options and answer');
    }
  }

  return {
    checkpointQuestion,
    checkpointOptions: { options, stepType: 'checkpoint' },
    checkpointAnswer,
    questionType,
  };
}
