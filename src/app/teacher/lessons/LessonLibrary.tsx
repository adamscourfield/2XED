'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type LessonLibraryRow = {
  id: string;
  title: string;
  topic: string;
  isPublished: boolean;
  isCopy: boolean;
  curriculumUnitId: string | null;
  curriculumUnitTitle: string | null;
  subjectTitle: string;
  subjectSlug: string;
  blockCount: number;
  createdAt: string;
  updatedAt: string;
};

const PAGE_SIZE = 12;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return `Today, ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  if (diffDays === 1) {
    return `Yesterday`;
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function LessonIcon({ title, published }: { title: string; published: boolean }) {
  const letter = title.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm ${
        published ? 'bg-[#5850ec]' : 'bg-[#9ca3af]'
      }`}
      aria-hidden
    >
      {letter}
    </div>
  );
}

type Props = { rows: LessonLibraryRow[] };

export function LessonLibrary({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [mappedFilter, setMappedFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated');
  const [page, setPage] = useState(1);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.subjectTitle));
    return Array.from(set).sort();
  }, [rows]);

  const unmappedCount = useMemo(() => rows.filter((r) => !r.curriculumUnitId).length, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.topic.toLowerCase().includes(q) ||
          r.subjectTitle.toLowerCase().includes(q),
      );
    }
    if (subjectFilter) {
      list = list.filter((r) => r.subjectTitle === subjectFilter);
    }
    if (mappedFilter === 'mapped') {
      list = list.filter((r) => !!r.curriculumUnitId);
    } else if (mappedFilter === 'unmapped') {
      list = list.filter((r) => !r.curriculumUnitId);
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [rows, search, subjectFilter, mappedFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const inputCls =
    'rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#5850ec] focus:ring-2 focus:ring-[#5850ec]/20';

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">Lessons</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            {rows.length === 0
              ? 'Build your lesson library.'
              : `${rows.length} lesson${rows.length !== 1 ? 's' : ''} in your library.`}
          </p>
        </div>
        <Link
          href="/teacher/lessons/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#5850ec] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          New lesson
        </Link>
      </header>

      {/* Unmapped prompt */}
      {unmappedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-amber-500" aria-hidden>
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-amber-800">
            <span className="font-semibold">{unmappedCount} lesson{unmappedCount !== 1 ? 's' : ''}</span>{' '}
            {unmappedCount === 1 ? 'hasn\'t' : 'haven\'t'} been added to your curriculum plan.{' '}
            <Link href="/teacher/curriculum" className="font-semibold underline hover:no-underline">
              Map them now →
            </Link>
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border-2 border-dashed border-[#e5e7eb] px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5f3ff] text-[#5850ec]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M8 7h8M8 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[#111827]">No lessons yet</p>
          <p className="mt-2 max-w-xs mx-auto text-sm text-[#6b7280]">
            Build your first lesson — add blocks, write questions, and launch it live with your class.
          </p>
          <Link
            href="/teacher/lessons/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#5850ec] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Build your first lesson
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm9 2-4.35-4.35" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search lessons…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className={`${inputCls} w-full pl-9`}
              />
            </div>

            {subjects.length > 1 && (
              <select
                className={inputCls}
                value={subjectFilter}
                onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
                aria-label="Subject"
              >
                <option value="">All subjects</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <select
              className={inputCls}
              value={mappedFilter}
              onChange={(e) => { setMappedFilter(e.target.value as typeof mappedFilter); setPage(1); }}
              aria-label="Curriculum map"
            >
              <option value="all">All lessons</option>
              <option value="mapped">Mapped to curriculum</option>
              <option value="unmapped">Not yet mapped</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-[#6b7280]">Sort:</span>
              <select
                className={inputCls}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort by"
              >
                <option value="updated">Recently updated</option>
                <option value="created">Newest first</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {pageRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e5e7eb] px-6 py-12 text-center">
              <p className="text-sm text-[#6b7280]">No lessons match your filters.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageRows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/teacher/lessons/${r.id}`}
                    className="group flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm transition hover:border-[#5850ec]/40 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <LessonIcon title={r.title} published={r.isPublished} />
                      <div className="flex items-center gap-1.5">
                        {r.isPublished ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                            Published
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-semibold text-[#6b7280]">
                            Draft
                          </span>
                        )}
                        {r.isCopy && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                            Copy
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex-1">
                      <p className="font-semibold text-[#111827] leading-snug line-clamp-2">{r.title}</p>
                      <p className="mt-1 text-xs text-[#6b7280] line-clamp-1">{r.topic}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#f3f4f6] pt-3">
                      <div className="min-w-0">
                        <p className="text-xs text-[#9ca3af] truncate">{r.subjectTitle}</p>
                        {r.curriculumUnitTitle ? (
                          <p className="text-xs text-[#5850ec] truncate">{r.curriculumUnitTitle}</p>
                        ) : (
                          <p className="text-xs text-amber-500">Not mapped</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-[#9ca3af]">{r.blockCount} block{r.blockCount !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-[#9ca3af]">{formatDate(r.updatedAt)}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}

              {/* "New lesson" tile */}
              <li>
                <Link
                  href="/teacher/lessons/new"
                  className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e7eb] p-4 text-center transition hover:border-[#5850ec]/50 hover:bg-[#f5f3ff]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#5850ec]" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
                    </svg>
                  </span>
                  <p className="mt-2 text-sm font-semibold text-[#5850ec]">New lesson</p>
                </Link>
              </li>
            </ul>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-1 pt-2" aria-label="Pagination">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#374151] shadow-sm transition disabled:opacity-40 hover:bg-[#f9fafb]"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${
                    n === safePage
                      ? 'bg-[#5850ec] text-white'
                      : 'border border-[#e5e7eb] bg-white text-[#374151] shadow-sm hover:bg-[#f9fafb]'
                  }`}
                >{n}</button>
              ))}
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#374151] shadow-sm transition disabled:opacity-40 hover:bg-[#f9fafb]"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >›</button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
