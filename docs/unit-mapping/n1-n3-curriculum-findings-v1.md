# N1–N3 Curriculum Findings — v1

Cross-reference of the Year 7 Applications of Numeracy curriculum slides against the current authoring pipeline. Produced March 2026.

---

## What This Document Is

Before authoring any question banks or explanation routes for N1–N3, the curriculum PowerPoint slides were extracted and reviewed. This document records:

- The exact examples and numbers your teachers use for each sub-topic
- Misconceptions explicitly flagged in the slides (which override or refine the general taxonomy)
- Confirmed question type preferences per skill category
- Exact authoring status: what exists, what needs fixing, what is missing entirely

---

## Confirmed Teaching Approach (Universal — All N1–N3 Skills)

Every sub-topic in the slides follows this structure:

1. **Frayer Model** — Definition / Characteristics / Examples / Non-Examples
2. **I do** — Teacher-worked example with full narration
3. **We do** — Guided practice with explicit prompting
4. **You do** — Independent practice
5. **Skills Check** — End-of-topic check questions

This maps directly onto our Route A (procedural), Route B (conceptual/visual), and Route C (misconception-corrective) structure.

**Bar models** are used as the primary visual for all four operations. This confirms `bar_model` as a required renderer primitive for N1–N3 (not just N5).

---

## Confirmed Question Type Rules

These come directly from the slide structure and authoring notes — override general defaults where they conflict:

| Skill category | Correct type | Avoid |
|---|---|---|
| Comparison (symbols: <, >, =) | `TRUE_FALSE` for statements; `SHORT_TEXT` for symbol insertion | Padded 4-option MCQ |
| Ordering (ascending/descending) | `ORDER_SEQUENCE` or structured `SHORT_TEXT` | Standard MCQ |
| Calculation (column methods) | `SHORT_NUMERIC` for core practice | MCQ except for onboarding |
| Number line placement | Interactive number-line or `SHORT_TEXT` label | MCQ |
| Concept understanding | Recognition MCQ (tight 2-choice) or `SHORT_TEXT` | Calculation-padded MCQ |
| Word problems (money, perimeter) | Direct `SHORT_NUMERIC`; keep reading load low | MCQ |

---

## N1 — Gap Analysis and Slide Evidence

### N1.1 — Recognise place value of integers up to one billion
**Status:** REVIEW_AND_FIX (30 items exist, 2 placeholders — no new authoring needed, fix quality issues)

**Slide examples:**
- 3,742,915 → value of digit 7 = 700,000
- 504,081 → place of digit 4 = thousands
- 8,030,406 → expanded form = 8,000,000 + 30,000 + 400 + 6
- 1,863,205 → value of 8 = 800,000

**Misconceptions confirmed in slides:** `pv_m1_place_vs_value`, `pv_m2_zero_shift`, `pv_m3_reading_direction` ✓

---

### N1.2 — Write integers in words and figures
**Status:** REVIEW_AND_FIX (29 items exist — fix quality issues only)

**Slide examples:**
- 4,206 → "four thousand, two hundred and six"
- "seven thousand and forty" → 7,040
- "ninety thousand three hundred and five" → 90,305
- 13,050 in words
- "two hundred and nine" → 209

---

### N1.3 — Compare two numbers using =, ≠, <, >, ≤, ≥
**Status:** REVIEW_AND_FIX (136 items exist — largest bank, quality check needed)

**Slide examples:** 3 < 5, 1 < 0, 902 < 93, 8106 > 8099, 3751 < 3699

**Note:** 136 items is unusually large. Audit for duplicate or near-duplicate items before marking complete.

---

### N1.4 — Order a list of integers
**Status:** REVIEW_AND_FIX (30 items exist)

**Slide examples:**
- Descending: 872, 802, 870, 780, 827
- Descending: 542, 412, 585, 591, 572
- Ascending: 8, 5, 9, 10, 2
- Ascending: 11, 20, 9, 15, 14, 3

---

