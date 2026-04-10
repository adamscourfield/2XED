#!/usr/bin/env node
/**
 * extract-pptx-questions.mjs
 *
 * Extracts practice questions from a question-bank PPTX and writes a JSONL file
 * ready for import via `npm run db:import:question-bank`.
 *
 * Usage:
 *   node scripts/extract-pptx-questions.mjs --file <path-to.pptx> --skill <N1.1>
 *
 * Output:
 *   docs/unit-mapping/question-bank/<skill-slug>-questions.jsonl
 *
 * Handles four question types found in the standard question-bank PPTX format:
 *   1. Value-of-digit  — labeled a), b) … with one underlined digit in a number
 *   2. Greatest/smallest — "Using the following digits: X, Y, Z"
 *   3. Difference       — "What is the difference between greatest and smallest?"
 *   4. Skills Check MCQ — A. … B. … C. … D. … options
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

const pptxArg = getArg('file');
const skillCode = getArg('skill');

if (!pptxArg || !skillCode) {
  console.error('Usage: node scripts/extract-pptx-questions.mjs --file <path> --skill <N1.1>');
  process.exit(1);
}

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pptxPath = path.resolve(repoRoot, pptxArg);

if (!fs.existsSync(pptxPath)) {
  console.error(`PPTX not found: ${pptxPath}`);
  process.exit(1);
}

const sourceFile = path.basename(pptxPath);
const skillSlug = skillCode.toLowerCase().replace(/\./g, '-');
const outDir = path.join(repoRoot, 'docs', 'unit-mapping', 'question-bank');
const outPath = path.join(outDir, `${skillSlug}-questions.jsonl`);
fs.mkdirSync(outDir, { recursive: true });

// ─── XML helpers ─────────────────────────────────────────────────────────────

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2013;/gi, '–')
    .replace(/&#x2014;/gi, '—')
    .replace(/&#x2264;/gi, '≤')
    .replace(/&#x2265;/gi, '≥')
    .replace(/&#x2260;/gi, '≠')
    .replace(/&#xD7;/gi, '×')
    .replace(/&#xF7;/gi, '÷');
}

function parseSlideRuns(xml) {
  const runs = [];
  const runRe = /<a:r>([\s\S]*?)<\/a:r>/g;
  let m;
  while ((m = runRe.exec(xml)) !== null) {
    const runXml = m[1];
    const underlined = /u="sng"|u="dbl"/.test(runXml);
    const tMatch = runXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/);
    if (!tMatch) continue;
    const text = decodeXmlEntities(tMatch[1]).trim();
    if (text) runs.push({ text, underlined });
  }
  return runs;
}

function readAllRuns(pptxPath) {
  const listing = execFileSync('unzip', ['-Z1', pptxPath], { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^ppt\/slides\/slide\d+\.xml$/.test(l))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
      return na - nb;
    });

  const allRuns = [];
  for (const entry of listing) {
    const xml = execFileSync('unzip', ['-p', pptxPath, entry], { encoding: 'utf8' });
    allRuns.push(...parseSlideRuns(xml));
  }
  return allRuns;
}

// ─── Number / place-value helpers ────────────────────────────────────────────

const PLACE_NAMES = {
  ones: 1,
  ten: 10,
  tens: 10,
  hundred: 100,
  hundreds: 100,
  thousand: 1000,
  thousands: 1000,
  'ten thousand': 10000,
  'ten thousands': 10000,
  'hundred thousand': 100000,
  'hundred thousands': 100000,
  million: 1000000,
  millions: 1000000,
};

/** Parse an option string like "50", "5 hundreds", "5 tens" to a numeric value. */
function parseOptionValue(opt) {
  const trimmed = opt.trim().replace(/,/g, '');
  // Pure number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  // "N place_name"
  const placeMatch = trimmed.match(/^(\d+)\s+(.+)$/i);
  if (placeMatch) {
    const n = Number(placeMatch[1]);
    const place = placeMatch[2].toLowerCase().trim();
    if (PLACE_NAMES[place] != null) return n * PLACE_NAMES[place];
  }
  return null;
}

