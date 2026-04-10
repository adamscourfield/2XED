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

function readSlidesRuns(pptxPath) {
  const listing = execFileSync('unzip', ['-Z1', pptxPath], { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^ppt\/slides\/slide\d+\.xml$/.test(l))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
      return na - nb;
    });

  return listing.map((entry) => {
    const xml = execFileSync('unzip', ['-p', pptxPath, entry], { encoding: 'utf8' });
    const slideNumber = Number(entry.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
    return { slideNumber, runs: parseSlideRuns(xml) };
  });
}

function readAllRuns(pptxPath) {
  return readSlidesRuns(pptxPath).flatMap((s) => s.runs);
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

// ─── British English number words ────────────────────────────────────────────

const _ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const _TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function _two(n) {
  if (n === 0) return '';
  if (n < 20) return _ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return o === 0 ? _TENS[t] : `${_TENS[t]}-${_ONES[o]}`;
}

function _hun(n) {
  // 1–999
  if (n < 100) return _two(n);
  const h = Math.floor(n / 100), rem = n % 100;
  return rem === 0 ? `${_ONES[h]} hundred` : `${_ONES[h]} hundred and ${_two(rem)}`;
}

function _fmt(n) {
  // recursive, returns lower-case, n > 0
  if (n >= 1_000_000) {
    const m = Math.floor(n / 1_000_000), rem = n % 1_000_000;
    const mp = `${_fmt(m)} million`;
    if (rem === 0) return mp;
    if (rem < 100) return `${mp} and ${_two(rem)}`;
    return `${mp}, ${_fmt(rem)}`;
  }
  if (n >= 1000) {
    const t = Math.floor(n / 1000), rem = n % 1000;
    const tp = `${_fmt(t)} thousand`;
    if (rem === 0) return tp;
    if (rem < 100) return `${tp} and ${_two(rem)}`;
    return `${tp}, ${_hun(rem)}`;
  }
  return _hun(n);
}

function numberToWords(n) {
  if (n === 0) return 'zero';
  const w = _fmt(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

// ─── Words to number ──────────────────────────────────────────────────────────

const _W2N = {
  zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
  ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16,
  seventeen:17, eighteen:18, nineteen:19,
  twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90,
};

function wordsToNumber(text) {
  const s = text.toLowerCase()
    .replace(/half\s+a\s+million/g, 'five hundred thousand')
    .replace(/[,.]/g, ' ').replace(/-/g, ' ')
    .replace(/\band\b/g, ' ').replace(/\s+/g, ' ').trim();
  let result = 0, current = 0;
  for (const tok of s.split(' ').filter(Boolean)) {
    if (_W2N[tok] !== undefined) {
      current += _W2N[tok];
    } else if (tok === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
    } else if (tok === 'thousand') {
      result += (current === 0 ? 1 : current) * 1000; current = 0;
    } else if (tok === 'million') {
      result += (current === 0 ? 1 : current) * 1_000_000; current = 0;
    } else if (tok === 'billion') {
      result += (current === 0 ? 1 : current) * 1_000_000_000; current = 0;
    }
  }
  return result + current;
}

// ─── Extraction: write integers as words (N1.2 sections 1-4) ─────────────────

const WRITE_AS_WORDS_HEADER_RE = /^\d+\.\s+write\s+each\s+numbers?\s+as\s+(?:a\s+)?words?[:.?]?\s*$/i;

function isNumberItem(text) {
  // Optional lower-case label prefix "b) " then digits+commas+spaces, 2+ digits total
  const stripped = text.replace(/^[a-z]\)\s*/, '').replace(/[,\s]/g, '');
  return /^\d{2,}$/.test(stripped);
}

function extractWriteAsWordsQuestions(slides) {
  const questions = [];
  const seen = new Set();

  for (const { runs } of slides) {
    let i = 0;
    while (i < runs.length) {
      if (!WRITE_AS_WORDS_HEADER_RE.test(runs[i].text)) { i++; continue; }
      i++;
      // skip non-items until first item
      while (i < runs.length && !isNumberItem(runs[i].text)) i++;
      // collect consecutive items
      while (i < runs.length && isNumberItem(runs[i].text)) {
        const stripped = runs[i].text.replace(/^[a-z]\)\s*/, '').replace(/[,\s]/g, '');
        const n = parseInt(stripped, 10);
        if (!isNaN(n) && !seen.has(n)) {
          seen.add(n);
          questions.push({ n, answer: numberToWords(n) });
        }
        i++;
      }
    }
  }
  return questions;
}

// ─── Extraction: write words as integers (N1.2 section 5) ────────────────────

const NUMBER_WORD_RE = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)\b/i;