### N1.5 — Finding the median from a set of numbers
**Status:** REVIEW_AND_FIX (30 items, currently all MCQ — needs answer type diversification)

**Slide examples:**
- {10, 12, 7} → median = 10
- {28, 31, 9} → median = 28
- {1003, 1001, 1002} → median = 1002
- {22, 18, 15, 7, 9} → median = 15 (odd count)
- {19, 20, 1, 5, 7} → median = 7

**Critical note from slides:** Explicitly tests both odd and even numbers of data points. Any question bank must include both cases. The even-count case (average of middle two values) is the more common student error.

**Fix needed:** Most items are MCQ. Diversify to include `SHORT_NUMERIC` for core practice.

---

### N1.6 — Decimal place value
**Status:** TOP_UP_AND_FIX (only 1 real item — needs 19 more)

**Slide examples (non-examples are equally important here):**
- Examples: 1.3, 0.2, 123.43, 0.278, 1.87, 12.76578, 10000.1
- Non-examples: −3.43, 10, 240

**Misconception confirmed:** `pv_m4_decimal_symmetry` — students think decimal columns mirror integers

---

### N1.7 — Compare decimals using =, ≠, <, >, ≤, ≥
**Status:** AUTHORED — 7 items in `review-pack-phase1-n1-6-to-n1-8.jsonl`

**Approach:** Mirrors N1.3 structure. Targets `pv_m7_decimal_ordering` — treating 0.9 < 0.12 because 9 < 12.

---

### N1.8 — Order a list of decimals
**Status:** AUTHORED — 6 items in `review-pack-phase1-n1-6-to-n1-8.jsonl`

**Approach:** Mirrors N1.4 using `ORDER_SEQUENCE`. Includes decimals with different numbers of decimal places (e.g. 0.3, 0.31, 0.09) to expose `pv_m7_decimal_ordering`.

---

### N1.9 — Position integers on a number line
**Status:** TOP_UP_AND_FIX (17 items — needs 3 more)

**Current split:** 11 TRUE_FALSE, 4 MCQ, 2 SHORT_TEXT. Needs more SHORT_TEXT (label position) items.

---

### N1.10 — Rounding to nearest 10, 100, 1000, integer
**Status:** TOP_UP_AND_FIX (17 items — needs 3 more, all currently MCQ)

**Slide examples:**
- 384 → nearest 100 = 400
- 942 → nearest 10 = 940
- 7460.8 → nearest 1000 = 7000
- 95.06 → nearest 100 = 100
- 10053 → nearest 1000 = 10000

**Fix needed:** Add `SHORT_NUMERIC` items. MCQ should only be for onboarding/misconception probes (`pv_m5_rounding_boundary`).

---

### N1.11 — Position decimals on a number line
**Status:** AUTHORED — 4 items in `review-pack-phase1-n1-9-to-n1-12.jsonl`

**App note:** Skill name includes "incl midpoint using a calculator" — items include finding the midpoint between two decimals, not just placing a given decimal.

---

### N1.12 — Rounding to decimal places
**Status:** TOP_UP_AND_FIX (13 items — needs 7 more, all currently MCQ)

**Slide examples:**
- 47.5 → nearest integer = 48
- 525.94 → nearest integer = 526
- 0.437 → nearest integer = 0
- 7.2 → nearest integer = 7
- 1.9 → nearest integer = 2

**Fix needed:** Add `SHORT_NUMERIC`. Include 1dp and 2dp rounding, not just to integer.

---

### N1.13 — Position negatives on a number line
**Status:** AUTHORED — 4 items in `review-pack-phase1-n1-13-to-n1-15.jsonl`

**Approach:** Mirrors N1.9 with range extended to −10 through +10. Targets `pv_m6_negative_ordering`.

---

### N1.14 — Compare negatives using =, ≠, <, >, ≤, ≥
**Status:** AUTHORED — 4 items in `review-pack-phase1-n1-13-to-n1-15.jsonl`

**Approach:** Mirrors N1.3/N1.7. Includes comparisons: −3 vs −7, −5 vs 0, −1 vs −9. Targets `pv_m6_negative_ordering`.

