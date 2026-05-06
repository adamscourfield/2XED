'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { TeacherResourcesPayload } from '@/data/teacherResourcesCatalog';

type RouteCategory = 'all' | 'A' | 'B' | 'C';

type CategoryRow = {
  id: RouteCategory;
  label: string;
  count: number;
  icon: string;
  accent: string;
};

const CATEGORY_META: Omit<CategoryRow, 'count'>[] = [
  { id: 'all', label: 'All routes', icon: 'grid', accent: 'indigo' },
  { id: 'A', label: 'Standard', icon: 'layers', accent: 'emerald' },
  { id: 'B', label: 'Easier', icon: 'target', accent: 'amber' },
  { id: 'C', label: 'Misconception repair', icon: 'bullseye', accent: 'rose' },
];

const ROUTE_TYPE_LABELS: Record<string, string> = {
  A: 'Standard',
  B: 'Easier',
  C: 'Misconception repair',
};

const TYPE_TAG_STYLES: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-900',
  B: 'bg-amber-100 text-amber-950',
  C: 'bg-rose-100 text-rose-900',
};

function thumbClassForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const gradients = [
    'bg-gradient-to-br from-violet-100 to-indigo-50',
    'bg-gradient-to-br from-amber-50 to-orange-50',
    'bg-gradient-to-br from-sky-100 to-blue-50',
    'bg-gradient-to-br from-fuchsia-50 to-violet-50',
    'bg-gradient-to-br from-emerald-50 to-teal-50',
    'bg-gradient-to-br from-rose-50 to-orange-50',
  ];
  return gradients[Math.abs(h) % gradients.length];
}

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
    case 'bullseye':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="6" stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill={stroke} />
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
    rose: {
      idle: 'border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-rose-800',
      active: 'border-rose-400 bg-rose-50 text-rose-950',
    },
  };
  const pair = map[accent] ?? map.indigo;
  return active ? pair.active : pair.idle;
}

interface Props {
  initialData: TeacherResourcesPayload;
}

