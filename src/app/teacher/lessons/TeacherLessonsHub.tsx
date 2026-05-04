'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TeacherHomeClassSelector, type TeacherHomeClassOption } from '@/app/teacher/dashboard/TeacherHomeClassSelector';

export type LessonsHubRow = {
  id: string;
  updatedAt: string;
  status: string;
  subjectTitle: string;
  skillName: string | null;
  skillCode: string | null;
  skillStrand: string;
  classroomId: string;
  classroomName: string;
  yearGroup: string | null;
  participantCount: number;
};

const PAGE_SIZE = 7;

const DEFAULT_FOLDERS = ['Algebra', 'Number', 'Geometry', 'Statistics', 'Revision', 'End of term'];

function formatUpdated(d: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const t = d.getTime();
  if (t >= startOfToday.getTime()) {
    return `Today, ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  if (t >= startOfYesterday.getTime()) {
    return `Yesterday, ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function topicLabel(strand: string, subjectTitle: string): string {
  const s = strand.trim();
  if (s) return s;
  return subjectTitle;
}

function folderForRow(row: LessonsHubRow): string {
  const t = topicLabel(row.skillStrand, row.subjectTitle);
  const lower = t.toLowerCase();
  if (lower.includes('algebra') || lower.includes('equation')) return 'Algebra';
  if (lower.includes('number') || lower.includes('fraction') || lower.includes('decimal') || lower.includes('percent'))
    return 'Number';
  if (lower.includes('geometry') || lower.includes('shape') || lower.includes('angle')) return 'Geometry';
  if (lower.includes('stat') || lower.includes('data') || lower.includes('probability')) return 'Statistics';
  if (lower.includes('revision') || lower.includes('review')) return 'Revision';
  if (lower.includes('term')) return 'End of term';
  return t || 'General';
}

function lessonIconSymbol(skillCode: string | null, subjectTitle: string): string {
  const code = skillCode?.trim();
  if (code) return code.slice(0, 2).toUpperCase();
  const t = subjectTitle.toLowerCase();
  if (t.includes('percent') || t.includes('%')) return '%';
  if (t.includes('algebra') || t.includes('equation')) return 'x';
  return subjectTitle.trim().charAt(0).toUpperCase() || '?';
}

function iconHue(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h + seed.charCodeAt(i) * (i + 1)) % 360;
  return `hsl(${h} 62% 46%)`;
}

function sessionTypeLabel(status: string): { label: string; tone: 'live' | 'worksheet' | 'check' } {
  if (status === 'ACTIVE' || status === 'LOBBY') return { label: 'Live lesson', tone: 'live' };
  if (status === 'PAUSED') return { label: 'Live lesson', tone: 'live' };
  if (status === 'COMPLETED') return { label: 'Worksheet', tone: 'worksheet' };
  return { label: 'Check', tone: 'check' };
}

function statusPill(status: string): { label: string; tone: 'live' | 'draft' | 'done' } {
  if (status === 'ACTIVE') return { label: 'Live', tone: 'live' };
  if (status === 'LOBBY') return { label: 'Draft', tone: 'draft' };
  if (status === 'PAUSED') return { label: 'Paused', tone: 'live' };
  if (status === 'COMPLETED') return { label: 'Completed', tone: 'done' };
  return { label: 'Draft', tone: 'draft' };
}

type Props = {
  rows: LessonsHubRow[];
  classOptions: TeacherHomeClassOption[];
};

export function TeacherLessonsHub({ rows, classOptions }: Props) {
  const [tab, setTab] = useState<'mine' | 'shared' | 'library'>('mine');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'title'>('updated');
  const [page, setPage] = useState(1);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);

  // Custom folders: created by the teacher, persisted in localStorage.
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('ember-lesson-folders') ?? '[]') as string[]; }
    catch { return []; }
  });
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const updated = [...new Set([...customFolders, name])];
    setCustomFolders(updated);
    try { localStorage.setItem('ember-lesson-folders', JSON.stringify(updated)); } catch { /* non-fatal */ }
    setNewFolderName('');
    setShowNewFolderInput(false);
    setFolderFilter(name);
    setPage(1);
  }

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.yearGroup?.trim()) set.add(r.yearGroup.trim());
    });
    return Array.from(set).sort();
  }, [rows]);

  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const t = topicLabel(r.skillStrand, r.subjectTitle);
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [rows]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const name of DEFAULT_FOLDERS) counts[name] = 0;
    for (const name of customFolders) if (!(name in counts)) counts[name] = 0;
    rows.forEach((r) => {
      const f = folderForRow(r);
      counts[f] = (counts[f] ?? 0) + 1;
    });
    return counts;
  }, [rows, customFolders]);

  const folderList = useMemo(() => {
    const extras = Object.keys(folderCounts).filter(
      (k) => !DEFAULT_FOLDERS.includes(k) && !customFolders.includes(k),
    );
    extras.sort();
    return [...DEFAULT_FOLDERS, ...customFolders, ...extras];
  }, [folderCounts, customFolders]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab !== 'mine') {
      list = [];
    }
    list = list.filter((r) => {
      const title = r.skillName ?? r.subjectTitle;
      const q = search.trim().toLowerCase();
      if (q && !title.toLowerCase().includes(q) && !r.classroomName.toLowerCase().includes(q)) return false;
      if (yearFilter && (r.yearGroup?.trim() || '') !== yearFilter) return false;
      if (topicFilter && topicLabel(r.skillStrand, r.subjectTitle) !== topicFilter) return false;
      if (typeFilter) {
        const { label } = sessionTypeLabel(r.status);
        if (label !== typeFilter) return false;
      }
      if (statusFilter) {
        const { label } = statusPill(r.status);
        if (label !== statusFilter) return false;
      }
      if (folderFilter) {
        if (folderForRow(r) !== folderFilter) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'title') {
        const ta = (a.skillName ?? a.subjectTitle).localeCompare(b.skillName ?? b.subjectTitle);
        return ta;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [rows, tab, search, yearFilter, topicFilter, typeFilter, statusFilter, folderFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  const selectClass =
    'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-md outline-none transition-colors duration-200 ease-calm focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Lessons</h1>
          <p className="text-sm text-muted sm:text-base">Create, organise and deliver live lessons.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TeacherHomeClassSelector classes={classOptions} />
          <span
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface-variant shadow-md"
            title="Notifications"
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2V20h16v-2l-2-2Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-surface-container-lowest" />
          </span>
          <Link
            href="/teacher/live/new"
            className="anx-btn-primary gap-2 px-4 py-2.5 text-sm no-underline"
          >
            <span aria-hidden>+</span> New lesson
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex gap-6 border-b border-outline-variant">
            {(
              [
                ['mine', 'My lessons'],
                ['shared', 'Shared with me'],
                ['library', 'School library'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setPage(1);
                }}
                className={`relative -mb-px pb-3 text-sm font-semibold transition-colors duration-200 ease-calm ${
                  tab === key ? 'text-primary' : 'text-muted hover:text-on-surface'
                }`}
              >
                {label}
                {tab === key ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" aria-hidden />
                ) : null}
              </button>
            ))}
          </div>

          {tab === 'mine' ? (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
                <div className="relative min-w-[12rem] flex-1 lg:max-w-xs">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-70" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm9 2-4.35-4.35"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <input
                    type="search"
                    placeholder="Search lessons..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-3 text-sm text-on-surface shadow-md placeholder:text-on-surface-variant placeholder:opacity-70 outline-none transition-colors duration-200 ease-calm focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <select
                  className={`${selectClass} min-w-[8.5rem]`}
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Year group"
                >
                  <option value="">Year group</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  className={`${selectClass} min-w-[8.5rem]`}
                  value={topicFilter}
                  onChange={(e) => {
                    setTopicFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Topic"
                >
                  <option value="">Topic</option>
                  {topicOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  className={`${selectClass} min-w-[8.5rem]`}
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Type"
                >
                  <option value="">Type</option>
                  <option value="Live lesson">Live lesson</option>
                  <option value="Worksheet">Worksheet</option>
                  <option value="Check">Check</option>
                </select>
                <select
                  className={`${selectClass} min-w-[8.5rem]`}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Status"
                >
                  <option value="">Status</option>
                  <option value="Live">Live</option>
                  <option value="Paused">Paused</option>
                  <option value="Draft">Draft</option>
                  <option value="Completed">Completed</option>
                </select>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-medium text-muted">Sort by:</span>
                  <select
                    className={selectClass}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'updated' | 'title')}
                    aria-label="Sort lessons"
                  >
                    <option value="updated">Recently updated</option>
                    <option value="title">Title</option>
                  </select>
                </div>
              </div>

              <div className="anx-card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-divider bg-surface-container-low">
                        {['Lesson', 'Year group', 'Topic', 'Type', 'Updated', 'Actions'].map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant opacity-80"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                            No lessons match your filters.{' '}
                            <Link href="/teacher/live/new" className="font-semibold text-primary hover:underline">
                              Create a new lesson
                            </Link>
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((r) => {
                          const title = r.skillName ?? r.subjectTitle;
                          const topic = topicLabel(r.skillStrand, r.subjectTitle);
                          const typeInfo = sessionTypeLabel(r.status);
                          const sym = lessonIconSymbol(r.skillCode, r.subjectTitle);
                          const bg = iconHue(r.id);
                          const yg = r.yearGroup?.trim() || '—';
                          return (
                            <tr key={r.id} className="border-b border-divider last:border-0">
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                  <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-on-primary shadow-md"
                                    style={{ background: bg }}
                                    aria-hidden
                                  >
                                    {sym}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-on-surface">{title}</p>
                                    <p className="mt-0.5 text-xs text-muted">
                                      {r.classroomName}
                                      {r.participantCount > 0
                                        ? ` · ${r.participantCount} student${r.participantCount !== 1 ? 's' : ''}`
                                        : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-on-surface">{yg}</td>
                              <td className="px-4 py-3 align-top text-on-surface">{topic}</td>
                              <td className="px-4 py-3 align-top">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    typeInfo.tone === 'live'
                                      ? 'bg-primary/10 text-primary'
                                      : typeInfo.tone === 'worksheet'
                                        ? 'bg-[var(--anx-info-soft)] text-[var(--anx-info-ink)]'
                                        : 'bg-warning-soft text-warning'
                                  }`}
                                >
                                  {typeInfo.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap text-on-surface">
                                {formatUpdated(new Date(r.updatedAt))}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex justify-end">
                                  <Link
                                    href={`/teacher/live/${r.id}`}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted transition-colors duration-200 ease-calm hover:border-outline-variant hover:bg-surface-bright hover:text-on-surface"
                                    aria-label={`Open lesson ${title}`}
                                  >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                      <circle cx="5" cy="12" r="2" />
                                      <circle cx="12" cy="12" r="2" />
                                      <circle cx="19" cy="12" r="2" />
                                    </svg>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-divider bg-surface-container-low px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted">
                    {filtered.length === 0
                      ? 'Showing 0 lessons'
                      : `Showing ${from} to ${to} of ${filtered.length} lesson${filtered.length !== 1 ? 's' : ''}`}
                  </p>
                  {totalPages > 1 ? (
                    <nav className="flex items-center gap-1" aria-label="Pagination">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface shadow-md transition-colors duration-200 ease-calm disabled:opacity-40"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPage(n)}
                          className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors duration-200 ease-calm ${
                            n === safePage
                              ? 'bg-primary text-on-primary'
                              : 'border border-outline-variant bg-surface-container-lowest text-on-surface shadow-md hover:bg-surface-bright'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface shadow-md transition-colors duration-200 ease-calm disabled:opacity-40"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </nav>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center">
              <p className="text-sm font-medium text-on-surface">Nothing here yet</p>
              <p className="mt-1 text-sm text-muted">
                {tab === 'shared'
                  ? 'Lessons shared with you by colleagues will appear in this tab.'
                  : 'Your school’s shared lesson library will appear here when it is available.'}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary shadow-md"
                  aria-hidden
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3l1.09 3.36L16.5 5.5l-2.86 2.08L15.18 11 12 9.27 8.82 11l1.54-3.42L7.5 5.5l3.41-.14L12 3Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path d="M5 14h14l-1 8H6l-1-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface">Let Ember build for you</p>
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    Generate a lesson or quiz in seconds. Save time and focus on teaching.
                  </p>
                </div>
              </div>
              <Link
                href="/teacher/live/new"
                className="anx-btn-secondary gap-2 self-start px-4 py-2.5 text-sm no-underline sm:self-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary-container" aria-hidden>
                  <path
                    d="M12 3l1.09 3.36L16.5 5.5l-2.86 2.08L15.18 11 12 9.27 8.82 11l1.54-3.42L7.5 5.5l3.41-.14L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                Generate with AI
              </Link>
            </div>
          </div>
        </div>

        <aside className="anx-card w-full shrink-0 space-y-4 p-4 xl:w-[17.5rem]">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Organise your lessons</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Group sessions by topic. Click a folder to filter the table.
            </p>
          </div>
          {showNewFolderInput ? (
            <form
              onSubmit={(e) => { e.preventDefault(); createFolder(); }}
              className="flex gap-2"
            >
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name…"
                className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                maxLength={40}
              />
              <button type="submit" className="anx-btn-primary px-3 py-2 text-sm">
                Create
              </button>
              <button
                type="button"
                onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
                className="anx-btn-secondary px-3 py-2 text-sm"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="anx-btn-secondary w-full"
              onClick={() => setShowNewFolderInput(true)}
            >
              + New folder
            </button>
          )}
          <ul className="flex list-none flex-col gap-1 p-0">
            {folderList.map((name) => {
              const count = folderCounts[name] ?? 0;
              const active = folderFilter === name;
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => {
                      setFolderFilter(active ? null : name);
                      setPage(1);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors duration-200 ease-calm ${
                      active ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-bright'
                    }`}
                  >
                    <span className="text-on-surface-variant opacity-70" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 7a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{name}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {count} lesson{count !== 1 ? 's' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 text-sm font-semibold text-primary hover:underline"
            onClick={() => {
              setFolderFilter(null);
              setPage(1);
            }}
          >
            View all folders
            <span aria-hidden>›</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
