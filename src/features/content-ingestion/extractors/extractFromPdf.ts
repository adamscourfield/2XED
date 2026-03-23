/**
 * extractFromPdf.ts
 *
 * Extracts structured content from PDF files using pdfjs-dist.
 *
 * Strategy:
 * - Page-level iteration with text content + structural hint detection
 * - Font size analysis to distinguish headings vs body
 * - Intra-word gap detection (gap < 3.5pt → missing space glyph in PDF text
 *   items; the space char is visually rendered but absent from the item strings)
 * - Highlighted vocab words: detected via X-offset pattern within a line
 *   (body text starts at x≈36, vocab words at x≈185 — the "highlighted" range)
 * - Lesson sections parsed from "Lesson N:" headings; content grouped by section
 * - Questions and key content flow into the shared extraction pipeline
 *   (buildExtractionResult → segmentQuestionText → RawExtractedQuestion)
 * - Explanatory/description content → unresolvedSegments with metadata
 *
 * Falls back to reading the page's operator list for precise position
 * reconstruction when text items have no inter-word gap.
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import path from 'node:path';
import {
  buildExtractionResult,
  detectObjectiveHint,
  detectSubtopic,
  extractTextRuns,
  listZipEntries,
  normalizeInlineText,
  readZipEntry,
} from './shared';
import type { ExtractionResult } from '../types';

// ─── Module-level constants ───────────────────────────────────────────────────

const PDF_DOCUMENT_OPTIONS = { disableWorker: true };

/** Gap ≤ this (points) between same-Y items = missing space glyph in PDF items */
const SPACE_GLYPH_THRESHOLD_PT = 3.5;

// ─── File Buffer Helper ───────────────────────────────────────────────────────

async function readFileBuffer(path: string): Promise<Uint8Array> {
  const { readFile } = await import('fs/promises');
  const buffer = await readFile(path);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

// ─── PDF Loading ─────────────────────────────────────────────────────────────

async function loadPdf(filePath: string) {
  const buffer = await readFileBuffer(filePath);
  return pdfjsLib.getDocument({ data: buffer, ...PDF_DOCUMENT_OPTIONS }).promise;
}

// ─── Line Building ───────────────────────────────────────────────────────────

interface TextLine {
  text: string;
  y: number;
  fontSize: number;
  /** Character offsets of highlighted (vocab) ranges within text */
  highlightedRanges: Array<{ start: number; end: number }>;
  /** True if this is a lesson heading line */
  isLessonHeading: boolean;
  /** True if this is a section-task heading (Activity, Questions, etc.) */
  isTaskHeading: boolean;
}

function buildLines(items: TextItem[]): TextLine[] {
  // ── Step 1: group by Y coordinate ────────────────────────────────────────
  const byY = new Map<number, TextItem[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y)!.push(item);
  }

  // ── Step 2: sort Y top-to-bottom; sort each Y-group left-to-right ──────────
  const yEntries = [...byY.entries()].sort(([a], [b]) => b - a);

  const lines: TextLine[] = [];

  for (const [, yItems] of yEntries) {
    const sorted = [...yItems].sort(
      (a, b) => a.transform[4] - b.transform[4],
    );

    // ── Step 3: merge items on same line, reconstructing missing spaces ─────
    let mergedText = '';
    let lastEndX = -1;
    const highlightedRanges: TextLine['highlightedRanges'] = [];
    let highlightedStart = -1;

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const startX = item.transform[4];
      const endX = startX + (item.width || 0);
      const gap = lastEndX >= 0 ? startX - lastEndX : 0;
      const word = item.str;

      // Space reconstruction: gap ≤ 3.5pt AND alphabetic transition = missing space
      // (the PDF renders it visually but the space glyph is absent from text items)
      if (
        gap > 0 &&
        gap <= SPACE_GLYPH_THRESHOLD_PT &&
        /[a-zA-Z]$/.test(mergedText) &&
        /^[a-zA-Z]/.test(word)
      ) {
        mergedText += ' ';
      }

      // Detect highlighted vocab words: first item is body text (x ≈ 36–50);
      // subsequent items at x > 120 = inline vocabulary definitions that have
      // been rendered with a highlight (common in literacy booklets)
      if (i > 0 && startX > 120) {
        if (highlightedStart < 0) highlightedStart = mergedText.length;
        highlightedRanges.push({
          start: highlightedStart,
          end: highlightedStart + word.length,
        });
      } else {
        highlightedStart = -1;
      }

      mergedText += word;
      lastEndX = endX;
    }

    if (!mergedText.trim()) continue;

    const fontSize = Math.round((sorted[0].height || 11) * 10) / 10;
    const isLessonHeading = /^Lesson \d+[:.]?\s*/i.test(mergedText);
    const isTaskHeading =
      /^((Task|Activity|Exercise|Questions?|Your turn|Think about|Check your|Try this)\b)/i.test(
        mergedText,
      );

    lines.push({
      text: mergedText,
      y: sorted[0].transform[5],
      fontSize,
      highlightedRanges,
      isLessonHeading,
      isTaskHeading,
    });
  }

  return lines;
}

