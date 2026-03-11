const ORDER_PROMPT_RE =
  /(^order\b|\bput in order\b|\barrange\b|\bascending order\b|\bdescending order\b|\bcorrect ascending order\b|\bcorrect descending order\b|\bfrom smallest to largest\b|\bfrom largest to smallest\b|\bsmallest to largest\b|\blargest to smallest\b|\bhighest to lowest\b|\blowest to highest\b|\bcoldest to warmest\b|\bwarmest to coldest\b|\bleft to right on a number line\b|\bin descending order\b|\bin ascending order\b)/i;

function cleanOrderingStem(question: string): string {
  return question
    .replace(/^\s*\[[^\]]+\]\s*/, '')
    .replace(/^\s*(?:dq|q|question)\s*\d*\s*[:\-–]\s*/i, '')
    .trim();
}

function splitOrderingValues(raw: string): string[] {
  return raw
    .split(/\s*,\s*/)
    .map((part) => part.replace(/^(?:and)\s+/i, '').replace(/[.?!]+$/g, '').trim())
    .filter(Boolean);
}

export function isOrderingPrompt(question: string): boolean {
  return ORDER_PROMPT_RE.test(cleanOrderingStem(question));
}

export function extractOrderingChoices(question: string): string[] {
  const stem = cleanOrderingStem(question);
  const candidates = [
    stem.match(/:\s*(.+?)\s*[.?!]?\s*$/)?.[1],
    stem.match(/\bfor\s+(.+?)\s*[?]?\s*$/i)?.[1],
    stem.match(/\border\s+(.+?)\s*[?]?\s*$/i)?.[1],
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  for (const candidate of candidates) {
    const values = splitOrderingValues(candidate);
    if (values.length >= 2) return values;
  }

  return [];
}
