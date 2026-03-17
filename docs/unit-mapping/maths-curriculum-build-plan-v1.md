# Maths Curriculum Build Plan — v1

## Scope

**137 sub-topics** across 9 strands.

| Strand | Topics | Description |
|--------|--------|-------------|
| N1 | 15 | Place value, ordering, rounding |
| N2 | 16 | Addition, subtraction, perimeter |
| N3 | 24 | Multiplication, division, area, number properties |
| N4 | 8 | Directed (negative) numbers |
| N5 | 12 | Fractions |
| A1 | 19 | Algebra |
| G1 | 11 | Angles and polygons |
| N6 | 20 | Fractions, decimals, percentages |
| S1 | 12 | Probability |

**Per sub-topic deliverables:** question bank · model answers · explanation routes (A/B/C) · animation schemas · audio narration · image renders (where applicable)

---

## Deliverables per Sub-Topic

### 1. Question Bank

Follow the N1.1 item spec pattern per topic:

| Bundle | Count | Question roles |
|--------|-------|----------------|
| Diagnostic | 4 | anchor, misconception probe, structure probe, transfer check |
| Route A shadows | 2 | shadow (procedural route) |
| Route B shadows | 2 | shadow (conceptual/visual route) |
| Route C shadows | 2 | shadow (misconception-corrective route) |
| **Total per skill** | **10** | |

Each item must be tagged: `question_role`, `misconception_tag`, `route`, `transfer_level`, `answer_type`, `strictness_level`.

**Answer types in use:** `MCQ`, `SHORT_NUMERIC`, `SHORT_TEXT`, `ORDER`, `FILL_IN`

### 2. Model Answers

One worked example per route (A, B, C), written in the teaching step schema format. Each must:
- Follow the I do → We do → You do sequence
- End with a transfer check step
- Every `visual_demo` step must be followed by a `guided_action`

### 3. Explanation Routes (A / B / C)

Per the teaching step schema (v1):

- **Route A** — Procedural: step-by-step method
- **Route B** — Conceptual/visual: diagram or model first
- **Route C** — Misconception-corrective: show wrong method, name error, show correct contrast

Each route: typically 6–8 teaching steps. Every step requires `stepType`, `visualType`, `visualPayload`, `expectedActionType`, `expectedAnswer`, `hint1`, `hint2`.

### 4. Animation Schemas

One JSON schema per route, following the animation schema spec (`docs/generate-animation-schema.md`).

Use only the supported visual primitives (additions listed below where new ones are needed):

| Primitive | Current support |
|-----------|----------------|
| `show_expression` | ✓ existing |
| `number_line` | ✓ existing |
| `step_reveal` | ✓ existing |
| `rule_callout` | ✓ existing |
| `area_model` | ✓ existing |
| `fraction_bar` | ✓ existing |
| `result_reveal` | ✓ existing |
| `place_value_grid` | ⚠ needs adding to AnimationRenderer |
| `bar_model` | ⚠ needs adding (fractions N5) |
| `venn_diagram` | ⚠ needs building (S1) |
| `sample_space_grid` | ⚠ needs building (S1) |
| `probability_scale` | ⚠ needs building (S1) |
| `angle_diagram` | ⚠ needs building (G1) |
| `polygon` | ⚠ needs building (G1) |

### 5. Audio Narration

Complementary narration script per animation step, following the rules in the animation schema spec:
- Never read the maths aloud
- Direct attention to the visual
- Name common mistakes at the moment they could occur
- 1–3 sentences per step, plain spoken English

Audio files generated via TTS (OpenAI `nova` voice or ElevenLabs equivalent), saved to `public/audio/[skillCode]-route-[routeType]-step-[n].mp3`.

### 6. Image Renders

Static SVG or rendered images required for topics where dynamic animation primitives are insufficient. Required for:

| Strand | Image types |
|--------|------------|
| G1 | Angle arcs, polygon diagrams, diagonal illustrations |
| S1 | Venn diagram seeds, sample space grids, probability scale |
| N2 | Perimeter shape diagrams (irregular polygons, compound shapes) |
| N3 | Factor trees, area missing-side diagrams |
| N5 | Bar model fraction diagrams |

All images stored in `public/images/curriculum/[skillCode]/`.

---

## Visual Primitive Gap Analysis

The following new renderer components must be built before content for the affected strands can go live. These are **blockers** for the listed strands.

### Must Build (Blockers)

| Primitive | Needed for | Complexity | Build first? |
|-----------|-----------|------------|--------------|
| `place_value_grid` | N1 | Low — grid with column highlights | Yes — N1 is first |
| `bar_model` | N5 | Medium — segmented bar with fraction labels | Before N5 |
| `angle_diagram` | G1 | Medium — SVG arc renderer | Before G1 |
| `polygon` | G1 | Medium — SVG polygon with labelled vertices/angles | Before G1 |
| `venn_diagram` | S1 | High — two/three circle Venn with region shading | Before S1 |
| `sample_space_grid` | S1 | Medium — labelled 2D grid with cell highlighting | Before S1 |
| `probability_scale` | S1 | Low — 0–1 number line with word labels | Before S1 |

All primitives should be added to `components/explanation/AnimationRenderer.tsx` as new case handlers. **The renderer is written once; content is data.**

