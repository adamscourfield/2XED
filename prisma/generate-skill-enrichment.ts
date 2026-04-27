/**
 * generate-skill-enrichment.ts
 *
 * Generates AI enrichment metadata for every KS3 maths skill node and writes
 * the result to prisma/skill-enrichment.json for review before DB commit.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' \
 *     prisma/generate-skill-enrichment.ts
 *
 * Requires ANTHROPIC_API_KEY in .env (or OPENAI_API_KEY — see LLM_PROVIDER below).
 *
 * The output JSON is an array of SkillEnrichment objects keyed by skill code.
 * Review the file, edit any entries that look wrong, then run:
 *   npx ts-node ... prisma/apply-skill-enrichment.ts
 * to write to the DB.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

// ── Types ─────────────────────────────────────────────────────────────────────

interface MisconceptionEntry {
  id: string;           // e.g. "n4-2-m1" — stable, referenced by LiveAttempt.misconceptionId
  label: string;        // short name: "Multiplies numerator only"
  description: string;  // what the student is actually thinking/doing
  frequency: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface DifficultyDimension {
  dimension: string;  // e.g. "denominator_relationship"
  easy: string;       // what makes it easy
  hard: string;       // what makes it hard
}

interface TransferContext {
  context: string;   // e.g. "Recipes and scaling"
  example: string;   // a concrete example question stem
}

export interface SkillEnrichment {
  code: string;
  name: string;
  masteryDefinition: string;
  misconceptions: MisconceptionEntry[];
  difficultyDimensions: DifficultyDimension[];
  transferContexts: TransferContext[];
  generativeContext: string;
}

// ── Skill list ─────────────────────────────────────────────────────────────────
// Pulled directly from seed.ts — code + name + strand is enough for generation.

const SKILLS: { code: string; name: string; strand: string; isStretch: boolean }[] = [
  { code: 'N1.1',  name: 'Recognise the place value of each digit in whole numbers up to millions', strand: 'PV', isStretch: false },
  { code: 'N1.2',  name: 'Write integers in words and figures', strand: 'PV', isStretch: false },
  { code: 'N1.3',  name: 'Compare two numbers using =, ≠, <, >, ≤, ≥', strand: 'PV', isStretch: false },
  { code: 'N1.4',  name: 'Use and interpret inequalities in context (incl number lines and statements)', strand: 'PV', isStretch: false },
  { code: 'N1.5',  name: 'Find the median from a set of numbers (incl midpoint using a calculator)', strand: 'STA', isStretch: false },
  { code: 'N1.6',  name: 'Decimal place value', strand: 'PV', isStretch: false },
  { code: 'N1.7',  name: 'Compare decimals using =, ≠, <, >, ≤, ≥', strand: 'PV', isStretch: false },
  { code: 'N1.8',  name: 'Order a list of decimals', strand: 'PV', isStretch: false },
  { code: 'N1.9',  name: 'Position integers on a number line', strand: 'PV', isStretch: false },
  { code: 'N1.10', name: 'Rounding to the nearest 10, 100, 1000, integer', strand: 'PV', isStretch: false },
  { code: 'N1.11', name: 'Position decimals on a number line (incl midpoint using a calculator)', strand: 'PV', isStretch: false },
  { code: 'N1.12', name: 'Rounding to decimal places', strand: 'PV', isStretch: false },
  { code: 'N1.13', name: 'Position negatives on a number line', strand: 'PV', isStretch: false },
  { code: 'N1.14', name: 'Compare negatives using =, ≠, <, >, ≤, ≥', strand: 'PV', isStretch: false },
  { code: 'N1.15', name: 'Order any integers, negatives and decimals', strand: 'PV', isStretch: false },
  { code: 'N1.16', name: 'Rounding to significant figures', strand: 'PV', isStretch: true },
  { code: 'N1.17', name: 'Write 10, 100, 1000 etc. as powers of 10', strand: 'POW', isStretch: true },
  { code: 'N1.18', name: 'Write positive integers in the form A × 10^n', strand: 'POW', isStretch: true },
  { code: 'N1.19', name: 'Understand negative powers of 10', strand: 'POW', isStretch: true },
  { code: 'N1.20', name: 'Place value systems beyond base 10', strand: 'PV', isStretch: true },
  { code: 'N1.21', name: 'Extended number-line reasoning (scaled intervals and estimation)', strand: 'PV', isStretch: true },
  { code: 'N1.22', name: 'Directed numbers in context using linear scales', strand: 'PV', isStretch: true },
  { code: 'N1.23', name: 'Multi-step comparison and ordering across representations', strand: 'PV', isStretch: true },
  { code: 'N1.24', name: 'Synthesis: integers, decimals, negatives, and powers of ten on a line', strand: 'PV', isStretch: true },
  { code: 'N2.1',  name: 'Properties of addition and subtraction', strand: 'ADD', isStretch: false },
  { code: 'N2.2',  name: 'Mental strategies for addition and subtraction', strand: 'ADD', isStretch: false },
  { code: 'N2.3',  name: 'Use commutative and associative laws', strand: 'LAW', isStretch: false },
  { code: 'N2.4',  name: 'Use formal methods for addition of integers', strand: 'ADD', isStretch: false },
  { code: 'N2.5',  name: 'Use formal methods for addition of decimals', strand: 'ADD', isStretch: false },
  { code: 'N2.6',  name: 'Use formal methods for subtraction of integers', strand: 'ADD', isStretch: false },
  { code: 'N2.7',  name: 'Use formal methods for subtraction of decimals; complement of a decimal (1 − p)', strand: 'ADD', isStretch: false },
  { code: 'N2.8',  name: 'Money problems involving addition and subtraction', strand: 'ADD', isStretch: false },
  { code: 'N2.9',  name: 'Perimeter of irregular polygons', strand: 'PER', isStretch: false },
  { code: 'N2.10', name: 'Perimeter of regular polygons', strand: 'PER', isStretch: false },
  { code: 'N2.11', name: 'Perimeter of rectangles and parallelograms', strand: 'PER', isStretch: false },
  { code: 'N2.12', name: 'Perimeter of an isosceles triangle or an isosceles trapezium', strand: 'PER', isStretch: false },
  { code: 'N2.13', name: 'Perimeter of a compound shape', strand: 'PER', isStretch: false },
  { code: 'N2.14', name: 'Solve problems involving tables and timetables', strand: 'REP', isStretch: false },
  { code: 'N2.15', name: 'Solve problems with frequency trees', strand: 'REP', isStretch: false },
  { code: 'N2.16', name: 'Add and subtract numbers given in standard form', strand: 'POW', isStretch: true },
  { code: 'N3.1',  name: 'Properties of multiplication and division', strand: 'MUL', isStretch: false },
  { code: 'N3.2',  name: 'Mental strategies for multiplication and division', strand: 'MUL', isStretch: false },
  { code: 'N3.3',  name: 'Multiply and divide integers and decimals by powers of 10', strand: 'MUL', isStretch: false },
  { code: 'N3.4',  name: 'Multiplication (without carrying)', strand: 'MUL', isStretch: false },
  { code: 'N3.5',  name: 'Multiplication (with carrying)', strand: 'MUL', isStretch: false },
  { code: 'N3.6',  name: 'Area of rectangles, parallelograms, triangles and compound shapes', strand: 'ARE', isStretch: false },
  { code: 'N3.7',  name: 'Short division (without carrying)', strand: 'MUL', isStretch: false },
  { code: 'N3.8',  name: 'Short division (with carrying)', strand: 'MUL', isStretch: false },
  { code: 'N3.9',  name: 'Order of Operations (DM before AS, L→R, indices/roots, brackets, inserting brackets)', strand: 'ORD', isStretch: false },
  { code: 'N3.10', name: 'Multiples', strand: 'FAC', isStretch: false },
  { code: 'N3.11', name: 'Factors', strand: 'FAC', isStretch: false },
  { code: 'N3.12', name: 'Lowest Common Multiple', strand: 'FAC', isStretch: false },
  { code: 'N3.13', name: 'Highest Common Factor', strand: 'FAC', isStretch: false },
  { code: 'N3.14', name: 'Convert metric units', strand: 'MEA', isStretch: false },
  { code: 'N3.15', name: 'Decimal multiplication (decimal × integer)', strand: 'MUL', isStretch: false },
  { code: 'N3.16', name: 'Decimal multiplication (decimal × decimal)', strand: 'MUL', isStretch: false },
  { code: 'N3.17', name: 'Multiply by 0.1 and 0.01', strand: 'MUL', isStretch: true },
  { code: 'N3.18', name: 'Short division (remainders)', strand: 'MUL', isStretch: false },
  { code: 'N3.19', name: 'Short division (decimal answers)', strand: 'MUL', isStretch: false },
  { code: 'N3.20', name: 'Divide decimals (by an integer / by a decimal; incl ÷0.1, ÷0.2, ÷0.5 etc.)', strand: 'MUL', isStretch: true },
  { code: 'N3.21', name: 'Find missing lengths given area (rectangles, parallelograms, triangles and compound shapes)', strand: 'ARE', isStretch: false },
  { code: 'N3.22', name: 'Solve problems using the mean', strand: 'STA', isStretch: false },
  { code: 'N3.23', name: 'Square and cube numbers, roots', strand: 'SQR', isStretch: false },
  { code: 'N3.24', name: 'Introduction to primes', strand: 'FAC', isStretch: false },
  { code: 'N4.1',  name: 'Understand a fraction as part of a whole and locate simple fractions on a number line', strand: 'FDP', isStretch: false },
  { code: 'N4.2',  name: 'Generate equivalent fractions', strand: 'FDP', isStretch: false },
  { code: 'N4.3',  name: 'Simplify a fraction using factors/HCF', strand: 'FDP', isStretch: false },
  { code: 'N4.4',  name: 'Convert a fraction to a decimal (terminating decimals)', strand: 'FDP', isStretch: false },
  { code: 'N4.5',  name: 'Convert a decimal to a fraction (simple/terminating)', strand: 'FDP', isStretch: false },
  { code: 'N4.6',  name: 'Convert a decimal to a percentage and a percentage to a decimal', strand: 'FDP', isStretch: false },
  { code: 'N4.7',  name: 'Convert a fraction to a percentage (via decimal or equivalence to /100)', strand: 'FDP', isStretch: false },
  { code: 'N4.8',  name: 'Compare and order fractions, decimals and percentages', strand: 'FDP', isStretch: false },
  { code: 'N4.9',  name: 'Find a percentage of an amount (using non-calculator-friendly methods)', strand: 'FDP', isStretch: false },
  { code: 'N5.1',  name: 'Concept of a fraction — shading shapes, bar models, placing on a number line', strand: 'FRA', isStretch: false },
  { code: 'N5.2',  name: 'Equivalent fractions: generating, showing equivalence, finding missing numbers', strand: 'FRA', isStretch: false },
  { code: 'N5.3',  name: 'Place fractions on a number line; compare and order fractions', strand: 'FRA', isStretch: false },
  { code: 'N5.4',  name: 'Simplify fractions', strand: 'FRA', isStretch: false },
  { code: 'N5.5',  name: 'Express one quantity as a fraction of another', strand: 'FRA', isStretch: false },
  { code: 'N5.6',  name: 'Convert between mixed numbers and improper fractions; write integers as fractions', strand: 'FRA', isStretch: false },
  { code: 'N5.7',  name: 'Add fractions (same then different denominators)', strand: 'FRA', isStretch: false },
  { code: 'N5.8',  name: 'Subtract fractions (same then different denominators)', strand: 'FRA', isStretch: false },
  { code: 'N5.9',  name: 'Add fractions with mixed numbers (same then different denominators)', strand: 'FRA', isStretch: false },
  { code: 'N5.10', name: 'Subtract fractions with mixed numbers (same then different denominators)', strand: 'FRA', isStretch: false },
  { code: 'N5.11', name: 'Fractions with negatives (addition and subtraction)', strand: 'FRA', isStretch: true },
  { code: 'N5.12', name: 'Order of operations with fractions (addition and subtraction, no multiply/divide)', strand: 'FRA', isStretch: true },
  { code: 'A1.1',  name: 'Algebraic terminology (e.g. term, expression, coefficient)', strand: 'ALG', isStretch: false },
  { code: 'A1.2',  name: 'Algebraic notation and basic collecting like terms (juxtaposition, index, fraction)', strand: 'ALG', isStretch: false },
  { code: 'A1.3',  name: 'Substitution into expressions', strand: 'ALG', isStretch: false },
  { code: 'A1.4',  name: 'Simplify expressions by collecting like terms', strand: 'ALG', isStretch: false },
  { code: 'A1.5',  name: 'Multiply a single term over a bracket (expand)', strand: 'ALG', isStretch: false },
  { code: 'A1.6',  name: 'Factorise by taking out a common factor', strand: 'ALG', isStretch: false },
  { code: 'A1.7',  name: 'Write expressions and formulae from worded descriptions', strand: 'ALG', isStretch: false },
  { code: 'A1.8',  name: 'Solve one-step linear equations', strand: 'ALG', isStretch: false },
  { code: 'A1.9',  name: 'Solve two-step linear equations', strand: 'ALG', isStretch: false },
  { code: 'A1.10', name: 'Solve equations with unknowns on both sides', strand: 'ALG', isStretch: false },
  { code: 'A1.11', name: 'Solve equations involving brackets', strand: 'ALG', isStretch: false },
  { code: 'A1.12', name: 'Generate terms of a sequence from a term-to-term rule', strand: 'SEQ', isStretch: false },
  { code: 'A1.13', name: 'Generate terms of a sequence from a position-to-term (nth term) rule', strand: 'SEQ', isStretch: false },
  { code: 'A1.14', name: 'Find the nth term rule for a linear sequence', strand: 'SEQ', isStretch: false },
  { code: 'A1.15', name: 'Recognise and use sequences of triangular, square and cube numbers', strand: 'SEQ', isStretch: false },
  { code: 'A1.16', name: 'Use coordinates in all four quadrants', strand: 'GRA', isStretch: false },
  { code: 'A1.17', name: 'Plot and interpret straight-line graphs (y = mx + c)', strand: 'GRA', isStretch: false },
  { code: 'A1.18', name: 'Inequalities on a number line (integer solutions)', strand: 'ALG', isStretch: true },
  { code: 'A1.19', name: 'Form and solve equations from context (word problems)', strand: 'ALG', isStretch: true },
  { code: 'G1.1',  name: 'Identify and name types of angles (acute, right, obtuse, reflex)', strand: 'GEO', isStretch: false },
  { code: 'G1.1b', name: 'Understand angle notation (e.g. ∠ABC) and label angles correctly', strand: 'GEO', isStretch: false },
  { code: 'G1.2',  name: 'Measure angles with a protractor', strand: 'GEO', isStretch: false },
  { code: 'G1.3',  name: 'Draw angles with a protractor', strand: 'GEO', isStretch: false },
  { code: 'G1.4',  name: 'Angles on a straight line sum to 180°', strand: 'GEO', isStretch: false },
  { code: 'G1.5',  name: 'Angles around a point sum to 360°', strand: 'GEO', isStretch: false },
  { code: 'G1.6',  name: 'Vertically opposite angles are equal', strand: 'GEO', isStretch: false },
  { code: 'G1.7',  name: 'Angles in a triangle sum to 180°', strand: 'GEO', isStretch: false },
  { code: 'G1.8',  name: 'Angles in a quadrilateral sum to 360°', strand: 'GEO', isStretch: false },
  { code: 'G1.9',  name: 'Interior angle sum of any polygon', strand: 'GEO', isStretch: false },
  { code: 'G1.10', name: 'Exterior angles of any polygon sum to 360°; regular polygon calculations', strand: 'GEO', isStretch: true },
  { code: 'N6.1',  name: 'Multiply a fraction by an integer', strand: 'FDP', isStretch: false },
  { code: 'N6.2',  name: 'Multiply a fraction by a fraction', strand: 'FDP', isStretch: false },
  { code: 'N6.3',  name: 'Divide a fraction by an integer', strand: 'FDP', isStretch: false },
  { code: 'N6.4',  name: 'Divide an integer by a fraction', strand: 'FDP', isStretch: false },
  { code: 'N6.5',  name: 'Divide a fraction by a fraction', strand: 'FDP', isStretch: false },
  { code: 'N6.6',  name: 'Multiply and divide with mixed numbers', strand: 'FDP', isStretch: false },
  { code: 'N6.7',  name: 'Order of operations with fractions (all four operations)', strand: 'FDP', isStretch: false },
  { code: 'N6.8',  name: 'Convert a recurring decimal to a fraction', strand: 'FDP', isStretch: true },
  { code: 'N6.9',  name: 'Recognise recurring decimals from fraction division', strand: 'FDP', isStretch: false },
  { code: 'N6.10', name: 'Find a percentage of an amount (with a calculator)', strand: 'FDP', isStretch: false },
  { code: 'N6.11', name: 'Express one quantity as a percentage of another', strand: 'FDP', isStretch: false },
  { code: 'N6.12', name: 'Percentage increase and decrease', strand: 'FDP', isStretch: false },
  { code: 'N6.13', name: 'Find the original value after a percentage change (reverse percentages)', strand: 'FDP', isStretch: false },
  { code: 'N6.14', name: 'Repeated percentage change (compound interest, depreciation)', strand: 'FDP', isStretch: true },
  { code: 'N6.15', name: 'Express one number as a fraction or percentage of another in context', strand: 'FDP', isStretch: false },
  { code: 'N6.16', name: 'Use ratio notation; simplify ratios', strand: 'RAT', isStretch: false },
  { code: 'N6.17', name: 'Share a quantity in a given ratio', strand: 'RAT', isStretch: false },
  { code: 'N6.18', name: 'Use the unitary method for ratio and proportion problems', strand: 'RAT', isStretch: false },
  { code: 'N6.19', name: 'Convert between fractions, decimals and percentages (including recurring)', strand: 'FDP', isStretch: false },
  { code: 'N6.20', name: 'Solve problems involving FDP in context (best buy, discounts, profit/loss)', strand: 'FDP', isStretch: false },
  { code: 'S1.1',  name: 'Use the vocabulary of probability and the probability scale', strand: 'PRO', isStretch: false },
  { code: 'S1.2',  name: 'Understand that probabilities sum to 1 (using fractions, decimals and percentages)', strand: 'PRO', isStretch: false },
  { code: 'S1.3',  name: 'Calculate the probability of a single event', strand: 'PRO', isStretch: false },
  { code: 'S1.4',  name: 'Construct sample space diagrams for two events', strand: 'PRO', isStretch: false },
  { code: 'S1.5',  name: 'Calculate probabilities from sample space diagrams for two events', strand: 'PRO', isStretch: false },
  { code: 'S1.6',  name: 'Identify and represent sets', strand: 'PRO', isStretch: false },
  { code: 'S1.7',  name: 'Create Venn diagrams where all information is given', strand: 'PRO', isStretch: false },
  { code: 'S1.8',  name: 'Interpret Venn diagrams where all information is given', strand: 'PRO', isStretch: false },
  { code: 'S1.9',  name: 'Understand the intersection of sets to interpret and create Venn diagrams', strand: 'PRO', isStretch: false },
  { code: 'S1.10', name: 'Understand the union of sets to interpret and create Venn diagrams', strand: 'PRO', isStretch: false },
  { code: 'S1.11', name: 'Calculate probability from Venn diagrams', strand: 'PRO', isStretch: false },
  { code: 'S1.12', name: 'The complement of a set', strand: 'PRO', isStretch: true },
];

// ── LLM call ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert KS3 maths teacher and curriculum designer.
Your job is to produce structured enrichment metadata for a single KS3 maths skill node.
This metadata will be used to:
  1. Constrain AI question generation at runtime (masteryDefinition, misconceptions, difficultyDimensions, transferContexts)
  2. Provide a rich prose briefing for the generation model (generativeContext)
  3. Tag student errors in live sessions so teachers see "6 students → misconception X" not just "6 students wrong"

CRITICAL requirements:
- misconception ids must be stable kebab-case strings: e.g. "n4-2-m1", "n4-2-m2"
  Use the pattern: {strand-code-lowercase}-m{number}, e.g. for skill N4.2: "n4-2-m1"
- misconceptions must be the real, specific errors Year 7 students actually make — not vague generalisations
- difficultyDimensions must name concrete, queryable parameters — not adjectives like "complex"
- transferContexts must include a concrete example question stem, not just a category name
- generativeContext must be dense and specific — assume the reader is a capable model, not a human teacher

Respond with valid JSON only. No markdown. No explanation. No wrapper object.
Respond with a JSON array containing exactly one object matching this TypeScript type:

interface MisconceptionEntry {
  id: string;
  label: string;
  description: string;
  frequency: "HIGH" | "MEDIUM" | "LOW";
}

interface DifficultyDimension {
  dimension: string;
  easy: string;
  hard: string;
}

interface TransferContext {
  context: string;
  example: string;
}

interface SkillEnrichment {
  code: string;
  name: string;
  masteryDefinition: string;
  misconceptions: MisconceptionEntry[];
  difficultyDimensions: DifficultyDimension[];
  transferContexts: TransferContext[];
  generativeContext: string;
}`;

function buildUserPrompt(skill: typeof SKILLS[0]): string {
  return `Skill code: ${skill.code}
Skill name: ${skill.name}
Strand: ${skill.strand}
Is stretch: ${skill.isStretch}

Generate the SkillEnrichment object for this skill.
Misconception ids should follow the pattern: ${skill.code.toLowerCase().replace('.', '-')}-m1, ${skill.code.toLowerCase().replace('.', '-')}-m2, etc.
Include 2–4 misconceptions, 2–3 difficulty dimensions, and 2–3 transfer contexts.`;
}

async function callAnthropic(skill: typeof SKILLS[0]): Promise<SkillEnrichment> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in .env');

  const body = {
    model: 'claude-opus-4-6',
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(skill) }],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const json = await res.json() as { content: Array<{ type: string; text: string }> };
  const text = json.content.find(b => b.type === 'text')?.text ?? '';

  // Parse — model returns a single-element array
  const parsed = JSON.parse(text.trim());
  const enrichment: SkillEnrichment = Array.isArray(parsed) ? parsed[0] : parsed;
  enrichment.code = skill.code; // ensure correct even if model hallucinates
  enrichment.name = skill.name;
  return enrichment;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const OUTPUT_PATH = path.join(__dirname, 'skill-enrichment.json');
const CONCURRENCY = 5;   // parallel calls
const DELAY_MS   = 200;  // between batches

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  // Resume from existing output if interrupted
  let existing: Record<string, SkillEnrichment> = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    const raw = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) as SkillEnrichment[];
    existing = Object.fromEntries(raw.map(e => [e.code, e]));
    console.log(`Resuming — ${Object.keys(existing).length} skills already done.`);
  }

  const todo = SKILLS.filter(s => !existing[s.code]);
  console.log(`Generating enrichment for ${todo.length} skills (${CONCURRENCY} at a time)...`);

  const results: SkillEnrichment[] = Object.values(existing);

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(skill => callAnthropic(skill))
    );

    for (let j = 0; j < batch.length; j++) {
      const skill = batch[j];
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        results.push(result.value);
        console.log(`  ✓ ${skill.code} — ${skill.name}`);
      } else {
        console.error(`  ✗ ${skill.code} — ${result.reason}`);
      }
    }

    // Write incrementally so a crash doesn't lose progress
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));

    if (i + CONCURRENCY < todo.length) await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${results.length}/${SKILLS.length} skills enriched.`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`\nReview the file, then run: npx ts-node ... prisma/apply-skill-enrichment.ts`);
}

main().catch(err => { console.error(err); process.exit(1); });
