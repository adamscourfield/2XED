'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type QuestionTab = 'all' | 'mine' | 'shared' | 'library';
type ViewMode = 'list' | 'grid';

type DemoQuestion = {
  id: string;
  index: number;
  types: string[];
  cognitive: string[];
  usedCount: number;
  stem: string;
  trail: string[];
};

const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: '1',
    index: 1,
    types: ['Multiple choice'],
    cognitive: ['Apply'],
    usedCount: 12,
    stem: 'Expand and simplify: 3(x + 4) − 5',
    trail: ['Algebra', 'Expressions', 'Expanding brackets'],
  },
  {
    id: '2',
    index: 2,
    types: ['Short answer'],
    cognitive: ['Recall'],
    usedCount: 4,
    stem: 'Write 0.0047 in standard form.',
    trail: ['Number', 'Powers and roots', 'Standard form'],
  },
  {
    id: '3',
    index: 3,
    types: ['Multiple choice'],
    cognitive: ['Reason'],
    usedCount: 28,
    stem: 'Which expression is equivalent to (2x)³?',
    trail: ['Algebra', 'Indices', 'Laws of indices'],
  },
  {
    id: '4',
    index: 4,
    types: ['Short answer'],
    cognitive: ['Apply'],
    usedCount: 7,
    stem: 'Solve: 5x − 12 = 3x + 4',
    trail: ['Algebra', 'Equations', 'Linear equations'],
  },
  {
    id: '5',
    index: 5,
    types: ['Multiple choice'],
    cognitive: ['Recall'],
    usedCount: 19,
    stem: 'What is the value of (−2)⁴?',
    trail: ['Number', 'Directed numbers', 'Powers'],
  },
];

const TAB_LABELS: { id: QuestionTab; label: string }[] = [
  { id: 'all', label: 'All questions' },
  { id: 'mine', label: 'My questions' },
  { id: 'shared', label: 'Shared with me' },
  { id: 'library', label: 'School library' },
];

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
        className="anx-input w-full cursor-pointer appearance-none py-2 pl-3 pr-9 text-sm"
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

function ListViewIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--anx-primary)' : 'var(--anx-text-muted)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h10" stroke={c} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function GridViewIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--anx-primary)' : 'var(--anx-text-muted)';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1" stroke={c} strokeWidth="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

