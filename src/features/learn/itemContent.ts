import { extractOrderingChoices, isOrderingPrompt } from '@/features/items/ordering';

export type ItemInteractionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_TEXT' | 'SHORT_NUMERIC' | 'ORDER' | 'MULTI_SELECT' | 'NUMBER_LINE' | 'PROTRACTOR';

export interface NumberLineConfig {
  min: number;
  max: number;
  step: number;
  labelledValues?: number[];
  task: 'place' | 'read';
  markerValue?: number;
  tolerance: number;
}

export interface ProtractorConfig {
  angleImage?: string;
  targetAngle: number;
  tolerance: number;
}

export interface ItemContent {
  type: ItemInteractionType;
  choices: string[];
  acceptedAnswers: string[];
  canonicalAnswer: string;
  numberLine?: NumberLineConfig;
  protractor?: ProtractorConfig;
}

type AcceptedAnswerInput = string | string[];

type RawOptions =
  | string[]
  | {
      choices?: unknown;
      acceptedAnswers?: unknown;
      media?: unknown;
    }
  | null
  | undefined;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function splitAcceptedAnswerString(value: string): string[] {
  return value
    .split(/[;\n|]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeNumericString(value: string): string | null {
  const cleaned = value.replace(/,/g, '').replace(/[−–—]/g, '-').trim();
  if (!/^[-+]?\d*\.?\d+$/.test(cleaned)) return null;

  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toString();
}

export function normalizeAnswer(value: string): string {
  const trimmed = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/(?<=\d),(?=\d)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const lowered = trimmed.toLowerCase();

  if (lowered === 'yes' || lowered === 'correct') return 'true';
  if (lowered === 'no' || lowered === 'incorrect') return 'false';

  if (trimmed.includes('|') || trimmed.includes(', ')) {
    return trimmed
      .split(/\s*(?:\||,)\s*/)
      .map((part) => normalizeAnswer(part))
      .join('|');
  }
  const numeric = normalizeNumericString(trimmed);
  if (numeric != null) return numeric;
  return trimmed.toLowerCase();
}

function normalizeAcceptedAnswers(input: AcceptedAnswerInput): string[] {
  if (Array.isArray(input)) {
    return unique(
      input
        .flatMap((value) => splitAcceptedAnswerString(value))
        .map((value) => value.trim())
        .filter(Boolean)
    );
  }

  return unique(splitAcceptedAnswerString(input));
}

function parseNumberLineConfig(raw: unknown): NumberLineConfig | undefined {
  if (!isObject(raw)) return undefined;
  const { min, max, step, task, markerValue, tolerance, labelledValues } = raw;
  if (typeof min !== 'number' || typeof max !== 'number' || (task !== 'place' && task !== 'read')) return undefined;
  return {
    min,
    max,
    step: typeof step === 'number' && step > 0 ? step : Math.max(1, Math.round((max - min) / 8)),
    task,
    markerValue: typeof markerValue === 'number' ? markerValue : undefined,
    tolerance: typeof tolerance === 'number' ? tolerance : 10,
    labelledValues: Array.isArray(labelledValues)
      ? labelledValues.filter((v): v is number => typeof v === 'number')
      : undefined,
  };
}

export function parseProtractorConfig(raw: unknown): ProtractorConfig | undefined {
  if (!isObject(raw)) return undefined;
  const { angleImage, targetAngle, tolerance } = raw;
  if (typeof targetAngle !== 'number') return undefined;
  return {
    angleImage: typeof angleImage === 'string' ? angleImage : undefined,
    targetAngle,
    tolerance: typeof tolerance === 'number' ? tolerance : 2,
  };
}

function parseOptions(options: unknown, question?: string, answer?: string): { choices: string[]; acceptedAnswers: string[]; numberLine?: NumberLineConfig; protractor?: ProtractorConfig } {
  if (Array.isArray(options)) {
    const choices = unique(toStringList(options));
    return {
      choices: choices.length > 0 ? choices : question ? extractOrderingChoices(question, answer) : [],
      acceptedAnswers: [],
    };
  }

  if (isObject(options)) {
    const choices = unique(toStringList(options.choices));
    return {
      choices: choices.length > 0 ? choices : question ? extractOrderingChoices(question, answer) : [],
      acceptedAnswers: unique(toStringList(options.acceptedAnswers)),
      numberLine: parseNumberLineConfig(options.numberLine),
      protractor: parseProtractorConfig(options.protractor),
    };
  }

  return { choices: question ? extractOrderingChoices(question, answer) : [], acceptedAnswers: [] };
}

function inferInteractionType(item: {
  type?: string | null;
  question?: string;
  answer: string;
  options?: unknown;
}): ItemInteractionType {
  if (typeof item.question === 'string' && isOrderingPrompt(item.question)) {
    return 'ORDER';
  }

  const normalized = item.type?.trim().toUpperCase();
  if (normalized === 'ORDER') return 'ORDER';
  if (normalized === 'TRUE_FALSE') return 'TRUE_FALSE';
  if (normalized === 'SHORT_NUMERIC' || normalized === 'NUMERIC') return 'SHORT_NUMERIC';
  if (normalized === 'SHORT_TEXT') return 'SHORT_TEXT';
  if (normalized === 'MCQ') return 'MCQ';
  if (normalized === 'MULTI_SELECT') return 'MULTI_SELECT';
  if (normalized === 'NUMBER_LINE') return 'NUMBER_LINE';
  if (normalized === 'PROTRACTOR') return 'PROTRACTOR';

  return (item.type as ItemInteractionType) || 'MCQ';
}

export function getItemContent(item: {
  type: string;
  question?: string;
  answer: string;
  options?: unknown;
}): ItemContent {
  const parsed = parseOptions(item.options, item.question, item.answer);
  const acceptedAnswers = unique([item.answer, ...parsed.acceptedAnswers]);

  return {
    type: inferInteractionType(item),
    choices: parsed.choices,
    acceptedAnswers,
    canonicalAnswer: item.answer,
    numberLine: parsed.numberLine,
    protractor: parsed.protractor,
  };
}

export function gradeAttempt(
  acceptedAnswers: AcceptedAnswerInput,
  submittedAnswer: string,
  tolerance?: number
): boolean {
  if (tolerance != null && tolerance > 0) {
    const submitted = parseFloat(submittedAnswer.replace(/,/g, '').trim());
    if (!isNaN(submitted)) {
      return normalizeAcceptedAnswers(acceptedAnswers).some((answer) => {
        const target = parseFloat(answer.replace(/,/g, '').trim());
        return !isNaN(target) && Math.abs(submitted - target) <= tolerance;
      });
    }
  }
  const submitted = normalizeAnswer(submittedAnswer);
  return normalizeAcceptedAnswers(acceptedAnswers).some((answer) => normalizeAnswer(answer) === submitted);
}

export function getAnswerFormatHint(type: string, question: string, options?: unknown): string | null {
  const content = getItemContent({ type, question, answer: '', options } as { type: string; question: string; answer: string; options?: unknown });

  switch (content.type) {
    case 'TRUE_FALSE':
      return 'Answer with True or False.';
    case 'SHORT_NUMERIC':
      return 'Enter digits only, without extra words.';
    case 'ORDER':
      return 'Drag the values into the correct order.';
    case 'MULTI_SELECT':
      return 'Select all correct answers.';
    case 'SHORT_TEXT':
      return 'Type a short answer using words or symbols only as needed.';
    case 'NUMBER_LINE':
      return 'Use the number line to answer.';
    case 'PROTRACTOR':
      return 'Use the on-screen protractor to measure the angle, then type your reading.';
    default:
      return null;
  }
}
