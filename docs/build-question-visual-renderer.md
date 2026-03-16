# build-question-visual-renderer

Build the `QuestionVisualRenderer` component — a single React component that reads a `visualDescriptor` JSON object and renders a mathematically precise, dynamic SVG visual for any question type.

## Usage
```
/build-question-visual-renderer
```

---

## What this command builds

A single shared component at:
```
components/question/QuestionVisualRenderer.tsx
```

And three primitive SVG renderer modules:
```
components/question/visuals/NumberLineVisual.tsx
components/question/visuals/BarModelVisual.tsx
components/question/visuals/GeometryVisual.tsx
```

The component accepts a `visualDescriptor` JSON object and a `placement` prop, renders nothing if no descriptor is present, and falls back to an `<img>` tag if a legacy `imageUrl` is passed.

---

## The visualDescriptor schema

All descriptor types share a common envelope:

```ts
type VisualDescriptor =
  | NumberLineDescriptor
  | BarModelDescriptor
  | RectangleDescriptor
  | TriangleDescriptor
  | CompositeShapeDescriptor
```

### NumberLineDescriptor

```ts
type NumberLineDescriptor = {
  type: 'number_line'
  min: number
  max: number
  step?: number               // tick interval, default 1
  marked?: number[]           // values to mark with a dot
  highlight?: number          // value to highlight with a filled circle
  arrow?: {
    from: number
    to: number
    label?: string
  }
  showQuestion?: {
    position: number          // position of the ? marker
    label?: string            // e.g. "Find this value"
  }
  width?: number              // SVG width, default 520
}
```

Example — "Mark −3 on this number line":
```json
{
  "type": "number_line",
  "min": -5,
  "max": 5,
  "showQuestion": { "position": -3, "label": "?" }
}
```

Example — "What is 7 − (−4)?":
```json
{
  "type": "number_line",
  "min": -2,
  "max": 13,
  "marked": [7],
  "arrow": { "from": 7, "to": 11, "label": "+4" }
}
```

---

### BarModelDescriptor

```ts
type BarModelDescriptor = {
  type: 'bar_model'
  total: number               // total value the bar represents
  segments: BarSegment[]
  orientation?: 'horizontal' | 'vertical'   // default horizontal
  showTotal?: boolean         // label total at the end
  question?: string           // text to show below the bar, e.g. "What fraction is shaded?"
}

type BarSegment = {
  value: number               // absolute value or fraction numerator
  denominator?: number        // if fractional
  label?: string              // e.g. "shaded", "2/5", "?"
  highlight?: boolean         // filled colour
  isQuestion?: boolean        // shows ? instead of value — this is what the student must find
  color?: 'primary' | 'secondary' | 'question'
}
```

Example — "What fraction of the bar is shaded?":
```json
{
  "type": "bar_model",
  "total": 5,
  "segments": [
    { "value": 3, "label": "shaded", "highlight": true },
    { "value": 2, "label": "unshaded" }
  ],
  "question": "What fraction is shaded?"
}
```

Example — "The bar shows 40%. What is the missing value if the total is 80?":
```json
{
  "type": "bar_model",
  "total": 80,
  "segments": [
    { "value": 32, "label": "40%", "highlight": true },
    { "value": 48, "label": "?", "isQuestion": true }
  ],
  "showTotal": true
}
```

---

### RectangleDescriptor

```ts
type RectangleDescriptor = {
  type: 'rectangle'
  width: number
  height: number
  showDimensions?: boolean    // label width and height
  showArea?: boolean          // label area inside shape
  labelWidth?: string         // override dimension label e.g. "(x + 2)"
  labelHeight?: string
  shaded?: boolean            // fill the rectangle
  question?: 'area' | 'perimeter' | 'missing_dimension' | null
  missingDimension?: 'width' | 'height'   // which dimension is unknown
  gridLines?: boolean         // show unit grid inside rectangle
}
```

Example — "What is the area of this rectangle?":
```json
{
  "type": "rectangle",
  "width": 7,
  "height": 4,
  "showDimensions": true,
  "question": "area"
}
```

Example — "The area is 24cm². Find the missing side.":
```json
{
  "type": "rectangle",
  "width": 6,
  "height": 4,
  "showDimensions": true,
  "showArea": true,
  "question": "missing_dimension",
  "missingDimension": "height",
  "labelHeight": "?"
}
```

---

### TriangleDescriptor

```ts
type TriangleDescriptor = {
  type: 'triangle'
  variant: 'right' | 'isoceles' | 'scalene' | 'equilateral'
  sideA?: number | '?'
  sideB?: number | '?'
  sideC?: number | '?'
  angleA?: number | '?'
  angleB?: number | '?'
  angleC?: number | '?'
  showRightAngle?: boolean
  question?: 'area' | 'perimeter' | 'missing_side' | 'missing_angle'
}
```

