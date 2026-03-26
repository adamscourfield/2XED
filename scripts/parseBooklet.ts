/**
 * scripts/parseBooklet.ts
 *
 * Parses the Y7 HT1 English booklet PDF using GPT-4o vision.
 * For each page: renders to PNG → sends to visionChunker → collects blocks.
 * Writes results to tmp/parsed-booklet.json for human review in the teacher UI.
 *
 * Prerequisites:
 *   poppler-utils must be installed (apt-get install -y poppler-utils)
 *   OPENAI_API_KEY must be set in environment
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' scripts/parseBooklet.ts
 *
 *   # Process only pages 1-10
 *   npx ts-node ... scripts/parseBooklet.ts --page 1-10
 *
 *   # Show what would be sent without calling the API
 *   npx ts-node ... scripts/parseBooklet.ts --dry-run
 *
 *   # Overwrite existing tmp/parsed-booklet.json
 *   npx ts-node ... scripts/parseBooklet.ts --force
 *
 *   # Combine flags
 *   npx ts-node ... scripts/parseBooklet.ts --page 3-5 --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { chunkPage, type ParsedPage, type VisionBlock } from '../src/features/content-ingestion/extractors/visionChunker';

// ── Constants ─────────────────────────────────────────────────────────────────

const PDF_PATH = path.join(process.cwd(), 'Curriculum', 'English', 'Y7 HT1 BOOKLET.pdf');
const OUTPUT_PATH = path.join(process.cwd(), 'tmp', 'parsed-booklet.json');
/** Pages per second target — stay well inside GPT-4o rate limits */
const INTER_PAGE_DELAY_MS = 1500;
/** Confidence threshold below which we flag the page for priority human review */
const LOW_CONFIDENCE_THRESHOLD = 0.7;
/** DPI for pdftoppm rendering — 200dpi gives ~1650px wide for A4 */
const RENDER_DPI = 200;

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