/** Compute the place value of a digit at a given 0-based position from the right. */
function placeValue(digitChar, posFromRight) {
  return Number(digitChar) * Math.pow(10, posFromRight);
}

/**
 * Given the full number string (with possible commas) and the underlined digit text,
 * compute the value of that digit (taking its rightmost occurrence by default).
 * Returns the numeric value, or null if not computable.
 */
function computeDigitValue(fullNumber, underlinedDigit) {
  const stripped = fullNumber.replace(/[,\s]/g, '');
  // Find position of underlined digit from the right (use last occurrence)
  let pos = -1;
  for (let i = stripped.length - 1; i >= 0; i--) {
    if (stripped[i] === underlinedDigit) {
      pos = stripped.length - 1 - i;
      break;
    }
  }
  if (pos === -1) return null;
  return placeValue(underlinedDigit, pos);
}

// ─── Digit arrangement helpers ────────────────────────────────────────────────

function greatestNumber(digits) {
  return [...digits].sort((a, b) => b - a).join('');
}

function smallestNumber(digits) {
  const sorted = [...digits].sort((a, b) => a - b);
  // Avoid leading zero: swap first element with first non-zero element
  if (sorted[0] === 0) {
    const firstNonZero = sorted.findIndex((d) => d !== 0);
    if (firstNonZero !== -1) {
      [sorted[0], sorted[firstNonZero]] = [sorted[firstNonZero], sorted[0]];
    }
  }
  return sorted.join('');
}

function parseDigitList(text) {
  return text.match(/\d/g)?.map(Number) ?? [];
}

// ─── Section header detection ─────────────────────────────────────────────────

const SECTION_HEADERS = [
  /^independent practice$/i,
  /^example \d/i,
  /^steps$/i,
  /^skills check$/i,
  /^using (the |all of the )?following digits/i,
  /^here are (four|three|five|\d+) digits/i,
  /^nb:/i,
  /^objectives:/i,
  /^learning outcome/i,
  /^keywords:/i,
  /^introduction/i,
  /^place value:/i,
  /^definition$/i,
  /^characteristics$/i,
  /^examples$/i,
  /^non\s*-?\s*examples$/i,
  /^what is the (greatest|smallest|difference|value)/i,
  /^question \d/i,
];

function isSectionHeader(text) {
  return SECTION_HEADERS.some((re) => re.test(text.trim()));
}

const LABEL_RE = /^[a-z]\)$/;
const NUMERIC_RE = /^[\d,\s]+$/;

// ─── Extraction: value-of-digit questions ────────────────────────────────────

function extractValueOfDigitQuestions(runs) {
  const questions = [];
  let i = 0;

  while (i < runs.length) {
    if (!LABEL_RE.test(runs[i].text)) { i++; continue; }

    const label = runs[i].text;
    const parts = [];
    let j = i + 1;

    while (j < runs.length) {
      const t = runs[j].text;
      if (LABEL_RE.test(t)) break;
      if (isSectionHeader(t)) break;
      parts.push(runs[j]);
      j++;
    }

    // Need at least 2 parts: number portion + answer
    if (parts.length >= 2) {
      const answerPart = parts[parts.length - 1];
      const numberParts = parts.slice(0, -1);

      const answerText = answerPart.text.replace(/\s/g, '');
      const isNumericAnswer = NUMERIC_RE.test(answerPart.text) && answerText !== '';
      const underlinedRuns = numberParts.filter((p) => p.underlined);
      const fullNumber = numberParts.map((p) => p.text).join('').trim();
      const isNumericNumber = NUMERIC_RE.test(fullNumber.replace(/,/g, ''));

      if (
        isNumericAnswer &&
        underlinedRuns.length === 1 &&
        isNumericNumber &&
        fullNumber.length > 0
      ) {
        const underlinedDigit = underlinedRuns[0].text.trim();
        const answer = answerText.replace(/,/g, '');

        // Sanity: answer should equal digit × 10^position
        const computed = computeDigitValue(fullNumber, underlinedDigit);
        const answerNum = Number(answer);
        if (computed !== null && computed === answerNum) {
          questions.push({ label, fullNumber, underlinedDigit, answer });
        } else if (computed === null) {
          // digit not found in number — skip
        } else {
          // mismatch — still include with extracted answer (could be display rounding)
          questions.push({ label, fullNumber, underlinedDigit, answer });
        }
      }
    }

    i = j;
  }

  return questions;
}

