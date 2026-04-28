'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';

type ResourceCategory =
  | 'all'
  | 'model'
  | 'check'
  | 'practice'
  | 'recap'
  | 'reteach'
  | 'discussion'
  | 'worksheet';

type DemoResource = {
  id: string;
  title: string;
  topic: string;
  yearLabel: string;
  typeLabel: string;
  typeKey: Exclude<ResourceCategory, 'all'>;
  usedAgo: string;
  thumbClass: string;
};

const CATEGORY_ROWS: { id: ResourceCategory; label: string; count: number; icon: string; accent: string }[] = [
  { id: 'all', label: 'All resources', count: 312, icon: 'grid', accent: 'indigo' },
  { id: 'model', label: 'Model', count: 48, icon: 'layers', accent: 'emerald' },
  { id: 'check', label: 'Check', count: 56, icon: 'target', accent: 'amber' },
  { id: 'practice', label: 'Practice', count: 82, icon: 'pen', accent: 'sky' },
  { id: 'recap', label: 'Recap', count: 34, icon: 'cycle', accent: 'violet' },
  { id: 'reteach', label: 'Reteach', count: 41, icon: 'bullseye', accent: 'rose' },
  { id: 'discussion', label: 'Discussion', count: 22, icon: 'chat', accent: 'purple' },
  { id: 'worksheet', label: 'Worksheet', count: 29, icon: 'doc', accent: 'teal' },
];

const RECENT_RESOURCES: DemoResource[] = [
  {
    id: 'r1',
    title: 'Solving equations: balancing both sides',
    topic: 'Algebra',
    yearLabel: 'Year 7',
    typeLabel: 'Model',
    typeKey: 'model',
    usedAgo: '2 days',
    thumbClass: 'bg-gradient-to-br from-violet-100 to-indigo-50',
  },
  {
    id: 'r2',
    title: 'Expanding single brackets',
    topic: 'Algebra',
    yearLabel: 'Year 7',
    typeLabel: 'Check',
    typeKey: 'check',
    usedAgo: '4 days',
    thumbClass: 'bg-gradient-to-br from-amber-50 to-orange-50',
  },
  {
    id: 'r3',
    title: 'Area of compound shapes',
    topic: 'Geometry',
    yearLabel: 'Year 7',
    typeLabel: 'Practice',
    typeKey: 'practice',
    usedAgo: '1 week',
    thumbClass: 'bg-gradient-to-br from-sky-100 to-blue-50',
  },
  {
    id: 'r4',
    title: 'Fractions: four operations recap',
    topic: 'Number',
    yearLabel: 'Year 7',
    typeLabel: 'Recap',
    typeKey: 'recap',
    usedAgo: '1 week',
    thumbClass: 'bg-gradient-to-br from-fuchsia-50 to-violet-50',
  },
];

const TOPIC_FOLDERS: { id: string; label: string; count: number; accent: string }[] = [
  { id: 'algebra', label: 'Algebra', count: 68, accent: 'from-violet-500/15 to-violet-600/5 text-violet-700' },
  { id: 'number', label: 'Number', count: 54, accent: 'from-emerald-500/15 to-emerald-600/5 text-emerald-800' },
  { id: 'geometry', label: 'Geometry', count: 45, accent: 'from-sky-500/15 to-sky-600/5 text-sky-800' },
  { id: 'ratio', label: 'Ratio & Proportion', count: 32, accent: 'from-orange-500/15 to-amber-500/5 text-orange-900' },
  { id: 'statistics', label: 'Statistics', count: 27, accent: 'from-pink-500/15 to-rose-500/5 text-rose-800' },
];

const AI_RESOURCES: { id: string; title: string; typeLabel: string; context: string }[] = [
  {
    id: 'a1',
    title: 'Reteach: Sign errors when isolating x',
    typeLabel: 'Reteach',
    context: 'Generated from misconception insights in 7MA.',
  },
  {
    id: 'a2',
    title: 'Check: Expanding brackets',
    typeLabel: 'Check',
    context: 'Based on recent exit tickets in Year 7 Algebra.',
  },
  {
    id: 'a3',
    title: 'Practice: Ratio tables',
    typeLabel: 'Practice',
    context: 'Suggested from class performance on ratio unit.',
  },
];

const SAVED_SEQUENCES: { title: string; count: number }[] = [
  { title: 'Fractions reteach', count: 4 },
  { title: 'Negative numbers recovery', count: 5 },
  { title: 'Foundation recap', count: 3 },
];