---

### N1.15 — Order any integers, negatives and decimals
**Status:** AUTHORED — 4 items in `review-pack-phase1-n1-13-to-n1-15.jsonl`

**Approach:** Synthesis of N1.4, N1.8, N1.14. Uses mixed lists like {−3, 0.5, −0.2, 2, −1.5} with `ORDER_SEQUENCE`.

---

## N2 — Gap Analysis and Slide Evidence

All N2 skills (N2.1–N2.13) have authored items in review packs but **0 items in the database**. They need importing, not re-authoring.

N2.14–N2.16 (tables/timetables, frequency trees, standard form) have **no review packs** and are not in the authoring queue. These are entirely unstarted.

### N2.1–N2.13 — In Review Packs, Not Yet Imported

| Skill | Review pack items | Key example from slides | Primary misconception |
|---|---|---|---|
| N2.1 Properties of add/sub | 5 | Fact families, bar models | Subtraction non-commutativity |
| N2.2 Mental strategies | 4 | Mental calculations | — |
| N2.3 Commutative/associative | 4 | Eva's error: 60−20=40 ∴ 20−60=40 | `add_m3_subtract_reversal` |
| N2.4 Formal addition integers | 4 | Sally's error: 438+100=4480 | `add_m1_no_carry` |
| N2.5 Formal addition decimals | 4 | 9.7+3.5=13.2; 18.45+14.72=33.17 | `add_m2_decimal_align` |
| N2.6 Formal subtraction integers | 4 | Column method | `add_m3_subtract_reversal` |
| N2.7 Formal subtraction decimals | 4 | Includes "complement of a decimal (1−p)" | `add_m2_decimal_align` |
| N2.8 Money problems | 5 | Paul: £6.89, pays £10 → change=£3.11 | `add_m2_decimal_align` |
| N2.9 Perimeter irregular polygons | 4 | Missed side on irregular shape | `add_m4_perimeter_vs_area` |
| N2.10 Perimeter regular polygons | 4 | Repeated side multiplication | `add_m5_compound_sides` |
| N2.11 Perimeter rectangles/parallelograms | 4 | Both pairs of equal sides | `add_m5_compound_sides` |
| N2.12 Perimeter isosceles triangle/trapezium | 4 | Equal-side properties | `add_m5_compound_sides` |
| N2.13 Perimeter compound shape | 3 | Outer edges only, rectangles joined | `add_m5_compound_sides` |

**Immediate action:** Run import script for N2.1–N2.13 review packs before authoring anything new.

### N2.14–N2.16 — Unstarted

| Skill | Status | Notes |
|---|---|---|
| N2.14 Tables and timetables | Not started | No slide extract yet. Word-problem style. |
| N2.15 Frequency trees | Not started | No slide extract yet. Requires tree diagram visual. |
| N2.16 Standard form addition/subtraction | Not started | Slide notes say `add_m6_standard_form` tag applies. |

---

## N3 — Gap Analysis and Slide Evidence

**N3 is entirely unstarted in the authoring pipeline.** All 24 skills need authoring from scratch. Slide content is available for N3.1–N3.3 from Part B Foundation extraction.

### N3.1 — Properties of Multiplication and Division
**Status:** AUTHORED — 4 items in `review-pack-phase1-n3-1-to-n3-3.jsonl`

**Slide approach:** Bar models → multiplication facts → division facts → number families (fact families)

**Worked examples from slides:**
- Bar model showing 40 = 8 groups of 5 → facts: 8×5=40, 5×8=40, 40÷8=5, 40÷5=8
- Number families: (5,6,30), (2,7,14), (4,5,20), (8,3,24)
- Commutative confirmed for ×, NOT for ÷

**Key non-examples flagged in slides:** 10÷2 ≠ 2÷10 (division not commutative)

**Misconception:** `mult_m5_factor_multiple` risk here — fact family confusion

---

