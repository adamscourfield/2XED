export type QuestionRole = 'anchor' | 'misconception' | 'prerequisite_probe' | 'transfer' | 'shadow' | 'practice';
export type MisconceptionTag = string;
export type TransferLevel = 'none' | 'low' | 'medium' | 'high';
export type StrictnessLevel = 'exact' | 'normalized';
export type AnswerType = 'MCQ' | 'SHORT_TEXT' | 'SHORT_NUMERIC' | 'TRUE_FALSE' | 'ORDER';

export interface ItemMeta {
  questionRole: QuestionRole;
  misconceptionTag: MisconceptionTag | null;
  route: 'A' | 'B' | 'C' | null;
  transferLevel: TransferLevel;
  strictnessLevel: StrictnessLevel;
}

export interface ParsedItemOptions {
  choices: string[];
  meta: ItemMeta;
}

const DEFAULT_META: ItemMeta = {
  questionRole: 'practice',
  misconceptionTag: null,
  route: null,
  transferLevel: 'none',
  strictnessLevel: 'normalized',
};

function dedupeChoices(choices: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const choice of choices) {
    const key = choice.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(choice);
  }

  return out;
}

function parseRoute(input: unknown): ItemMeta['route'] {
  if (input === 'A' || input === 'B' || input === 'C') return input;
  return null;
}

export function stripStudentQuestionLabel(question: unknown): string {
  if (typeof question !== 'string') return '';

  const codeToken = '[A-Za-z]{1,6}[A-Za-z0-9]*(?:[.:-][A-Za-z0-9]+)*';
  const codeLikeToken = '(?=[A-Za-z0-9.:-]*\\d)[A-Za-z]{1,6}[A-Za-z0-9]*(?:[.:-][A-Za-z0-9]+)*';
  const patterns = [
    // [N1.1] / [SC:A2] / [SC-C2]
    new RegExp(`^\\s*\\[${codeToken}\\]\\s*`),
    // N1.1 SC-A2: ... / N1.1 SC:A2 - ... (chained curriculum labels)
    new RegExp(`^\\s*(?:${codeLikeToken}\\s+){1,3}${codeToken}\\s*[:：\\-–]\\s*`),
    // SC:A2 - ... / SC:A2: ... / SC-C2: ... / N1.1: ...
    new RegExp(`^\\s*${codeToken}\\s*[:：\\-–]\\s*`),
    // SC:A2 DQ ... / N1.1 DQ ... / SC-C2 Q2 ... (only code-like prefix with digits)
    new RegExp(`^\\s*${codeLikeToken}\\s+(?:DQ|Q|QUESTION)\\d*\\s*[:：\\-–]?\\s*`, 'i'),
    // DQ1: ... / Q2: ... / Question3 - ...
    /^\s*(?:DQ|Q|QUESTION)\s*\d+\s*[:：\-–]\s*/i,
    // DQ: ... / Q: ... / Question: ...
    /^\s*(?:DQ|Q|QUESTION)\s*[:：\-–]\s*/i,
    // Subtopic N1.1: ...
    /^\s*subtopic\s+[A-Za-z0-9.:\-_/]+\s*[:：\-–]?\s*/i,
  ];

  let cleaned = question;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

export function parseItemOptions(options: unknown): ParsedItemOptions {
  // Legacy shape: options is just string[]
  if (Array.isArray(options)) {
    const choices = dedupeChoices(options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0));
    return { choices, meta: DEFAULT_META };
  }

  // Current shape for richer metadata: { choices: string[], meta: {...} }
  if (options && typeof options === 'object') {
    const raw = options as {
      choices?: unknown;
      meta?: {
        role?: unknown;
        question_role?: unknown;
        misconception_tag?: unknown;
        route?: unknown;
        transfer_level?: unknown;
        strictness_level?: unknown;
      };
    };

    const choices = Array.isArray(raw.choices)
      ? dedupeChoices(raw.choices.filter((o): o is string => typeof o === 'string' && o.trim().length > 0))
      : [];

    const role = raw.meta?.role ?? raw.meta?.question_role;
    const transfer = raw.meta?.transfer_level;
    const strictness = raw.meta?.strictness_level;

    const meta: ItemMeta = {
      questionRole:
        role === 'anchor' ||
        role === 'misconception' ||
        role === 'prerequisite_probe' ||
        role === 'transfer' ||
        role === 'shadow' ||
        role === 'practice'
          ? role
          : DEFAULT_META.questionRole,
      misconceptionTag: typeof raw.meta?.misconception_tag === 'string' ? raw.meta.misconception_tag : null,
      route: parseRoute(raw.meta?.route),
      transferLevel:
        transfer === 'none' || transfer === 'low' || transfer === 'medium' || transfer === 'high'
          ? transfer
          : DEFAULT_META.transferLevel,
      strictnessLevel: strictness === 'exact' || strictness === 'normalized' ? strictness : DEFAULT_META.strictnessLevel,
    };

    return { choices, meta };
  }

  return { choices: [], meta: DEFAULT_META };
}

function looksLikeTrueFalseQuestion(question: unknown): boolean {
  if (typeof question !== 'string') return false;
  const text = question.trim();
  return /^(correct|incorrect)\s*:/i.test(text) || /^is this statement (correct|true)\??/i.test(text);
}

function optionsContainBooleanChoices(options: unknown): boolean {
  const parsed = parseItemOptions(options);
  if (parsed.choices.length < 2) return false;
  const normalized = new Set(parsed.choices.map((c) => c.trim().toLowerCase()));
  return (
    (normalized.has('true') && normalized.has('false')) ||
    (normalized.has('correct') && normalized.has('incorrect')) ||
    (normalized.has('yes') && normalized.has('no'))
  );
}

function answerLooksBoolean(answer: unknown): boolean {
  if (typeof answer !== 'string') return false;
  const normalized = answer.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === 'false' ||
    normalized === 'correct' ||
    normalized === 'incorrect' ||
    normalized === 'yes' ||
    normalized === 'no'
  );
}

const ORDER_PROMPT_RE =
  /(^order\b|\bput in order\b|\barrange\b|\bascending order\b|\bdescending order\b|\bfrom smallest to largest\b|\bfrom largest to smallest\b|\bsmallest to largest\b|\blargest to smallest\b|\bhighest to lowest\b|\blowest to highest\b|\bcoldest to warmest\b|\bwarmest to coldest\b|\bleft to right on a number line\b)/i;

export function parseAnswerType(itemType: unknown, question?: unknown, options?: unknown, answer?: unknown): AnswerType {
  if (looksLikeTrueFalseQuestion(question) || optionsContainBooleanChoices(options) || answerLooksBoolean(answer)) {
    return 'TRUE_FALSE';
  }

  if (typeof question === 'string' && ORDER_PROMPT_RE.test(question)) {
    return 'ORDER';
  }

  if (typeof itemType === 'string') {
    const normalized = itemType.trim().toUpperCase();
    if (normalized === 'ORDER') return 'ORDER';
    if (normalized === 'TRUE_FALSE' || normalized === 'BOOLEAN' || normalized === 'TF') return 'TRUE_FALSE';
    if (normalized === 'SHORT_TEXT' || normalized === 'SHORT') return 'SHORT_TEXT';
    if (normalized === 'SHORT_NUMERIC' || normalized === 'NUMERIC') return 'SHORT_NUMERIC';
  }

  return 'MCQ';
}