const TYPE_TAG_STYLES: Record<DemoResource['typeKey'], string> = {
  model: 'bg-emerald-100 text-emerald-900',
  check: 'bg-amber-100 text-amber-950',
  practice: 'bg-sky-100 text-sky-950',
  recap: 'bg-violet-100 text-violet-900',
  reteach: 'bg-rose-100 text-rose-900',
  discussion: 'bg-purple-100 text-purple-900',
  worksheet: 'bg-teal-100 text-teal-900',
};

function SelectChevron() {
  return (
    <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="mb-1 block text-xs font-medium text-[color:var(--anx-text-muted)]">{label}</span>
      <select
        className="anx-input w-full cursor-pointer appearance-none rounded-full py-2 pl-3 pr-9 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <SelectChevron />
    </label>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 7.5v9l7.5-4.5L9 7.5Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v2.5M12 18.5V21M4.2 4.2l1.8 1.8M18 18l1.8 1.8M3 12h2.5M18.5 12H21M4.2 19.8l1.8-1.8M18 6l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 8.5 13.2 12l3.3 1.2-3.3 1.2L12 17.5l-1.2-3.1L7.5 13.2l3.3-1.2L12 8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoryIcon({ kind }: { kind: string }) {
  const stroke = 'currentColor';
  switch (kind) {
    case 'grid':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'layers':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2 2 7l10 5 10-5-10-5Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m2 12 10 5 10-5M2 17l10 5 10-5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'target':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="5" stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="1" fill={stroke} />
        </svg>
      );
    case 'pen':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 19h7M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'cycle':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M21 21v-5h-5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'bullseye':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="6" stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill={stroke} />
        </svg>
      );
    case 'chat':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7H8l-5 3v-3H4.5a8.5 8.5 0 0 1-1.6-16.2A8.38 8.38 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'doc':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 2v6h6M9 13h6M9 17h4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function categoryAccentClass(accent: string, active: boolean): string {
  const map: Record<string, { idle: string; active: string }> = {
    indigo: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-[#4f46e5]',
      active: 'border-[#6366f1] bg-[rgba(99,102,241,0.1)] text-[#312e81] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]',
    },
    emerald: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-emerald-700',
      active: 'border-emerald-400 bg-emerald-50 text-emerald-900',
    },
    amber: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-amber-800',
      active: 'border-amber-400 bg-amber-50 text-amber-950',
    },
    sky: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-sky-800',
      active: 'border-sky-400 bg-sky-50 text-sky-950',
    },
    violet: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-violet-800',
      active: 'border-violet-400 bg-violet-50 text-violet-950',
    },
    rose: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-rose-800',
      active: 'border-rose-400 bg-rose-50 text-rose-950',
    },
    purple: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-purple-800',
      active: 'border-purple-400 bg-purple-50 text-purple-950',
    },
    teal: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-teal-800',
      active: 'border-teal-400 bg-teal-50 text-teal-950',
    },
  };
  const pair = map[accent] ?? map.indigo;
  return active ? pair.active : pair.idle;
}