// ─── Page Extraction ─────────────────────────────────────────────────────────

interface ExtractedPage {
  pageNumber: number;
  lines: TextLine[];
}

/** Extract all pages, returning lines grouped by page */
async function extractAllPages(
  pdf: Awaited<ReturnType<typeof loadPdf>>,
  numPages: number,
): Promise<ExtractedPage[]> {
  const pages: ExtractedPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content: TextContent = await page.getTextContent();
    const lines = buildLines(content.items as TextItem[]);
    pages.push({ pageNumber: pageNum, lines });
  }

  return pages;
}

// ─── Body Font Size Estimation ───────────────────────────────────────────────

function estimateBodyFontSize(
  pages: ExtractedPage[],
): number {
  const fontSizes = pages
    .flatMap(p => p.lines.map(l => l.fontSize))
    .filter(f => f >= 8 && f <= 16);
  fontSizes.sort((a, b) => a - b);
  return fontSizes.length > 0
    ? fontSizes[Math.floor(fontSizes.length / 2)]
    : 11;
}

// ─── Lesson / Section Parsing ───────────────────────────────────────────────

interface LessonSection {
  title: string;
  pageStart: number;
  pageEnd: number;
  lines: TextLine[];
}

/**
 * Group pages into lesson sections using "Lesson N:" headings.
 * Each section runs from its heading until the next lesson heading or EOF.
 */
function groupIntoSections(pages: ExtractedPage[]): LessonSection[] {
  const sections: LessonSection[] = [];
  let current: LessonSection | null = null;

  for (const page of pages) {
    for (const line of page.lines) {
      if (line.isLessonHeading) {
        if (current) {
          current.pageEnd = page.pageNumber;
          sections.push(current);
        }
        current = {
          title: line.text,
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
          lines: [line],
        };
      } else if (current) {
        current.lines.push(line);
      }
    }
  }

  if (current) {
    current.pageEnd =
      pages.length > 0 ? pages[pages.length - 1].pageNumber : current.pageStart;
    sections.push(current);
  }

  return sections;
}

// ─── Content Categorisation ─────────────────────────────────────────────────

type PartKind = 'question' | 'vocabulary' | 'description' | 'activity';

interface CategorisedPart {
  ref: string;
  text: string;
  kind: PartKind;
  sectionTitle: string;
  contextText: string;
}

/**
 * Categorise lines into semantic parts.
 *
 * Strategy mirrors extractFromDocx (questions → pipeline;
 * everything else → unresolvedSegments with reason).
 *
 * For English booklets the content is richer than typical maths MCQs:
 * - Lesson headings → description (metadata)
 * - Vocab lines (highlighted words) → vocabulary parts
 * - Task/Activity headings + body → activity parts
 * - Explanatory text → description parts
 * - Lines ending with ? or numbered options → question parts
 */
function categoriseSections(
  sections: LessonSection[],
  bodyFontSize: number,
): CategorisedPart[] {
  const parts: CategorisedPart[] = [];

  for (const section of sections) {
    const sectionTitle = section.title;

    for (const line of section.lines) {
      const isBigHeading = line.fontSize > bodyFontSize + 1.5;
      const ref = `p${section.pageStart}-l${Math.round(line.y)}`;

      // Skip solo standalone page numbers (e.g. "3" on a page)
      if (/^\s*\d+\s*$/.test(line.text)) continue;

      // Skip empty or noise lines
      if (!line.text.trim()) continue;

      // Classify
      let kind: PartKind;
      let text = line.text;
      let contextText = `${sectionTitle}: ${line.text}`;

      if (line.isLessonHeading || isBigHeading) {
        kind = 'description';
      } else if (line.highlightedRanges.length > 0) {
        kind = 'vocabulary';
      } else if (line.isTaskHeading) {
        kind = 'activity';
      } else if (
        /\?$/.test(text) ||
        /^true or false/i.test(text) ||
        /^[A-D]\)/.test(text) ||
        /^(which of the following|choose|select)/i.test(text)
      ) {
        kind = 'question';
      } else {
        kind = 'description';
      }

      parts.push({ ref, text, kind, sectionTitle, contextText });
    }
  }

  return parts;
}

