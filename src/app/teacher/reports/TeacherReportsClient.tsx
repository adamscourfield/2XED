"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";

const REPORT_TABS = [
  { id: "dle", label: "DLE overview" },
  { id: "topics", label: "Topics" },
  { id: "misconceptions", label: "Misconceptions" },
  { id: "students", label: "Students" },
  { id: "lessons", label: "Lessons" },
] as const;

type ReportTabId = (typeof REPORT_TABS)[number]["id"];

const DLE_LINE_POINTS = [
  { y: 1.05, week: "Wk 1", date: "19 Apr" },
  { y: 1.12, week: "Wk 2", date: "26 Apr" },
  { y: 1.18, week: "Wk 3", date: "3 May" },
  { y: 1.22, week: "Wk 4", date: "10 May" },
  { y: 1.28, week: "Wk 5", date: "17 May" },
  { y: 1.34, week: "Wk 6", date: "24 Jun" },
  { y: 1.42, week: "Wk 7", date: "12 Jul" },
];

const HIGH_TOPICS = [
  { name: "Expanding brackets", value: 1.85 },
  { name: "Collecting like terms", value: 1.62 },
  { name: "Indices and standard form", value: 1.48 },
];

const LOW_TOPICS = [
  { name: "Rearranging equations", value: 0.68 },
  { name: "Fractions with algebra", value: 0.74 },
  { name: "Solving equations (negatives)", value: 0.79 },
];

const RETENTION_ROWS = [
  { label: "1 week ago", pct: 92 },
  { label: "2 weeks ago", pct: 84 },
  { label: "3 weeks ago", pct: 76 },
  { label: "4 weeks ago", pct: 68 },
  { label: "5 weeks ago", pct: 56 },
  { label: "6+ weeks ago", pct: 45 },
];

const TABLE_ROWS = [
  {
    topic: "Expanding brackets",
    hours: "4.2",
    retained: "7.8",
    dle: "1.85",
    efficiency: "high" as const,
  },
  {
    topic: "Collecting like terms",
    hours: "3.6",
    retained: "5.8",
    dle: "1.62",
    efficiency: "high" as const,
  },
  {
    topic: "Rearranging equations",
    hours: "5.1",
    retained: "3.5",
    dle: "0.68",
    efficiency: "low" as const,
  },
  {
    topic: "Fractions with algebra",
    hours: "4.4",
    retained: "3.3",
    dle: "0.74",
    efficiency: "low" as const,
  },
];

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconExport({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15V3M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21 8 14 2 9.4h7.6L12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBrain({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5a3 3 0 0 0-3 3v1a3 3 0 1 0 6 0V8a3 3 0 0 0-3-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5 10a2.5 2.5 0 0 1 2.5-2.5H9M19 10a2.5 2.5 0 0 0-2.5-2.5H15M5 14a2.5 2.5 0 0 0 2.5 2.5H9M19 14a2.5 2.5 0 0 1-2.5 2.5H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M9 18v1a3 3 0 0 0 6 0v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconExternal({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function selectShellClassName() {
  return [
    "min-w-0 cursor-pointer appearance-none rounded-xl border border-[color:var(--anx-border)] bg-[var(--anx-surface-container-lowest)] py-2 pl-9 pr-9 text-sm font-medium text-[color:var(--anx-text)]",
    "shadow-sm transition-colors hover:border-[color:var(--anx-border-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--anx-primary)]",
  ].join(" ");
}

export function TeacherReportsHeaderActions() {
  const classSelectId = useId();
  const termSelectId = useId();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <div className="relative min-w-[10.5rem] flex-1 sm:flex-initial sm:min-w-[11.5rem]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--anx-text-muted)]">
          <IconUsers className="shrink-0" />
        </span>
        <label htmlFor={classSelectId} className="sr-only">
          Class or cohort
        </label>
        <select id={classSelectId} defaultValue="y7" className={`${selectShellClassName()} w-full`}>
          <option value="y7">Year 7 Maths</option>
          <option value="y8">Year 8 Maths</option>
          <option value="y9">Year 9 Maths</option>
        </select>
      </div>
      <div className="relative min-w-[12rem] flex-1 sm:flex-initial sm:min-w-[14rem]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--anx-text-muted)]">
          <IconCalendar className="shrink-0" />
        </span>
        <label htmlFor={termSelectId} className="sr-only">
          Reporting period
        </label>
        <select id={termSelectId} defaultValue="term" className={`${selectShellClassName()} w-full`}>
          <option value="term">This term (19 Apr – 18 Jul)</option>
          <option value="half">This half term</option>
          <option value="year">This year</option>
        </select>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--anx-border)] bg-[var(--anx-surface-container-lowest)] px-4 py-2 text-sm font-semibold text-[color:var(--anx-text)] shadow-sm transition-colors hover:bg-[var(--anx-surface-container-low)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--anx-primary)]"
      >
        <IconExport />
        Export
      </button>
      <button
        type="button"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--anx-border)] bg-[var(--anx-surface-container-lowest)] text-[color:var(--anx-text-secondary)] shadow-sm transition-colors hover:bg-[var(--anx-surface-container-low)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--anx-primary)]"
        aria-label="Notifications"
      >
        <IconBell />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--anx-primary)] ring-2 ring-white" aria-hidden />
      </button>
    </div>
  );
}