export function TeacherResourcesClient() {
  const [category, setCategory] = useState<ResourceCategory>('all');
  const [search, setSearch] = useState('');
  const [yearGroup, setYearGroup] = useState('7');
  const [topicFilter, setTopicFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent-used');

  const recentScrollRef = useRef<HTMLDivElement>(null);
  const topicScrollRef = useRef<HTMLDivElement>(null);

  const scrollByRef = useCallback((el: HTMLDivElement | null, delta: number) => {
    el?.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const yearOptions = useMemo(
    () =>
      ['7', '8', '9', '10', '11'].map((y) => ({
        value: y,
        label: `Year ${y}`,
      })),
    [],
  );

  const topicOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      { value: 'algebra', label: 'Algebra' },
      { value: 'number', label: 'Number' },
      { value: 'geometry', label: 'Geometry' },
      { value: 'ratio', label: 'Ratio & Proportion' },
      { value: 'statistics', label: 'Statistics' },
    ],
    [],
  );

  const resourceTypeOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      { value: 'model', label: 'Model' },
      { value: 'check', label: 'Check' },
      { value: 'practice', label: 'Practice' },
      { value: 'recap', label: 'Recap' },
      { value: 'reteach', label: 'Reteach' },
      { value: 'discussion', label: 'Discussion' },
      { value: 'worksheet', label: 'Worksheet' },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'recent-used', label: 'Recently used' },
      { value: 'title', label: 'Title A–Z' },
      { value: 'topic', label: 'Topic' },
    ],
    [],
  );

  const filteredRecent = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = RECENT_RESOURCES;
    if (category !== 'all') {
      list = list.filter((r) => r.typeKey === category);
    }
    if (q) {
      list = list.filter((r) => r.title.toLowerCase().includes(q) || r.topic.toLowerCase().includes(q));
    }
    return list;
  }, [search, category]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--anx-text)' }}>
              Resources
            </h1>
            <p className="text-sm sm:text-base" style={{ color: 'var(--anx-text-muted)' }}>
              Your teaching library. Ready to use in every lesson.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <label className="relative min-w-[10rem]">
              <span className="sr-only">Course</span>
              <select className="anx-input w-full cursor-pointer appearance-none rounded-xl py-2 pl-3 pr-9 text-sm font-medium">
                <option>Year 7 Maths</option>
                <option>Year 8 Maths</option>
                <option>Year 9 Maths</option>
              </select>
              <SelectChevron />
            </label>
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-[color:var(--anx-text-secondary)] transition hover:bg-[var(--anx-surface-hover)]"
              aria-label="Notifications"
            >
              <BellIcon />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />
            </button>
            <button type="button" className="anx-btn-primary whitespace-nowrap rounded-xl px-4 py-2 text-sm">
              + Create new
            </button>
          </div>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--anx-text-muted)]" />
          <input
            type="search"
            className="anx-input w-full rounded-2xl py-2.5 pl-10 pr-3 text-sm"
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search resources"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-3xl lg:flex-1">
            <FilterSelect label="Year group" value={yearGroup} onChange={setYearGroup} options={yearOptions} />
            <FilterSelect label="Topic" value={topicFilter} onChange={setTopicFilter} options={topicOptions} />
            <FilterSelect label="Resource type" value={resourceTypeFilter} onChange={setResourceTypeFilter} options={resourceTypeOptions} />
          </div>
          <label className="relative min-w-[12rem]">
            <span className="mb-1 block text-xs font-medium text-[color:var(--anx-text-muted)]">Sort by</span>
            <select
              className="anx-input w-full cursor-pointer appearance-none rounded-full py-2 pl-3 pr-9 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </label>
        </div>

        <div className="relative">
          <div
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Resource categories"
          >
            {CATEGORY_ROWS.map((row) => {
              const active = category === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(row.id)}
                  className={`flex min-w-[8.5rem] shrink-0 flex-col gap-2 rounded-2xl border px-3 py-3 text-left transition ${categoryAccentClass(row.accent, active)}`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-white/80' : 'bg-[var(--anx-surface-container-low)]'}`}>
                    <CategoryIcon kind={row.icon} />
                  </span>
                  <span className="text-xs font-semibold leading-tight">{row.label}</span>
                  <span className="text-[11px] font-medium opacity-80">({row.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <section aria-labelledby="recent-resources-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="recent-resources-heading" className="m-0 text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>
              Recently used
            </h2>
            <div className="flex items-center gap-2">
              <button type="button" className="text-sm font-medium text-[color:var(--anx-primary)] hover:underline">
                View all
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-[color:var(--anx-text-secondary)] hover:bg-[var(--anx-surface-hover)]"
                aria-label="Scroll recently used"
                onClick={() => scrollByRef(recentScrollRef.current, 280)}
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
          <div ref={recentScrollRef} className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filteredRecent.map((item) => (
              <article
                key={item.id}
                className="anx-card flex w-[min(100%,17rem)] shrink-0 flex-col overflow-hidden rounded-2xl"
              >
                <div className={`relative h-24 ${item.thumbClass}`} aria-hidden>
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <span className="font-mono text-xs text-[color:var(--anx-text-muted)]">Preview</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_TAG_STYLES[item.typeKey]}`}>{item.typeLabel}</span>
                  <h3 className="m-0 text-sm font-bold leading-snug" style={{ color: 'var(--anx-text)' }}>
                    {item.title}
                  </h3>
                  <p className="m-0 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    {item.topic} · {item.yearLabel}
                  </p>
                  <p className="m-0 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    Used {item.usedAgo} ago
                  </p>
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--anx-primary)] bg-transparent px-2 py-2 text-xs font-semibold text-[color:var(--anx-primary)] transition hover:bg-[var(--anx-primary-soft)]"
                    >
                      <PlayIcon />
                      Use in lesson
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--anx-border)] text-[color:var(--anx-text-muted)] hover:bg-[var(--anx-surface-hover)]"
                      aria-label="More options"
                    >
                      <MoreIcon />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredRecent.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              No resources match this category and search. Try &quot;All resources&quot; or clear the search.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="browse-topic-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="browse-topic-heading" className="m-0 text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>
              Browse by topic
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[color:var(--anx-primary)]">View all topics</span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-[color:var(--anx-text-secondary)] hover:bg-[var(--anx-surface-hover)]"
                aria-label="Scroll topics"
                onClick={() => scrollByRef(topicScrollRef.current, 240)}
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
          <div ref={topicScrollRef} className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TOPIC_FOLDERS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`flex min-w-[10.5rem] shrink-0 flex-col gap-2 rounded-2xl border border-[var(--anx-border)] bg-gradient-to-br px-4 py-4 text-left transition hover:border-[var(--anx-primary)]/30 ${t.accent}`}
              >
                <span className="text-sm font-bold">{t.label}</span>
                <span className="text-xs font-medium opacity-90">{t.count} resources</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="ai-resources-heading" className="space-y-3">
          <h2 id="ai-resources-heading" className="m-0 flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>
            <SparkleIcon className="text-[#6338f1]" />
            AI-generated for you
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {AI_RESOURCES.map((item) => (
              <article key={item.id} className="anx-card flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(99,56,241,0.08)] text-[#6338f1]">
                    <SparkleIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="inline-block rounded-full bg-[var(--anx-surface-container-low)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--anx-text-secondary)]">
                      {item.typeLabel}
                    </span>
                    <h3 className="m-0 text-sm font-bold leading-snug" style={{ color: 'var(--anx-text)' }}>
                      {item.title}
                    </h3>
                    <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                      {item.context}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-[var(--anx-border)] pt-3">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--anx-primary)] bg-transparent px-3 py-2 text-sm font-semibold text-[color:var(--anx-primary)] transition hover:bg-[var(--anx-primary-soft)]"
                  >
                    <PlayIcon />
                    Use in lesson
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--anx-border)] text-[color:var(--anx-text-muted)] hover:bg-[var(--anx-surface-hover)]"
                    aria-label="More options"
                  >
                    <MoreIcon />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
          Sample content for layout preview. Search, filters, and actions will connect to your school library when the backend is ready. You can still use{' '}
          <Link href="/teacher/content/booklet-review" className="font-medium text-[color:var(--anx-primary)] hover:underline">
            English booklet review
          </Link>{' '}
          or open your{' '}
          <Link href="/teacher/timetable" className="font-medium text-[color:var(--anx-primary)] hover:underline">
            timetable
          </Link>
          .
        </p>
      </div>

      <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:w-80" aria-label="Library shortcuts">
        <div className="anx-card space-y-3 rounded-2xl p-4">
          <h2 className="m-0 text-base font-bold" style={{ color: 'var(--anx-text)' }}>
            School library
          </h2>
          <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
            Shared materials from your school. Browse sequences and approved resources.
          </p>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--anx-border)] bg-[var(--anx-surface-raised)] px-3 py-2.5 text-sm font-semibold text-[color:var(--anx-text)] transition hover:bg-[var(--anx-surface-hover)]"
          >
            Browse school library
            <ChevronRightIcon />
          </button>
        </div>

        <div className="anx-card space-y-3 rounded-2xl p-4">
          <h2 className="m-0 text-base font-bold" style={{ color: 'var(--anx-text)' }}>
            Saved sequences
          </h2>
          <ul className="m-0 list-none space-y-2 p-0">
            {SAVED_SEQUENCES.map((s) => (
              <li key={s.title}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-transparent px-2 py-2 text-left text-sm font-medium transition hover:border-[var(--anx-border)] hover:bg-[var(--anx-surface-container-low)]"
                  style={{ color: 'var(--anx-text)' }}
                >
                  <span className="min-w-0 truncate">{s.title}</span>
                  <span className="shrink-0 text-xs text-[color:var(--anx-text-muted)]">({s.count})</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="text-sm font-medium text-[color:var(--anx-primary)] hover:underline">
            View all sequences
          </button>
        </div>

        <div className="anx-card space-y-3 rounded-2xl p-4">
          <h2 className="m-0 text-base font-bold" style={{ color: 'var(--anx-text)' }}>
            Create new resource
          </h2>
          <button
            type="button"
            className="flex w-full flex-col items-start gap-1 rounded-2xl border-2 border-[var(--anx-border)] bg-[var(--anx-surface-raised)] px-4 py-4 text-left transition hover:border-[var(--anx-primary)]/40 hover:bg-[var(--anx-primary-soft)]"
          >
            <span className="text-sm font-bold" style={{ color: 'var(--anx-text)' }}>
              Create from template
            </span>
            <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              Start with a template.
            </span>
          </button>
          <Link
            href="/teacher/question-bank/generate"
            className="flex w-full flex-col items-start gap-1 rounded-2xl border-2 border-[#6338f1] bg-[rgba(99,56,241,0.06)] px-4 py-4 text-left no-underline transition hover:bg-[rgba(99,56,241,0.1)]"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-[#4338ca]">
              <SparkleIcon className="h-4 w-4 text-[#6338f1]" />
              Generate with AI
            </span>
            <span className="text-xs text-[color:var(--anx-text-secondary)]">Describe what you need.</span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
