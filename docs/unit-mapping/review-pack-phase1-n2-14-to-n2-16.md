# Phase 1 Review Pack: N2.14 to N2.16

Fifth offline-authored curriculum batch for phase 1.

File:
- `docs/unit-mapping/review-pack-phase1-n2-14-to-n2-16.jsonl`

Source:
- `(PART A) N1-3 Secondary Ready - Applications of Numeracy (CORE Meeting Expected Standard).pptx`
- Key slides: 34, 167–183, 186–203

Scope:
- `N2.14` Solve problems involving tables and timetables
- `N2.15` Solve problems involving frequency trees
- `N2.16` Add and subtract numbers given in standard form

Item count:
- `N2.14`: 4 items
- `N2.15`: 4 items
- `N2.16`: 4 items
- Total: `12`

Routing intent in `source.question_ref`:
- `ONB`: onboarding
- `LRN`: main learn/practice
- `RT`: reteach

Answer-mode intent in this pack:
- `N2.14`: NUMERIC for duration calculations; SHORT for timetable constraint problems
- `N2.15`: NUMERIC throughout — all answers are counts derived from the tree
- `N2.16`: MCQ for the standard-form definition check; SHORT for calculation items (standard-form notation cannot be represented as a plain number)

Important notes:
- `N2.14` ONB uses a unit-conversion prerequisite check (minutes in 1 h 15 min) before moving to timetable reading. The RT item uses the specific `TIME_BRIDGE_ERROR` pattern identified in slides 182–183 (crossing the hour boundary).
- `N2.15` items use exact slide numbers from Slides 187 and 190. The snow/lateness tree (Slide 187d) and the homework tree (Slide 190a) are used verbatim.
- `N2.16` RT item uses the exact student misconception from slides 198–200: adding base numbers then adding exponents, mirroring the `add_m6_standard_form` misconception tag.
- `N2.16` is sourced from CORE (Part A) slides, not Foundation. Tier is `CORE`.

Primary misconceptions targeted:
- `N2.14`: `TIME_BRIDGE_ERROR` — treating hour and minute gaps as separately additive across an hour boundary
- `N2.15`: `TREE_BRANCH_CONFUSION` / `INCORRECT_SUBTRACTION_PATH` — subtracting from grand total instead of navigating the correct branch
- `N2.16`: `add_m6_standard_form` — applying exponent-multiplication rules (adding indices) to an addition problem