function DLELineChart() {
  const w = 280;
  const h = 120;
  const pad = { t: 12, r: 8, b: 36, l: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const yMin = 0;
  const yMax = 2;
  const n = DLE_LINE_POINTS.length - 1;

  const toX = (i: number) => pad.l + (i / n) * innerW;
  const toY = (v: number) => pad.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const pathD = DLE_LINE_POINTS.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.y)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full max-w-full" role="img" aria-label="DLE trend over seven weeks, increasing from about 1.0 to 1.4">
      {[0, 0.5, 1, 1.5, 2].map((tick) => {
        const y = toY(tick);
        return (
          <g key={tick}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--anx-border-subtle)" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" className="fill-[var(--anx-text-faint)] text-[9px] font-medium">
              {tick.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={pathD} fill="none" stroke="var(--anx-primary)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {DLE_LINE_POINTS.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.y)} r="4" fill="white" stroke="var(--anx-primary)" strokeWidth="2" />
      ))}
      {DLE_LINE_POINTS.map((p, i) => (
        <text
          key={`xl-${i}`}
          x={toX(i)}
          y={h - 14}
          textAnchor="middle"
          className="fill-[var(--anx-text-muted)] text-[7.5px] font-medium leading-tight"
        >
          <tspan x={toX(i)} dy="0">
            {p.week}
          </tspan>
          <tspan x={toX(i)} dy="10" fill="var(--anx-text-faint)" style={{ fontSize: "7px" }}>
            {p.date}
          </tspan>
        </text>
      ))}
    </svg>
  );
}

function TopicBarRow({
  name,
  value,
  max,
  tone,
}: {
  name: string;
  value: number;
  max: number;
  tone: "high" | "low";
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const bar =
    tone === "high"
      ? "bg-[var(--anx-success)]"
      : "bg-gradient-to-r from-[#ea580c] to-[var(--anx-warning)]";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-[color:var(--anx-text)]">{name}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[color:var(--anx-text)]">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--anx-surface-container)]">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RetentionBarRow({ label, pct }: { label: string; pct: number }) {
  const hue = pct >= 80 ? "var(--anx-success)" : pct >= 60 ? "#ca8a04" : "var(--anx-warning)";
  return (
    <div className="flex items-center gap-3">
      <span className="w-[6.5rem] shrink-0 text-xs font-medium text-[color:var(--anx-text-secondary)]">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--anx-surface-container)]">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hue }} />
        </div>
        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-[color:var(--anx-text)]">{pct}%</span>
      </div>
    </div>
  );
}

function InsightRow({
  icon,
  children,
  iconWrapClass,
}: {
  icon: ReactNode;
  children: ReactNode;
  iconWrapClass: string;
}) {
  return (
    <div className="flex gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>{icon}</div>
      <p className="m-0 min-w-0 flex-1 text-sm leading-snug text-[color:var(--anx-text)]">{children}</p>
    </div>
  );
}

function ActionRow({
  icon,
  title,
  iconClass,
}: {
  icon: ReactNode;
  title: string;
  iconClass: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-[color:var(--anx-border)] hover:bg-[var(--anx-surface-container-low)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--anx-primary)]"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
      <span className="min-w-0 flex-1 text-sm font-medium text-[color:var(--anx-text)]">{title}</span>
      <IconChevronRight className="shrink-0 text-[color:var(--anx-text-faint)]" />
    </button>
  );
}

