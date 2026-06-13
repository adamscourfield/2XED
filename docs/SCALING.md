# Scaling live sessions

Practical guidance for running school-scale live lessons — hundreds of students
connected to one session at once. Read this before a large rollout.

## The bottleneck at a few hundred students

Each connected student holds a live-update stream that queries the database
every ~2s, and every student logs in (a CPU-heavy password check) at lesson
start. At a few hundred concurrent students the limit you hit first is almost
always the **database connection pool**, not CPU or the application code.

Prisma defaults to a small pool — `num_cpus * 2 + 1` connections **per app
instance**. With hundreds of students querying every couple of seconds, requests
queue waiting for a free connection, which shows up as rising latency and
eventually timeouts. The fix is configuration, not code.

## Tuning the pool

Set these in the app's environment (see `.env.example`):

| Var | What it does | Starting point |
|-----|--------------|----------------|
| `DATABASE_CONNECTION_LIMIT` | Max pooled connections per app instance | `20` |
| `DATABASE_POOL_TIMEOUT` | Seconds a query waits for a free connection before erroring | `10` |

Leaving them unset preserves Prisma's default behaviour exactly — these only take
effect when set. An explicit `connection_limit` already in `DATABASE_URL` is
respected and not overridden.

### Sizing it correctly

The hard ceiling is **Postgres `max_connections`** (default `100`). Your total
must stay under it with headroom:

```
(DATABASE_CONNECTION_LIMIT) × (number of app instances)  +  overhead  <  Postgres max_connections
```

- **Overhead**: migrations, the load-test seeder, admin tools, monitoring — leave
  ~20% slack.
- **Single instance, default Postgres**: `DATABASE_CONNECTION_LIMIT=20` is a safe,
  effective starting point (20 of 100, lots of headroom). Many simple indexed
  queries share 20 connections comfortably.
- **Raising Postgres `max_connections`** costs ~10 MB RAM per connection and has
  diminishing returns past a point; a connection pooler (PgBouncer) is the right
  tool if you genuinely need thousands. You are very unlikely to need that at a
  few hundred students.

Don't guess the exact number — **measure** (next section) and adjust.

## Measure before you tune: the load test

`scripts/loadtest/` simulates a school's worth of students against a copy of the
stack and reports where it strains. See `scripts/loadtest/README.md`. Run it at
your expected peak (e.g. 300 students), read the percentiles, and:

- **Login p95 climbing** → password-check CPU saturation. Stagger lesson starts
  or give the app more CPU.
- **Stream first-state p95 climbing + stream failures** → connection-pool
  exhaustion. Raise `DATABASE_CONNECTION_LIMIT` (within the sizing budget above)
  and re-test.
- **Clean run at your peak** → you're ready; no further work needed.

## Running more than one app instance

Two things to know if you scale horizontally (multiple app containers behind a
load balancer):

1. **Connection budget is shared.** `DATABASE_CONNECTION_LIMIT` is *per instance*
   — multiply by instance count against `max_connections` (see sizing above).
2. **The rate limiter is in-process.** `src/lib/rateLimit.ts` counts per instance,
   so the effective limit becomes `limit × instances`. Fine for protecting the
   app; if you need a precise global limit across instances, move it to a shared
   store (Redis). Not required for a single instance.

The live-update streams themselves are database-backed (no shared in-memory
state), so they work correctly across multiple instances as-is.

## When the realtime push *does* become worth it

The current live updates poll the database on a short interval. That's simple and
fine for a few hundred students on a tuned pool. If load testing shows the
database struggling even after pool tuning — i.e. you're genuinely at thousands of
concurrent students — that's the signal to replace polling with event-driven push
(publish on state change via Redis/pub-sub). It's a real rewrite; do it when the
numbers justify it, not before.
