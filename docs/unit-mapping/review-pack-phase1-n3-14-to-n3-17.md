# Phase 1 Review Pack: N3.14 to N3.17

Fifth N3 authoring batch.

File:
- `docs/unit-mapping/review-pack-phase1-n3-14-to-n3-17.jsonl`

Source:
- `(PART B) N1-3 Secondary Ready - Applications of Numeracy (FOUNDATION Not Meeting Expected Standard).pptx`
- Key slides: 14, 18–19 (N3.14), 34, 39 (N3.15), 40, 45–46 (N3.16), 47, 49 (N3.17)

Scope:
- `N3.14` Metric unit conversions
- `N3.15` Multiply a decimal by a whole number
- `N3.16` Multiply a decimal by a decimal
- `N3.17` Multiply by 0.1 and 0.01

Item count:
- `N3.14`: 4 items
- `N3.15`: 4 items
- `N3.16`: 4 items
- `N3.17`: 4 items
- Total: `16`

Routing intent in `source.question_ref`:
- `ONB`: onboarding
- `LRN`: main learn/practice
- `RT`: reteach

Answer-mode intent in this pack:
- `N3.14`: NUMERIC for direct conversion (3 km → 3000 m, 5 km → 5000 m); SHORT for mixed-unit perimeter (2 m + 15 cm → 430 cm); NUMERIC for weekly distance in km
- `N3.15`: NUMERIC throughout; LRN-02 is a worded context (cola bottles at £1.29 each)
- `N3.16`: NUMERIC throughout; LRN-02 is a real-world fencing cost context
- `N3.17`: NUMERIC for direct calculations; LRN-01 uses MCQ format (42.5 × 0.1)

Important notes:
- `N3.14` LRN-01 (rectangle perimeter with mixed units) requires converting 2 m to 200 cm before calculating: 2×(200+15) = 430 cm. The RT item uses the `UNIT_CONVERSION_FACTOR` misconception pattern exactly: student writes 500 for 5 km in metres (dividing by 2 rather than multiplying by 1000).
- `N3.15` and `N3.16` form a deliberate progression: N3.15 multiplies a decimal by a whole number (0.4 × 5); N3.16 multiplies a decimal by a decimal (0.4 × 0.5). The RT items use the same number pattern to contrast the two error types.
- `N3.16` RT targets `DECIMAL_COUNT_ERROR`: student writes 3.6 for 0.4 × 0.9 by ignoring that two decimal factors each contribute one decimal place (correct: 0.36, two decimal places).
- `N3.17` RT (Emily, 170 × 0.1 = 1700) uses the `mult_m2_decimal_place` misconception: multiplying rather than dividing by 10, mirroring the N3.3 reteach but with a ×0.1 framing.

Primary misconceptions targeted:
- `N3.14`: `UNIT_CONVERSION_FACTOR` — applies the wrong conversion factor (e.g., ÷2 or ×100 instead of ×1000) when changing between km and m
- `N3.15`: `DECIMAL_POINT_MISPLACE` — misplaces the decimal point in the product (e.g., writes 0.48 for 0.8 × 6)
- `N3.16`: `DECIMAL_COUNT_ERROR` — counts decimal places incorrectly when both factors are decimals
- `N3.17`: `mult_m2_decimal_place` — treats ×0.1 as ×10 (moves decimal the wrong direction)
