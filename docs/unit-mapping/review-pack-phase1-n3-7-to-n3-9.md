# Phase 1 Review Pack: N3.7 to N3.9

Third N3 authoring batch.

File:
- `docs/unit-mapping/review-pack-phase1-n3-7-to-n3-9.jsonl`

Source:
- `(PART B) N1-3 Secondary Ready - Applications of Numeracy (FOUNDATION Not Meeting Expected Standard).pptx`
- Key slides: 70–77 (N3.7), 75–77 (N3.8), 83–84 (N3.9)

Scope:
- `N3.7` Short division (without remainder / carrying)
- `N3.8` Short division (with remainder carrying)
- `N3.9` Order of operations (BIDMAS)

Item count:
- `N3.7`: 4 items
- `N3.8`: 4 items
- `N3.9`: 4 items
- Total: `12`

Routing intent in `source.question_ref`:
- `ONB`: onboarding
- `LRN`: main learn/practice
- `RT`: reteach

Answer-mode intent in this pack:
- `N3.7`: NUMERIC throughout; LRN-01 is a worded context (toy cost)
- `N3.8`: NUMERIC throughout; LRN-02 is a worded context (school year groups)
- `N3.9`: NUMERIC throughout; RT uses the exact erroneous student working shown on Slide 83

Important notes:
- `N3.7` and `N3.8` are sequenced so that N3.7 covers exact division (no remainder carry) and N3.8 introduces carrying of remainders between digits. The RT items use the ZERO_IN_QUOTIENT and PARTIAL_DIVIDEND_ERROR patterns respectively.
- `N3.7` RT targets `ZERO_IN_QUOTIENT`: student calculates 609 ÷ 3 = 23 by skipping the zero placeholder in the quotient (correct: 203).
- `N3.8` RT targets `PARTIAL_DIVIDEND_ERROR`: student calculates 456 ÷ 4 by ignoring the hundreds digit and treating only 56 as the dividend (writes 14, correct: 114).
- `N3.9` uses the BIDMAS expressions from Slide 83 verbatim. ONB-01 and RT-01 share the same expression (6 + 3 × 2 = 12) so that the reteach explicitly contrasts the correct and erroneous approaches. LRN-02 introduces indices (6 − 2² = 2).

Primary misconceptions targeted:
- `N3.7`: `ZERO_IN_QUOTIENT` — omits zero placeholder when a digit of the dividend divides to give 0
- `N3.8`: `PARTIAL_DIVIDEND_ERROR` — skips the leading digit of the dividend, treating only the last two digits
- `N3.9`: `LEFT_TO_RIGHT_ORDER` — evaluates a mixed-operation expression strictly left to right, ignoring BIDMAS precedence