function isWordPhrase(text) { return NUMBER_WORD_RE.test(text); }

function isColumnHeader(text) {
  return /^(millions?|hundred thousands?|ten thousands?|thousands?|hundreds?|tens?|ones?)$/i.test(text);
}

function extractWriteAsFiguresQuestions(slides) {
  const questions = [];
  const seen = new Set();
  const HEADER_RE = /^5\.\s+write\s+(?:each\s+of\s+these\s+)?words?\s+in\s+numerals?/i;

  for (const { runs } of slides) {
    let i = 0;
    while (i < runs.length) {
      if (!HEADER_RE.test(runs[i].text)) { i++; continue; }
      i++;
      // find "Independent Practice"
      while (i < runs.length && !/^independent practice$/i.test(runs[i].text)) i++;
      if (i >= runs.length) break;
      i++;

      let firstFound = false;

      while (i < runs.length) {
        const text = runs[i].text;
        const numOnly = text.replace(/[,\s]/g, '');

        if (isColumnHeader(text)) { i++; continue; }
        if (/^\d{4,}$/.test(numOnly)) break; // answer section
        if (/^(example\s+\d|steps|skills\s+check)$/i.test(text)) break;

        // labeled "b) Eight thousand..."
        if (/^[b-z]\)\s+\S/.test(text)) {
          const phrase = text.replace(/^[b-z]\)\s+/, '').replace(/\.\s*$/, '').trim();
          if (isWordPhrase(phrase)) {
            const n = wordsToNumber(phrase);
            if (n > 0 && !seen.has(n)) { seen.add(n); questions.push({ phrase, answer: String(n) }); firstFound = true; }
          }
          i++; continue;
        }

        // split-label "d)" then next run is the phrase
        if (/^[b-z]\)$/.test(text) && i + 1 < runs.length) {
          const phrase = runs[i + 1].text.replace(/\.\s*$/, '').replace(/\s+/g, ' ').trim();
          if (isWordPhrase(phrase)) {
            const n = wordsToNumber(phrase);
            if (n > 0 && !seen.has(n)) { seen.add(n); questions.push({ phrase, answer: String(n) }); firstFound = true; }
          }
          i += 2; continue;
        }

        // unlabeled first item
        if (!firstFound && isWordPhrase(text)) {
          const phrase = text.replace(/\.\s*$/, '').trim();
          const n = wordsToNumber(phrase);
          if (n > 0 && !seen.has(n)) { seen.add(n); questions.push({ phrase, answer: String(n) }); firstFound = true; }
        }

        i++;
      }
      break;
    }
  }
  return questions;
}

// ─── Extraction: N1.2-style Skills Check MCQ ─────────────────────────────────

function parseN12OptionLines(line1, line2) {
  const ab = line1.split(/\s{2,}B\.\s+/);
  const cd = line2.split(/\s{2,}D\.\s+/);
  if (ab.length < 2 || cd.length < 2) return null;
  return [ab[0].trim(), ab[1].trim(), cd[0].trim(), cd[1].trim()];
}

function extractN12McqQuestions(slides) {
  const questions = [];
  const seenStems = new Set();

  for (const { runs } of slides) {
    for (let i = 0; i < runs.length; i++) {
      const text = runs[i].text;

      // Type 1: "Write the following number in words:"
      if (/^write the following number in words:/i.test(text)) {
        if (i + 3 >= runs.length) continue;
        const numStr = runs[i + 1].text.replace(/[,\s]/g, '');
        const n = parseInt(numStr, 10);
        if (isNaN(n)) continue;
        const opts = parseN12OptionLines(runs[i + 2].text, runs[i + 3].text);
        if (!opts) continue;
        const computed = numberToWords(n);
        const norm = (s) => s.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        const correct = opts.find((o) => norm(o) === norm(computed)) ?? opts[0];
        const stem = `Write the number ${n} in words.`;
        if (!seenStems.has(stem)) {
          seenStems.add(stem);
          questions.push({ stem, options: opts, answer: correct });
        }
        i += 3; continue;
      }

      // Type 2: "Write the number [words] in figures"
      const figMatch = text.match(/^write the number\s+(.+?)\s+in figures$/i);
      if (figMatch) {
        if (i + 2 >= runs.length) continue;
        const opts = parseN12OptionLines(runs[i + 1].text, runs[i + 2].text);
        if (!opts) continue;
        const n = wordsToNumber(figMatch[1]);
        if (n === 0) continue;
        const norm = (s) => s.replace(/[,\s]/g, '');
        const correct = opts.find((o) => norm(o) === String(n)) ?? opts[0];
        if (!seenStems.has(text)) {
          seenStems.add(text);
          questions.push({ stem: text, options: opts, answer: correct });
        }
        i += 2; continue;
      }
    }
  }
  return questions;
}