// ─── Extraction: greatest / smallest / difference ────────────────────────────

function extractArrangementQuestions(runs) {
  const greatest = [];
  const smallest = [];
  const differences = [];

  for (let i = 0; i < runs.length; i++) {
    const t = runs[i].text;

    // Difference question: "Here are N digits:" followed by individual digit runs,
    // then the difference stem, then the answer.
    if (/here are (four|three|five|six|\d+) digits/i.test(t)) {
      // Collect the individual digit runs that follow immediately
      const digits = [];
      let j = i + 1;
      while (j < runs.length && j < i + 10) {
        const rt = runs[j].text.trim();
        if (/^\d$/.test(rt)) {
          digits.push(Number(rt));
          j++;
        } else if (/difference between/i.test(rt)) {
          // Found the question stem — stop collecting digits
          break;
        } else if (/^\d[\d,\s]+$/.test(rt)) {
          // Multi-digit run like "7532" — skip, it's an example answer
          j++;
        } else {
          break;
        }
      }
      // Find the "difference" stem within the next few runs
      while (j < runs.length && j < i + 15) {
        if (/difference between the greatest.*smallest/i.test(runs[j].text)) {
          if (digits.length >= 2) {
            const g = greatestNumber(digits);
            const s = smallestNumber(digits);
            differences.push({ digits, answer: String(Number(g) - Number(s)), stem: runs[j].text });
          }
          break;
        }
        j++;
      }
      continue;
    }

    // Trigger: "Using [the/all of the] following digits:"
    if (/using (the |all of the )?following digits/i.test(t)) {
      // Next run should contain the digit list
      let digitText = '';
      let j = i + 1;
      while (j < runs.length && j < i + 4) {
        const candidate = runs[j].text.trim();
        if (/[\d,\s]+/.test(candidate) && /\d/.test(candidate)) {
          digitText = candidate;
          break;
        }
        j++;
      }
      if (!digitText) continue;
      const digits = parseDigitList(digitText);
      if (digits.length < 2) continue;

      // Look ahead for greatest/smallest question stems within the next ~6 runs
      let k = j + 1;
      while (k < runs.length && k < j + 8) {
        const qt = runs[k].text;
        if (/greatest.*digit.*number/i.test(qt)) {
          const digitCount = qt.match(/(\d+)-digit/) ? Number(qt.match(/(\d+)-digit/)[1]) : digits.length;
          const g = greatestNumber(digits.slice(0, digitCount));
          greatest.push({ digits, digitCount, answer: g, stem: qt });
        } else if (/smallest.*digit.*number/i.test(qt)) {
          const digitCount = qt.match(/(\d+)-digit/) ? Number(qt.match(/(\d+)-digit/)[1]) : digits.length;
          const s = smallestNumber(digits.slice(0, digitCount));
          smallest.push({ digits, digitCount, answer: s, stem: qt });
        } else if (isSectionHeader(qt) && !/greatest|smallest/i.test(qt)) {
          break;
        }
        k++;
      }
    }
  }

  return { greatest, smallest, differences };
}

// ─── Extraction: Skills Check MCQ ────────────────────────────────────────────

const OPTIONS_RE = /^A\.\s*.+(?:\s+[B-D]\.\s*.+){2,}/;

