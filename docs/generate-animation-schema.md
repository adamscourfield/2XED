# generate-animation-schema

Generate a complete animation schema for a micro-skill explanation route — including visual steps, complementary audio narration, and a renderer-ready JSON structure. Produces one schema per explanation route (A, B, C).

## Usage
```
/generate-animation-schema [skillCode] [routeType?]
```

Examples:
```
/generate-animation-schema N3
/generate-animation-schema N3 B
/generate-animation-schema N7 A
```

If no `routeType` is given, generate schemas for all three routes (A, B, C).

---

## What this command generates

For each route, one JSON schema file at:
```
content/animations/[skillCode]-route-[routeType].json
```

And one React renderer component instantiation in:
```
content/animations/[skillCode]-route-[routeType].tsx
```

---

## Step 1 — Read the skill from the database

Before generating anything, fetch the skill record:

```ts
const skill = await prisma.skill.findFirstOrThrow({
  where: { code: skillCode },
  include: {
    explanationRoutes: {
      where: routeType ? { routeType } : undefined,
      include: { steps: true }
    }
  }
})
```

Use the following fields to inform generation:
- `skill.name` — the skill being taught
- `skill.description` — what the student should be able to do
- `skill.common_misconceptions` — the errors to address
- `explanationRoute.misconceptionSummary` — the specific misconception for this route
- `explanationRoute.workedExample` — the worked example to animate
- `explanationRoute.routeType` — A (procedural), B (conceptual/visual), C (misconception-corrective)

---

## Step 2 — Generate the visual steps

Produce an array of animation steps using only the six supported primitive types:

### Primitive types

**`show_expression`**
Displays a mathematical expression with optional part highlighting.
```json
{
  "type": "show_expression",
  "expression": "7 − (−4)",
  "parts": [
    { "text": "7",      "id": "p1", "highlight": null },
    { "text": " − ",    "id": "p2", "highlight": null },
    { "text": "(−4)",   "id": "p3", "highlight": null }
  ]
}
```

Highlight values: `null` | `"accent"` | `"blue"` | `"green"` | `"dim"`

**`number_line`**
Renders a number line with optional start point and movement arrow.
```json
{
  "type": "number_line",
  "range": [-2, 13],
  "highlightStart": 7,
  "arrowFrom": 7,
  "arrowTo": 11
}
```

**`step_reveal`**
Shows a multi-step calculation appearing one line at a time.
```json
{
  "type": "step_reveal",
  "lines": [
    { "text": "7 − (−4)",  "highlight": null },
    { "text": "= 7 + 4",   "highlight": "accent" },
    { "text": "= 11",      "highlight": "green" }
  ]
}
```

**`rule_callout`**
A prominent callout box stating the core rule.
```json
{
  "type": "rule_callout",
  "ruleText": "Subtracting a negative = Adding a positive",
  "subText": "− (−n) → + n"
}
```

**`area_model`**
A rectangular area model for multiplication or fractions.
```json
{
  "type": "area_model",
  "rows": 3,
  "cols": 4,
  "highlightRows": [0, 1],
  "label": "3 × 4 = 12"
}
```

**`fraction_bar`**
A fraction/percentage/decimal conversion bar.
```json
{
  "type": "fraction_bar",
  "numerator": 3,
  "denominator": 4,
  "showDecimal": true,
  "showPercent": true
}
```

**`result_reveal`**
The final answer shown prominently.
```json
{
  "type": "result_reveal",
  "expression": "7 − (−4) = 11",
  "label": "Correct answer"
}
```

---

## Step 3 — Generate complementary audio narration

For each step, write narration that follows these rules strictly:

**COMPLEMENTARY NARRATION RULES:**
1. **Never read the maths aloud.** The student can see the expression. Do not say "seven minus negative four equals eleven."
2. **Direct attention.** Tell the student what to look at: "Notice the arrow is pointing right, not left."
3. **Explain meaning.** Tell the student why something is true: "That's because the two negatives cancel each other out."
4. **Name the common mistake at the moment it could occur.** "Most students move left here — watch the direction carefully."
5. **Keep it short.** Each step's narration should be 1–3 sentences. The student is reading and watching simultaneously.
6. **Use plain spoken English.** No mathematical notation in the audio script. Write it as you would say it to a student: "negative four" not "minus four in brackets."

**Bad narration (reads the maths):**
> "Seven minus negative four. We apply the rule and get seven plus four which equals eleven."

**Good narration (directs attention, explains meaning):**
> "Notice the arrow moves right, not left. Even though the original expression has a minus, we end up with a larger number. That's the sign you've done it correctly."

---

## Step 4 — Produce the schema file

Output format:

```json
{
  "schemaVersion": "1.0",
  "skillCode": "N3",
  "skillName": "Subtract integers",
  "routeType": "B",
  "routeLabel": "Conceptual",
  "misconceptionSummary": "Students treat −(−4) as −4, moving left instead of right",
  "generatedAt": "ISO_TIMESTAMP",
  "steps": [
    {
      "stepIndex": 0,
      "id": "introduce",
      "visuals": [
        {
          "type": "show_expression",
          "expression": "7 − (−4)",
          "parts": [...]
        }
      ],
      "narration": "Look at the whole expression first. There are two minus signs — that's the thing to pay attention to.",
      "audioFile": null
    }
  ],
  "misconceptionStrip": {
    "text": "Common mistake: treating −(−4) as just −4, which means moving left on the number line.",
    "audioNarration": "Watch the direction of the arrow on the number line. Most mistakes happen because students move the wrong way."
  },
  "loopable": true,
  "pauseAtEndMs": 2000
}
```

