# build-lane-view

Build the lane view API and teacher dashboard UI that powers the live three-lane classroom display. Replaces the old class snapshot / heatmap approach.

## Usage
```
/build-lane-view [sessionId]
```

## What this command builds

The lane view is the primary teacher interface during a live lesson. It shows three clearly labelled groups — Got it / Nearly there / Needs teacher — with one action per group. The intelligence sits underneath; the teacher only sees the output.

---

## The three zones

### Zone 1 — The Now (top, dominant)
A single headline telling the teacher what to do right now:

```
"16 students need you — consider stopping and reteaching the whole class"
```
or
```
"3 students need you — circulate to: Maya, Jordan, Priya"
```

This is the first thing the teacher sees. It must be actionable in under 3 seconds.

### Zone 2 — The Three Lanes (centre)
Three columns, always visible:

| Lane 1 — Got it | Lane 2 — Nearly there | Lane 3 — Needs teacher |
|---|---|---|
| 11 students | 14 students | 3 students |
| Moving forward | App is working | Names listed below |

Lane 3 shows student names, sorted by lowest mastery first.
Unexpected failures (students who are usually secure) are visually flagged.
Students who are holding at final check (app exhausted, waiting for teacher) are marked distinctly.

### Zone 3 — Lane 3 detail (bottom or sidebar)
The prioritised list of students needing teacher attention:
- Name
- First failing skill
- How long they've been waiting
- Whether they escalated from Lane 2 (unexpected)
- Whether app has exhausted all routes (holding)

---

## Implementation steps

### Step 1 — Lane query

In `lib/live/lane-view.ts`, write:

```ts
export async function getLaneView(sessionId: string): Promise<LaneViewResponse>
```

This function must:
1. Fetch all `LiveParticipant` records for the session
2. Group by `currentLane`
3. For Lane 3 students: join with `StudentSkillState` to get `masteryProbability`, sort ASC
4. For Lane 3 students: check `SkillMastery` history to determine `isUnexpectedFailure`
   - Unexpected = current `masteryProbability` is more than 0.25 below their historical average for this strand
5. Compute `waitingMinutes` from `laneAssignedAt` for each Lane 3 student
6. Evaluate reteach alert:
   - Lane 3 count / total participants >= 0.35 → `reteachAlert = true`
   - If ALL Lane 3 students have `isUnexpectedFailure = false` (expected failures) → raise threshold to 0.50
7. Build `reteachMessage`:
   - If alert: `"${lane3Count} students need support — consider stopping and reteaching the whole class"`
   - If no alert and lane3Count > 0: `"${lane3Count} students need you — circulate to: ${top3Names}"`
   - If lane3Count === 0: `"All students on track"`

### Step 2 — API route

`GET /api/live/sessions/[sessionId]/lanes`
- Protected: TEACHER or ADMIN role
- Returns: `LaneViewResponse`
- Cache: `no-store`

### Step 3 — Headline component

`components/live/LessonHeadline.tsx`

Props: `{ reteachAlert: boolean, reteachMessage: string, lane3Count: number }`

- If `reteachAlert`: large red/amber banner, prominent, impossible to miss
- If lane3Count > 0 and no alert: moderate callout with student names
- If lane3Count === 0: calm green "All students on track" state

This component must never be subtle. A teacher glancing for 2 seconds must immediately understand what is being asked of them.

### Step 4 — Lane columns component

`components/live/LaneColumns.tsx`

Props: `{ lane1: LaneGroup, lane2: LaneGroup, lane3: LaneGroup }`

Three equal columns. Each column has:
- Lane name (bold, large)
- Count badge
- For Lane 1 and 2: just the count and a brief status description
- For Lane 3: list of student names with priority indicators

Lane 3 student card shows:
- Name (large enough to read at arm's length from a monitor)
- Waiting time: "2 min" — amber if > 3 min, red if > 6 min
- Unexpected failure badge: "⚠ Usually secure" in amber
- Holding badge: "App waiting" if `holdingAtFinalCheck = true`
- "Hand back to app" button — single tap, calls `POST .../handback`

### Step 5 — Hook

`hooks/useLiveLanes.ts`:
```ts
export function useLiveLanes(sessionId: string, intervalMs = 3000) {
  // Poll GET /api/live/sessions/[sessionId]/lanes every intervalMs
  // Return: { laneView, isLoading, error, lastUpdated }
  // On error: preserve last known state, show reconnecting indicator
}
```

### Step 6 — Teacher dashboard page

`app/teacher/live/[sessionId]/page.tsx`

Layout:
```
┌─────────────────────────────────────────┐
│ Session header + phase controls         │
├─────────────────────────────────────────┤
│ LessonHeadline (Zone 1)                 │
├──────────┬──────────────┬───────────────┤
│  Lane 1  │    Lane 2    │    Lane 3     │
│  Got it  │ Nearly there │ Needs teacher │
└──────────┴──────────────┴───────────────┘
```

All data flows from a single `useLiveLanes` hook. No component makes its own API calls.

Auth guard:
```ts
const session = await getServerSession(authOptions)
if (!session || !['TEACHER', 'ADMIN'].includes(session.user.role)) {
  redirect('/login')
}
```

---

## Performance constraint

The lane query must complete in < 300ms for a class of 35 students.
Use a single Prisma query per table — do not loop per student.
Read `StudentSkillState` with `where: { userId: { in: participantUserIds } }`.

---

## What this replaces

This command replaces `build-class-snapshot`. Do not build a skill × student heatmap as the primary view. The heatmap may be added as a collapsible "detail" view below the lane columns in a future iteration, but it must never be the first thing the teacher sees.