export function QuestionBankClient() {
  const [tab, setTab] = useState<QuestionTab>('all');
  const [search, setSearch] = useState('');
  const [yearGroup, setYearGroup] = useState('7');
  const [topic, setTopic] = useState('algebra');
  const [questionType, setQuestionType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [view, setView] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalQuestions = 1247;

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
      { value: 'algebra', label: 'Algebra' },
      { value: 'number', label: 'Number' },
      { value: 'geometry', label: 'Geometry' },
      { value: 'statistics', label: 'Statistics' },
    ],
    [],
  );

  const typeOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      { value: 'mc', label: 'Multiple choice' },
      { value: 'short', label: 'Short answer' },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'recent', label: 'Recently added' },
      { value: 'used', label: 'Most used' },
      { value: 'az', label: 'Title A–Z' },
    ],
    [],
  );

  const filteredDemo = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DEMO_QUESTIONS;
    return DEMO_QUESTIONS.filter((item) => item.stem.toLowerCase().includes(q) || item.trail.some((t) => t.toLowerCase().includes(q)));
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(totalQuestions / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalQuestions);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--anx-text)' }}>
              Question bank
            </h1>
            <p className="text-sm sm:text-base" style={{ color: 'var(--anx-text-muted)' }}>
              Search, filter and use questions in your live lessons.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <label className="relative min-w-[10rem]">
              <span className="sr-only">Course</span>
              <select className="anx-input w-full cursor-pointer appearance-none py-2 pl-3 pr-9 text-sm font-medium">
                <option>Year 7 Maths</option>
                <option>Year 8 Maths</option>
                <option>Year 9 Maths</option>
              </select>
              <SelectChevron />
            </label>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-raised)] text-[color:var(--anx-text-secondary)] transition hover:bg-[var(--anx-surface-hover)]"
              aria-label="Notifications"
            >
              <BellIcon />
            </button>
            <button type="button" className="anx-btn-primary whitespace-nowrap px-4 py-2 text-sm" aria-label="Add question (coming soon)">
              + Add question
            </button>
          </div>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--anx-text-muted)]" />
          <input
            type="search"
            className="anx-input w-full py-2.5 pl-10 pr-3 text-sm"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search questions"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--anx-border)] pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TAB_LABELS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[var(--anx-primary)] text-[color:var(--anx-primary)]'
                    : 'border-transparent text-[color:var(--anx-text-muted)] hover:text-[color:var(--anx-text)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-3xl lg:flex-1">
            <FilterSelect label="Year group" value={yearGroup} onChange={setYearGroup} options={yearOptions} />
            <FilterSelect label="Topic" value={topic} onChange={setTopic} options={topicOptions} />
            <FilterSelect label="Question type" value={questionType} onChange={setQuestionType} options={typeOptions} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="relative min-w-[11rem]">
              <span className="mb-1 block text-xs font-medium text-[color:var(--anx-text-muted)]">Sort by</span>
              <select className="anx-input w-full cursor-pointer appearance-none py-2 pl-3 pr-9 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </label>
            <div className="flex rounded-xl border border-[var(--anx-border)] p-0.5" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`rounded-lg p-2 ${view === 'list' ? 'bg-[var(--anx-primary-soft)]' : ''}`}
                aria-pressed={view === 'list'}
                aria-label="List view"
              >
                <ListViewIcon active={view === 'list'} />
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`rounded-lg p-2 ${view === 'grid' ? 'bg-[var(--anx-primary-soft)]' : ''}`}
                aria-pressed={view === 'grid'}
                aria-label="Grid view"
              >
                <GridViewIcon active={view === 'grid'} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          Previewing sample questions. Full bank and filters will connect to your library soon.
          {tab !== 'all' ? ` Tab: ${TAB_LABELS.find((x) => x.id === tab)?.label}.` : ''}
        </p>

        <ul className={`${view === 'grid' ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'} list-none p-0`}>
          {filteredDemo.map((item) => (
            <li key={item.id}>
              <article
                className="anx-card relative flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                style={{ boxShadow: 'var(--anx-shadow-sm)' }}
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ background: 'rgba(74, 64, 224, 0.12)', color: 'var(--anx-primary)' }}
                  >
                    {item.index}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.types.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: 'var(--anx-surface-container-low)', color: 'var(--anx-text-secondary)' }}
                        >
                          {tag}
                        </span>
                      ))}
                      {item.cognitive.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: 'var(--anx-info-soft)', color: 'var(--anx-info-ink)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="font-semibold leading-snug" style={{ color: 'var(--anx-text)' }}>
                      {item.stem}
                    </p>
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                      {item.trail.join(' › ')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      Used {item.usedCount} times
                    </span>
                    <button
                      type="button"
                      className="rounded-lg p-1 text-[color:var(--anx-text-muted)] hover:bg-[var(--anx-surface-hover)] hover:text-[color:var(--anx-text)]"
                      aria-label="More options"
                    >
                      <MoreIcon />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--anx-primary)] bg-transparent px-3 py-2 text-sm font-semibold text-[color:var(--anx-primary)] transition hover:bg-[var(--anx-primary-soft)]"
                  >
                    <PlayIcon />
                    Use in lesson
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {filteredDemo.length === 0 ? (
          <div className="anx-card p-8 text-center text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            No questions match your search.
          </div>
        ) : null}

        <nav className="flex flex-col gap-3 border-t border-[var(--anx-border)] pt-4 text-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Pagination">
          <p className="m-0" style={{ color: 'var(--anx-text-muted)' }}>
            Showing {from} to {to} of {totalQuestions.toLocaleString()} questions
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className="rounded-lg px-2 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`min-w-[2rem] rounded-lg px-2 py-1 ${page === n ? 'bg-[var(--anx-primary)] font-semibold text-white' : 'hover:bg-[var(--anx-surface-hover)]'}`}
                aria-current={page === n ? 'page' : undefined}
              >
                {n}
              </button>
            ))}
            {totalPages > 5 ? (
              <span className="px-1" style={{ color: 'var(--anx-text-muted)' }}>
                …
              </span>
            ) : null}
            {totalPages > 5 ? (
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                className={`min-w-[2rem] rounded-lg px-2 py-1 ${page === totalPages ? 'bg-[var(--anx-primary)] font-semibold text-white' : 'hover:bg-[var(--anx-surface-hover)]'}`}
              >
                {totalPages}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg px-2 py-1 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </nav>

        <aside
          className="flex flex-col gap-3 rounded-2xl border border-[rgba(99,56,241,0.12)] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          style={{ background: '#f5f3ff' }}
          aria-labelledby="question-bank-ai-heading"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#6338f1] shadow-sm">
              <SparkleIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 id="question-bank-ai-heading" className="text-base font-bold text-[color:var(--anx-text)]">
                Create new questions in seconds
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
                Use AI to generate questions tailored to your class and topic.
              </p>
            </div>
          </div>
          <Link
            href="/teacher/question-bank/generate"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-[#6338f1] bg-white px-4 py-2.5 text-sm font-semibold text-[#6338f1] shadow-sm transition hover:bg-[rgba(99,56,241,0.06)] no-underline"
          >
            <SparkleIcon className="h-4 w-4" />
            Generate with AI
          </Link>
        </aside>
      </div>

      <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:w-72" aria-labelledby="filters-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="filters-heading" className="m-0 text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>
            Filters
          </h2>
          <button
            type="button"
            className="text-sm font-medium text-[color:var(--anx-primary)] hover:underline"
            onClick={() => {
              setYearGroup('7');
              setTopic('algebra');
              setQuestionType('all');
            }}
          >
            Clear all
          </button>
        </div>
        <div className="anx-card space-y-4 p-4">
          <FilterSelect label="Year group" value={yearGroup} onChange={setYearGroup} options={yearOptions} />
          <FilterSelect label="Topic" value={topic} onChange={setTopic} options={topicOptions} />
          <FilterSelect label="Question type" value={questionType} onChange={setQuestionType} options={typeOptions} />
        </div>
      </aside>
    </div>
  );
}
