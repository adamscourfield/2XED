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
  { topic: "Expanding brackets", hours: "4.2", retained: "7.8", dle: "1.85", efficiency: "high" as const },
  { topic: "Collecting like terms", hours: "3.6", retained: "5.8", dle: "1.62", efficiency: "high" as const },
  { topic: "Rearranging equations", hours: "5.1", retained: "3.5", dle: "0.68", efficiency: "low" as const },
  { topic: "Fractions with algebra", hours: "4.4", retained: "3.3", dle: "0.74", efficiency: "low" as const },
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

/** Export / upload: arrow rising from a tray (matches common “export” affordance). */
function IconExport({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M6 20v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2V20h16v-2l-2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStar({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21 8 14 2 9.4h7.6L12 2Z" />
      </svg>
    );
  }
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
      <path
        d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function IconTrendUp({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWave({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0M2 18c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function selectClass() {
  return [
    "min-w-0 w-full cursor-pointer appearance-none rounded-lg border border-[rgba(15,23,42,0.08)] bg-white py-2.5 pl-10 pr-9",
    "text-sm font-medium text-[#1a1a1a] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors",
    "hover:border-[rgba(15,23,42,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--report-purple)]",
  ].join(" ");
}

export function TeacherReportsHeaderActions() {
  const classSelectId = useId();
  const termSelectId = useId();

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
      <div className="relative min-w-0 sm:min-w-[12.5rem]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]">
          <IconUsers className="shrink-0" />
        </span>
        <label htmlFor={classSelectId} className="sr-only">
          Class or cohort
        </label>
        <select id={classSelectId} defaultValue="y7" className={selectClass()}>
          <option value="y7">Year 7 Maths</option>
          <option value="y8">Year 8 Maths</option>
          <option value="y9">Year 9 Maths</option>
        </select>
      </div>
      <div className="relative min-w-0 sm:min-w-[15.5rem]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]">
          <IconCalendar className="shrink-0" />
        </span>
        <label htmlFor={termSelectId} className="sr-only">
          Reporting period
        </label>
        <select id={termSelectId} defaultValue="term" className={selectClass()}>
          <option value="term">This term (19 Apr – 18 Jul)</option>
          <option value="half">This half term</option>
          <option value="year">This year</option>
        </select>
      </div>
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm font-semibold text-[#1a1a1a] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--report-purple)]"
      >
        <IconExport />
        Export
      </button>
      <button
        type="button"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(15,23,42,0.08)] bg-white text-[#64748b] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--report-purple)]"
        aria-label="Notifications"
      >
        <IconBell />
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-white"
          style={{ backgroundColor: "var(--report-purple)" }}
          aria-hidden
        />
      </button>
    </div>
  );
}

function DLELineChart() {
  const w = 520;
  const h = 200;
  const pad = { t: 16, r: 12, b: 44, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const yMin = 0;
  const yMax = 2;
  const n = DLE_LINE_POINTS.length - 1;

  const toX = (i: number) => pad.l + (i / n) * innerW;
  const toY = (v: number) => pad.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const pathD = DLE_LINE_POINTS.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.y)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-[11rem] w-full max-w-full sm:h-[12.5rem]"
      role="img"
      aria-label="DLE trend over seven weeks, increasing from about 1.0 to 1.4"
    >
      {[0, 0.5, 1, 1.5, 2].map((tick) => {
        const y = toY(tick);
        return (
          <g key={tick}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="rgba(15,23,42,0.06)" strokeWidth="1" />
            <text
              x={pad.l - 8}
              y={y + 4}
              textAnchor="end"
              fill="#94a3b8"
              style={{ fontSize: "11px", fontWeight: 600 }}
            >
              {tick.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path
        d={pathD}
        fill="none"
        stroke="var(--report-purple)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {DLE_LINE_POINTS.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.y)} r="5" fill="#ffffff" stroke="var(--report-purple)" strokeWidth="2.5" />
      ))}
      {DLE_LINE_POINTS.map((p, i) => (
        <text
          key={`xl-${i}`}
          x={toX(i)}
          y={h - 18}
          textAnchor="middle"
          fill="#64748b"
          style={{ fontSize: "10px", fontWeight: 600 }}
        >
          <tspan x={toX(i)} dy="0">
            {p.week}
          </tspan>
          <tspan x={toX(i)} dy="12" fill="#94a3b8" style={{ fontSize: "9px", fontWeight: 500 }}>
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
  const barStyle =
    tone === "high"
      ? { width: `${pct}%`, background: "var(--report-green)" }
      : { width: `${pct}%`, background: "linear-gradient(90deg, var(--report-orange) 0%, var(--report-red) 100%)" };
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[0.8125rem] font-medium leading-tight text-[#1a1a1a]">{name}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[#1a1a1a]">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#f1f5f9]">
        <div className="h-full rounded-full transition-all" style={barStyle} />
      </div>
    </div>
  );
}

function retentionBarColor(pct: number): string {
  const t = Math.max(0, Math.min(1, (100 - pct) / 55));
  const g1 = { r: 34, g: 197, b: 94 };
  const g2 = { r: 249, g: 115, b: 22 };
  const r = Math.round(g1.r + (g2.r - g1.r) * t);
  const g = Math.round(g1.g + (g2.g - g1.g) * t);
  const b = Math.round(g1.b + (g2.b - g1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function RetentionBarRow({ label, pct }: { label: string; pct: number }) {
  const fill = retentionBarColor(pct);
  return (
    <div className="flex items-center gap-3">
      <span className="w-[6.75rem] shrink-0 text-xs font-medium text-[#64748b]">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#f1f5f9]">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: fill }} />
        </div>
        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-[#1a1a1a]">{pct}%</span>
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
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>{icon}</div>
      <p className="m-0 min-w-0 flex-1 text-sm leading-snug text-[#334155]">{children}</p>
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
      className="flex w-full items-center gap-3 rounded-xl border border-transparent py-2 pl-1 pr-1 text-left transition-colors hover:border-[rgba(15,23,42,0.06)] hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--report-purple)]"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-[#1a1a1a]">{title}</span>
      <IconChevronRight className="shrink-0 text-[#cbd5e1]" />
    </button>
  );
}

const card = "anx-reports-card flex flex-col p-5 sm:p-6";

function DLEOverview() {
  const maxHigh = Math.max(...HIGH_TOPICS.map((t) => t.value));
  const maxLow = Math.max(...LOW_TOPICS.map((t) => t.value));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className={`${card} min-h-[17rem] xl:col-span-4`}>
          <h2 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">Durable Learning Efficiency (DLE)</h2>
          <div className="mt-5 flex flex-wrap items-start gap-4">
            <span className="text-[2.75rem] font-bold leading-none tracking-tight text-[#0f172a] sm:text-5xl">1.42</span>
            <div className="rounded-full px-3.5 py-2 text-center" style={{ background: "var(--report-green-soft)" }}>
              <div className="text-sm font-bold" style={{ color: "var(--report-green-dark)" }}>
                ▲ 18%
              </div>
              <div className="text-[11px] font-medium text-[#64748b]">vs last term (1.20)</div>
            </div>
          </div>
          <p className="mt-2 text-sm text-[#64748b]">retained learning points per teaching hour</p>
          <div className="mt-auto flex gap-3 rounded-xl p-4" style={{ background: "var(--report-purple-tint)" }}>
            <IconStar className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--report-purple)" }} filled />
            <p className="m-0 text-sm font-medium leading-snug" style={{ color: "var(--report-purple-dark)" }}>
              Students are retaining more learning per teaching hour than last term.
            </p>
          </div>
        </section>

        <section className={`${card} xl:col-span-5`}>
          <h2 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">DLE over time</h2>
          <div className="mt-2 -mx-1">
            <DLELineChart />
          </div>
        </section>

        <section className={`${card} min-h-[17rem] xl:col-span-3`}>
          <h2 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">What is DLE?</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#64748b]">
            DLE measures how much durable learning your teaching time produces — not just coverage, but what students still know after spacing and
            retrieval.
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-3 rounded-xl border border-[rgba(15,23,42,0.06)] bg-[#f8fafc] px-4 py-5">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-[#1a1a1a] shadow-sm ring-1 ring-[rgba(15,23,42,0.05)]">
              <IconBrain className="shrink-0" style={{ color: "var(--report-purple)" }} />
              Retained learning
            </div>
            <div className="text-center text-lg font-light text-[#94a3b8]">÷</div>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-[#1a1a1a] shadow-sm ring-1 ring-[rgba(15,23,42,0.05)]">
              <IconClock className="shrink-0" style={{ color: "var(--report-purple)" }} />
              Teaching hours
            </div>
          </div>
          <Link
            href="/teacher/help"
            className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold no-underline hover:underline"
            style={{ color: "var(--report-purple)" }}
          >
            Learn more about DLE
            <IconExternal />
          </Link>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className={`${card} xl:col-span-4`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">DLE by topic</h2>
            <Link href="/teacher/question-bank" className="text-xs font-semibold no-underline hover:underline" style={{ color: "var(--report-purple)" }}>
              View all topics
            </Link>
          </div>
          <div className="mt-5">
            <p className="m-0 mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--report-green-dark)" }}>
              Highest DLE
            </p>
            <div className="space-y-5">
              {HIGH_TOPICS.map((t) => (
                <TopicBarRow key={t.name} {...t} max={maxHigh} tone="high" />
              ))}
            </div>
          </div>
          <div className="mt-6 border-t border-[rgba(15,23,42,0.06)] pt-6">
            <p className="m-0 mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--report-red)" }}>
              Lowest DLE
            </p>
            <div className="space-y-5">
              {LOW_TOPICS.map((t) => (
                <TopicBarRow key={t.name} {...t} max={maxLow} tone="low" />
              ))}
            </div>
          </div>
        </section>

        <section className={`${card} xl:col-span-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">Retention over time</h2>
            <Link href="/teacher/dashboard/classes" className="text-xs font-semibold no-underline hover:underline" style={{ color: "var(--report-purple)" }}>
              View full retention
            </Link>
          </div>
          <p className="m-0 mt-1 text-xs text-[#94a3b8]">Taught in the last 6 weeks</p>
          <div className="mt-5 space-y-4">
            {RETENTION_ROWS.map((r) => (
              <RetentionBarRow key={r.label} {...r} />
            ))}
          </div>
        </section>

        <section className={`${card} xl:col-span-3`}>
          <h2 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">Insights</h2>
          <div className="mt-5 flex flex-col gap-5">
            <InsightRow iconWrapClass="bg-[#dcfce7] text-[var(--report-green-dark)]" icon={<IconTrendUp className="shrink-0" />}>
              DLE improved 18% vs last term.
            </InsightRow>
            <InsightRow iconWrapClass="bg-[#ffedd5] text-[var(--report-orange)]" icon={<IconWave className="shrink-0" />}>
              <span className="font-semibold text-[#1a1a1a]">Rearranging equations</span> has the lowest DLE.
            </InsightRow>
            <InsightRow
              iconWrapClass="bg-[rgba(94,53,177,0.1)] text-[var(--report-purple)]"
              icon={<IconStar className="h-[18px] w-[18px] shrink-0" filled />}
            >
              Retention drops after 4 weeks.
            </InsightRow>
          </div>
          <span className="mt-auto inline-flex cursor-default items-center gap-1 pt-6 text-sm font-semibold opacity-90" style={{ color: "var(--report-purple)" }}>
            View all insights
            <IconChevronRight />
          </span>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="anx-reports-card overflow-hidden xl:col-span-8">
          <div className="border-b border-[rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5">
            <h2 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">Teaching time vs retained learning</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  <th className="px-5 py-3.5 sm:px-6">Topic</th>
                  <th className="px-3 py-3.5">Teaching hours</th>
                  <th className="px-3 py-3.5">Retained learning</th>
                  <th className="px-3 py-3.5">DLE</th>
                  <th className="px-5 py-3.5 sm:px-6">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr key={row.topic} className="border-b border-[rgba(15,23,42,0.05)] last:border-0">
                    <td className="px-5 py-4 font-medium text-[#1a1a1a] sm:px-6">{row.topic}</td>
                    <td className="px-3 py-4 tabular-nums text-[#64748b]">{row.hours}</td>
                    <td className="px-3 py-4 tabular-nums text-[#64748b]">{row.retained}</td>
                    <td className="px-3 py-4 font-semibold tabular-nums text-[#1a1a1a]">{row.dle}</td>
                    <td className="px-5 py-4 sm:px-6">
                      {row.efficiency === "high" ? (
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                          style={{ background: "var(--report-green-soft)", color: "var(--report-green-dark)" }}
                        >
                          High
                        </span>
                      ) : (
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                          style={{ background: "var(--report-red-soft)", color: "var(--report-red)" }}
                        >
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

        <section className={`${card} xl:col-span-4`}>
          <h2 className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">Suggested actions</h2>
          <div className="mt-4 flex flex-col">
            <ActionRow
              title="Create recap on rearranging equations."
              iconClass="bg-[rgba(94,53,177,0.1)] text-[var(--report-purple)]"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 21v-5h-5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
            <ActionRow
              title="Schedule retrieval check in 3 weeks."
              iconClass="bg-[#dcfce7] text-[var(--report-green-dark)]"
              icon={<IconCalendar className="text-[var(--report-green-dark)]" />}
            />
            <ActionRow
              title="Generate practice for low DLE topics."
              iconClass="bg-[#ffedd5] text-[var(--report-orange)]"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
    <div className="space-y-2">
      <div
        role="tablist"
        aria-label="Report sections"
        className="flex flex-wrap gap-0 border-b border-[rgba(15,23,42,0.08)]"
      >
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
                "relative -mb-px px-4 py-3.5 text-sm font-semibold tracking-tight transition-colors sm:px-5",
                selected ? "text-[var(--report-purple)]" : "text-[#64748b] hover:text-[#334155]",
              ].join(" ")}
            >
              {t.label}
              {selected ? (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full sm:left-4 sm:right-4"
                  style={{ background: "var(--report-purple)" }}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`report-panel-${tab}`}
        aria-labelledby={`report-tab-${tab}`}
        className={
          tab === "dle"
            ? "pt-4"
            : "rounded-xl border border-dashed border-[rgba(15,23,42,0.12)] bg-white/80 p-10 text-center shadow-sm"
        }
      >
        {tab === "dle" ? (
          <DLEOverview />
        ) : (
          <p className="m-0 text-sm text-[#64748b]">
            This view is coming soon. Use <strong className="text-[#1a1a1a]">DLE overview</strong> for durable learning efficiency analytics.
          </p>
        )}
      </div>
    </div>
  );
}
