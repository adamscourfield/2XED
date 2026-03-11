import {
  deriveChoicesForMapping,
  inferCanonicalQuestionFormat,
  parseOrderedValues,
  getItemContractIssues,
} from '../content/questionContract';
import { summarizeQuestionQa } from '../items/questionQa';
import { parseAnswerType, parseItemOptions, stripStudentQuestionLabel } from '../items/itemMeta';

export type SupportedAutoQaIssueCode =
  | 'typed_question_has_choices'
  | 'too_few_choices'
  | 'answer_missing_from_choices'
  | 'label_leak'
  | 'duplicate_choices';

export interface RepairableItemShape {
  id?: string;
  question: string;
  type: string;
  options: unknown;
  answer: string;
}

export interface AutoRepairResult {
  item: RepairableItemShape;
  changed: boolean;
  actions: string[];
  unresolvedReason?: string;
}

const AUTO_QA_CODE_RE = /\[AUTO_QA:([^\]]+)\]/i;
const PLACEHOLDER_RE = /placeholder question/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function cloneOptions(options: unknown): Record<string, unknown> {
  if (Array.isArray(options)) {
    return { choices: [...options] };
  }
  if (isObject(options)) {
    return { ...options };
  }
  return {};
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function splitSequence(value: string): string[] {
  return value
    .split(/\s*(?:\||,)\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function extractOrderingChoices(item: RepairableItemShape): string[] {
  const fromQuestion = parseOrderedValues(stripStudentQuestionLabel(item.question));
  if (fromQuestion.length >= 2) return unique(fromQuestion);

  const parsed = parseItemOptions(item.options);
  if (parsed.choices.length === 1) {
    const fromChoice = splitSequence(parsed.choices[0]);
    if (fromChoice.length >= 2) return unique(fromChoice);
  }

  const fromAnswer = splitSequence(item.answer);
  if (fromAnswer.length >= 2) return unique(fromAnswer);

  return [];
}

function expectedIssueGone(item: RepairableItemShape, issueCode: SupportedAutoQaIssueCode): boolean {
  const qaIssueCodes = new Set(summarizeQuestionQa(item).issues.map((issue) => issue.code));
  const contractIssueCodes = new Set(getItemContractIssues(item).map((issue) => issue.code));

  switch (issueCode) {
    case 'typed_question_has_choices':
      return !qaIssueCodes.has('typed_question_has_choices');
    case 'label_leak':
      return !qaIssueCodes.has('label_leak');
    case 'duplicate_choices':
      return !qaIssueCodes.has('duplicate_choices') && !contractIssueCodes.has('duplicate_choices');
    case 'too_few_choices':
      return !qaIssueCodes.has('too_few_choices');
    case 'answer_missing_from_choices':
      return !qaIssueCodes.has('answer_missing_from_choices') && !contractIssueCodes.has('mcq_missing_answer');
    default:
      return false;
  }
}

export function extractAutoQaIssueCode(note: string): SupportedAutoQaIssueCode | null {
  const match = note.match(AUTO_QA_CODE_RE)?.[1]?.trim();
  if (
    match === 'typed_question_has_choices' ||
    match === 'too_few_choices' ||
    match === 'answer_missing_from_choices' ||
    match === 'label_leak' ||
    match === 'duplicate_choices'
  ) {
    return match;
  }
  return null;
}

function repairTypedQuestionHasChoices(item: RepairableItemShape): AutoRepairResult {
  const parsed = parseItemOptions(item.options);
  const answerType = parseAnswerType(item.type, item.question, item.options, item.answer);
  const next = { ...item, options: cloneOptions(item.options) };

  if (answerType === 'ORDER') {
    const orderedChoices = extractOrderingChoices(item);
    if (orderedChoices.length >= 2) {
      next.type = 'ORDER';
      next.options = {
        ...cloneOptions(item.options),
        choices: orderedChoices,
      };

      return {
        item: next,
        changed: next.type !== item.type || JSON.stringify(next.options) !== JSON.stringify(item.options),
        actions: ['Converted typed ordering prompt to ORDER and restored draggable choices.'],
      };
    }
  }

  if (answerType === 'SHORT_TEXT' || answerType === 'SHORT_NUMERIC') {
    next.options = {
      ...cloneOptions(item.options),
      choices: [],
    };

    return {
      item: next,
      changed: parsed.choices.length > 0,
      actions: ['Cleared fixed choices from typed-answer item.'],
    };
  }

  return {
    item,
    changed: false,
    actions: [],
    unresolvedReason: `Typed-choice repair is not applicable to inferred answer type ${answerType}.`,
  };
}

function repairLabelLeak(item: RepairableItemShape): AutoRepairResult {
  const cleaned = stripStudentQuestionLabel(item.question);
  if (!cleaned) {
    return {
      item,
      changed: false,
      actions: [],
      unresolvedReason: 'Removing internal labels would leave the student-facing stem empty.',
    };
  }

  if (PLACEHOLDER_RE.test(cleaned)) {
    return {
      item,
      changed: false,
      actions: [],
      unresolvedReason: 'Placeholder content needs human authoring; stripping labels would still expose placeholder text.',
    };
  }

  return {
    item: { ...item, question: cleaned },
    changed: cleaned !== item.question,
    actions: ['Removed internal label/prefix from the stored stem.'],
  };
}

function repairDuplicateChoices(item: RepairableItemShape): AutoRepairResult {
  const parsed = parseItemOptions(item.options);
  const deduped = unique(parsed.choices);
  const options = {
    ...cloneOptions(item.options),
    choices: deduped,
  };
  return {
    item: { ...item, options },
    changed: JSON.stringify(options) !== JSON.stringify(item.options),
    actions: ['Deduplicated stored choices.'],
  };
}

function repairChoiceContract(item: RepairableItemShape): AutoRepairResult {
  const cleanedQuestion = stripStudentQuestionLabel(item.question) || item.question;
  const canonicalFormat = inferCanonicalQuestionFormat(item.type, cleanedQuestion, item.answer);
  const derivedChoices = deriveChoicesForMapping(cleanedQuestion, item.answer, canonicalFormat, []);
  if (derivedChoices.length < 2) {
    return {
      item,
      changed: false,
      actions: [],
      unresolvedReason: 'Could not deterministically derive a valid choice set for this choice-based item.',
    };
  }

  const nextType = canonicalFormat === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MCQ';
  const nextOptions = {
    ...cloneOptions(item.options),
    choices: unique(derivedChoices),
  };

  return {
    item: { ...item, type: nextType, options: nextOptions },
    changed:
      nextType !== item.type || JSON.stringify(nextOptions) !== JSON.stringify(item.options),
    actions: ['Rebuilt the choice set so the student can select the canonical answer.'],
  };
}

export function applyAutoRepair(
  item: RepairableItemShape,
  issueCodes: SupportedAutoQaIssueCode[]
): AutoRepairResult {
  let working = { ...item };
  const actions: string[] = [];
  let changed = false;

  for (const issueCode of issueCodes) {
    if (issueCode !== 'typed_question_has_choices' && expectedIssueGone(working, issueCode)) {
      continue;
    }

    const result =
      issueCode === 'typed_question_has_choices'
        ? repairTypedQuestionHasChoices(working)
        : issueCode === 'label_leak'
          ? repairLabelLeak(working)
          : issueCode === 'duplicate_choices'
            ? repairDuplicateChoices(working)
            : repairChoiceContract(working);

    if (result.unresolvedReason) {
      return {
        item: working,
        changed,
        actions,
        unresolvedReason: result.unresolvedReason,
      };
    }

    working = result.item;
    changed = changed || result.changed;
    actions.push(...result.actions);
  }

  return {
    item: working,
    changed,
    actions: unique(actions),
  };
}
