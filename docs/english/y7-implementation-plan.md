# Year 7 English — 2XED Implementation Plan

_Branch: `claude/plan-year7-english-amztr` | Updated: 2026-03-24_

---

## 1. What Has Been Built

All six items from the initial English build session are confirmed on `main`:

| File | Purpose | Status |
|------|---------|--------|
| `Curriculum/English/Y7 HT1 BOOKLET.pdf` | Source booklet (7.5 MB, 35 pages) | ✅ uploaded |
| `src/features/content/types.ts` | `ExplanationBlock`, `AnnotationData`, `EnglishAnimationSchema`, `QuestionBlock`, `Rubric` types | ✅ committed |
| `src/features/qa/AIMarkingService.ts` | GPT-4o rubric scoring — DRAFT + FINAL modes, rate limiter | ✅ committed |
| `src/app/api/mark/route.ts` | `POST /api/mark` — validates, calls AI, returns structured feedback | ✅ committed |
| `src/components/question/CanvasInput.tsx` | Pointer/stylus capture, undo, PNG snapshot, draw+type modes | ✅ committed |
| `scripts/generate-english-animations.ts` | Algorithmic English animation schema generator (9 visual styles) | ✅ committed |
| `src/features/content-ingestion/extractors/extractFromPdf.ts` | PDF text extractor — pdfjs-dist + pdf-parse fallback | ✅ committed |

---

## 2. What Is Missing

### 2a. Booklet Parse Pipeline (no scripts yet)

The spec called for two files that have not been written:

- `scripts/parseBooklet.ts` — master orchestration script: reads the PDF, calls GPT-4o vision per page, writes `ExplanationBlock[]` + `ImportedQuestion[]` to a JSON staging file
- `src/features/content-ingestion/extractors/visionChunker.ts` — sends a page image to GPT-4o with a structured prompt to classify each block as `EXPLANATION | MODEL | QUESTION`

The text extractor (`extractFromPdf.ts`) exists and works, but the vision-based chunker that understands *layout and pedagogical intent* of each page has not been built.

### 2b. Prisma Schema — No English Models in DB

The schema currently has no English-specific models. These need to be added:

```prisma
// New models needed
model EnglishContentBlock  { ... }  // persisted ExplanationBlock
model AIMarkResult         { ... }  // stores GPT-4o mark output per attempt
model AnnotationLayer      { ... }  // teacher-drawn annotation strokes per block
```

Current `ExplanationRoute` + `ExplanationStep` are Maths-only (single MCQ checkpoint per step). English open-response questions and compound question blocks can't be stored yet.

### 2c. Missing UI Components

| Component | What it does | Depends on |
|-----------|-------------|------------|
| `QuestionBlock` component | Renders `SubQuestion[]` with CanvasInput + AI marking flow | `CanvasInput` ✅, types ✅ |
| `ExplanationBlock` renderer | Renders `TEXT / IMAGE / ANIMATION / CALLOUT / MODEL` blocks in sequence | Types ✅ |
| `AnnotationLayer` component | Plays back teacher annotation strokes over a model answer | `AnnotationData` types ✅ |

### 2d. Teacher Content UI

No authoring pages exist yet:

```
src/app/teacher/content/
├── page.tsx                          # content list
├── [skillId]/
│   ├── explanation/new/page.tsx
│   ├── explanation/[blockId]/edit/page.tsx
│   └── review/page.tsx               # review GPT-4o parsed blocks
```

### 2e. Rubric Zod Validator

`src/features/qa/schemas.ts` — the `Rubric` type exists in `types.ts` but there is no Zod schema for API validation.

### 2f. LearnSession Integration

The existing learn flow (`LearnSession`) was built for Maths `ExplanationRoute`. It needs to be capable of rendering English `ExplanationBlock[]` sequences — either via a shared renderer or a parallel English session flow.

---

## 3. Next Steps — Priority Order

### Priority 1 — Booklet Parse Pipeline (RED: blocks everything else)

Without parsed content, there's nothing to review, nothing to author, and nothing to test the student flow with.

**Build order:**
1. `src/features/content-ingestion/extractors/visionChunker.ts`
   - Input: base64 PNG of a single PDF page
   - Sends to GPT-4o vision with prompt: _"Classify each distinct block on this page as EXPLANATION, MODEL, or QUESTION. Return structured JSON."_
   - Output: `ParsedPage` with array of `{ blockType, text, boundingHint }`

2. `scripts/parseBooklet.ts`
   - Reads `Curriculum/English/Y7 HT1 BOOKLET.pdf`
   - Converts pages to images (using `pdf2image` or `pdfjs-dist` canvas render)
   - Calls `visionChunker` per page
   - Writes `parsed-booklet.json` to `tmp/` for human review
   - CLI flags: `--page 1-10`, `--dry-run`, `--force`

### Priority 2 — Prisma Schema (RED: needed before any persistence)

Add the following to `prisma/schema.prisma`:

