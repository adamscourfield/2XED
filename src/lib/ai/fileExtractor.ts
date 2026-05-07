/**
 * Shared text extraction utilities for uploaded files.
 * Supports PDF, PPTX, DOCX, and plain text/CSV.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const FILE_TEXT_LIMIT = 15_000;

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

async function extractTextFromPdf(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const { readFile } = await import('node:fs/promises');
  const buf = await readFile(filePath);
  try {
    const data = await pdfParse(buf);
    return (data.text ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

export async function extractTextFromFile(
  filePath: string,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pptx' || mimeType.includes('presentationml')) return extractTextFromPptx(filePath);
  if (ext === '.docx' || mimeType.includes('wordprocessingml')) return extractTextFromDocx(filePath);
  if (ext === '.pdf' || mimeType === 'application/pdf') return extractTextFromPdf(filePath);
  // CSV or plain text
  const { readFile } = await import('node:fs/promises');
  return (await readFile(filePath, 'utf8')).slice(0, FILE_TEXT_LIMIT);
}
