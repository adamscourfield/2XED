import type { MathsVisual } from '../../lib/maths/visuals/types';
import { parseStoredVisuals, resolveItemVisuals } from './itemVisuals';

export type Unit1VisualBackfillStatus =
  | 'already_stored'
  | 'generated'
  | 'manual_review'
  | 'not_needed';

export interface Unit1VisualBackfillResult {
  status: Unit1VisualBackfillStatus;
  visuals: MathsVisual[];
  reason: string;
}

const SHAPE_SKILLS = new Set(['N2.9', 'N2.10', 'N2.11', 'N2.12', 'N2.13']);
const FORMAL_METHOD_SKILLS = new Set(['N2.4', 'N2.5', 'N2.6', 'N2.7']);
const NUMBER_LINE_SKILLS = new Set(['N1.9', 'N1.10', 'N1.11', 'N1.12', 'N1.13']);
const PLACE_VALUE_SKILLS = new Set(['N1.1', 'N1.6']);

function isShapeQuestion(question: string): boolean {
  return /\b(rectangle|parallelogram|triangle|trapezium|polygon|compound shape|perimeter)\b/i.test(question);
}

function isArithmeticLayoutQuestion(question: string): boolean {
  return /\b(calculate|column|formal method|addition|subtraction|add|subtract)\b/i.test(question);
}

function isNumberLineQuestion(question: string): boolean {
  return /\b(number line|midpoint|between|left to right|round|nearest|decimal place)\b/i.test(question);
}

function isPlaceValueQuestion(question: string): boolean {
  return /\b(place value|value of|digit|expanded form)\b/i.test(question);
}

function visualExpectation(skillCode: string, question: string): 'required' | 'useful' | 'none' {
  if (SHAPE_SKILLS.has(skillCode)) return 'required';
  if (FORMAL_METHOD_SKILLS.has(skillCode) && isArithmeticLayoutQuestion(question)) return 'required';
  if (NUMBER_LINE_SKILLS.has(skillCode) && isNumberLineQuestion(question)) return 'required';
  if (PLACE_VALUE_SKILLS.has(skillCode) && isPlaceValueQuestion(question)) return 'useful';
  return 'none';
}

function generatedVisualIsExactEnough(skillCode: string, question: string, visuals: MathsVisual[]): boolean {
  if (visuals.length === 0) return false;
  const visualTypes = new Set(visuals.map((visual) => visual.type));

  if (SHAPE_SKILLS.has(skillCode)) {
    const hasNamedShape = /\b(rectangle|parallelogram|triangle|trapezium|polygon|compound shape|regular|irregular)\b/i.test(
      question
    );
    const hasMeasurements = /\d+(?:\.\d+)?\s*cm\b/i.test(question);
    return hasNamedShape || hasMeasurements;
  }

  if (FORMAL_METHOD_SKILLS.has(skillCode) || visualTypes.has('arithmetic-layout')) {
    return isArithmeticLayoutQuestion(question) || /\d+\s*[+\-x÷]\s*\d+/.test(question);
  }

  if (NUMBER_LINE_SKILLS.has(skillCode) || visualTypes.has('number-line')) {
    const hasTwoValues = (question.match(/[-+]?\d[\d,]*(?:\.\d+)?/g) ?? []).length >= 2;
    return isNumberLineQuestion(question) || hasTwoValues;
  }

  if (PLACE_VALUE_SKILLS.has(skillCode)) {
    return isPlaceValueQuestion(question);
  }

  return true;
}

export function buildUnit1VisualBackfill(input: {
  question: string;
  answer: string;
  type: string;
  options?: unknown;
  primarySkillCode: string;
}): Unit1VisualBackfillResult {
  const stored = parseStoredVisuals(input.options);
  if (stored.length > 0) {
    return {
      status: 'already_stored',
      visuals: stored,
      reason: 'Item already has stored maths visuals.',
    };
  }

  const expectation = visualExpectation(input.primarySkillCode, input.question);
  const generated = resolveItemVisuals(input, input.primarySkillCode);

  if (generated.length > 0) {
    if (!generatedVisualIsExactEnough(input.primarySkillCode, input.question, generated)) {
      return {
        status: 'manual_review',
        visuals: [],
        reason: 'A low-confidence fallback visual was possible, but this question still needs a manually authored spec.',
      };
    }

    return {
      status: 'generated',
      visuals: generated,
      reason:
        expectation === 'required'
          ? 'Generated deterministic visual spec for a question that should render with a model.'
          : 'Generated deterministic visual spec for a question where a model is useful.',
    };
  }

  if (expectation === 'required') {
    return {
      status: 'manual_review',
      visuals: [],
      reason: 'This question should have a visual, but no deterministic spec could be generated from the current data.',
    };
  }

  return {
    status: 'not_needed',
    visuals: [],
    reason: 'This question does not currently need a stored visual spec.',
  };
}