function DLEOverview() {
  const maxHigh = Math.max(...HIGH_TOPICS.map((t) => t.value));
  const maxLow = Math.max(...LOW_TOPICS.map((t) => t.value));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-12">
        <section className="anx-card flex flex-col p-5 shadow-sm lg:col-span-4">
          <h2 className="m-0 text-sm font-semibold text-[color:var(--anx-text-secondary)]">Durable Learning Efficiency (DLE)</h2>
          <div className="mt-4 flex flex-wrap items-start gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-[color:var(--anx-text)] sm:text-5xl">1.42</span>
            </div>
            <div className="rounded-full bg-[var(--anx-success-soft)] px-3 py-1.5 text-center ring-1 ring-[var(--anx-success)]/20">
              <div className="text-sm font-bold text-[var(--anx-success)]">▲ 18%</div>
              <div className="text-[11px] font-medium text-[color:var(--anx-text-secondary)]">vs last term (1.20)</div>
            </div>
          </div>
          <p className="mt-1 text-sm text-[color:var(--anx-text-muted)]">retained learning points per teaching hour</p>
          <div className="mt-auto flex gap-3 rounded-xl bg-[rgba(74,64,224,0.08)] p-3.5 pt-4">
            <IconStar className="mt-0.5 shrink-0 text-[var(--anx-primary)]" />
            <p className="m-0 text-sm font-medium leading-snug text-[color:var(--anx-on-secondary-container)]">
              Students are retaining more learning per teaching hour than last term.
            </p>
          </div>
        </section>

        <section className="anx-card p-5 shadow-sm lg:col-span-5">
          <h2 className="m-0 text-sm font-semibold text-[color:var(--anx-text-secondary)]">DLE over time</h2>
          <div className="mt-4">
            <DLELineChart />
          </div>
        </section>

        <section className="anx-card flex flex-col p-5 shadow-sm lg:col-span-3">
          <h2 className="m-0 text-sm font-semibold text-[color:var(--anx-text-secondary)]">What is DLE?</h2>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--anx-text-secondary)]">
            DLE measures how much durable learning your teaching time produces — not just coverage, but what students still know after spacing and
            retrieval.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-[color:var(--anx-border-subtle)] bg-[var(--anx-surface-container-low)] px-4 py-5">
            <div className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-[color:var(--anx-text)]">
              <span className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-black/5">
                <IconBrain className="text-[var(--anx-primary)]" />
                Retained learning
              </span>
            </div>
            <div className="text-lg font-light text-[color:var(--anx-text-muted)]">÷</div>
            <div className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-[color:var(--anx-text)]">
              <span className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-black/5">
                <IconClock className="text-[var(--anx-primary)]" />
                Teaching hours
              </span>
            </div>
          </div>
          <Link
            href="/teacher/help"
            className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-[var(--anx-primary)] no-underline hover:underline"
          >
            Learn more about DLE
            <IconExternal />
          </Link>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="anx-card space-y-4 p-5 shadow-sm lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 text-sm font-semibold text-[color:var(--anx-text-secondary)]">DLE by topic</h2>
            <Link href="/teacher/question-bank" className="text-xs font-semibold text-[var(--anx-primary)] no-underline hover:underline">
              View all topics
            </Link>
          </div>
          <div>
            <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-[var(--anx-success)]">Highest DLE</p>
            <div className="space-y-4">
              {HIGH_TOPICS.map((t) => (
                <TopicBarRow key={t.name} {...t} max={maxHigh} tone="high" />
              ))}
            </div>
          </div>
          <div className="border-t border-[color:var(--anx-border-subtle)] pt-4">
            <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-[var(--anx-warning)]">Lowest DLE</p>
            <div className="space-y-4">
              {LOW_TOPICS.map((t) => (
                <TopicBarRow key={t.name} {...t} max={maxLow} tone="low" />
              ))}
            </div>
          </div>
        </section>

        <section className="anx-card space-y-4 p-5 shadow-sm lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-sm font-semibold text-[color:var(--anx-text-secondary)]">Retention over time</h2>
            <Link href="/teacher/dashboard/classes" className="text-xs font-semibold text-[var(--anx-primary)] no-underline hover:underline">
              View full retention
            </Link>
          </div>
          <p className="m-0 text-xs text-[color:var(--anx-text-muted)]">Taught in the last 6 weeks</p>
          <div className="space-y-3.5 pt-1">
            {RETENTION_ROWS.map((r) => (
              <RetentionBarRow key={r.label} {...r} />
            ))}
          </div>
        </section>

        <section className="anx-card flex flex-col p-5 shadow-sm lg:col-span-3">
          <h2 className="m-0 text-sm font-semibold text-[color:var(--anx-text-secondary)]">Insights</h2>
          <div className="mt-4 flex flex-col gap-4">
            <InsightRow
              iconWrapClass="bg-[var(--anx-success-soft)] text-[var(--anx-success)]"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              DLE improved 18% vs last term.
            </InsightRow>
            <InsightRow
              iconWrapClass="bg-[var(--anx-warning-soft)] text-[var(--anx-warning)]"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3 12c2-4 4-6 6-6s4 2 6 6M3 18c2-4 4-6 6-6s4 2 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              }
            >
              <span className="font-semibold">Rearranging equations</span> has the lowest DLE.
            </InsightRow>
            <InsightRow
              iconWrapClass="bg-[rgba(74,64,224,0.12)] text-[var(--anx-primary)]"
              icon={<IconStar className="h-4 w-4" />}
            >
              Retention drops after 4 weeks.
            </InsightRow>
          </div>
          <span className="mt-auto inline-flex cursor-default items-center gap-1 pt-4 text-sm font-semibold text-[var(--anx-primary)] opacity-80">
            View all insights
            <IconChevronRight />
          </span>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="anx-card overflow-hidden p-0 shadow-sm lg:col-span-8">
          <div className="border-b border-[color:var(--anx-border-subtle)] px-5 py-4">
            <h2 className="m-0 text-sm font-semibold text-[color:var(--anx-text-secondary)]">Teaching time vs retained learning</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--anx-border-subtle)] bg-[var(--anx-surface-container-low)] text-[11px] font-bold uppercase tracking-wide text-[color:var(--anx-text-muted)]">
                  <th className="px-5 py-3">Topic</th>
                  <th className="px-3 py-3">Teaching hours</th>
                  <th className="px-3 py-3">Retained learning</th>
                  <th className="px-3 py-3">DLE</th>
                  <th className="px-5 py-3">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr key={row.topic} className="border-b border-[color:var(--anx-border-subtle)] last:border-0">
                    <td className="px-5 py-3.5 font-medium text-[color:var(--anx-text)]">{row.topic}</td>
                    <td className="px-3 py-3.5 tabular-nums text-[color:var(--anx-text-secondary)]">{row.hours}</td>
                    <td className="px-3 py-3.5 tabular-nums text-[color:var(--anx-text-secondary)]">{row.retained}</td>
                    <td className="px-3 py-3.5 font-semibold tabular-nums text-[color:var(--anx-text)]">{row.dle}</td>
                    <td className="px-5 py-3.5">
                      {row.efficiency === "high" ? (
                        <span className="inline-flex rounded-full bg-[var(--anx-success-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--anx-success)] ring-1 ring-[var(--anx-success)]/25">
                          High
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[var(--anx-danger-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--anx-danger)] ring-1 ring-[var(--anx-danger)]/20">
                          Low
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="anx-card p-5 shadow-sm lg:col-span-4">
          <h2 className="m-0 text-sm font-semibold text-[color:var(--anx-text-secondary)]">Suggested actions</h2>
          <div className="mt-3 flex flex-col gap-1">
            <ActionRow
              title="Create recap on rearranging equations."
              iconClass="bg-[rgba(74,64,224,0.12)] text-[var(--anx-primary)]"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 21v-5h-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <ActionRow
              title="Schedule retrieval check in 3 weeks."
              iconClass="bg-[var(--anx-success-soft)] text-[var(--anx-success)]"
              icon={<IconCalendar className="text-[var(--anx-success)]" />}
            />
            <ActionRow
              title="Generate practice for low DLE topics."
              iconClass="bg-[var(--anx-warning-soft)] text-[var(--anx-warning)]"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export function TeacherReportsDashboard() {
  const [tab, setTab] = useState<ReportTabId>("dle");

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Report sections" className="flex flex-wrap gap-1 border-b border-[color:var(--anx-border-subtle)]">
        {REPORT_TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`report-tab-${t.id}`}
              aria-controls={`report-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={[
                "relative -mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                selected
                  ? "border-[var(--anx-primary)] text-[var(--anx-primary)]"
                  : "border-transparent text-[color:var(--anx-text-muted)] hover:text-[color:var(--anx-text)]",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`report-panel-${tab}`}
        aria-labelledby={`report-tab-${tab}`}
        className={tab === "dle" ? "" : "rounded-xl border border-dashed border-[color:var(--anx-border)] bg-[var(--anx-surface-container-low)]/60 p-10 text-center"}
      >
        {tab === "dle" ? (
          <DLEOverview />
        ) : (
          <p className="m-0 text-sm text-[color:var(--anx-text-secondary)]">
            This view is coming soon. Use <strong className="text-[color:var(--anx-text)]">DLE overview</strong> for durable learning efficiency
            analytics.
          </p>
        )}
      </div>
    </div>
  );
}
