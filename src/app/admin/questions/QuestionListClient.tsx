'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

interface Skill {
  id: string;
  code: string;
  name: string;
  strand: string;
}

interface QuestionItem {
  id: string;
  question: string;
  type: string;
  answer: string;
  createdAt: string;
  skills: { skill: Skill }[];
}

interface Props {
  skills: Skill[];
}

const TYPE_LABELS: Record<string, string> = {
  MCQ: 'MCQ',
  TRUE_FALSE: 'T/F',
  SHORT_TEXT: 'Short',
  SHORT_NUMERIC: 'Numeric',
  ORDER: 'Order',
  NUMBER_LINE: 'Num. Line',
  MULTI_SELECT: 'Multi',
};

const TYPE_COLOURS: Record<string, { bg: string; text: string }> = {
  MCQ:          { bg: 'var(--anx-primary-container)', text: '#93c5fd' },
  TRUE_FALSE:   { bg: '#1e3a5f', text: '#93c5fd' },
  SHORT_TEXT:   { bg: '#134e2a', text: '#86efac' },
  SHORT_NUMERIC:{ bg: '#3b1f00', text: '#fbbf24' },
  ORDER:        { bg: '#3b0764', text: '#d8b4fe' },
  NUMBER_LINE:  { bg: '#1a2e1a', text: '#4ade80' },
  MULTI_SELECT: { bg: '#2a1a00', text: '#fb923c' },
};

function extractStem(question: string): string {
  return question.replace(/^\[[^\]]+\]\s*/, '');
}

function extractRef(question: string): string {
  return question.match(/^\[([^\]]+)\]/)?.[1] ?? '';
}

export function QuestionListClient({ skills }: Props) {
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const LIMIT = 25;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      ...(search ? { search } : {}),
      ...(skillFilter ? { skill: skillFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    });
    const res = await fetch(`/api/admin/questions?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, skillFilter, typeFilter, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, skillFilter, typeFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions…"
          className="anx-input flex-1 min-w-48"
        />
        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="anx-input w-52"
          style={{ background: 'var(--anx-surface-container-highest)' }}
        >
          <option value="">All skills</option>
          {skills.map((s) => (
            <option key={s.id} value={s.code}>{s.code} — {s.name.slice(0, 40)}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="anx-input w-40"
          style={{ background: 'var(--anx-surface-container-highest)' }}
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
        {loading ? 'Loading…' : `${total.toLocaleString()} question${total !== 1 ? 's' : ''}`}
      </p>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--anx-border)' }}
      >
        {loading ? (
          <div className="p-12 text-center" style={{ color: 'var(--anx-text-muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--anx-text-muted)' }}>No questions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--anx-surface-container-low)', borderBottom: '1px solid var(--anx-border)' }}>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--anx-text-muted)' }}>Ref</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--anx-text-muted)' }}>Question</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--anx-text-muted)' }}>Type</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--anx-text-muted)' }}>Skills</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const stem = extractStem(item.question);
                const ref = extractRef(item.question);
                const colours = TYPE_COLOURS[item.type] ?? { bg: '#222', text: '#ccc' };
                return (
                  <tr
                    key={item.id}
                    style={{
                      background: i % 2 === 0 ? 'var(--anx-surface-container-lowest)' : 'var(--anx-surface-container-low)',
                      borderBottom: '1px solid var(--anx-border)',
                    }}
                  >
                    <td className="p-3 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--anx-text-faint)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ref}
                    </td>
                    <td className="p-3" style={{ maxWidth: '420px' }}>
                      <span style={{ color: 'var(--anx-text)' }} className="line-clamp-2">{stem}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold"
                        style={{ background: colours.bg, color: colours.text }}
                      >
                        {TYPE_LABELS[item.type] ?? item.type}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {item.skills.slice(0, 3).map(({ skill }) => (
                          <span
                            key={skill.id}
                            className="inline-block rounded px-1.5 py-0.5 text-xs font-mono"
                            style={{ background: 'var(--anx-surface-container-highest)', color: 'var(--anx-text-secondary)' }}
                          >
                            {skill.code}
                          </span>
                        ))}
                        {item.skills.length > 3 && (
                          <span className="text-xs" style={{ color: 'var(--anx-text-faint)' }}>+{item.skills.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/questions/${item.id}`}
                        className="text-xs font-medium"
                        style={{ color: 'var(--anx-primary)' }}
                      >
                        Edit →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="anx-btn-secondary px-4 py-2 text-sm disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="anx-btn-secondary px-4 py-2 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
