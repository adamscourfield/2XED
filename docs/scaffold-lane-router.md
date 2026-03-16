# scaffold-lane-router

Build the lane assignment and escalation engine — the core decision-making module that determines which lane every student is in at every moment during a live session.

## Usage
```
/scaffold-lane-router
```

## What this command builds

A single TypeScript module at `lib/live/lane-router.ts` containing all lane logic. This is the brain of the live session. Everything else (dashboard, student device, API routes) reads from the output of this module.

---

## The two functions to build

### 1. `assignLane()`

Called once per student after they complete their diagnostic questions.

```ts
export async function assignLane(
  participantId: string,
  sessionId: string,
  diagnosticAttempts: DiagnosticAttempt[]
): Promise<LaneAssignmentResult>

type DiagnosticAttempt = {
  itemId: string
  questionRole: 'anchor' | 'misconception_check' | 'prerequisite_probe' | 'transfer'
  correct: boolean
  hintsUsed: number
  supportLevel: SupportLevel
  responseTimeMs: number
}

type LaneAssignmentResult = {
  lane: StudentLane
  reason: EscalationReason
  isUnexpectedFailure: boolean
  recommendedExplanationId: string | null  // for Lane 2 only
}
```

**Assignment logic — evaluate in this exact order:**

```
Step 1 — Find the anchor attempt
  anchorAttempt = attempts.find(a => a.questionRole === 'anchor')

Step 2 — Find the misconception check attempt
  miscAttempt = attempts.find(a => a.questionRole === 'misconception_check')

Step 3 — Apply lane rules

  LANE 3 conditions (check first — these override everything):
  - anchorAttempt.correct === false
      → reason: ANCHOR_FAILED
  - anchorAttempt.correct === true
    AND anchorAttempt.supportLevel is SCAFFOLDED or FULL_EXPLANATION
      → reason: SCAFFOLDED_CORRECT
  - anchorAttempt.correct === false AND miscAttempt?.correct === false
      → reason: MISCONCEPTION_FAILED

  LANE 2 conditions (if none of the above):
  - anchorAttempt.correct === true
    AND (anchorAttempt.hintsUsed > 0 OR miscAttempt?.correct === false)
      → Lane 2

  LANE 1 (default if all checks pass):
  - anchorAttempt.correct === true
    AND anchorAttempt.hintsUsed === 0
    AND anchorAttempt.supportLevel === INDEPENDENT
    AND (miscAttempt === undefined OR miscAttempt.correct === true)
      → Lane 1

Step 4 — Check for unexpected failure (Lane 3 only)
  Fetch StudentSkillState for this student + skill
  Fetch historical SkillMastery average for this strand
  isUnexpectedFailure = currentMasteryProbability < (historicalAverage - 0.25)

Step 5 — For Lane 2: select recommended explanation
  Call selectExplanationRoute(skillId, miscAttempt?.misconceptionTag)
  Returns the ExplanationRoute with highest DLE for this skill + misconception pattern
  Falls back to routeType 'A' if no ExplanationPerformance data exists
```

**After computing result:**
- Update `LiveParticipant.currentLane`, `currentExplanationId`, `escalationReason`, `isUnexpectedFailure`, `laneAssignedAt`
- Create `LaneTransition` record: `transitionType: ASSIGNED`, `fromLane: null`, `toLane: result.lane`
- If Lane 3 assignment: call `checkReteachThreshold(sessionId)` to update `LiveSession.reteachAlert`

---

### 2. `escalateLane()`

Called when a Lane 2 student fails a shadow check. Moves them to Lane 3 and steps down their content.

```ts
export async function escalateLane(
  participantId: string,
  sessionId: string,
  failedExplanationId: string
): Promise<EscalationResult>

type EscalationResult = {
  newLane: StudentLane          // always LANE_3
  nextExplanationId: string | null  // next simplest unused route, or null if exhausted
  holdingAtFinalCheck: boolean  // true if all routes exhausted
}
```

**Escalation logic:**

```
Step 1 — Fetch all ExplanationRoutes for this skill
  Order by default_priority_rank ASC (simplest first)

Step 2 — Fetch all explanation attempts for this student in this session
  attemptsIds = previously tried explanation IDs

Step 3 — Find next unused route
  nextRoute = routes.find(r => !attemptedIds.includes(r.id))

Step 4 — If nextRoute exists:
  holdingAtFinalCheck = false
  nextExplanationId = nextRoute.id
  Update LiveParticipant.currentExplanationId = nextRoute.id

Step 5 — If no unused routes remain:
  holdingAtFinalCheck = true
  nextExplanationId = null
  Update LiveParticipant.holdingAtFinalCheck = true

Step 6 — Update LiveParticipant:
  currentLane = LANE_3
  escalationReason = SHADOW_CHECK_FAILED

Step 7 — Create LaneTransition:
  transitionType: ESCALATED
  fromLane: LANE_2
  toLane: LANE_3
  reason: SHADOW_CHECK_FAILED

Step 8 — Call checkReteachThreshold(sessionId)
```

---

### 3. `handleHandback()`

Called when teacher taps "handed back to app" on the dashboard.

