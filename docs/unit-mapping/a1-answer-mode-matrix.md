# A1 Answer Mode Matrix

Lean authoring guide for **A1.1 to A1.19**.

## Core principle

Default to:
- **MCQ** for identification, classification, misconception checks
- **SHORT_TEXT** for symbolic algebra outputs
- **NUMERIC** for substitution and sequence value outputs
- **MULTI_SELECT** only when selecting multiple valid statements genuinely improves diagnosis

Avoid introducing a new answer mode for A1 at this stage.
Avoid handwriting capture as a required mode for A1.

## Subtopic matrix

| Subtopic | Best modes | Avoid / low priority | Author notes |
|---|---|---|---|
| A1.1 Algebraic terminology | MCQ, SHORT_TEXT | Handwriting, new mode | Good for identifying variable, coefficient, term, expression |
| A1.2 Algebraic notation | SHORT_TEXT, MCQ | Handwriting | Exact symbolic entry works well, e.g. `3y`, `ab`, `a^2`, `a/b` |
| A1.3 Collecting like terms | SHORT_TEXT, MCQ, occasional MULTI_SELECT | Handwriting | Use MCQ for misconception spotting, SHORT_TEXT for simplification |
| A1.4 Multiplying terms | SHORT_TEXT, MCQ | Handwriting | Symbolic products like `6x^2`, `20ab`, `4a^3` |
| A1.5 Dividing terms | SHORT_TEXT, MCQ | Handwriting | Good fit for exact simplified symbolic answers |
| A1.6 Substitution, one operation | NUMERIC, MCQ | Handwriting | Mostly numerical outputs |
| A1.7 Substitution, multiple operations | NUMERIC, MCQ | Handwriting | Strong fit for numeric outputs and order-of-operations distractors |
| A1.8 Substitute into formulae | NUMERIC, MCQ, occasional SHORT_TEXT | Handwriting | Mostly numeric, occasional symbolic substituted form |
| A1.9 Expand single brackets | SHORT_TEXT, MCQ | Handwriting | Exact expanded expression is enough |
| A1.10 Expand two brackets and simplify | SHORT_TEXT, MCQ | Handwriting | Use MCQ to expose partial-expansion mistakes |
| A1.11 Factorising into one bracket | SHORT_TEXT, MCQ | Handwriting | Allow spacing variation in accepted answers |
| A1.12 Diagram sequences | NUMERIC, MCQ, occasional SHORT_TEXT | New visual mode for now | Numeric next-term and rule-description items are sufficient |
| A1.13 Continue linear sequences | NUMERIC, MCQ, SHORT_TEXT | Handwriting | Next-term values and rule identification |
| A1.14 Generate linear sequences | NUMERIC, MCQ | Handwriting | Generate terms from term-to-term rules |
| A1.15 Special sequences | MCQ, NUMERIC, occasional MULTI_SELECT | Handwriting | Sequence-type classification plus next-term work |
| A1.16 Continue geometric sequences | NUMERIC, MCQ, SHORT_TEXT | Handwriting | Focus on multiplier recognition |
| A1.17 Generate geometric sequences | NUMERIC, MCQ | Handwriting | Mostly numerical outputs |
| A1.18 Generate from nth-term rules | NUMERIC, MCQ, occasional SHORT_TEXT | Handwriting | Position-to-term substitution tasks |
| A1.19 Find the nth term | SHORT_TEXT, MCQ | Handwriting | Symbolic nth-term expression output |

## Authoring notes

- Use **MCQ** when the teaching goal is diagnosis of misconception, not just final-answer production.
- Use **SHORT_TEXT** when the answer is a compact symbolic expression.
- Use **NUMERIC** when the result should be a number after substitution or sequence evaluation.
- Use **MULTI_SELECT** sparingly for “which statements are true?” or “which are like terms?” style items.
- For A1, do not design around handwriting capture. Assume students can use books/whiteboards for rough working if needed.