// ─── N1.3 helpers ─────────────────────────────────────────────────────────────

/** Parse a string as an integer, falling back to wordsToNumber. Returns null on failure. */
function parseNum(str) {
  const stripped = str.trim().replace(/[,\s]/g, '');
  const n = parseInt(stripped, 10);
  if (!isNaN(n)) return n;
  const w = wordsToNumber(str.trim());
  return w > 0 ? w : null;
}

/** Evaluate L op R where op is one of < > ≤ ≥ = ≠ */
function evalOp(a, op, b) {
  if (op === '<') return a < b;
  if (op === '>') return a > b;
  if (op === '≤') return a <= b;
  if (op === '≥') return a >= b;
  if (op === '=') return a === b;
  if (op === '≠') return a !== b;
  return false;
}

/** Given a statement string like "3 < 5" or "One million < 214 380", return "True"/"False"/null. */
function evaluateInequalityStatement(text) {
  // Try each operator (longest first to avoid < matching ≤)
  const OPS = ['≥', '≤', '≠', '>', '<', '='];
  for (const sym of OPS) {
    const idx = text.indexOf(sym);
    if (idx === -1) continue;
    const left = parseNum(text.slice(0, idx));
    const right = parseNum(text.slice(idx + sym.length));
    if (left === null || right === null) continue;
    return evalOp(left, sym, right) ? 'True' : 'False';
  }
  return null;
}

/** Evaluate an MCQ5-style option claim ("17050 ≠ seventeen thousand and five", "32 + 55 = 88", etc.) */
function evaluateStatementOption(opt) {
  // X ≠ Y
  const neqIdx = opt.indexOf('≠');
  if (neqIdx !== -1) {
    const left = parseNum(opt.slice(0, neqIdx));
    const right = parseNum(opt.slice(neqIdx + 1));
    if (left !== null && right !== null) return left !== right;
  }
  // X = Y (possibly arithmetic: A + B = C)
  const eqIdx = opt.indexOf('=');
  if (eqIdx !== -1) {
    const lhs = opt.slice(0, eqIdx).trim();
    const rhs = parseNum(opt.slice(eqIdx + 1));
    const arith = lhs.match(/^(.+?)\s*\+\s*(.+)$/);
    if (arith) {
      const a = parseNum(arith[1]), b = parseNum(arith[2]);
      if (a !== null && b !== null && rhs !== null) return a + b === rhs;
    }
    const left = parseNum(lhs);
    if (left !== null && rhs !== null) return left === rhs;
  }
  return false;
}

