const ORDER_PROMPT_RE =
  /(\border\b|\bput in order\b|\barrange\b|\bascending order\b|\bdescending order\b|\bcorrect ascending order\b|\bcorrect descending order\b|\bfrom smallest to largest\b|\bfrom largest to smallest\b|\bsmallest to largest\b|\blargest to smallest\b|\bhighest to lowest\b|\blowest to highest\b|\bcoldest to warmest\b|\bwarmest to coldest\b|\bleft to right on a number line\b|\bin descending order\b|\bin ascending order\b)/i;

const WRONG_ORDER_RE = /\bwrong\s+order\b|\bincorrect\s+order\b/i;

const STRONG_ORDER_SIGNAL_RE =
  /\bput in order\b|\barrange\b|\bascending order\b|\bdescending order\b|\bfrom smallest to largest\b|\bfrom largest to smallest\b|\bsmallest to largest\b|\blargest to smallest\b|\bhighest to lowest\b|\blowest to highest\b|\bin ascending order\b|\bin descending order\b/i;

function cleanOrderingStem(question: string): string {
  return question
    .replace(/^\s*\[[^\]]+\]\s*/, '')
    .replace(/^\s*(?:dq|q|question)\s*\d*\s*[:\-–]\s*/i, '')
    .trim();
}

function splitOrderingValues(raw: string): string[] {
  return raw
    .split(/\s*,\s*|\s+and\s+/i)
    .map((part) => part.replace(/^(?:and)\s+/i, '').replace(/[.?!]+$/g, '').trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function extractComparableTokens(question: string): string[] {
  const numericLike = question.match(/[-+]?\d[\d,]*(?:\.\d+)?(?:°[CF])?/gi) ?? [];
  if (numericLike.length >= 2) {
    return unique(numericLike.map((token) => token.trim().replace(/[.?!]+$/g, '')));
  }

  const quoted = [...question.matchAll(/"([^"]+)"|'([^']+)'/g)]
    .map((match) => (match[1] ?? match[2] ?? '').trim())
    .filter(Boolean);
  if (quoted.length >= 2) return unique(quoted);

  return [];
}

export function isOrderingPrompt(question: string): boolean {
  const stem = cleanOrderingStem(question);
  if (WRONG_ORDER_RE.test(stem)) {
    return STRONG_ORDER_SIGNAL_RE.test(stem);
  }
  return ORDER_PROMPT_RE.test(stem);
}

export function extractOrderingChoices(question: string, answer?: string): string[] {
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

  const fromStem = extractComparableTokens(stem);
  if (fromStem.length >= 2) return fromStem;

  if (answer) {
    const fromAnswer = splitOrderingValues(answer.replace(/\|/g, ','));
    if (fromAnswer.length >= 2) return unique(fromAnswer);
  }

  return [];
}
