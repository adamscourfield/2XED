# Input Components Roadmap (v1)

## Goal
Ship input components in sequence that maximizes learning value per engineering effort.

## Phase 1 (now) — Harden MCQ + Short Entry
1. MCQ component
   - keyboard support
   - clear selected state
   - anti-double-submit
2. Short entry component
   - numeric normalization
   - inline format help
   - graceful error states
3. Marking adapter
   - type-based grading pipeline

**Exit criteria**
- N1.1 routing works fully with MCQ + short entry only.

---

## Phase 2 — Expression/Equation Builder Lite
1. Token palette (digits/operators/brackets/basic symbols)
2. Editable expression line with backspace/clear
3. Serialization format for grading
4. Event logging for step sequence

**Exit criteria**
- Can support early algebra formation items reliably.

---

## Phase 3 — Advanced Builder + Teacher View
1. Multi-line equation steps
2. Validation hints (optional)
3. Teacher replay of student construction path

**Exit criteria**
- Teachers can inspect process errors, not just final answer.

---

## Cross-cutting requirements
- Accessibility first (keyboard + screen-reader labels)
- Reduced motion compatibility
- Mobile-friendly tap targets
- Telemetry consistency across all input types

## Implementation order recommendation
1) productionise N1.1 routing on MCQ/short entry
2) pilot and stabilize
3) add builder only where objective requires symbolic construction
