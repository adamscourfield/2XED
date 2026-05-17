'use client';

import { useMemo, useState } from 'react';

export type TeacherClassesHubRow = {
  id: string;
  name: string;
  code: string;
  hue: string;
  yearGroup: string | null;
  studentCount: number;
  lastLive: {
    at: string;
    topic: string;
    isLive: boolean;
  } | null;
};

type SortKey = 'name' | 'students';

type Props = {
  rows: TeacherClassesHubRow[];
  teacherDisplayName: string;
};


export function TeacherClassesHub({
  rows,
  teacherDisplayName,
}: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [view, setView] = useState<'list' | 'grid'>('list');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.yearGroup?.toLowerCase().includes(q) ?? false) ||
            r.code.toLowerCase().includes(q)
        )
      : [...rows];

    list.sort((a, b) => {
      if (sort === 'students') return b.studentCount - a.studentCount || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [rows, query, sort]);

  return (
    <div className="tc-hub">
      <div className="tc-hub-toolbar">
        <div className="tc-hub-search-wrap">
          <span className="tc-hub-search-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
              <path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            className="tc-hub-search"
            placeholder="Search classes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search classes"
          />
        </div>
        <div className="tc-hub-toolbar-right">
          <div className="tc-hub-sort-row">
            <span className="tc-hub-sort-prefix">Sort by:</span>
            <select className="tc-hub-select tc-hub-select--sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="name">Class name</option>
              <option value="students">Students</option>
            </select>
          </div>
          <div className="tc-hub-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`tc-hub-view-btn${view === 'list' ? ' tc-hub-view-btn--active' : ''}`}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              title="List view"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`tc-hub-view-btn${view === 'grid' ? ' tc-hub-view-btn--active' : ''}`}
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
              title="Grid view"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="tc-hub-table-shell">
          <table className="tc-hub-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Year group</th>
                <th>Students</th>
                <th>Last live lesson</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="tc-hub-class-cell">
                        <span className="tc-hub-class-orb" style={{ background: row.hue }} aria-hidden>
                          {row.code.slice(0, 3)}
                        </span>
                        <div>
                          <p className="tc-hub-class-name">{row.name}</p>
                          <p className="tc-hub-class-teacher">{teacherDisplayName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="tc-hub-muted">{row.yearGroup ?? '—'}</td>
                    <td>
                      {row.studentCount} student{row.studentCount !== 1 ? 's' : ''}
                    </td>
                    <td>
                      {row.lastLive ? (
                        <div>
                          <p className="tc-hub-live-time">
                            {row.lastLive.at}
                            {row.lastLive.isLive ? <span className="tc-hub-live-pill">Live</span> : null}
                          </p>
                          <p className="tc-hub-live-topic">{row.lastLive.topic}</p>
                        </div>
                      ) : (
                        <span className="tc-hub-muted">No sessions yet</span>
                      )}
                    </td>
                  </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="tc-hub-empty">
                    {rows.length === 0 ? 'No classes linked yet.' : 'No classes match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="tc-hub-grid">
          {filtered.map((row) => (
            <article key={row.id} className="tc-hub-grid-card">
              <div className="tc-hub-grid-head">
                <span className="tc-hub-class-orb" style={{ background: row.hue }} aria-hidden>
                  {row.code.slice(0, 3)}
                </span>
                <div className="min-w-0">
                  <p className="tc-hub-class-name truncate">{row.name}</p>
                  <p className="tc-hub-class-teacher truncate">{teacherDisplayName}</p>
                </div>
              </div>
              <p className="tc-hub-grid-meta">
                {row.yearGroup ?? '—'} · {row.studentCount} student{row.studentCount !== 1 ? 's' : ''}
              </p>
              {row.lastLive ? (
                <p className="tc-hub-grid-live mt-3 text-sm">
                  <span className="font-semibold text-[color:var(--anx-text)]">{row.lastLive.at}</span>
                  <br />
                  <span className="text-[color:var(--anx-text-muted)]">{row.lastLive.topic}</span>
                </p>
              ) : (
                <p className="tc-hub-grid-live mt-3 text-sm text-[color:var(--anx-text-muted)]">No sessions yet</p>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="tc-hub-cta">
        <div className="tc-hub-cta-icon" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12.5 7.5 18 3M18 3v4h-4M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="tc-hub-cta-copy">
          <p className="tc-hub-cta-title">Create a new class</p>
          <p className="tc-hub-cta-sub">Add a new class and invite your students to join.</p>
        </div>
        <button type="button" className="tc-hub-cta-btn" disabled title="Contact your school admin to link a new class">
          + Add class
        </button>
      </div>
    </div>
  );
}
