# scaffold-live-session

Scaffold all code needed to support a teacher-initiated live classroom session in 2XED, built around the three-lane routing model.

## Usage
```
/scaffold-live-session [classroomId] [subjectSlug] [skillCode?]
```

## The three-lane model

Every student in a live session is assigned to exactly one lane at all times:

- **Lane 1 — Got it**: App serves next content autonomously. Teacher does nothing.
- **Lane 2 — Nearly there**: App handles explanation routing. Teacher monitors only.
- **Lane 3 — Needs teacher**: Teacher intervenes directly. Dashboard shows name immediately.

All scaffolding must be built around this model. The lanes ARE the UI — do not build a heatmap-first interface.

---

## Step 1 — Prisma schema additions

Add to `prisma/schema.prisma`:

```prisma
enum StudentLane {
  LANE_1
  LANE_2
  LANE_3
}

enum EscalationReason {
  SHADOW_CHECK_FAILED
  ANCHOR_FAILED
  MISCONCEPTION_FAILED
  SCAFFOLDED_CORRECT
  MANUAL_TEACHER
}

enum LaneTransitionType {
  ASSIGNED          // Initial assignment after diagnostic
  ESCALATED         // Lane 2 → Lane 3 (automatic)
  HANDED_BACK       // Lane 3 → Lane 2 (teacher tap)
  RESOLVED          // Lane 3 → Lane 1 (teacher + shadow check passed)
}

model LiveSession {
  id              String            @id @default(cuid())
  classroomId     String
  teacherUserId   String
  subjectId       String
  skillId         String?
  status          LiveSessionStatus @default(WAITING)
  phase           LiveSessionPhase  @default(DIAGNOSTIC)
  reteachAlert    Boolean           @default(false)
  startedAt       DateTime?
  endedAt         DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  classroom       Classroom         @relation(fields: [classroomId], references: [id])
  teacher         User              @relation(fields: [teacherUserId], references: [id])
  subject         Subject           @relation(fields: [subjectId], references: [id])
  skill           Skill?            @relation(fields: [skillId], references: [id])
  participants    LiveParticipant[]
  transitions     LaneTransition[]
}

enum LiveSessionStatus {
  WAITING
  ACTIVE
  PAUSED
  ENDED
}

enum LiveSessionPhase {
  DIAGNOSTIC
  EXPLANATION
  SHADOW_CHECK
  REVIEW
}

model LiveParticipant {
  id                    String            @id @default(cuid())
  sessionId             String
  studentUserId         String
  currentLane           StudentLane       @default(LANE_3)
  currentExplanationId  String?
  escalationReason      EscalationReason?
  isUnexpectedFailure   Boolean           @default(false)
  holdingAtFinalCheck   Boolean           @default(false)
  joinedAt              DateTime          @default(now())
  lastActiveAt          DateTime          @default(now())
  laneAssignedAt        DateTime?
  session               LiveSession       @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  student               User              @relation(fields: [studentUserId], references: [id])
  transitions           LaneTransition[]

  @@unique([sessionId, studentUserId])
  @@index([sessionId, currentLane])
}

model LaneTransition {
  id              String             @id @default(cuid())
  sessionId       String
  participantId   String
  studentUserId   String
  fromLane        StudentLane?
  toLane          StudentLane
  transitionType  LaneTransitionType
  reason          EscalationReason?
  triggeredBy     String?            // userId of teacher if manual
  createdAt       DateTime           @default(now())
  session         LiveSession        @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  participant     LiveParticipant    @relation(fields: [participantId], references: [id], onDelete: Cascade)
}
```

After adding, run:
```bash
npx prisma migrate dev --name add_live_session_lanes
npx prisma generate
```

---

## Step 2 — API routes

### `POST /api/live/sessions`
Teacher creates a live session for a classroom + subject + optional skill.
Protected: TEACHER or ADMIN role.

### `GET /api/live/sessions/[sessionId]`
Returns session state: status, phase, reteachAlert, lane counts, participant list with current lanes.
Protected: TEACHER or ADMIN role.

### `PATCH /api/live/sessions/[sessionId]`
Update status or phase. Records phase changes as LaneTransition events.
Protected: TEACHER or ADMIN role.

