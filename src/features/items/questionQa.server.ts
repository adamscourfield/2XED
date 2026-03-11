import { inferItemPurpose } from './itemPurpose';
import { stripStudentQuestionLabel } from './itemMeta';
import { summarizeQuestionQa } from './questionQa';

const PLACEHOLDER_RE = /placeholder question/i;
const DIAGNOSTIC_RE = /\bDQ(\d+)\b/i;
const QUESTION_RE = /\bQ(\d+)([a-z])?\b/i;
const SHADOW_RE = /\bSC[-:]?([ABC])(\d+)\b/i;

function parseSequenceTokens(question: string) {
  const displayQuestion = stripStudentQuestionLabel(question);
  const diagnosticMatch = question.match(DIAGNOSTIC_RE);
  const questionMatch = question.match(QUESTION_RE);
  const shadowMatch = question.match(SHADOW_RE);

  const alphaSuffix = questionMatch?.[2]?.toLowerCase() ?? '';
  const alphaOrder = alphaSuffix ? alphaSuffix.charCodeAt(0) - 96 : 0;

  return {
    displayQuestion,
    isPlaceholder: PLACEHOLDER_RE.test(question),
    diagnosticOrdinal: Number(diagnosticMatch?.[1] ?? 0),
    questionOrdinal: Number(questionMatch?.[1] ?? 0),
    questionAlphaOrder: alphaOrder,
    shadowRoute: shadowMatch?.[1] ?? null,
    shadowOrdinal: Number(shadowMatch?.[2] ?? 0),
  };
}

export function buildQaItemView(item: {
  id: string;
  question: string;
  type: string;
  answer: string;
  options: unknown;
  createdAt?: Date;
  skills: Array<{ skill: { code: string; sortOrder?: number | null } }>;
  reviewNotes: Array<{
    id: string;
    status: 'OPEN' | 'RESOLVED';
    category: 'ANSWER_MODE' | 'ANSWER_MAPPING' | 'STEM_COPY' | 'DISTRACTOR_QUALITY' | 'SKILL_MAPPING' | 'OTHER';
    note: string;
    createdAt: Date;
    resolvedAt: Date | null;
    author: { name: string | null; email: string };
  }>;
}) {
  const summary = summarizeQuestionQa(item);
  const inferred = inferItemPurpose({
    question: item.question,
    type: item.type,
    options: item.options,
    answer: item.answer,
  });
  const sequence = parseSequenceTokens(item.question);
  const orderedSkills = [...item.skills]
    .sort((a, b) => (a.skill.sortOrder ?? 9999) - (b.skill.sortOrder ?? 9999) || a.skill.code.localeCompare(b.skill.code));
  const primarySkill = orderedSkills[0]?.skill;

  return {
    id: item.id,
    question: item.question,
    displayQuestion: summary.displayQuestion,
    type: item.type,
    answerType: summary.answerType,
    answerModeLabel: summary.answerModeLabel,
    answer: item.answer,
    options: item.options,
    skills: orderedSkills.map((entry) => entry.skill.code),
    primarySkillCode: primarySkill?.code ?? '',
    primarySkillSortOrder: primarySkill?.sortOrder ?? 9999,
    questionPurpose: inferred.purpose,
    isPlaceholder: sequence.isPlaceholder,
    sequenceKey: {
      diagnosticOrdinal: sequence.diagnosticOrdinal,
      questionOrdinal: sequence.questionOrdinal,
      questionAlphaOrder: sequence.questionAlphaOrder,
      shadowRoute: sequence.shadowRoute,
      shadowOrdinal: sequence.shadowOrdinal,
      createdAt: item.createdAt?.toISOString() ?? null,
      displayQuestion: sequence.displayQuestion,
    },
    issues: summary.issues,
    reviewNotes: item.reviewNotes.map((note) => ({
      id: note.id,
      status: note.status,
      category: note.category,
      note: note.note,
      createdAt: note.createdAt.toISOString(),
      resolvedAt: note.resolvedAt?.toISOString() ?? null,
      authorLabel: note.author.name ?? note.author.email,
    })),
  };
}