export function TeacherResourcesClient({ initialData }: Props) {
  const [data, setData] = useState<TeacherResourcesPayload>(initialData);
  const [selectedSubjectId, setSelectedSubjectId] = useState(() => initialData.subjectId ?? '');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [category, setCategory] = useState<RouteCategory>('all');
  const [search, setSearch] = useState('');
  const [yearGroup, setYearGroup] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent-used');

  const recentScrollRef = useRef<HTMLDivElement>(null);
  const topicScrollRef = useRef<HTMLDivElement>(null);

  const subjectId = data.subjectId;

  const loadForSubject = useCallback(async (nextSubjectId: string) => {
    const revertTo = data.subjectId;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/teacher/resources?subjectId=${encodeURIComponent(nextSubjectId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Request failed (${res.status})`);
      }
      const next = (await res.json()) as TeacherResourcesPayload;
      setData(next);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Could not load resources');
      if (revertTo) setSelectedSubjectId(revertTo);
    } finally {
      setLoading(false);
    }
  }, [data.subjectId]);

  const scrollByRef = useCallback((el: HTMLDivElement | null, delta: number) => {
    el?.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const yearOptions = useMemo(
    () => [{ value: 'all', label: 'All years' }, ...['7', '8', '9', '10', '11'].map((y) => ({ value: y, label: `Year ${y}` }))],
    [],
  );

  const topicOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'All topics' }];
    const strands = data.strandFolders.map((f) => ({ value: f.id, label: f.label }));
    return [...base, ...strands];
  }, [data.strandFolders]);

  const resourceTypeOptions = useMemo(
    () => [
      { value: 'all', label: 'All route types' },
      { value: 'A', label: 'Standard (A)' },
      { value: 'B', label: 'Easier (B)' },
      { value: 'C', label: 'Misconception repair (C)' },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'recent-used', label: 'Recently updated' },
      { value: 'title', label: 'Title A–Z' },
      { value: 'topic', label: 'Topic (strand)' },
    ],
    [],
  );

  const categoryRows: CategoryRow[] = useMemo(() => {
    const countMap = Object.fromEntries(data.categoryCounts.map((c) => [c.id, c.count])) as Record<RouteCategory, number>;
    return CATEGORY_META.map((m) => ({ ...m, count: countMap[m.id] ?? 0 }));
  }, [data.categoryCounts]);

  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...data.routes];

    const typeKey = category !== 'all' ? category : resourceTypeFilter !== 'all' ? (resourceTypeFilter as RouteCategory) : null;
    if (typeKey && typeKey !== 'all') {
      list = list.filter((r) => r.routeType === typeKey);
    }

    if (topicFilter !== 'all') {
      list = list.filter((r) => r.strand === topicFilter);
    }

    if (q) {
      list = list.filter(
        (r) =>
          r.skillName.toLowerCase().includes(q) ||
          r.skillCode.toLowerCase().includes(q) ||
          r.strand.toLowerCase().includes(q) ||
          r.misconceptionSummary.toLowerCase().includes(q),
      );
    }

    if (sortBy === 'title') {
      list.sort((a, b) => a.skillName.localeCompare(b.skillName) || a.routeType.localeCompare(b.routeType));
    } else if (sortBy === 'topic') {
      list.sort((a, b) => a.strand.localeCompare(b.strand) || a.skillCode.localeCompare(b.skillCode));
    } else {
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return list;
  }, [data.routes, search, category, resourceTypeFilter, topicFilter, sortBy]);

  const syncFiltersFromCategory = (cat: RouteCategory) => {
    setCategory(cat);
    setResourceTypeFilter(cat === 'all' ? 'all' : cat);
  };

  const syncCategoryFromResourceType = (v: string) => {
    setResourceTypeFilter(v);
    if (v === 'all') setCategory('all');
    else setCategory(v as RouteCategory);
  };

  const onSubjectChange = (id: string) => {
    if (id === selectedSubjectId) return;
    setSelectedSubjectId(id);
    setTopicFilter('all');
    setSearch('');
    setCategory('all');
    setResourceTypeFilter('all');
    void loadForSubject(id);
  };

  const emptySubjects = data.subjects.length === 0;
  const noRoutesInSubject = !subjectId || data.routes.length === 0;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--anx-text)' }}>
              Resources
            </h1>
            <p className="text-sm sm:text-base" style={{ color: 'var(--anx-text-muted)' }}>
              Explanation routes from your curriculum — launch them in a live lesson or browse by strand.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <label className="relative min-w-[10rem]">
              <span className="sr-only">Subject</span>
              <select
                className="anx-input w-full cursor-pointer appearance-none rounded-xl py-2 pl-3 pr-9 text-sm font-medium"
                value={selectedSubjectId}
                onChange={(e) => onSubjectChange(e.target.value)}
                disabled={emptySubjects || loading}
              >
                {emptySubjects ? <option value="">No subjects</option> : null}
                {!emptySubjects &&
                  data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
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
            <Link href="/teacher/question-bank/generate" className="anx-btn-primary inline-flex whitespace-nowrap rounded-xl px-4 py-2 text-sm no-underline">
              + Create new
            </Link>
          </div>
        </div>

        {fetchError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {fetchError}{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                if (data.subjectId) void loadForSubject(data.subjectId);
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--anx-text-muted)]" />
          <input
            type="search"
            className="anx-input w-full rounded-2xl py-2.5 pl-10 pr-3 text-sm"
            placeholder="Search by skill name, code, or strand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search resources"
            disabled={!subjectId}
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-3xl lg:flex-1">
            <FilterSelect label="Year group" value={yearGroup} onChange={setYearGroup} options={yearOptions} />
            <FilterSelect label="Strand" value={topicFilter} onChange={setTopicFilter} options={topicOptions} />
            <FilterSelect
              label="Route type"
              value={resourceTypeFilter}
              onChange={syncCategoryFromResourceType}
              options={resourceTypeOptions}
            />
          </div>
          <label className="relative min-w-[12rem]">
            <span className="mb-1 block text-xs font-medium text-[color:var(--anx-text-muted)]">Sort by</span>
            <select
              className="anx-input w-full cursor-pointer appearance-none rounded-full py-2 pl-3 pr-9 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={!subjectId}
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

        <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
          Year group is a visual filter for now; strands and route types match your curriculum data.
        </p>

        <div className="relative">
          <div
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Route categories"
          >
            {categoryRows.map((row) => {
              const active = category === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => syncFiltersFromCategory(row.id)}
                  disabled={!subjectId}
                  className={`flex min-w-[8.5rem] shrink-0 flex-col gap-2 rounded-2xl border px-3 py-3 text-left transition disabled:opacity-50 ${categoryAccentClass(row.accent, active)}`}
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
              Explanation routes
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--anx-text-muted)]">
                {loading ? 'Loading…' : `${filteredRoutes.length} shown`}
              </span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-[color:var(--anx-text-secondary)] hover:bg-[var(--anx-surface-hover)]"
                aria-label="Scroll routes"
                onClick={() => scrollByRef(recentScrollRef.current, 280)}
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
          <div ref={recentScrollRef} className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filteredRoutes.map((item) => {
              const typeLabel = ROUTE_TYPE_LABELS[item.routeType] ?? `Route ${item.routeType}`;
              const tagStyle = TYPE_TAG_STYLES[item.routeType] ?? 'bg-[var(--anx-surface-container-low)] text-[color:var(--anx-text-secondary)]';
              const liveHref = `/teacher/live/new?subjectId=${encodeURIComponent(item.subjectId)}&skillId=${encodeURIComponent(item.skillId)}`;
              return (
                <article key={item.id} className="anx-card flex w-[min(100%,17rem)] shrink-0 flex-col overflow-hidden rounded-2xl">
                  <div className={`relative h-24 ${thumbClassForId(item.id)}`} aria-hidden>
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      <span className="font-mono text-xs text-[color:var(--anx-text-muted)]">{item.stepCount} steps</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagStyle}`}>{typeLabel}</span>
                    <h3 className="m-0 text-sm font-bold leading-snug" style={{ color: 'var(--anx-text)' }}>
                      {item.skillName}
                    </h3>
                    <p className="m-0 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      {item.skillCode} · {item.strand}
                    </p>
                    <p className="m-0 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </p>
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Link
                        href={liveHref}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--anx-primary)] bg-transparent px-2 py-2 text-xs font-semibold text-[color:var(--anx-primary)] no-underline transition hover:bg-[var(--anx-primary-soft)]"
                      >
                        <PlayIcon />
                        Use in lesson
                      </Link>
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
              );
            })}
          </div>
          {noRoutesInSubject && !loading ? (
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              No explanation routes for this subject yet. Routes are created with skills in the database.
            </p>
          ) : null}
          {!noRoutesInSubject && filteredRoutes.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              No routes match these filters. Try clearing search or choosing &quot;All routes&quot;.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="browse-topic-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="browse-topic-heading" className="m-0 text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>
              Browse by strand
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-sm font-medium text-[color:var(--anx-primary)] hover:underline"
                onClick={() => {
                  setTopicFilter('all');
                  syncFiltersFromCategory('all');
                }}
              >
                Clear strand filter
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-[color:var(--anx-text-secondary)] hover:bg-[var(--anx-surface-hover)]"
                aria-label="Scroll strands"
                onClick={() => scrollByRef(topicScrollRef.current, 240)}
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
          <div ref={topicScrollRef} className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.strandFolders.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTopicFilter(t.id);
                  setCategory('all');
                  setResourceTypeFilter('all');
                }}
                className={`flex min-w-[10.5rem] shrink-0 flex-col gap-2 rounded-2xl border border-[var(--anx-border)] bg-gradient-to-br px-4 py-4 text-left transition hover:border-[var(--anx-primary)]/30 ${t.accent}`}
              >
                <span className="text-sm font-bold">{t.label}</span>
                <span className="text-xs font-medium opacity-90">{t.count} routes</span>
              </button>
            ))}
          </div>
          {data.strandFolders.length === 0 && !loading ? (
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              Strands appear here once explanation routes exist for this subject.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="ai-resources-heading" className="space-y-3">
          <h2 id="ai-resources-heading" className="m-0 flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>
            <SparkleIcon className="text-[#6338f1]" />
            Misconception repair highlights
          </h2>
          <p className="m-0 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            Route C explanations with a misconception summary from your curriculum.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.aiSuggestions.map((item) => {
              const route = data.routes.find((r) => r.id === item.id);
              const liveHref = route
                ? `/teacher/live/new?subjectId=${encodeURIComponent(route.subjectId)}&skillId=${encodeURIComponent(route.skillId)}`
                : '/teacher/live/new';
              return (
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
                    <Link
                      href={liveHref}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--anx-primary)] bg-transparent px-3 py-2 text-sm font-semibold text-[color:var(--anx-primary)] no-underline transition hover:bg-[var(--anx-primary-soft)]"
                    >
                      <PlayIcon />
                      Use in lesson
                    </Link>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--anx-border)] text-[color:var(--anx-text-muted)] hover:bg-[var(--anx-surface-hover)]"
                      aria-label="More options"
                    >
                      <MoreIcon />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {data.aiSuggestions.length === 0 && !loading ? (
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              No Route C misconception summaries are available for this subject yet.
            </p>
          ) : null}
        </section>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
          For English coursework workflows, use{' '}
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
            Question bank
          </h2>
          <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
            Browse and generate items aligned to skills — pairs with explanation routes in live lessons.
          </p>
          <Link
            href="/teacher/question-bank"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--anx-border)] bg-[var(--anx-surface-raised)] px-3 py-2.5 text-sm font-semibold text-[color:var(--anx-text)] no-underline transition hover:bg-[var(--anx-surface-hover)]"
          >
            Open question bank
            <ChevronRightIcon />
          </Link>
        </div>

        <div className="anx-card space-y-3 rounded-2xl p-4">
          <h2 className="m-0 text-base font-bold" style={{ color: 'var(--anx-text)' }}>
            Recent live lessons
          </h2>
          {data.recentSessions.length === 0 ? (
            <p className="m-0 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
              Completed sessions you have run will appear here.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {data.recentSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/teacher/live/${s.id}/review`}
                    className="flex w-full items-center justify-between rounded-xl border border-transparent px-2 py-2 text-left text-sm font-medium no-underline transition hover:border-[var(--anx-border)] hover:bg-[var(--anx-surface-container-low)]"
                    style={{ color: 'var(--anx-text)' }}
                  >
                    <span className="min-w-0 truncate">{s.title}</span>
                    <span className="shrink-0 text-xs text-[color:var(--anx-text-muted)]">
                      ({s.phaseCount} phase{s.phaseCount === 1 ? '' : 's'})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/teacher/live/new" className="text-sm font-medium text-[color:var(--anx-primary)] no-underline hover:underline">
            Start a new live lesson
          </Link>
        </div>

        <div className="anx-card space-y-3 rounded-2xl p-4">
          <h2 className="m-0 text-base font-bold" style={{ color: 'var(--anx-text)' }}>
            Create new resource
          </h2>
          <Link
            href="/teacher/question-bank"
            className="flex w-full flex-col items-start gap-1 rounded-2xl border-2 border-[var(--anx-border)] bg-[var(--anx-surface-raised)] px-4 py-4 text-left no-underline transition hover:border-[var(--anx-primary)]/40 hover:bg-[var(--anx-primary-soft)]"
          >
            <span className="text-sm font-bold" style={{ color: 'var(--anx-text)' }}>
              Create from template
            </span>
            <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              Coming soon — templates will mirror your school schemes.
            </span>
          </Link>
          <Link
            href="/teacher/question-bank/generate"
            className="flex w-full flex-col items-start gap-1 rounded-2xl border-2 border-[#6338f1] bg-[rgba(99,56,241,0.06)] px-4 py-4 text-left no-underline transition hover:bg-[rgba(99,56,241,0.1)]"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-[#4338ca]">
              <SparkleIcon className="h-4 w-4 text-[#6338f1]" />
              Generate with AI
            </span>
            <span className="text-xs text-[color:var(--anx-text-secondary)]">Describe what you need in the question bank.</span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