/** Determine the correct answer for an N1.3 Skills Check MCQ. Returns matching option string or null. */
function computeN13McqAnswer(stemText, options) {
  const stemLow = stemText.toLowerCase();

  // MCQ4: "minimum value of N" → option with ≥N
  const minMatch = stemLow.match(/minimum value of (\d+)/);
  if (minMatch) {
    const N = minMatch[1];
    return options.find((o) => o.includes(`≥ ${N}`) || o.includes(`≥${N}`)) ?? null;
  }
  const maxMatch = stemLow.match(/maximum value of (\d+)/);
  if (maxMatch) {
    const N = maxMatch[1];
    return options.find((o) => o.includes(`≤ ${N}`) || o.includes(`≤${N}`)) ?? null;
  }

  // MCQ3: "could [var] = N" — evaluate each inequality at N
  const couldM = stemLow.match(/could\s+[a-z]\s*=\s*(\d+)/);
  if (couldM) {
    const val = parseInt(couldM[1], 10);
    const ineqM = [...stemText.matchAll(/Inequality\s+(\d+)[:\s]+[a-z]\s*([<>≤≥])\s*(\d+)/gi)];
    if (ineqM.length >= 2) {
      const satisfied = ineqM
        .filter((m) => evalOp(val, m[2], parseInt(m[3], 10)))
        .map((m) => m[1]);
      if (satisfied.length === 0) return options.find((o) => /neither/i.test(o)) ?? null;
      if (satisfied.length === ineqM.length) return options.find((o) => /both/i.test(o)) ?? null;
      const n = satisfied[0];
      return options.find((o) => new RegExp(`only inequality ${n}`, 'i').test(o)) ?? null;
    }
  }

  // MCQ5: "which … statements is correct" — evaluate each option
  if (/which\s+(one\s+)?of the following statements is correct/i.test(stemText)) {
    return options.find((o) => evaluateStatementOption(o)) ?? null;
  }

  // MCQ1: "in words" — flip the literal inequality in the stem
  if (/in words/i.test(stemLow) && /inequality.*[<>]/i.test(stemLow)) {
    const ineqM = stemText.match(/inequality[:\s]+(\d+)\s*([<>])\s*([a-z])/i);
    if (ineqM) {
      const num = ineqM[1];
      const varN = ineqM[3];
      // e.g. "3 > t" → t < 3 → option says "t is smaller/less than 3"
      return (
        options.find(
          (o) =>
            o.toLowerCase().includes(`${varN} is smaller than ${num}`) ||
            o.toLowerCase().includes(`${varN} is less than ${num}`) ||
            o.includes(`${varN} < ${num}`)
        ) ?? null
      );
    }
  }

  // MCQ2: "cannot be true" / "can not be true"
  if (/cannot be true|can not be true/i.test(stemText)) {
    const condM = stemText.match(/([a-z])\s*([<>])\s*(\d+)/);
    if (condM) {
      const [, varN, op, boundStr] = condM;
      const bound = parseInt(boundStr, 10);
      const contradictOp = op === '>' ? '<' : '>';
      return (
        options.find(
          (o) =>
            o.toLowerCase().includes(`${varN} is less than ${bound}`) ||
            o.toLowerCase().includes(`${varN} is smaller than ${bound}`) ||
            o.includes(`${varN} ${contradictOp} ${bound}`)
        ) ?? null
      );
    }
  }

  return null;
}

// ─── Extraction: inequality true/false (N1.3 slide 2 table + Q4) ──────────────

function extractInequalityTrueFalseQuestions(slides) {
  const questions = [];
  const seen = new Set();
  // Match labeled rows: "a) 3 < 5", "k) 3  849 000 > one million", etc.
  const ROW_RE = /^([a-k])\)\s+(.+[<>=≠≤≥].+)$/;

  for (const { runs } of slides) {
    for (let i = 0; i < runs.length; i++) {
      const text = runs[i].text;

      // Labeled inequality row
      const rowM = ROW_RE.exec(text);
      if (rowM && i + 1 < runs.length) {
        const statement = rowM[2].trim();
        const nextText = runs[i + 1].text.trim();
        if (!/^(True|False)$/i.test(nextText)) continue;
        const answer = nextText.charAt(0).toUpperCase() + nextText.slice(1).toLowerCase();
        const stem = `True or false? ${statement}`;
        if (!seen.has(stem)) {
          seen.add(stem);
          questions.push({ stem, answer });
        }
        continue;
      }

      // Q4: "True or false?: a = 8  satisfies the inequality a > 5."
      if (/^true or false\?:/i.test(text)) {
        const satisfyM = text.match(
          /([a-z])\s*=\s*(\d+)\s+satisfies\s+the\s+inequality\s+[a-z]\s*([<>≤≥=≠])\s*(\d+)/i
        );
        if (satisfyM) {
          const N = parseInt(satisfyM[2], 10);
          const op = satisfyM[3];
          const M = parseInt(satisfyM[4], 10);
          const answer = evalOp(N, op, M) ? 'True' : 'False';
          const stem = text
            .replace(/\s+Circle the correct answer\.?\s*$/i, '')
            .replace(/\?:/, '?')
            .trim();
          if (!seen.has(stem)) {
            seen.add(stem);
            questions.push({ stem, answer });
          }
        }
      }
    }
  }
  return questions;
}

// ─── Extraction: fill-blank integer inequalities (N1.3 Q8/Q9) ─────────────────