---

## Build Sequence

Work strand by strand, in curriculum order. Build renderer primitives just before the strand that needs them.

### Phase 1 — Foundation Numeracy ✓ (partial)
N1.1–N1.15 · N2.1–N2.16 · N3.1–N3.24

Status: N1.1–N1.15 question banks and explanation routes partially authored. Gaps remain in animation schemas and audio for some skills. Complete before moving on.

**New primitive needed:** `place_value_grid` — build before starting N1 animations.

### Phase 2 — Directed Numbers
N4.1–N4.8

All existing primitives sufficient (`number_line`, `rule_callout`, `step_reveal`). Low build complexity. Good early-win strand.

### Phase 3 — Fractions
N5.1–N5.12

**New primitive needed:** `bar_model` — build before starting N5.

### Phase 4 — Algebra
A1.1–A1.19

All existing primitives sufficient (`show_expression`, `step_reveal`, `rule_callout`). Algebra has the most sub-topics (19) — plan for 2 batch generation runs.

### Phase 5 — Geometry
G1.1–G1.10

**New primitives needed:** `angle_diagram`, `polygon` — build before starting G1. This strand will also require the most image renders (all 11 topics need at least one static diagram).

### Phase 6 — Fractions, Decimals, Percentages
N6.1–N6.20

`fraction_bar` already exists. Most topics covered by existing primitives + `step_reveal`. 20 topics — second largest strand.

### Phase 7 — Probability
S1.1–S1.12

**New primitives needed:** `venn_diagram`, `sample_space_grid`, `probability_scale` — all must be built before starting S1. This is the most visually complex strand.

---

## Content Generation Pipeline

For each strand, the authoring pipeline runs in this order:

```
1. Skill record creation (code, name, description, misconceptions)
         ↓
2. Question bank authoring (10 items per skill, tagged)
         ↓
3. Explanation route authoring (A/B/C teaching step sequences)
         ↓
4. Animation schema generation (JSON per route)
         ↓
5. Audio narration generation (TTS per step)
         ↓
6. Image render generation (where applicable)
         ↓
7. Validation (validate-explanation-integrity, validate-item-answer-types)
         ↓
8. QA review (content-audit admin panel)
         ↓
9. Publish (import script → database)
```

### Automation vs Manual Authoring

| Deliverable | Approach |
|-------------|----------|
| Question banks | AI-generated per topic, human QA review |
| Misconception tags | Human-authored (domain expertise required) |
| Explanation steps | AI-generated from skill spec, human QA |
| Animation schemas | AI-generated from explanation steps (`/generate-animation-schema`) |
| Audio narration scripts | AI-generated from animation schemas |
| Audio files | TTS via OpenAI `nova` / ElevenLabs |
| Image renders (G1, S1) | AI-generated SVG + human review |
| Validation | Automated (existing scripts) |

### Batch Scripts to Create

The following scripts do not yet exist and need building:

| Script | Purpose |
|--------|---------|
| `scripts/generate-all-questions.ts` | Bulk question bank generation for a strand |
| `scripts/generate-all-explanations.ts` | Bulk explanation route generation |
| `scripts/generate-all-animations.ts` | Already documented — build this |
| `scripts/generate-all-audio.ts` | TTS audio file generation for all animation steps |
| `scripts/generate-curriculum-images.ts` | SVG image render generation (G1, S1, N2, N3) |
| `scripts/import-strand.ts` | Generic strand importer (generalise existing import scripts) |

---

## Scale Estimate

| Metric | Count |
|--------|-------|
| Sub-topics | 137 |
| Question items (10 per skill) | 1,370 |
| Explanation routes (3 per skill) | 411 |
| Teaching steps (~7 per route avg) | ~2,877 |
| Animation schemas | 411 |
| Audio files (~6 steps per route avg) | ~2,466 |
| Image renders (G1 + S1 + selected) | ~100–150 |

---

## Key Decisions Required

1. **TTS provider** — OpenAI `tts-1` (cheaper, good) vs ElevenLabs (higher quality, more expensive)?
2. **Image render format** — SVG components in React vs static PNG generation vs AI image gen?
3. **Question bank review process** — Who QAs generated questions? Human teacher review or automated rubric checks only?
4. **Misconception tag taxonomy** — Do we extend the existing tag taxonomy (currently only covers N1–N3) before authoring N4 onwards?
5. **Strand priority within Phase 1** — Complete all N1 gaps first, or build N1/N2/N3 in parallel?
6. **Audio language** — British English throughout? Any accessibility variants (slower speed, etc.)?

---

## Immediate Next Steps

1. **Audit N1 gaps** — Run `scripts/validate-explanation-integrity.mjs` to see which N1 skills are missing animation schemas or audio
2. **Build `place_value_grid` primitive** — Add to `AnimationRenderer.tsx`; unblocks N1 animation completion
3. **Extend misconception tag taxonomy** — Cover N4, N5, A1, G1, N6, S1 before authoring those strands
4. **Create `scripts/generate-all-animations.ts`** — The batch animation generator is already fully specced in `docs/generate-animation-schema.md`; it just needs building
5. **Decide TTS provider** — Needed before any audio generation can begin