### `POST /api/live/sessions/[sessionId]/join`
Student joins session. Creates LiveParticipant with `currentLane = LANE_3` as safe default until diagnostic completes.
Protected: STUDENT role.

### `GET /api/live/sessions/[sessionId]/lanes`
Returns the three-lane view for the teacher dashboard:

```ts
type LaneViewResponse = {
  lane1: { count: number, students: LaneStudent[] }
  lane2: { count: number, students: LaneStudent[] }
  lane3: {
    count: number,
    students: LaneStudent[]   // sorted by masteryProbability ASC
    reteachAlert: boolean
    reteachMessage: string | null
  }
  totalParticipants: number
  unassigned: number          // still completing diagnostic
}

type LaneStudent = {
  studentUserId: string
  studentName: string
  masteryProbability: number
  currentExplanationRouteType: string | null
  escalationReason: EscalationReason | null
  isUnexpectedFailure: boolean    // visual flag — usually secure, now failing
  waitingMinutes: number          // minutes since entering Lane 3
  holdingAtFinalCheck: boolean    // app has exhausted routes, waiting for teacher
}
```

### `POST /api/live/sessions/[sessionId]/participants/[participantId]/handback`
Teacher taps "handed back to app". Sets `currentLane = LANE_2`, triggers shadow check on student device.
Records LaneTransition of type `HANDED_BACK`.
Protected: TEACHER or ADMIN role.

---

## Step 3 — Lane assignment trigger

After a student completes their diagnostic questions, call `assignLane()` from `lib/live/lane-router.ts`.
This is scaffolded by the `/scaffold-lane-router` command — run that command to build the engine.

The result updates `LiveParticipant.currentLane` and creates a `LaneTransition` record of type `ASSIGNED`.

---

## Step 4 — Student device behaviour per lane

Implement in the student-facing live session page `app/student/live/[sessionId]/page.tsx`:

**Lane 1:**
Call `GET /api/live/sessions/[sessionId]/next-content` which uses strand progress to determine:
- Prerequisites met + mastery threshold passed → advance to next skill in graph
- Not ready to advance → serve stretch/transfer question on current skill
- No stretch content → serve spaced retrieval question on an earlier skill due for review

**Lane 2:**
App automatically routes to the highest DLE explanation route for this skill.
On shadow check failure → escalate to Lane 3 (call `POST .../escalate`), step down to simplest unused explanation route.
If all routes exhausted → set `holdingAtFinalCheck = true`, show final check question, wait.

**Lane 3:**
Show a calm holding state — do not leave the student idle.
Display the simplest explanation route not yet attempted, with worked examples.
Do not loop through content indefinitely — hold at final check question if all routes exhausted.

---

## Step 5 — Polling hook

Create `hooks/useLiveLanes.ts`:
```ts
// Poll GET /api/live/sessions/[sessionId]/lanes every 3 seconds
// Return: { lanes, isLoading, error, lastUpdated }
// On error: surface 'reconnecting' state, do not blank the screen
```

---

## Step 6 — Zod validators

Create `lib/validators/live-session.ts`:
- `CreateLiveSessionSchema`
- `UpdateLiveSessionSchema`
- `LaneViewResponseSchema`
- `LaneStudentSchema`
- `HandbackSchema`

---

## Step 7 — Tests

Add `__tests__/live-session/`:
- `lane-assignment.test.ts` — all assignment conditions produce correct lanes
- `escalation.test.ts` — Lane 2 → Lane 3 on shadow check failure, step-down logic
- `handback.test.ts` — Lane 3 → Lane 2 on teacher tap; return to Lane 3 on shadow fail
- `reteach-alert.test.ts` — 35% threshold triggers alert; 50% threshold when all failures expected
- `priority-order.test.ts` — Lane 3 sorted by masteryProbability ASC; unexpected failures visually flagged
- `holding.test.ts` — student is held at final check when all routes exhausted, not looped

---

## Auth guards

- Teacher routes: require `TEACHER` or `ADMIN` role via next-auth session check
- Student routes: require `STUDENT` role
- Students may only call `/join` and `/handback` for sessions linked to their enrolled classroom
- Students may not access the teacher lane view endpoint