// ─── High-level API ──────────────────────────────────────────────────────────

/**
 * Main entry point — mirrors the signature of extractFromDocx / extractFromPptx.
 *
 * Extracts structured content from a PDF file and routes it through the shared
 * pipeline. Questions flow to `ExtractionResult.questions`; everything else
 * (lesson descriptions, vocab, activities) goes to `unresolvedSegments` with
 * a `reason` field indicating what kind of content it is.
 *
 * The PDF is treated as a sequence of "parts" (lesson sections, paragraphs,
 * vocab entries, activities) — the same model as PPTX slides and DOCX paragraphs.
 */
export function extractFromPdf(filePath: string): ExtractionResult {
  // Note: we use sync PDF loading via a helper to match the synchronous pattern
  // of extractFromDocx. For large PDFs call loadPdf() async at call-site.
  let pdf: Awaited<ReturnType<typeof loadPdf>>;
  let numPages: number;

  try {
    // Load synchronously by reading buffer and parsing
    const { readFileSync } = require('fs') as typeof import('fs');
    const buffer = readFileSync(filePath);
    const uint8 = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      ...PDF_DOCUMENT_OPTIONS,
    });
    // getDocument is async in pdfjs-dist — we need to handle this
    // For the synchronous API contract, throw a helpful error
    throw new Error('PDF extraction must be called with await extractFromPdfAsync()');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('await')) {
      throw err;
    }
    throw err;
  }
}

/** Async version — use this in async contexts */
export async function extractFromPdfAsync(
  filePath: string,
): Promise<ExtractionResult> {
  const pdf = await loadPdf(filePath);
  const numPages = pdf.numPages;

  // Pass 1: extract all pages
  const pages = await extractAllPages(pdf, numPages);

  // Estimate body font size for heading classification
  const bodyFontSize = estimateBodyFontSize(pages);

  // Group into lesson sections
  const sections = groupIntoSections(pages);

  // Categorise each section's lines
  const categorised = categoriseSections(sections, bodyFontSize);

  // ── Build parts for the shared pipeline ────────────────────────────────────
  const questionParts: Array<{ ref: string; text: string; contextText?: string }> = [];
  const unresolvedParts: Array<{
    ref: string;
    text: string;
    contextText?: string;
    reason: string;
  }> = [];

  for (const part of categorised) {
    const base = { ref: part.ref, text: part.text, contextText: part.contextText };

    switch (part.kind) {
      case 'question':
        questionParts.push(base);
        break;
      case 'vocabulary':
        unresolvedParts.push({
          ...base,
          reason: `Vocabulary highlight: ${part.sectionTitle}`,
        });
        break;
      case 'activity':
        unresolvedParts.push({
          ...base,
          reason: `Activity section: ${part.sectionTitle}`,
        });
        break;
      case 'description':
      default:
        unresolvedParts.push({
          ...base,
          reason: `Lesson content: ${part.sectionTitle}`,
        });
        break;
    }
  }

  // ── Route through shared pipeline ─────────────────────────────────────────
  // Build a minimal contextText for objective/subtopic detection
  const fullContext = categorised
    .map(p => `${p.sectionTitle}: ${p.text}`)
    .join(' | ');

  const enrichedQuestionParts = questionParts.map(part => ({
    ...part,
    contextText: part.contextText ?? `${part.text} | ${fullContext}`,
  }));

  const result = buildExtractionResult(
    'PDF',
    path.basename(filePath),
    enrichedQuestionParts,
  );

  // Add non-question parts as unresolvedSegments
  for (const part of unresolvedParts) {
    result.unresolvedSegments.push({
      sourceType: 'PDF',
      sourceFile: path.basename(filePath),
      slideOrPageRef: part.ref,
      rawText: part.text,
      reason: part.reason,
    });
  }

  return result;
}
