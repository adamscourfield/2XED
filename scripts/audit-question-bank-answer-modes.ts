/**
 * Audits docs/unit-mapping/question-bank/*.jsonl for consistency between
 * declared question.format, derived import type, and runtime parseAnswerType.
 *
 * Run: npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' scripts/audit-question-bank-answer-modes.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  MappingRow,
  MappingRowSchema,
  deriveStoredItemFromMapping,
  getItemContractIssues,
  type CanonicalQuestionFormat,
} from '../src/features/content/questionContract';
import { parseAnswerType } from '../src/features/items/itemMeta';

const BANK_DIR = path.resolve(process.cwd(), 'docs/unit-mapping/question-bank');

type AnswerType = ReturnType<typeof parseAnswerType>;

/** Map legacy `question.format` labels in JSONL to canonical names for comparison. */
function normalizeDeclaredFormat(declared: string | undefined): string | undefined {
  if (!declared) return undefined;
  const u = declared.trim().toUpperCase();
  if (u === 'SHORT' || u === 'SHORT_ANSWER') return 'SHORT_TEXT';
  if (u === 'MCQ') return 'SINGLE_CHOICE';
  return u;
}

/** How parseAnswerType classifies stored `Item.type` when stem/options/answer are neutral. */
function naiveTypeParse(itemType: string): AnswerType {
  const normalized = itemType.trim().toUpperCase();
  if (normalized === 'ORDER') return 'ORDER';
  if (normalized === 'TRUE_FALSE' || normalized === 'BOOLEAN' || normalized === 'TF') return 'TRUE_FALSE';
  if (normalized === 'SHORT_TEXT' || normalized === 'SHORT') return 'SHORT_TEXT';
  if (normalized === 'SHORT_NUMERIC' || normalized === 'NUMERIC') return 'SHORT_NUMERIC';
  if (normalized === 'MULTI_SELECT' || normalized === 'NUMBER_LINE' || normalized === 'PROTRACTOR') return 'MCQ';
  return 'MCQ';
}

function canonicalToStoredType(format: CanonicalQuestionFormat): string {
  const map: Record<CanonicalQuestionFormat, string> = {
    TRUE_FALSE: 'TRUE_FALSE',
    SINGLE_CHOICE: 'MCQ',
    SHORT_TEXT: 'SHORT_TEXT',
    NUMERIC: 'SHORT_NUMERIC',
    ORDER_SEQUENCE: 'ORDER',
    MULTI_SELECT: 'MULTI_SELECT',
    NUMBER_LINE: 'NUMBER_LINE',
    PROTRACTOR: 'PROTRACTOR',
  };
  return map[format];
}

function main() {
  if (!fs.existsSync(BANK_DIR)) {
    console.error(`Directory not found: ${BANK_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(BANK_DIR).filter((f) => f.endsWith('.jsonl')).sort();
  const rows: Array<{
    file: string;
    ref: string;
    declaredFormat: string | undefined;
    canonicalFormat: CanonicalQuestionFormat;
    derivedType: string;
    expectedStoredType: string;
    storedTypeParseNaive: AnswerType;
    parseActual: AnswerType;
    contractErrors: string[];
    orderDowngraded: boolean;
  }> = [];

  for (const file of files) {
    const filePath = path.join(BANK_DIR, file);
    const lines = fs
      .readFileSync(filePath, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const raw = JSON.parse(line) as MappingRow;
      const row = MappingRowSchema.parse(raw);
      const derived = deriveStoredItemFromMapping(row);
      const issues = getItemContractIssues({
        question: row.question.stem,
        type: derived.type,
        answer: derived.answer,
        options: derived.options,
      });

      const orderIssues = issues.filter(
        (i) =>
          i.severity === 'error' &&
          (i.code === 'order_min_choices' || i.code === 'order_missing_answer_values')
      );
      const orderDowngraded = orderIssues.length > 0;
      let effectiveType = derived.type;
      let effectiveOptions = derived.options;
      if (orderDowngraded) {
        effectiveType = 'SHORT_TEXT';
        effectiveOptions = { choices: [], acceptedAnswers: derived.options.acceptedAnswers };
      }

      const hardIssues = issues.filter((i) => i.severity === 'error' && !orderIssues.includes(i));
      const parseActual = parseAnswerType(
        effectiveType,
        row.question.stem,
        effectiveOptions,
        derived.answer
      );
      const expectedStoredType = canonicalToStoredType(derived.canonicalFormat);
      const storedTypeParseNaive = naiveTypeParse(effectiveType);

      rows.push({
        file,
        ref: row.source.question_ref,
        declaredFormat: row.question.format,
        canonicalFormat: derived.canonicalFormat,
        derivedType: derived.type,
        expectedStoredType,
        storedTypeParseNaive,
        parseActual,
        contractErrors: hardIssues.map((i) => i.code),
        orderDowngraded,
      });
    }
  }

  const formatMismatch = rows.filter((r) => {
    const n = normalizeDeclaredFormat(r.declaredFormat);
    return Boolean(n && n !== r.canonicalFormat);
  });
  const storedTypeMismatch = rows.filter((r) => r.derivedType !== r.expectedStoredType);
  const parseVsStored = rows.filter((r) => r.parseActual !== r.storedTypeParseNaive);
  const importBlockers = rows.filter((r) => r.contractErrors.length > 0);
  const orderWarnings = rows.filter((r) => r.orderDowngraded);

  console.log(`Files: ${files.length}, rows: ${rows.length}`);
  console.log(`Declared format !== inferred canonical: ${formatMismatch.length}`);
  console.log(`Derived DB type !== mapping from canonical: ${storedTypeMismatch.length}`);
  console.log(`parseAnswerType differs from naive item-type parse (boolean/order heuristics): ${parseVsStored.length}`);
  console.log(`Would be skipped on import (hard contract errors): ${importBlockers.length}`);
  console.log(`ORDER → SHORT_TEXT downgrade path: ${orderWarnings.length}`);

  const printSample = (label: string, list: typeof rows, limit = 30) => {
    if (list.length === 0) return;
    console.log(`\n--- ${label} (showing up to ${limit}) ---`);
    for (const r of list.slice(0, limit)) {
      console.log(
        `${r.ref} [${r.file}] declared=${r.declaredFormat ?? '∅'} canonical=${r.canonicalFormat} derived=${r.derivedType} expectStored=${r.expectedStoredType} naiveParse=${r.storedTypeParseNaive} parseAnswerType=${r.parseActual}` +
          (r.contractErrors.length ? ` ERR:${r.contractErrors.join(',')}` : '') +
          (r.orderDowngraded ? ' [order-downgrade]' : '')
      );
    }
    if (list.length > limit) console.log(`... and ${list.length - limit} more`);
  };

  printSample('Format vs canonical mismatches', formatMismatch);
  printSample('Derived type vs canonical→stored mapping', storedTypeMismatch);
  printSample('parseAnswerType heuristic overrides naive type', parseVsStored);
  printSample('Import would skip (hard errors)', importBlockers, 50);

  if (importBlockers.length > 0) {
    process.exitCode = 1;
  }
}

main();