```prisma
model EnglishContentBlock {
  id          String   @id @default(cuid())
  skillId     String
  blockType   String   // TEXT | IMAGE | MODEL | QUESTION | CALLOUT
  sortOrder   Int
  content     Json     // serialised ExplanationBlock payload
  sourceRef   String?  // e.g. "Y7_HT1_BOOKLET_p12_block3"
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  skill       Skill    @relation(fields: [skillId], references: [id])
}

model AIMarkResult {
  id          String      @id @default(cuid())
  attemptId   String
  questionId  String
  mode        AttemptMode
  answer      String      // text or base64 image ref
  markResult  Json        // { correct, score, feedback, wtm, ebi, flagged }
  modelUsed   String
  latencyMs   Int
  createdAt   DateTime    @default(now())
}

model AnnotationLayer {
  id        String   @id @default(cuid())
  blockId   String
  strokes   Json     // Stroke[] serialised
  version   Int      @default(1)
  createdAt DateTime @default(now())
  block     EnglishContentBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)
}
```

### Priority 3 — Rubric Zod Validator (needed before /api/mark is safe)

`src/features/qa/schemas.ts`
- Zod schemas for `Rubric`, `SubQuestion`, `MarkRequest`, `MarkResult`
- Wire into `route.ts` to replace loose `any` validation

### Priority 4 — QuestionBlock Component

`src/components/english/QuestionBlock.tsx`
- Renders a `QuestionBlock` (from `types.ts`)
- Each `SubQuestion` renders as: stem → input (MCQ | SHORT_TEXT | CANVAS)
- On submit, calls `POST /api/mark` and shows WTM + EBI feedback inline
- Supports `presentationHint: 'sequential' | 'all_visible' | 'accordion'`

### Priority 5 — ExplanationBlock Renderer

`src/components/english/ExplanationBlockRenderer.tsx`
- Renders a sequence of `ContentBlock` items from `ExplanationBlock.blocks[]`
- TEXT → rich paragraph
- IMAGE → `<img>` with optional caption
- MODEL → model answer block with optional `AnnotationLayer` playback
- CALLOUT → highlighted aside box
- ANIMATION → hooks into `EnglishAnimationSchema` player

### Priority 6 — Teacher Booklet Review UI

`src/app/teacher/content/review/page.tsx`
- Loads `parsed-booklet.json` from staging
- Teacher can accept / reject / edit each parsed block
- Accepted blocks → written to `EnglishContentBlock` table
- This is the human-in-the-loop quality gate before content goes live

### Priority 7 — LearnSession Integration

- Extend `LearnSession` to accept an `EnglishContentBlock[]` sequence
- OR create `EnglishLearnSession` parallel to the Maths session, sharing the same shell but swapping in English-specific renderers
- Student flow: `ExplanationBlockRenderer` → `QuestionBlock` → `AIMarkingService` → spaced review queue

---

## 4. English Skill Code Convention

For consistency with the Maths system (e.g. `N4.2`, `G1.1`), English skills should follow:

```
E{strand}{unit}.{skill}

Strands:
  R = Reading
  W = Writing  
  L = Language
  S = Speaking & Listening

Examples:
  ER1.1  — Inference from explicit evidence (Year 7, Reading)
  EW2.3  — PEEL paragraph structure
  EL1.1  — Vocabulary: word families and roots
```

The Y7 HT1 Booklet spans strands R, W, and L. The first pass of skill codes should be derived from the booklet's own section headings.

---

## 5. Immediate Decision Points

Before building, confirm the following with the team:

1. **PDF vision vs. manual entry** — the GPT-4o vision pipeline is the fast path, but the booklet PDF is scanned (not text-native). How much accuracy is acceptable before human review? Suggested threshold: flag any page where vision confidence < 0.7.

2. **Open response marking scope** — `AIMarkingService` supports full AI marking. For initial rollout, should AI marking be DRAFT-only (show feedback, teacher confirms mark) or FINAL (auto-persist)?

3. **Skill seeding** — do we seed English skills via a `prisma/ensure-skills-english.ts` script (matching the Maths pattern) or import from the booklet parse?

4. **Animation priority** — `generate-english-animations.ts` is ready. Should animation schemas be generated before or after the first booklet parse? Suggested: after, so visual styles are informed by actual content structure.

---

## 6. File Map — Full English Stack

```
scripts/
  parseBooklet.ts                              # ❌ to build
  generate-english-animations.ts               # ✅ done

prisma/
  schema.prisma                                # ❌ English models to add
  ensure-skills-english.ts                     # ❌ to build (mirrors ensure-routes-n1.ts pattern)

src/features/content/
  types.ts                                     # ✅ done

src/features/content-ingestion/extractors/
  extractFromPdf.ts                            # ✅ done
  visionChunker.ts                             # ❌ to build

src/features/qa/
  AIMarkingService.ts                          # ✅ done
  schemas.ts                                   # ❌ Zod validators to build

src/app/api/
  mark/route.ts                                # ✅ done

src/components/english/
  ExplanationBlockRenderer.tsx                 # ❌ to build
  QuestionBlock.tsx                            # ❌ to build
  AnnotationLayer.tsx                          # ❌ to build

src/app/teacher/content/
  review/page.tsx                              # ❌ to build
  [skillId]/explanation/new/page.tsx           # ❌ to build
```