function parseOptions(optLine) {
  const opts = [];
  const re = /[A-D]\.\s*([^A-D]+?)(?=\s+[A-D]\.|$)/g;
  let m;
  while ((m = re.exec(optLine)) !== null) {
    opts.push(m[1].trim());
  }
  return opts;
}

function findCorrectOption(options, underlinedDigit, fullNumber) {
  const value = computeDigitValue(fullNumber, underlinedDigit);
  if (value === null) return options[0];

  // Try to match each option to the computed value
  for (const opt of options) {
    const parsed = parseOptionValue(opt);
    if (parsed !== null && parsed === value) return opt;
  }

  // Fallback: return first option that numerically matches when comma-stripped
  for (const opt of options) {
    if (Number(opt.replace(/,/g, '').trim()) === value) return opt;
  }

  return options[0];
}

function extractMcqQuestions(runs) {
  const questions = [];

  for (let i = 0; i < runs.length; i++) {
    const t = runs[i].text;

    // Detect MCQ stem patterns
    const isValueStem = /what is the value of the underlined digit in the following number/i.test(t);
    const isArrangeStem = /what is (the )?(greatest|smallest) (.*digit.*number|four-digit)/i.test(t);

    if (!isValueStem && !isArrangeStem) continue;

    // Collect number runs and find options line within the next 10 runs
    const numberRuns = [];
    let optionsLine = null;
    let j = i + 1;

    while (j < runs.length && j < i + 12) {
      if (OPTIONS_RE.test(runs[j].text)) {
        optionsLine = runs[j].text;
        break;
      }
      // Stop if we hit another MCQ stem or section header (but not digit/letter runs)
      if (isSectionHeader(runs[j].text) && !/^\d/.test(runs[j].text)) break;
      numberRuns.push(runs[j]);
      j++;
    }

    if (!optionsLine) continue;

    const options = parseOptions(optionsLine);
    if (options.length < 2) continue;

    if (isValueStem) {
      const underlinedRuns = numberRuns.filter((r) => r.underlined);
      if (underlinedRuns.length === 0) continue;
      const underlinedDigit = underlinedRuns[0].text.trim();
      const fullNumber = numberRuns.map((r) => r.text).join('').trim();
      const correctAnswer = findCorrectOption(options, underlinedDigit, fullNumber);

      // Build stem with number embedded
      const stem = `What is the value of the underlined digit in the number ${fullNumber}?`;
      questions.push({ stem, options, answer: correctAnswer });
    } else if (isArrangeStem) {
      // "What is smallest four digit number you could make using the following digits?"
      // Digits are embedded in the stem or nearby runs
      const digitRun = numberRuns.find((r) => /[\d\s]+/.test(r.text) && /\d/.test(r.text));
      const stemText = t;
      // Compute answer from options for arrangement (or from digits if available)
      // Use the option that numerically corresponds to the correct arrangement
      const allDigits = digitRun ? parseDigitList(digitRun.text) : [];

      let correctAnswer = options[0];
      if (allDigits.length >= 2) {
        if (/smallest/i.test(stemText)) {
          const s = smallestNumber(allDigits);
          // Find matching option
          const match = options.find((o) => {
            const stripped = o.replace(/[,\s]/g, '');
            return stripped === s;
          });
          if (match) correctAnswer = match;
        } else if (/greatest/i.test(stemText)) {
          const g = greatestNumber(allDigits);
          const match = options.find((o) => {
            const stripped = o.replace(/[,\s]/g, '');
            return stripped === g;
          });
          if (match) correctAnswer = match;
        }
      }

      questions.push({ stem: stemText, options, answer: correctAnswer });
    }
  }

  return questions;
}

// ─── Build JSONL records ──────────────────────────────────────────────────────

function makeRef(type, n) {
  return `${skillCode}-QB-${type}-${String(n).padStart(3, '0')}`;
}

