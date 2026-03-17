# Phase 1 Review Pack: N3.18 to N3.21

Sixth N3 authoring batch.

File:
- `docs/unit-mapping/review-pack-phase1-n3-18-to-n3-21.jsonl`

Source:
- `(PART B) N1-3 Secondary Ready - Applications of Numeracy (FOUNDATION Not Meeting Expected Standard).pptx`
- Key slides: 73, 75 (N3.18), 76–79 (N3.19), 82, 85–86 (N3.20), 87–88, 92, 96 (N3.21)

Scope:
- `N3.18` Short division with integer remainders
- `N3.19` Short division giving a decimal answer
- `N3.20` Divide by a decimal
- `N3.21` Find a missing length using area

Item count:
- `N3.18`: 4 items
- `N3.19`: 4 items
- `N3.20`: 4 items
- `N3.21`: 4 items
- Total: `16`

Routing intent in `source.question_ref`:
- `ONB`: onboarding
- `LRN`: main learn/practice
- `RT`: reteach

Answer-mode intent in this pack:
- `N3.18`: NUMERIC for isolated remainder (ONB); NUMERIC for worded remainder contexts; SHORT for RT (answer must include both quotient and remainder: "321 remainder 2")
- `N3.19`: MCQ for ONB (804 ÷ 4 = 201, four options); NUMERIC for decimal answers; RT is NUMERIC (correct answer is 12.25)
- `N3.20`: NUMERIC throughout; LRN-02 is a worded context (textbooks, £61.60 ÷ 16 = £3.85)
- `N3.21`: NUMERIC throughout; LRN-02 involves triangle area (2 × area ÷ base = height); RT is NUMERIC

Important notes:
- `N3.18` and `N3.19` are deliberately sequenced: N3.18 establishes the concept of a remainder as an integer, then N3.19 extends to expressing the same remainder as a decimal continuation. The RT items directly contrast the two representations (N3.18 RT corrects an erroneously appended remainder digit; N3.19 RT corrects a student who stops at "12 remainder 1" instead of continuing to 12.25).
- `N3.18` RT targets `REMAINDER_APPENDED`: student gets 965 ÷ 3 = 321 r 2, then writes 3212 by appending the remainder as a digit.
- `N3.19` RT targets `REMAINDER_NOT_CONTINUED`: student writes "12 remainder 1" for 49 ÷ 4 and stops instead of continuing the division to give 12.25.
- `N3.20` LRN-01 (8 ÷ 0.1 = 80) is a key conceptual item: dividing by 0.1 multiplies by 10. The RT (4 ÷ 0.2 = 20, not 0.8) targets `DIVISION_MULTIPLICATION_CONFUSION` — treating division by a decimal as multiplication.
- `N3.21` LRN-02 (triangle, height = 2 × 20 ÷ 8 = 5) requires rearranging the triangle area formula; it is the highest cognitive load item in this batch (level 3).

Primary misconceptions targeted:
- `N3.18`: `REMAINDER_APPENDED` — appends the remainder as a digit at the end of the quotient
- `N3.19`: `REMAINDER_NOT_CONTINUED` — stops division at the remainder stage instead of converting to a decimal
- `N3.20`: `DIVISION_MULTIPLICATION_CONFUSION` — divides by a decimal fraction but treats it as a multiplication (e.g., 4 ÷ 0.2 = 0.8 instead of 20)
- `N3.21`: `MISSING_LENGTH_MULTIPLICATION` — multiplies instead of divides when finding a missing dimension from area