function extractFillBlankQuestions(slides) {
  const questions = [];
  const seen = new Set();
  const BLANK = /_{4,}/;

  for (const { runs } of slides) {
    for (let i = 0; i < runs.length; i++) {
      const text = runs[i].text;
      if (!BLANK.test(text) || !/[<>≤≥]/.test(text)) continue;

      let stem = null, answer = null;

      // Blank on left: "______ < 100"
      const leftM = text.match(/^_{4,}\s*([<>≤≥])\s*(.+)$/);
      if (leftM) {
        const op = leftM[1], rhs = parseNum(leftM[2].trim());
        if (rhs !== null) {
          if (op === '<') { answer = String(rhs - 1); stem = `What is the largest integer satisfying ______ < ${rhs}?`; }
          else if (op === '≤') { answer = String(rhs); stem = `What is the largest integer satisfying ______ ≤ ${rhs}?`; }
          else if (op === '>') { answer = String(rhs + 1); stem = `What is the smallest integer satisfying ______ > ${rhs}?`; }
          else if (op === '≥') { answer = String(rhs); stem = `What is the smallest integer satisfying ______ ≥ ${rhs}?`; }
        }
      }

      // Blank on right (numeric or word left): "489 < _____" / "Six hundred... < _____"
      if (!stem) {
        const rightM = text.match(/^(.+?)\s*([<>])\s*_{4,}$/);
        if (rightM) {
          const lhs = parseNum(rightM[1].trim()), op = rightM[2];
          if (lhs !== null) {
            if (op === '<') { answer = String(lhs + 1); stem = `What is the smallest integer satisfying ${lhs} < ______?`; }
            else if (op === '>') { answer = String(lhs - 1); stem = `What is the largest integer satisfying ${lhs} > ______?`; }
          }
        }
      }

      if (!stem || !answer) continue;

      // Verify: next run must be a single number matching computed answer
      if (i + 1 < runs.length) {
        const nextNum = parseNum(runs[i + 1].text);
        if (nextNum === null || String(nextNum) !== answer) continue;
      } else {
        continue;
      }

      if (!seen.has(stem)) {
        seen.add(stem);
        questions.push({ stem, answer });
      }
    }
  }
  return questions;
}

// ─── Extraction: N1.3-style Skills Check MCQ (A/B then C/D two-line format) ───

function extractN13McqQuestions(slides) {
  const questions = [];
  const seenStems = new Set();
  const AB_RE = /^A\.\s+.{3,}\s{2,}B\.\s+.{3,}/;
  const CD_RE = /^C\.\s+.{3,}\s{2,}D\.\s+.{3,}/;

  for (const { runs } of slides) {
    let inSkillsCheck = false;
    let stemParts = [];

    for (let i = 0; i < runs.length; i++) {
      const text = runs[i].text;

      if (/^skills check$/i.test(text)) {
        inSkillsCheck = true;
        stemParts = [];
        continue;
      }
      if (!inSkillsCheck) continue;

      if (AB_RE.test(text)) {
        if (i + 1 >= runs.length || !CD_RE.test(runs[i + 1].text)) {
          stemParts = [];
          continue;
        }
        const abParts = text.replace(/^A\.\s+/, '').split(/\s{2,}B\.\s+/);
        const cdParts = runs[i + 1].text.replace(/^C\.\s+/, '').split(/\s{2,}D\.\s+/);
        if (abParts.length < 2 || cdParts.length < 2) {
          stemParts = [];
          i++;
          continue;
        }
        const options = [abParts[0].trim(), abParts[1].trim(), cdParts[0].trim(), cdParts[1].trim()];
        const stemText = stemParts.map((s) => s.replace(/\s+/g, ' ').trim()).join(' ');

        if (!seenStems.has(stemText)) {
          const answer = computeN13McqAnswer(stemText, options);
          if (answer !== null) {
            seenStems.add(stemText);
            questions.push({ stem: stemText, options, answer });
          } else {
            console.warn(`  [WARN] N1.3 MCQ: could not determine answer for stem: "${stemText.slice(0, 60)}..."`);
          }
        }

        stemParts = [];
        i++; // consume CD line
        continue;
      }

      // Accumulate stem fragments (skip CD lines that appear stray)
      if (!CD_RE.test(text)) {
        stemParts.push(text);
      }
    }
  }
  return questions;
}

// ─── Extraction: ordering questions (N1.4) ────────────────────────────────────