```ts
export async function handleHandback(
  participantId: string,
  sessionId: string,
  teacherUserId: string
): Promise<HandbackResult>

type HandbackResult = {
  newLane: StudentLane   // LANE_2
  shadowCheckItemId: string  // item to serve to student device immediately
}
```

**Handback logic:**

```
Step 1 — Update LiveParticipant:
  currentLane = LANE_2
  holdingAtFinalCheck = false

Step 2 — Create LaneTransition:
  transitionType: HANDED_BACK
  fromLane: LANE_3
  toLane: LANE_2
  triggeredBy: teacherUserId

Step 3 — Select shadow check item:
  Fetch shadow check questions for current skill
  Return the simplest one not yet attempted by this student in this session

Step 4 — Return shadowCheckItemId for student device to serve immediately
```

**After handback — shadow check outcome:**

If shadow check passes → call `resolveLane()`:
```ts
// Update LiveParticipant.currentLane = LANE_2 (already set)
// Create LaneTransition: RESOLVED
// Student continues in Lane 2 progress flow
```

If shadow check fails → call `escalateLane()` again:
```ts
// Student returns to Lane 3
// Name reappears on teacher dashboard
// Step down to next unused explanation route
```

---

### 4. `checkReteachThreshold()`

Called after every lane assignment or escalation that adds a student to Lane 3.

```ts
export async function checkReteachThreshold(sessionId: string): Promise<void>
```

**Logic:**

```
Step 1 — Count participants by lane
  lane3Count = participants.filter(p => p.currentLane === LANE_3).length
  total = participants.filter(p => p.laneAssignedAt !== null).length
  // Only count assigned participants — not students still in diagnostic

Step 2 — Check if all Lane 3 failures are expected
  allExpected = lane3Participants.every(p => p.isUnexpectedFailure === false)

Step 3 — Apply threshold
  threshold = allExpected ? 0.50 : 0.35
  reteachAlert = (lane3Count / total) >= threshold

Step 4 — Update LiveSession.reteachAlert
```

---

## Supporting function

### `selectExplanationRoute()`

```ts
async function selectExplanationRoute(
  skillId: string,
  misconceptionTag: string | null
): Promise<string>  // returns explanationId
```

Logic:
1. Fetch `ExplanationPerformance` records for this skill, ordered by `dle DESC`
2. If `misconceptionTag` provided: prefer routes where `misconceptionSummary` matches tag
3. If no performance data: fall back to `routeType = 'A'`
4. Return `explanationId` of best match

---

## File structure

```
lib/
  live/
    lane-router.ts       ← this file (all functions above)
    lane-view.ts         ← built by /build-lane-view
    next-content.ts      ← Lane 1 content selection (see below)
```

---

## Lane 1 content selection

Also create `lib/live/next-content.ts`:

```ts
export async function getNextContent(
  studentUserId: string,
  currentSkillId: string,
  subjectId: string
): Promise<NextContentResult>

type NextContentResult = {
  type: 'NEXT_SKILL' | 'STRETCH' | 'SPACED_REVIEW'
  skillId: string
  itemId: string
  reason: string
}
```

Logic (evaluate in order):
1. **NEXT_SKILL**: All prerequisite skills have `mastery >= 0.85` AND `confirmedCount >= 2` → advance to next skill in graph
2. **STRETCH**: Current skill mastery is high but `transfer_ability < 0.65` → serve transfer/stretch question on current skill
3. **SPACED_REVIEW**: No stretch available → find the skill with the oldest `nextReviewAt` that is now overdue → serve a review item

---

## Tests

Create `__tests__/live/lane-router.test.ts`:

```ts
describe('assignLane', () => {
  it('assigns Lane 1 when anchor correct, independent, no hints, misconception passed')
  it('assigns Lane 2 when anchor correct but hints used')
  it('assigns Lane 2 when anchor correct but misconception check failed')
  it('assigns Lane 3 when anchor failed')
  it('assigns Lane 3 when anchor correct but support level was SCAFFOLDED')
  it('flags isUnexpectedFailure when mastery is 0.25+ below historical average')
})

describe('escalateLane', () => {
  it('moves student to Lane 3 and selects next unused explanation route')
  it('sets holdingAtFinalCheck when all routes exhausted')
  it('never serves the same explanation route twice in one session')
})

describe('handleHandback', () => {
  it('moves student to Lane 2 and returns a shadow check item')
  it('returns student to Lane 3 if shadow check subsequently fails')
})

describe('checkReteachThreshold', () => {
  it('sets reteachAlert at 35% Lane 3 when unexpected failures present')
  it('raises threshold to 50% when all failures are expected')
  it('clears reteachAlert when Lane 3 drops below threshold')
  it('only counts assigned participants, not students still in diagnostic')
})
```

---

## Critical constraints

- `assignLane` must complete in < 100ms — it runs while the student is waiting
- Never assign a student to Lane 1 if `anchorAttempt` is undefined — default to Lane 3
- Never loop a student through the same explanation route twice in one session
- `checkReteachThreshold` must exclude unassigned participants (still in diagnostic) from the denominator
- All lane transitions must be recorded in `LaneTransition` — this is the audit log for post-lesson analysis
