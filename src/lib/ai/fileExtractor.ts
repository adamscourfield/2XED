/**
 * Shared text extraction utilities for uploaded files.
 * Supports PDF, PPTX, DOCX, and plain text/CSV.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const FILE_TEXT_LIMIT = 15_000;

/** What was (and wasn't) captured from an uploaded file, for teacher review. */
export interface ExtractionStats {
  /** 'pptx' | 'docx' | 'pdf' | 'text' */
  format: string;
  totalChars: number;
  /** Slides for PPTX, pages for PDF; null when not applicable/known. */
  unitCount: number | null;
  unitLabel: 'slides' | 'pages' | null;
  /** Embedded images detected in the file — these are NOT imported (text only). */
  imageCount: number;
}

export interface ExtractionResult {
  text: string;
  stats: ExtractionStats;
}

const IMAGE_ENTRY_RE = /\.(png|jpe?g|gif|bmp|tiff?|emf|wmf|svg)$/i;

function countImageEntries(filePath: string, mediaDir: RegExp): number {
  return listZipEntries(filePath, mediaDir).filter((entry) => IMAGE_ENTRY_RE.test(entry)).length;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function readZipEntry(filePath: string, entry: string): string {
  try {
    return execFileSync('unzip', ['-p', filePath, entry], { encoding: 'utf8' });
  } catch {
    return '';
  }
}

function listZipEntries(filePath: string, pattern: RegExp): string[] {
  try {
    return execFileSync('unzip', ['-Z1', filePath], { encoding: 'utf8' })
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => pattern.test(l));
  } catch {
    return [];
  }
}

function extractTextFromPptx(filePath: string): string {
  const entries = listZipEntries(filePath, /^ppt\/slides\/slide\d+\.xml$/).sort((a, b) => {
    return (
      Number(a.match(/slide(\d+)/)?.[1] ?? 0) - Number(b.match(/slide(\d+)/)?.[1] ?? 0)
    );
  });
  return entries
    .map((entry) => {
      const xml = readZipEntry(filePath, entry);
      const runs: string[] = [];
      const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        const t = decodeXmlEntities(m[1]).trim();
        if (t) runs.push(t);
      }
      return runs.join(' ');
    })
    .filter(Boolean)
    .join('\n\n');
}

function extractTextFromDocx(filePath: string): string {
  const xml = readZipEntry(filePath, 'word/document.xml');
  if (!xml) return '';
  const runs: string[] = [];
  const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const t = decodeXmlEntities(m[1]);
    if (t.trim()) runs.push(t);
  }
  return runs.join(' ').replace(/\s+/g, ' ').trim();
}

async function extractTextFromPdf(filePath: string): Promise<{ text: string; pageCount: number | null }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages?: number }>;
  const { readFile } = await import('node:fs/promises');
  const buf = await readFile(filePath);
  try {
    const data = await pdfParse(buf);
    return {
      text: (data.text ?? '').replace(/\s+/g, ' ').trim(),
      pageCount: typeof data.numpages === 'number' ? data.numpages : null,
    };
  } catch {
    return { text: '', pageCount: null };
  }
}

export async function extractFileWithStats(
  filePath: string,
  mimeType: string,
  fileName: string,
): Promise<ExtractionResult> {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === '.pptx' || mimeType.includes('presentationml')) {
    const slideEntries = listZipEntries(filePath, /^ppt\/slides\/slide\d+\.xml$/);
    const text = extractTextFromPptx(filePath);
    return {
      text,
      stats: {
        format: 'pptx',
        totalChars: text.length,
        unitCount: slideEntries.length,
        unitLabel: 'slides',
        imageCount: countImageEntries(filePath, /^ppt\/media\//),
      },
    };
  }

  if (ext === '.docx' || mimeType.includes('wordprocessingml')) {
    const text = extractTextFromDocx(filePath);
    return {
      text,
      stats: {
        format: 'docx',
        totalChars: text.length,
        unitCount: null,
        unitLabel: null,
        imageCount: countImageEntries(filePath, /^word\/media\//),
      },
    };
  }

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    const { text, pageCount } = await extractTextFromPdf(filePath);
    return {
      text,
      stats: {
        format: 'pdf',
        totalChars: text.length,
        unitCount: pageCount,
        unitLabel: 'pages',
        imageCount: 0,
      },
    };
  }

  // CSV or plain text
  const { readFile } = await import('node:fs/promises');
  const text = (await readFile(filePath, 'utf8')).slice(0, FILE_TEXT_LIMIT);
  return {
    text,
    stats: { format: 'text', totalChars: text.length, unitCount: null, unitLabel: null, imageCount: 0 },
  };
}

export async function extractTextFromFile(
  filePath: string,
  mimeType: string,
  fileName: string,
): Promise<string> {
  return (await extractFileWithStats(filePath, mimeType, fileName)).text;
}