const WORD_NUM_STARTS_RE = /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|half)/i;

function extractOrderingQuestions(slides) {
  const questions = [];

  for (const { runs } of slides) {
    let direction = null;
    const labeledItems = {};
    let pendingLabel = null;
    let pendingPartial = null;
    let temperatureItems = null;
    let pendingTemp = false;
    let inWordNumbers = false;
    const wordNumberItems = [];

    for (const rawRun of runs) {
      const run = rawRun.text.trim();
      if (!run) continue;

      // Q8: word numbers trigger
      if (/arrange these numbers in ascending order/i.test(run)) {
        inWordNumbers = true;
        if (!direction) direction = 'ascending';
        continue;
      }

      // Q8: collect word number items until a non-word-number run appears
      if (inWordNumbers) {
        if (WORD_NUM_STARTS_RE.test(run)) {
          wordNumberItems.push(run);
        } else {
          inWordNumbers = false;
        }
        continue;
      }

      // Direction detection (standalone keyword run)
      if (/^ascending$/i.test(run)) { direction = 'ascending'; continue; }
      if (/^descending$/i.test(run)) { direction = 'descending'; continue; }

      // Q2: temperature items — header and values may be in separate runs
      if (/coldest to warmest/i.test(run)) {
        const m = run.match(/:\s*(.+)$/);
        if (m && m[1].trim()) {
          temperatureItems = m[1].split(',').map(s => s.trim()).filter(Boolean);
        } else {
          pendingTemp = true;
        }
        continue;
      }
      if (pendingTemp) {
        temperatureItems = run.split(',').map(s => s.trim()).filter(Boolean);
        pendingTemp = false;
        continue;
      }

      // Pure label: "a) " (letter a-h + close-paren + optional whitespace only)
      if (/^([a-h])\)\s*$/.test(run)) {
        pendingLabel = run[0];
        pendingPartial = null;
        continue;
      }

      // Split label: "h) 3" (letter + paren + partial leading digit, no comma)
      const splitMatch = run.match(/^([a-h])\)\s*(\d+)$/);
      if (splitMatch) {
        pendingLabel = splitMatch[1];
        pendingPartial = splitMatch[2];
        continue;
      }

      // Continuation run immediately after a pending label
      if (pendingLabel !== null) {
        labeledItems[pendingLabel] = pendingPartial !== null
          ? pendingPartial + run
          : run;
        pendingLabel = null;
        pendingPartial = null;
        continue;
      }
    }

    // Emit labeled ordering questions
    if (direction) {
      for (const listStr of Object.values(labeledItems)) {
        const parts = listStr.split(',').map(s => s.trim().replace(/\s+/g, '')).filter(Boolean);
        const nums = parts.map(Number).filter(n => !isNaN(n));
        if (nums.length < 3) continue;
        const sorted = direction === 'ascending'
          ? [...nums].sort((a, b) => a - b)
          : [...nums].sort((a, b) => b - a);
        questions.push({
          stem: `List the following numbers in ${direction} order: ${parts.join(', ')}.`,
          options: parts.map(String),
          sorted: sorted.map(String),
        });
      }
    }

    // Q2: temperature ordering question
    if (temperatureItems && temperatureItems.length >= 3) {
      const tempVals = temperatureItems.map(t => ({
        label: t,
        val: parseInt(t.replace(/[^-\d]/g, ''), 10),
      }));
      const sortedTemps = [...tempVals].sort((a, b) => a.val - b.val).map(t => t.label);
      questions.push({
        stem: `Order the following temperatures from coldest to warmest: ${temperatureItems.join(', ')}.`,
        options: temperatureItems,
        sorted: sortedTemps,
      });
    }

    // Q8: word numbers ordering question
    if (wordNumberItems.length >= 3) {
      const wordVals = wordNumberItems.map(w => ({
        label: w,
        val: wordsToNumber(w),
      }));
      const sortedWords = [...wordVals].sort((a, b) => a.val - b.val).map(w => w.label);
      questions.push({
        stem: `Arrange these numbers in ascending order: ${wordNumberItems.join(', ')}.`,
        options: wordNumberItems,
        sorted: sortedWords,
      });
    }
  }

  return questions;
}

// ─── Build JSONL records ──────────────────────────────────────────────────────

function makeRef(type, n) {
  return `${skillCode}-QB-${type}-${String(n).padStart(3, '0')}`;
}

