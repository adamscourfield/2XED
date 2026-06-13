/**
 * Live-session load driver (dependency-free, Node 20+).
 *
 * Simulates a school's worth of students hitting a live session: each virtual
 * student logs in via the real NextAuth credentials flow, opens the student-stream
 * SSE connection, and (optionally) submits attempts on a cadence. Reports latency
 * percentiles, error breakdown, and throughput so you can see where the server
 * strains before a real rollout.
 *
 * Reads scripts/loadtest/fixture.json (written by seed-loadtest.ts).
 *
 * Config via env:
 *   BASE_URL        override the seeded base URL (default: fixture.baseUrl)
 *   STUDENTS        cap the number of virtual students (default: all seeded)
 *   DURATION_S      how long to hold the streams open (default: 60)
 *   RAMP_S          spread logins/connections over this window (default: 20)
 *   ATTEMPTS        '1' to also submit attempts (default: off — read-path only)
 *   ATTEMPT_EVERY_S seconds between a student's attempts (default: 15)
 *
 * Example:
 *   DURATION_S=120 RAMP_S=30 ATTEMPTS=1 node scripts/loadtest/run-loadtest.mjs
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(path.join(__dirname, 'fixture.json'), 'utf8'));

const BASE_URL = process.env.BASE_URL ?? fixture.baseUrl;
const STUDENTS = Math.min(Number(process.env.STUDENTS ?? fixture.studentCount), fixture.studentCount);
const DURATION_S = Number(process.env.DURATION_S ?? 60);
const RAMP_S = Number(process.env.RAMP_S ?? 20);
const DO_ATTEMPTS = process.env.ATTEMPTS === '1';
const ATTEMPT_EVERY_S = Number(process.env.ATTEMPT_EVERY_S ?? 15);

// ── Metrics ──────────────────────────────────────────────────────────────────
const samples = { login: [], firstState: [], attempt: [] };
const counts = {
  loginOk: 0, loginFail: 0,
  sseConnected: 0, sseFailed: 0, sseDisconnected: 0,
  stateEvents: 0,
  attemptOk: 0, attemptFail: 0,
};
const errorsByKind = new Map();

function recordError(kind, detail) {
  const key = `${kind}${detail ? `: ${detail}` : ''}`;
  errorsByKind.set(key, (errorsByKind.get(key) ?? 0) + 1);
}

function pct(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

const now = () => Number(process.hrtime.bigint() / 1000000n);

// ── NextAuth credentials login (manual cookie jar) ───────────────────────────
function parseSetCookies(headers) {
  // Node's fetch exposes getSetCookie() on Headers (Node 20+).
  const list = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  return list.map((c) => c.split(';')[0]).filter(Boolean);
}

async function login(email, password) {
  const jar = new Map();
  const addCookies = (headers) => {
    for (const c of parseSetCookies(headers)) {
      const eq = c.indexOf('=');
      if (eq > 0) jar.set(c.slice(0, eq), c.slice(eq + 1));
    }
  };
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  // 1. CSRF token + cookie.
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, { redirect: 'manual' });
  addCookies(csrfRes.headers);
  const { csrfToken } = await csrfRes.json();

  // 2. Credentials callback — sets the session cookie.
  const body = new URLSearchParams({ csrfToken, email, password, json: 'true' });
  const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookieHeader() },
    body,
    redirect: 'manual',
  });
  addCookies(res.headers);

  const hasSession = [...jar.keys()].some((k) => k.includes('session-token'));
  if (!hasSession) throw new Error(`no session cookie (status ${res.status})`);
  return cookieHeader();
}

// ── One virtual student ──────────────────────────────────────────────────────
async function runStudent(index, deadlineMs) {
  const email = fixture.studentEmailPattern.replace('{i}', String(index));
  let cookie;

  // Login.
  const t0 = now();
  try {
    cookie = await login(email, fixture.password);
    samples.login.push(now() - t0);
    counts.loginOk++;
  } catch (err) {
    counts.loginFail++;
    recordError('login', err.message);
    return;
  }

  // Open the SSE stream and hold it until the deadline.
  const controller = new AbortController();
  const remaining = Math.max(0, deadlineMs - now());
  const sseDeadline = setTimeout(() => controller.abort(), remaining);

  const attemptTimer = DO_ATTEMPTS
    ? startAttempts(index, cookie, deadlineMs)
    : null;

  const tConnect = now();
  let gotFirst = false;
  try {
    const res = await fetch(`${BASE_URL}/api/live-sessions/${fixture.sessionId}/student-stream`, {
      headers: { cookie, accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      counts.sseFailed++;
      recordError('sse-connect', `status ${res.status}`);
      return;
    }
    counts.sseConnected++;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) { counts.sseDisconnected++; break; }
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (frame.includes('event: state')) {
          counts.stateEvents++;
          if (!gotFirst) { gotFirst = true; samples.firstState.push(now() - tConnect); }
        }
      }
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      counts.sseDisconnected++;
      recordError('sse-stream', err.message);
    }
  } finally {
    clearTimeout(sseDeadline);
    if (attemptTimer) clearInterval(attemptTimer);
  }
}

function startAttempts(index, cookie, deadlineMs) {
  let n = 0;
  return setInterval(async () => {
    if (now() >= deadlineMs) return;
    const itemId = fixture.itemIds[n % fixture.itemIds.length];
    n++;
    const t0 = now();
    try {
      const res = await fetch(`${BASE_URL}/api/live-sessions/${fixture.sessionId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ itemId, skillId: fixture.skillId, answer: 'A', responseTimeMs: 1200 }),
      });
      samples.attempt.push(now() - t0);
      if (res.ok) counts.attemptOk++;
      else { counts.attemptFail++; recordError('attempt', `status ${res.status}`); }
    } catch (err) {
      counts.attemptFail++;
      recordError('attempt', err.message);
    }
  }, ATTEMPT_EVERY_S * 1000);
}

// ── Orchestration ────────────────────────────────────────────────────────────
async function main() {
  console.log(`Load test → ${BASE_URL}`);
  console.log(`  students=${STUDENTS}  duration=${DURATION_S}s  ramp=${RAMP_S}s  attempts=${DO_ATTEMPTS ? `on (every ${ATTEMPT_EVERY_S}s)` : 'off'}`);
  console.log(`  session=${fixture.sessionId}\n`);

  const startedAt = now();
  const deadlineMs = startedAt + DURATION_S * 1000;
  const rampStepMs = STUDENTS > 1 ? (RAMP_S * 1000) / STUDENTS : 0;

  const runners = [];
  for (let i = 0; i < STUDENTS; i++) {
    runners.push(
      new Promise((resolve) => {
        setTimeout(() => { runStudent(i, deadlineMs).finally(resolve); }, Math.floor(i * rampStepMs));
      }),
    );
  }

  const progress = setInterval(() => {
    const elapsed = Math.round((now() - startedAt) / 1000);
    process.stdout.write(
      `\r[${elapsed}s] logins ${counts.loginOk}/${STUDENTS}  sse ${counts.sseConnected} open  ` +
      `state-events ${counts.stateEvents}  errors ${counts.loginFail + counts.sseFailed + counts.attemptFail}   `,
    );
  }, 1000);

  await Promise.all(runners);
  clearInterval(progress);
  process.stdout.write('\n\n');

  report();
}

function report() {
  const line = (label, arr) =>
    `  ${label.padEnd(16)} p50 ${String(pct(arr, 50)).padStart(6)}ms   p95 ${String(pct(arr, 95)).padStart(6)}ms   p99 ${String(pct(arr, 99)).padStart(6)}ms   (n=${arr.length})`;

  console.log('─'.repeat(72));
  console.log('LATENCY');
  console.log(line('login', samples.login));
  console.log(line('sse first-state', samples.firstState));
  if (DO_ATTEMPTS) console.log(line('attempt POST', samples.attempt));
  console.log('');
  console.log('OUTCOMES');
  console.log(`  logins:        ${counts.loginOk} ok, ${counts.loginFail} failed`);
  console.log(`  sse:           ${counts.sseConnected} connected, ${counts.sseFailed} failed, ${counts.sseDisconnected} dropped`);
  console.log(`  state events:  ${counts.stateEvents} received`);
  if (DO_ATTEMPTS) console.log(`  attempts:      ${counts.attemptOk} ok, ${counts.attemptFail} failed`);
  console.log('');
  if (errorsByKind.size > 0) {
    console.log('ERRORS');
    for (const [kind, n] of [...errorsByKind.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(5)} × ${kind}`);
    }
  } else {
    console.log('ERRORS  none 🎉');
  }
  console.log('─'.repeat(72));
  console.log('Interpreting: rising login p95 = bcrypt CPU saturation (stagger joins or scale CPU).');
  console.log('Rising sse first-state p95 with sse failures = DB connection-pool exhaustion');
  console.log('(raise connection_limit in DATABASE_URL and/or Postgres max_connections).');
}

main().catch((err) => { console.error(err); process.exit(1); });