### N3.2 — Mental Strategies for Multiplication and Division
**Status:** AUTHORED — 4 items in `review-pack-phase1-n3-1-to-n3-3.jsonl`

**Slide approach:** Times table listing strategy up to 12×12; fluency through pattern recognition

**Examples from slides:** Full 2×, 4×, 6× tables listed with fill-in gaps

---

### N3.3 — Multiply and Divide by Powers of 10
**Status:** AUTHORED — 4 items in `review-pack-phase1-n3-1-to-n3-3.jsonl`

**Slide approach:** Digit movement method (not "add zeros")

**Rule stated in slides:** "Multiply → digits move LEFT. Divide → digits move RIGHT."

**Worked examples from slides:**
- Integer ×: 71×10, 821×100, 45×10,000
- Decimal ×: 3.51×10, 4.03×100, 6.4×1000
- Derived: given 3×4=12, find 30×4, 300×4, 120÷4, 120÷40
- Division: 65÷10, 403.6÷100, 5622÷1000

**Misconception:** `mult_m2_decimal_place` — wrong decimal place count. Also: students often revert to "add a zero" which fails for decimals.

---

### N3.4–N3.24 — No Slide Extract Yet

These skills are in Part B CORE/FOUNDATION but have not been extracted. Before authoring these, run the extractor or read the slides for:
- N3.4–N3.5: Long multiplication (without/with carrying)
- N3.6: Area
- N3.7–N3.8: Short division
- N3.9: Order of operations
- N3.10–N3.13: Multiples, factors, LCM, HCF
- N3.14: Metric unit conversion
- N3.15–N3.20: Decimal multiplication and division
- N3.21: Area missing lengths
- N3.22: The mean
- N3.23: Squares, cubes, roots
- N3.24: Introduction to primes

---

## Misconception Taxonomy — Validation Results

The taxonomy drafted in `misconception-tag-taxonomy-v1.md` is confirmed as accurate for N1–N3. Two additional specific errors were found in slides that strengthen existing tags:

| Slide evidence | Maps to tag | Action |
|---|---|---|
| Eva's error: "60−20=40 so 20−60=40" | `add_m3_subtract_reversal` | Tag confirmed ✓ |
| Sally's error: "438+100=4480" | `add_m1_no_carry` | Tag confirmed ✓ — this is a digit misplacement error, not just carry |

**Refinement needed:** `add_m1_no_carry` is slightly too narrow. The Sally error is actually *digit misplacement in column layout*, not strictly a carrying error. Consider splitting:
- `add_m1_no_carry` — forgets to carry (existing)
- `add_m1b_column_misalign` — misaligns digits in column setup

---

## Immediate Authoring Priority

Based on this review, the correct Phase 1 work order is:

### Step 1 — Fix what exists (N1.1–N1.5)
Run QA audit on the 30-item banks for N1.1–N1.5. Key fixes:
- N1.3: Audit for near-duplicates (136 items is suspicious)
- N1.5: Add SHORT_NUMERIC items alongside MCQ
- N1.10, N1.12: Add SHORT_NUMERIC items, reduce MCQ dominance

### Step 2 — Top up (N1.6, N1.9, N1.10, N1.12)
Author missing items using slide examples as the number source.

### Step 3 — Import N2.1–N2.13 ✓ READY
All 53 items are authored in three review packs and referenced in `prisma/import-phase1-unit1.ts`. Run `npm run db:import:phase1-unit1` to load them.

### Step 4 — Author N1.7, N1.8, N1.11, N1.13, N1.14, N1.15 ✓ DONE
All six skills are now authored (29 items across three review packs) and included in the import script. No further authoring needed.

### Step 5 — Author N2.14–N2.16
Tables/timetables, frequency trees, and standard form. Need slide extraction first.

### Step 6 — Author N3.1–N3.3 ✓ DONE
All three skills are authored (12 items in `review-pack-phase1-n3-1-to-n3-3.jsonl`) and included in the import script.

### Step 7 — Extract + Author N3.4–N3.24
Run extractor on Part B CORE slides for N3.4–N3.24, then begin authoring.