function parsePageRange(rawArgs: string[]): { from: number; to: number } | null {
  const idx = rawArgs.indexOf('--page');
  if (idx === -1) return null;
  const val = rawArgs[idx + 1];
  if (!val) return null;
  const match = val.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid --page value "${val}". Expected e.g. "3" or "1-10".`);
  }
  const from = parseInt(match[1], 10);
  const to = match[2] ? parseInt(match[2], 10) : from;
  if (from < 1 || to < from) {
    throw new Error(`Invalid page range ${from}-${to}. Pages are 1-based and from ≤ to.`);
  }
  return { from, to };
}

const PAGE_RANGE = parsePageRange(args);

// ── Staging file type ─────────────────────────────────────────────────────────

export interface StagedBlock {
  /** Unique id scoped to this booklet: "Y7_HT1_BOOKLET_p{page}_b{block}" */
  id: string;
  pageIndex: number;
  blockType: VisionBlock['blockType'];
  text: string;
  boundingHint?: string;
  /** Per-block confidence 0–1, inferred from page-level average */
  confidence: number;
}

export interface ParsedBooklet {
  sourceFile: string;
  parsedAt: string;
  totalPages: number;
  /** Pages parsed this run (may be a subset if --page used) */
  pagesParsed: number;
  lowConfidencePages: number[];
  blocks: StagedBlock[];
}

// ── PDF → PNG renderer (via pdftoppm) ────────────────────────────────────────

/**
 * Render a single PDF page to a PNG using pdftoppm (poppler-utils).
 * Returns the page image as a base64-encoded PNG string.
 */
function renderPageToPng(pdfPath: string, pageNum: number): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anaxi-booklet-'));
  const outputPrefix = path.join(tmpDir, 'page');

  try {
    execFileSync('pdftoppm', [
      '-png',
      '-r', String(RENDER_DPI),
      '-f', String(pageNum),
      '-l', String(pageNum),
      '-singlefile',
      pdfPath,
      outputPrefix,
    ]);

    // pdftoppm writes <prefix>.png when -singlefile is used
    const outFile = `${outputPrefix}.png`;
    if (!fs.existsSync(outFile)) {
      throw new Error(`pdftoppm did not produce output for page ${pageNum}`);
    }

    const buf = fs.readFileSync(outFile);
    return buf.toString('base64');
  } finally {
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Sleep helper ──────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Merge helper (for incremental runs via --page) ────────────────────────────

function mergeIntoExisting(
  existing: ParsedBooklet,
  newBlocks: StagedBlock[],
  newLowConfPages: number[],
  pagesParsed: number,
): ParsedBooklet {
  // Remove blocks for pages being re-parsed
  const pagesParsedSet = new Set(newBlocks.map((b) => b.pageIndex));
  const retained = existing.blocks.filter((b) => !pagesParsedSet.has(b.pageIndex));
  const mergedBlocks = [...retained, ...newBlocks].sort(
    (a, b) => a.pageIndex - b.pageIndex || a.id.localeCompare(b.id),
  );

  const allLow = [
    ...existing.lowConfidencePages.filter((p) => !pagesParsedSet.has(p)),
    ...newLowConfPages,
  ].sort((a, b) => a - b);

  return {
    ...existing,
    parsedAt: new Date().toISOString(),
    pagesParsed: existing.pagesParsed + pagesParsed,
    lowConfidencePages: allLow,
    blocks: mergedBlocks,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Pre-flight checks ──────────────────────────────────────────────────────

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`PDF not found: ${PDF_PATH}`);
    console.error('Expected: Curriculum/English/Y7 HT1 BOOKLET.pdf');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY && !DRY_RUN) {
    console.error('OPENAI_API_KEY is not set. Use --dry-run to test without API calls.');
    process.exit(1);
  }

  if (fs.existsSync(OUTPUT_PATH) && !FORCE && !PAGE_RANGE) {
    console.error(
      `Output already exists: ${OUTPUT_PATH}\nUse --force to overwrite or --page N-M to extend.`,
    );
    process.exit(1);
  }

  // Ensure tmp/ directory exists
  const tmpDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // ── Get page count via pdfinfo ─────────────────────────────────────────────

  console.log(`Loading PDF: ${path.relative(process.cwd(), PDF_PATH)}`);

  let totalPages: number;
  try {
    const info = execFileSync('pdfinfo', [PDF_PATH]).toString();
    const match = info.match(/^Pages:\s*(\d+)/m);
    totalPages = match ? parseInt(match[1], 10) : 0;
    if (!totalPages) throw new Error('Could not determine page count from pdfinfo');
  } catch {
    // Fallback: render page 1 and count via pdftoppm -l with a high ceiling
    const raw = execFileSync('pdftoppm', ['-l', '999', '-f', '1', '-r', '1', PDF_PATH, '/dev/null'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // pdfinfo is the reliable path; if both fail, abort
    throw new Error(`Cannot determine PDF page count. Install poppler-utils: apt-get install -y poppler-utils\n${raw}`);
  }

  const firstPage = PAGE_RANGE?.from ?? 1;
  const lastPage = Math.min(PAGE_RANGE?.to ?? totalPages, totalPages);

  console.log(
    `PDF loaded — ${totalPages} pages total. Processing pages ${firstPage}–${lastPage}.`,
  );
  if (DRY_RUN) console.log('  [dry-run] API calls will be skipped.');

  // ── Load existing output for incremental merge ─────────────────────────────

  let existingData: ParsedBooklet | null = null;
  if (PAGE_RANGE && fs.existsSync(OUTPUT_PATH)) {
    try {
      existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) as ParsedBooklet;
      console.log(
        `Merging into existing output (${existingData.blocks.length} existing blocks).`,
      );
    } catch {
      console.warn('Could not parse existing output — will overwrite.');
    }
  }

  // ── Process pages ──────────────────────────────────────────────────────────

  const allBlocks: StagedBlock[] = [];
  const lowConfidencePages: number[] = [];
  let pagesParsed = 0;

  for (let pageNum = firstPage; pageNum <= lastPage; pageNum++) {
    process.stdout.write(`  Page ${pageNum}/${lastPage} … `);

    if (DRY_RUN) {
      console.log('skipped (dry-run)');
      continue;
    }

    try {
      // Render page to PNG via pdftoppm
      const imageBase64 = renderPageToPng(PDF_PATH, pageNum);

      // Call GPT-4o vision
      const parsed: ParsedPage = await chunkPage(imageBase64, pageNum);

      // Map to staged blocks
      for (const block of parsed.blocks) {
        const stagedId = `Y7_HT1_BOOKLET_p${pageNum}_b${block.id.split('_b')[1]}`;
        allBlocks.push({
          id: stagedId,
          pageIndex: pageNum,
          blockType: block.blockType,
          text: block.text,
          boundingHint: block.boundingHint,
          confidence: parsed.confidence,
        });
      }

      const flagged = parsed.confidence < LOW_CONFIDENCE_THRESHOLD || parsed.hasAmbiguous;
      if (flagged) lowConfidencePages.push(pageNum);

      console.log(
        `${parsed.blocks.length} blocks, confidence=${parsed.confidence.toFixed(2)}${flagged ? ' ⚠ LOW' : ''}`,
      );

      pagesParsed++;

      // Rate-limit friendly pause between pages
      if (pageNum < lastPage) await sleep(INTER_PAGE_DELAY_MS);
    } catch (err) {
      console.error(`\n  ERROR on page ${pageNum}:`, (err as Error).message);
      // Continue with remaining pages
    }
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] No output written.');
    return;
  }

  // ── Build output ───────────────────────────────────────────────────────────

  let output: ParsedBooklet;

  if (existingData && PAGE_RANGE) {
    output = mergeIntoExisting(existingData, allBlocks, lowConfidencePages, pagesParsed);
  } else {
    output = {
      sourceFile: path.basename(PDF_PATH),
      parsedAt: new Date().toISOString(),
      totalPages,
      pagesParsed,
      lowConfidencePages,
      blocks: allBlocks,
    };
  }

  // ── Write output ───────────────────────────────────────────────────────────

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\nDone.`);
  console.log(`  Pages parsed : ${pagesParsed}`);
  console.log(`  Blocks found : ${allBlocks.length}`);
  console.log(`  Low-conf pages: ${lowConfidencePages.join(', ') || 'none'}`);
  console.log(`  Output       : ${path.relative(process.cwd(), OUTPUT_PATH)}`);

  if (lowConfidencePages.length > 0) {
    console.warn(
      `\n⚠  ${lowConfidencePages.length} page(s) had confidence < ${LOW_CONFIDENCE_THRESHOLD} — review carefully in the teacher UI.`,
    );
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', (err as Error).message ?? err);
  process.exit(1);
});
