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
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import path from 'node:path';
import {
  buildExtractionResult,
  detectObjectiveHint,
  detectSubtopic,
} from './shared';
import type { ExtractionResult } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PDF_DOCUMENT_OPTIONS = { disableWorker: true };

/** Gap ≤ this (pts) between same-Y items = missing space glyph in PDF text items */
const SPACE_GLYPH_THRESHOLD_PT = 3.5;

// ─── File Buffer ─────────────────────────────────────────────────────────────

function readFileBuffer(path: string): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require('fs') as typeof import('fs');
  const buffer = readFileSync(path);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

// ─── Line Building ────────────────────────────────────────────────────────────

interface TextLine {
  text: string;
  y: number;
  fontSize: number;
  /** Character offsets of highlighted (vocab) ranges within text */
  highlightedRanges: Array<{ start: number; end: number }>;
  isLessonHeading: boolean;
  isTaskHeading: boolean;
}

/**
 * Merge TextItems that share the same Y coordinate into a single logical line.
 * Apply space-reconstruction heuristic for items with no inter-word gap.
 */
/** Merge TextItems that share the same Y coordinate into a single logical line.
 *  Apply space-reconstruction heuristic for items with no inter-word gap.
 *
 *  Max same-Y gap threshold: if two items share the same Y but are > MAX_SAME_Y_GAP
 *  points apart horizontally, they are treated as separate lines. This handles cases
 *  where PDF authoring tools split a heading across the page width (e.g. "Lesson 1:"
 *  left-aligned and "Introduction to the Gothic" right-aligned on the same baseline). */
function buildLines(items: TextItem[]): TextLine[] {
  // Group by rounded Y
  const byY = new Map<number, TextItem[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y)!.push(item);
  }

  const lines: TextLine[] = [];

  // Sort Y top-to-bottom; sort each Y-group left-to-right
  const yEntries = Array.from(byY.entries()).sort(([a], [b]) => b - a);

  for (const [, yItems] of yEntries) {
    // Sort left-to-right
    const sorted = [...yItems].sort(
      (a, b) => a.transform[4] - b.transform[4],
    );

    // ── Split into sub-lines based on horizontal gap ─────────────────────────
    // Items on the same Y but > MAX_SAME_Y_GAP apart horizontally are on
    // different visual lines (e.g. left-column text vs right-column text)
    const MAX_SAME_Y_GAP = 50; // points
    const subGroups: TextItem[][] = [];
    for (const item of sorted) {
      const prev = subGroups[subGroups.length - 1];
      if (
        prev &&
        item.transform[4] - (prev[prev.length - 1].transform[4] + (prev[prev.length - 1].width || 0)) <
          MAX_SAME_Y_GAP
      ) {
        prev.push(item);
      } else {
        subGroups.push([item]);
      }
    }

    // Process each sub-group as its own line
    for (const group of subGroups) {
      let mergedText = '';
      let lastEndX = -1;
      const highlightedRanges: TextLine['highlightedRanges'] = [];
      let highlightedStart = -1;

      for (let i = 0; i < group.length; i++) {
        const item = group[i];
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

        // Detect highlighted vocab words: first item body (x ≈ 36–50);
        // subsequent items at x > 120 = inline vocabulary definitions
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

      const fontSize = Math.round((group[0].height || 11) * 10) / 10;
      const isLessonHeading = /^Lesson \d+[:.]?\s*/i.test(mergedText);
      const isTaskHeading =
        /^((Task|Activity|Exercise|Questions?|Your turn|Think about|Check your|Try this)\b)/i.test(
          mergedText,
        );

      lines.push({
        text: mergedText,
        y: group[0].transform[5],
        fontSize,
        highlightedRanges,
        isLessonHeading,
        isTaskHeading,
      });
    }
  }

  return lines;
}

// ─── PDF Loading ─────────────────────────────────────────────────────────────

async function loadPdf(filePath: string) {
  const buffer = readFileBuffer(filePath);
  return pdfjsLib.getDocument({ data: buffer, ...PDF_DOCUMENT_OPTIONS }).promise;
}

// ─── Page Extraction ─────────────────────────────────────────────────────────

interface ExtractedPage {
  pageNumber: number;
  lines: TextLine[];
}

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

function estimateBodyFontSize(pages: ExtractedPage[]): number {
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

function groupIntoSections(pages: ExtractedPage[]): LessonSection[] {
  const sections: LessonSection[] = [];
  let current: LessonSection | null = null;

  for (const page of pages) {
    // Detect TOC/cover pages: a page whose only heading lines are
    // "Lesson N:" (table of contents entries, not actual lesson content pages)
    const lessonHeadings = page.lines.filter(l => l.isLessonHeading);
    const isTocPage =
      lessonHeadings.length >= 2 ||
      (lessonHeadings.length >= 1 &&
        page.lines.some(l => !l.isLessonHeading && /^\.{3,}$|Page\b/i.test(l.text)));

    for (const line of page.lines) {
      // TOC pages: skip non-heading lines (these are just page numbers and dot leaders)
      if (isTocPage && !line.isLessonHeading) continue;

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

      // Skip solo standalone page numbers
      if (/^\s*\d+\s*$/.test(line.text)) continue;
      if (!line.text.trim()) continue;

      let kind: PartKind;
      const text = line.text;
      const contextText = `${sectionTitle}: ${line.text}`;

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

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Extract structured content from a PDF file.
 *
 * Routes content through the shared pipeline:
 * - Questions → ExtractionResult.questions (segmented by segmentQuestionText)
 * - Lesson descriptions, vocab highlights, activities → unresolvedSegments
 *
 * For English booklets the content is richer than typical maths MCQs:
 * - Lesson headings → description
 * - Vocab lines (highlighted) → vocabulary in unresolvedSegments
 * - Task/Activity headings + body → activity in unresolvedSegments
 * - Explanatory text → description in unresolvedSegments
 * - Lines ending with ? or numbered options → question pipeline
 */
export async function extractFromPdf(
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

  // Build parts for the shared pipeline
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

  // Route through shared pipeline
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