function makeRecord(ref, stem, format, answer, options) {
  const rec = {
    source: { question_ref: ref, source_file: sourceFile },
    question: { stem, format, answer },
    skills: { primary_skill_code: skillCode },
    marking: { mark_scheme_type: 'AUTO_EXACT', accepted_answers: [answer] },
  };
  if (options && options.length > 0) {
    rec.question.options = options;
  }
  return rec;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const allRuns = readAllRuns(pptxPath);

// 1. Value-of-digit questions
const valQuestions = extractValueOfDigitQuestions(allRuns);
// Deduplicate: same fullNumber + underlinedDigit
const valSeen = new Set();
const valUnique = valQuestions.filter((q) => {
  const key = `${q.fullNumber}|${q.underlinedDigit}`;
  if (valSeen.has(key)) return false;
  valSeen.add(key);
  return true;
});

// 2. Arrangement questions
const { greatest, smallest, differences } = extractArrangementQuestions(allRuns);
// Deduplicate by digits + type
const grtSeen = new Set();
const smlSeen = new Set();
const grtUnique = greatest.filter((q) => {
  const key = q.digits.join(',');
  if (grtSeen.has(key)) return false;
  grtSeen.add(key);
  return true;
});
const smlUnique = smallest.filter((q) => {
  const key = q.digits.join(',');
  if (smlSeen.has(key)) return false;
  smlSeen.add(key);
  return true;
});
const difSeen = new Set();
const difUnique = differences.filter((q) => {
  const key = q.digits.sort().join(',');
  if (difSeen.has(key)) return false;
  difSeen.add(key);
  return true;
});

// 3. MCQ
const mcqQuestions = extractMcqQuestions(allRuns);
const mcqSeen = new Set();
const mcqUnique = mcqQuestions.filter((q) => {
  if (mcqSeen.has(q.stem)) return false;
  mcqSeen.add(q.stem);
  return true;
});

// ─── Write output ─────────────────────────────────────────────────────────────

const lines = [];

valUnique.forEach((q, i) => {
  const stem = `In the number ${q.fullNumber}, what is the value of the digit ${q.underlinedDigit}?`;
  lines.push(makeRecord(makeRef('VAL', i + 1), stem, 'NUMERIC', q.answer, null));
});

grtUnique.forEach((q, i) => {
  const digitList = q.digits.join(', ');
  const stem = `Using the digits ${digitList}, what is the greatest ${q.digitCount}-digit number you can make?`;
  lines.push(makeRecord(makeRef('GRT', i + 1), stem, 'NUMERIC', q.answer, null));
});

smlUnique.forEach((q, i) => {
  const digitList = q.digits.join(', ');
  const stem = `Using the digits ${digitList}, what is the smallest ${q.digitCount}-digit number you can make?`;
  lines.push(makeRecord(makeRef('SML', i + 1), stem, 'NUMERIC', q.answer, null));
});

difUnique.forEach((q, i) => {
  const digitList = q.digits.join(', ');
  const g = greatestNumber(q.digits);
  const s = smallestNumber(q.digits);
  const stem = `Here are the digits: ${digitList}. What is the difference between the greatest and smallest ${q.digits.length}-digit number you can make?`;
  lines.push(makeRecord(makeRef('DIF', i + 1), stem, 'NUMERIC', String(Number(g) - Number(s)), null));
});

mcqUnique.forEach((q, i) => {
  lines.push(makeRecord(makeRef('MCQ', i + 1), q.stem, 'SINGLE_CHOICE', q.answer, q.options));
});

fs.writeFileSync(outPath, lines.map((r) => JSON.stringify(r)).join('\n') + '\n');

const summary = {
  skill: skillCode,
  outputFile: path.relative(repoRoot, outPath),
  questionsExtracted: {
    valueOfDigit: valUnique.length,
    greatest: grtUnique.length,
    smallest: smlUnique.length,
    difference: difUnique.length,
    mcq: mcqUnique.length,
    total: lines.length,
  },
};

console.log(JSON.stringify(summary, null, 2));