function makeRecord(ref, stem, format, answer, options, acceptedAnswers) {
  const rec = {
    source: { question_ref: ref, source_file: sourceFile },
    question: { stem, format, answer },
    skills: { primary_skill_code: skillCode },
    marking: { mark_scheme_type: 'AUTO_EXACT', accepted_answers: acceptedAnswers || [answer] },
  };
  if (options && options.length > 0) {
    rec.question.options = options;
  }
  return rec;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const slides = readSlidesRuns(pptxPath);
const allRuns = slides.flatMap((s) => s.runs);

// 1. Value-of-digit questions (N1.1-style)
const valQuestions = extractValueOfDigitQuestions(allRuns);
const valSeen = new Set();
const valUnique = valQuestions.filter((q) => {
  const key = `${q.fullNumber}|${q.underlinedDigit}`;
  if (valSeen.has(key)) return false;
  valSeen.add(key);
  return true;
});

// 2. Arrangement questions (N1.1-style)
const { greatest, smallest, differences } = extractArrangementQuestions(allRuns);
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

// 3. MCQ N1.1-style
const mcqQuestions = extractMcqQuestions(allRuns);
const mcqSeen = new Set();
const mcqUnique = mcqQuestions.filter((q) => {
  if (mcqSeen.has(q.stem)) return false;
  mcqSeen.add(q.stem);
  return true;
});

// 4. Write-as-words questions (N1.2 sections 1-4)
const wrdUnique = extractWriteAsWordsQuestions(slides);

// 5. Write-as-figures questions (N1.2 section 5)
const figUnique = extractWriteAsFiguresQuestions(slides);

// 6. N1.2-style MCQ
const mcq12Unique = extractN12McqQuestions(slides);

// 7. Inequality true/false (N1.3 slide 2 table + Q4)
const tfUnique = extractInequalityTrueFalseQuestions(slides);

// 8. Fill-blank integer inequalities (N1.3 Q8/Q9)
const blkUnique = extractFillBlankQuestions(slides);

// 9. N1.3-style Skills Check MCQ (A/B C/D two-line format)
const mcq13Unique = extractN13McqQuestions(slides);

// 10. Ordering questions (N1.4)
const ordQuestions = extractOrderingQuestions(slides);
const ordSeen = new Set();
const ordUnique = ordQuestions.filter((q) => {
  if (ordSeen.has(q.stem)) return false;
  ordSeen.add(q.stem);
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

wrdUnique.forEach((q, i) => {
  const stem = `Write the number ${q.n} in words.`;
  lines.push(makeRecord(makeRef('WRD', i + 1), stem, 'SHORT_TEXT', q.answer, null));
});

figUnique.forEach((q, i) => {
  const stem = `Write in figures: ${q.phrase}.`;
  lines.push(makeRecord(makeRef('FIG', i + 1), stem, 'NUMERIC', q.answer, null));
});

mcq12Unique.forEach((q, i) => {
  // offset MCQ ref counter past N1.1-style MCQs
  lines.push(makeRecord(makeRef('MCQ', mcqUnique.length + i + 1), q.stem, 'SINGLE_CHOICE', q.answer, q.options));
});

tfUnique.forEach((q, i) => {
  lines.push(makeRecord(makeRef('TF', i + 1), q.stem, 'TRUE_FALSE', q.answer, null));
});

blkUnique.forEach((q, i) => {
  lines.push(makeRecord(makeRef('BLK', i + 1), q.stem, 'NUMERIC', q.answer, null));
});

const mcqOffset = mcqUnique.length + mcq12Unique.length;
mcq13Unique.forEach((q, i) => {
  lines.push(makeRecord(makeRef('MCQ', mcqOffset + i + 1), q.stem, 'SINGLE_CHOICE', q.answer, q.options));
});

ordUnique.forEach((q, i) => {
  const answer = q.sorted.join(', ');
  lines.push(makeRecord(makeRef('ORD', i + 1), q.stem, 'ORDER_SEQUENCE', answer, q.options, q.sorted));
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
    mcq: mcqUnique.length + mcq12Unique.length + mcq13Unique.length,
    writeAsWords: wrdUnique.length,
    writeAsFigures: figUnique.length,
    trueFalse: tfUnique.length,
    fillBlank: blkUnique.length,
    orderSequence: ordUnique.length,
    total: lines.length,
  },
};

console.log(JSON.stringify(summary, null, 2));