---

### CompositeShapeDescriptor

```ts
type CompositeShapeDescriptor = {
  type: 'composite'
  shapes: (RectangleDescriptor | TriangleDescriptor)[]
  layout: 'joined_right' | 'joined_top' | 'l_shape' | 'custom'
  totalDimensions?: { width: number, height: number }
  question?: 'area' | 'perimeter'
}
```

---

## The renderer component

```tsx
// components/question/QuestionVisualRenderer.tsx

import { NumberLineVisual }    from './visuals/NumberLineVisual'
import { BarModelVisual }      from './visuals/BarModelVisual'
import { GeometryVisual }      from './visuals/GeometryVisual'

type Props = {
  descriptor:  VisualDescriptor | null
  imageUrl?:   string | null         // legacy fallback
  placement:   'above' | 'below' | 'left' | 'inline'
  maxWidth?:   number                // default 520
  className?:  string
}

export function QuestionVisualRenderer({
  descriptor, imageUrl, placement, maxWidth = 520, className
}: Props) {

  // Nothing to show
  if (!descriptor && !imageUrl) return null

  // Legacy fallback — static image URL
  if (!descriptor && imageUrl) {
    return (
      <div className={`question-visual question-visual--${placement} ${className ?? ''}`}>
        <img src={imageUrl} alt="Question diagram" style={{ maxWidth }} />
      </div>
    )
  }

  // Dynamic SVG renderer
  const visual = (() => {
    switch (descriptor!.type) {
      case 'number_line':  return <NumberLineVisual  d={descriptor as NumberLineDescriptor}  maxWidth={maxWidth} />
      case 'bar_model':    return <BarModelVisual    d={descriptor as BarModelDescriptor}    maxWidth={maxWidth} />
      case 'rectangle':
      case 'triangle':
      case 'composite':    return <GeometryVisual    d={descriptor as any}                   maxWidth={maxWidth} />
      default:             return null
    }
  })()

  return (
    <div className={`question-visual question-visual--${placement} ${className ?? ''}`}>
      {visual}
    </div>
  )
}
```

---

## Visual design standards

All SVG visuals must follow these standards:

**Typography**
- Font: system-ui with monospace fallback for numbers
- Dimension labels: 13px, ink colour
- Question marks (?): 16px bold, accent colour
- All text must be legible at 75% zoom

**Colour palette — use CSS variables**
```css
--visual-ink:        #1a1814;   /* labels, axes */
--visual-dim:        #9e9790;   /* tick marks, secondary elements */
--visual-accent:     #d4541a;   /* highlight, question mark */
--visual-blue:       #1a56d4;   /* marked points, known values */
--visual-green:      #1a9454;   /* correct, positive movement */
--visual-fill:       #e8f0fd;   /* shape fill, bar highlight */
--visual-border:     #e8e3db;   /* shape outline, bar border */
--visual-question:   #fff3ed;   /* ? segment background */
```

**Spacing**
- Minimum padding inside SVG: 24px on all sides
- Shapes must never touch the SVG edge
- Dimension labels must not overlap shape edges

**Question mark styling**
When `isQuestion: true` or a dimension is `'?'`:
- Fill the element with `--visual-question`
- Stroke with `--visual-accent` dashed border
- Show `?` in `--visual-accent` bold text
- This makes the unknown value immediately obvious

**Accessibility**
- Every SVG must have a `<title>` element with a plain English description
- Example: `<title>Rectangle with width 7cm and height 4cm</title>`
- Use `role="img"` on the SVG element

---

## Placement classes

```css
.question-visual--above  { margin-bottom: 20px; }
.question-visual--below  { margin-top: 20px; }
.question-visual--left   {
  float: left;
  margin-right: 24px;
  margin-bottom: 8px;
}
.question-visual--inline { display: inline-block; vertical-align: middle; }
```

---

## Zod validator

Create `lib/validators/visual-descriptor.ts`:

```ts
export const VisualDescriptorSchema = z.discriminatedUnion('type', [
  NumberLineDescriptorSchema,
  BarModelDescriptorSchema,
  RectangleDescriptorSchema,
  TriangleDescriptorSchema,
  CompositeShapeDescriptorSchema
])
```

Use this to validate descriptors before storing them in the database and before rendering.

---

## Tests

Create `__tests__/visuals/`:
- `number-line.test.ts` — renders correctly for positive range, negative range, mixed range, with arrow, with question mark
- `bar-model.test.ts` — renders correctly for fractions, percentages, missing value
- `geometry.test.ts` — renders rectangle with dimensions, with area label, with missing dimension
- `renderer.test.ts` — falls back to img tag when no descriptor, renders nothing when both null, passes correct component for each type