`audioFile` is `null` at generation time. It is populated by the audio generation step below.

---

## Step 5 — Generate audio files (optional, requires TTS API)

If a TTS API key is configured in `.env`:

```
OPENAI_API_KEY=...       # for OpenAI TTS
# or
ELEVENLABS_API_KEY=...   # for ElevenLabs
```

For each step's `narration` string, generate an MP3 file:

```ts
// Using OpenAI TTS
const response = await openai.audio.speech.create({
  model: 'tts-1',
  voice: 'nova',        // calm, clear, appropriate for education
  input: step.narration,
  speed: 0.92           // slightly slower for comprehension
})

const audioPath = `public/audio/${skillCode}-route-${routeType}-step-${stepIndex}.mp3`
fs.writeFileSync(audioPath, Buffer.from(await response.arrayBuffer()))
```

Update the schema: set `step.audioFile` to the public path of the generated file.

If no TTS API key is present: leave `audioFile` as `null`. The renderer will fall back to Web Speech API using the `narration` string directly.

**Voice selection guidance:**
- OpenAI: `nova` (warm, clear) or `shimmer` (gentle)
- ElevenLabs: choose a calm, neutral British or American voice
- Avoid voices that sound robotic, rushed, or overly enthusiastic

---

## Step 6 — Save schema to database

```ts
await prisma.explanationRoute.update({
  where: { skillId_routeType: { skillId: skill.id, routeType } },
  data: {
    animationSchema: schema,  // JSON field — add to schema if not present
    animationVersion: '1.0',
    animationGeneratedAt: new Date()
  }
})
```

Add to `prisma/schema.prisma` if not already present:
```prisma
model ExplanationRoute {
  // ... existing fields ...
  animationSchema       Json?
  animationVersion      String?
  animationGeneratedAt  DateTime?
}
```

---

## Step 7 — Validate the schema

After generating, validate against Zod:

```ts
import { AnimationSchemaValidator } from 'lib/validators/animation-schema'

const result = AnimationSchemaValidator.safeParse(schema)
if (!result.success) {
  console.error('Schema validation failed:', result.error)
  process.exit(1)
}
```

Create `lib/validators/animation-schema.ts` with Zod schemas for all primitive types and the top-level schema shape.

---

## The renderer component

The animation schema is consumed by a single shared renderer:

```
components/explanation/AnimationRenderer.tsx
```

This component:
- Accepts a schema JSON object as a prop
- Renders the current step's visuals using the six primitive renderers
- Plays audio for the current step (TTS file if available, Web Speech fallback)
- Shows the speaking indicator while audio plays
- Exposes next/prev/loop controls
- Shows the misconception strip permanently at the bottom
- Is fully keyboard-navigable (arrow keys, space)

**The renderer is written once. All animation content is data.**

Do not write a new renderer component per skill. Do not write new animation code per skill. Only the schema JSON changes between skills.

---

## Batch generation

To generate schemas for all skills in a subject:

```bash
# Generate all Route B schemas for KS3 Maths
npx ts-node scripts/generate-all-animations.ts --subject ks3-maths --route B

# Generate all routes for a single skill
/generate-animation-schema N3

# Generate and include audio (requires API key)
/generate-animation-schema N3 --audio
```

Create `scripts/generate-all-animations.ts` that:
1. Fetches all skills for the subject
2. Calls `generateAnimationSchema()` for each skill × route combination
3. Logs progress and any failures
4. Outputs a summary: schemas generated, audio files created, validation errors

---

## Route-specific generation guidance

### Route A — Procedural
- Use `step_reveal` as the primary primitive — show the method step by step
- Audio: narrate *why* each step is taken, not what is written
- Final step: `result_reveal`
- Typical step count: 4–6

### Route B — Conceptual / Visual
- Use `number_line`, `area_model`, or `fraction_bar` as the primary primitive
- Audio: direct attention to the visual — "notice the direction", "watch what happens to the shape"
- Include a `rule_callout` step before the visual demonstration
- Typical step count: 4–5

### Route C — Misconception-Corrective
- First step: show the WRONG method using `step_reveal` with red highlighting
- Second step: `rule_callout` naming exactly what went wrong
- Remaining steps: show the correct method as a direct contrast
- Audio: name the mistake explicitly — "this is what goes wrong", "here's where most students make the error"
- Typical step count: 5–6

---

## Quality checklist

Before committing a generated schema, verify:

- [ ] No step's narration reads the maths aloud
- [ ] Every step's narration is 1–3 sentences
- [ ] Route C opens by naming the misconception directly
- [ ] The misconception strip text matches `explanationRoute.misconceptionSummary`
- [ ] Audio narration uses plain spoken English (no symbols, no notation)
- [ ] Step count is appropriate for route type (A: 4–6, B: 4–5, C: 5–6)
- [ ] Schema validates against Zod schema without errors
- [ ] `loopable: true` is set
