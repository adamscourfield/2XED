# Live-session load test

Measures whether a single deployment copes with a school-scale live lesson —
hundreds of students connected to one session at once — and surfaces the real
bottleneck before a rollout.

It's a standalone tool: the driver touches nothing in the app, and the seeder
namespaces everything it creates under `loadtest-*@loadtest.ember.local` and tears
it down on each run. **Run it against a throwaway copy of the stack, never
production.**

## What it tells you

- **Login throughput** — every student logs in at lesson start; `bcrypt` is
  CPU-heavy, so this is a real thundering-herd. Rising login p95 = CPU saturation.
- **Live-stream capacity** — each student holds an SSE connection that queries the
  DB every 2s. Rising first-state p95 plus SSE failures = **database
  connection-pool exhaustion**, the most likely limit at a few hundred students.
- **Attempt path** (optional) — write latency under load.

## Prerequisites

1. A running copy of the app + Postgres (e.g. `docker compose up` on a sized VM,
   or a staging deploy). Note its URL.
2. The main DB seed has been run (`npm run db:seed`) so there's a subject/skill
   with MCQ items to target.
3. **Unset `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` in the test environment** so the
   attempt path can't make paid AI calls if the item pool runs low.

## Run it

```bash
# 1. Provision N students + an ACTIVE session (writes fixture.json)
STUDENTS=300 BASE_URL=https://staging.example.com \
  npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' \
  scripts/loadtest/seed-loadtest.ts
# or: STUDENTS=300 npm run loadtest:seed

# 2. Drive the load (read-path only by default)
DURATION_S=120 RAMP_S=30 node scripts/loadtest/run-loadtest.mjs
# or: npm run loadtest:run

# Include attempt submissions:
ATTEMPTS=1 DURATION_S=120 node scripts/loadtest/run-loadtest.mjs
```

### Driver knobs (env)

| Var | Default | Meaning |
|-----|---------|---------|
| `BASE_URL` | from fixture | Target URL |
| `STUDENTS` | all seeded | Cap virtual students |
| `DURATION_S` | 60 | How long to hold streams open |
| `RAMP_S` | 20 | Spread connections over this window |
| `ATTEMPTS` | off | `1` to also submit attempts |
| `ATTEMPT_EVERY_S` | 15 | Seconds between a student's attempts |

## Reading the result

The report prints p50/p95/p99 for login, SSE first-state, and (if enabled)
attempts, plus an error breakdown. The footer maps symptoms to fixes — the
headline being that **connection-pool exhaustion is a config change**
(`?connection_limit=N` on `DATABASE_URL` + Postgres `max_connections`), not a
code rewrite.

## Cleanup

Re-running the seeder wipes the previous fixture. To remove it entirely, delete
users matching `@loadtest.ember.local` (the seeder does this on its next run).
