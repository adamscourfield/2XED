'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { AnswerMode, LessonItem } from './LessonBuilder';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BankSkill {
  id: string;
  code: string;
  name: string;
  strand: string | null;
  sortOrder: number;
}

interface BankItem {
  id: string;
  question: string;
  type: string;
  options: unknown;
  answer: string;
  liveMetadata: unknown;
  skills: Array<{ skill: { id: string; code: string; name: string; strand: string | null } }>;
}

type DifficultyFilter = 'EASIER' | 'CORE' | 'CHALLENGE' | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseChoices(options: unknown): string[] {
  if (!options || typeof options !== 'object') return [];
  const raw = options as Record<string, unknown>;
  if (Array.isArray(raw)) return raw.filter((o): o is string => typeof o === 'string');
  if (Array.isArray(raw.choices)) {
    return (raw.choices as unknown[]).filter((o): o is string => typeof o === 'string');
  }
  return [];
}

function inferAnswerMode(type: string): AnswerMode {
  const t = type.toUpperCase();
  if (t === 'ORDER') return 'ORDER';
  if (t === 'SHORT_TEXT' || t === 'SHORT_NUMERIC' || t === 'NUMERIC' || t === 'SHORT_ANSWER') return 'SHORT_ANSWER';
  if (t === 'MCQ' || t === 'TRUE_FALSE') return 'MCQ';
  // R6: unknown types fall back to SHORT_ANSWER, not MCQ, to avoid creating a
  // broken MCQ with no options. The teacher will see a short-answer form and can fix it.
  return 'SHORT_ANSWER';
}

function difficultyLabel(band: string | undefined): string {
  if (band === 'EASIER') return 'Easier';
  if (band === 'CHALLENGE') return 'Challenge';
  return 'Core';
}

function difficultyColor(band: string | undefined): string {
  if (band === 'EASIER') return '#10b981';
  if (band === 'CHALLENGE') return '#ef4444';
  return '#3b82f6';
}

function getLiveMetadata(raw: unknown): { difficultyBand?: string; itemPurpose?: string; liveSuitability?: string } {
  if (raw && typeof raw === 'object') return raw as Record<string, string>;
  return {};
}

// ─── QuestionBankPicker ───────────────────────────────────────────────────────

interface QuestionBankPickerProps {
  subjectId: string;
  lessonId: string;
  blockId: string;
  onItemAdded: (item: LessonItem) => void;
  onClose: () => void;
}

export function QuestionBankPicker({
  subjectId,
  lessonId,
  blockId,
  onItemAdded,
  onClose,
}: QuestionBankPickerProps) {
  const [skills, setSkills] = useState<BankSkill[]>([]);
  const [items, setItems] = useState<BankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  // R2: track items added where the bank answer text didn't match any option
  const [answerMatchWarning, setAnswerMatchWarning] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(null);
  const [skip, setSkip] = useState(0);

  const debouncedSearch = useDebounce(search, 350);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Load skills for this subject
  useEffect(() => {
    fetch(`/api/subjects/${subjectId}/skills`)
      .then((r) => r.json())
      .then((d) => setSkills(d.skills ?? []))
      .catch(() => {});
  }, [subjectId]);

  // Load items whenever filters change
  const loadItems = useCallback(
    async (nextSkip: number) => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({ subjectId, take: '24', skip: String(nextSkip) });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedSkillIds.length > 0) params.set('skillIds', selectedSkillIds.join(','));
        if (difficulty) params.set('difficulty', difficulty);

        const res = await fetch(`/api/items/search?${params}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json() as { items: BankItem[]; total: number; hasMore: boolean };
        setItems(nextSkip === 0 ? data.items : (prev) => [...prev, ...data.items]);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load questions');
      } finally {
        setLoading(false);
      }
    },
    [subjectId, debouncedSearch, selectedSkillIds, difficulty]
  );

  useEffect(() => {
    setSkip(0);
    void loadItems(0);
  }, [loadItems]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const handleAddItem = async (bankItem: BankItem) => {
    setAdding(bankItem.id);
    setAnswerMatchWarning(null);
    try {
      const choices = parseChoices(bankItem.options);
      const answerMode = inferAnswerMode(bankItem.type);

      const content: Record<string, unknown> = { question: bankItem.question };
      if (choices.length > 0) content.options = choices;

      // MCQ stores correctIndex (integer), not answer text
      if (answerMode === 'MCQ' && bankItem.answer && choices.length > 0) {
        const correctIndex = choices.indexOf(bankItem.answer);
        if (correctIndex !== -1) {
          content.correctIndex = correctIndex;
        } else {
          // R2: answer text didn't match any option — add the question but warn the teacher
          // so they know to set the correct answer manually in the editor.
          setAnswerMatchWarning(
            `"${bankItem.question.slice(0, 60)}${bankItem.question.length > 60 ? '…' : ''}" was added but its correct answer couldn't be matched to an option. Open the question to set it manually.`
          );
        }
      } else if (answerMode === 'SHORT_ANSWER' && bankItem.answer) {
        content.answer = bankItem.answer;
      } else if (bankItem.answer) {
        // ORDER / PICK — preserve raw answer
        content.answer = bankItem.answer;
      }

      const res = await fetch(`/api/lessons/${lessonId}/blocks/${blockId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'QUESTION',
          answerMode,
          content,
          sourceItemId: bankItem.id,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newItem = await res.json() as LessonItem;
      onItemAdded(newItem);
    } finally {
      setAdding(null);
    }
  };

  const loadMore = () => {
    const nextSkip = skip + 24;
    setSkip(nextSkip);
    void loadItems(nextSkip);
  };

  // Group skills by strand
  const skillsByStrand = skills.reduce<Record<string, BankSkill[]>>((acc, s) => {
    const strand = s.strand ?? 'Other';
    if (!acc[strand]) acc[strand] = [];
    acc[strand].push(s);
    return acc;
  }, {});

  const difficultyOptions: { value: DifficultyFilter; label: string; color: string }[] = [
    { value: null, label: 'All', color: '#6b7280' },
    { value: 'EASIER', label: 'Easier', color: '#10b981' },
    { value: 'CORE', label: 'Core', color: '#3b82f6' },
    { value: 'CHALLENGE', label: 'Challenge', color: '#ef4444' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Browse question bank"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-[#111827]">Question Bank</h2>
            <p className="text-xs text-[#6b7280]">Browse and add questions to this block</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="shrink-0 space-y-3 border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-4">
          {/* Search */}
          <div className="relative">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions…"
              className="w-full rounded-lg border border-[#e5e7eb] bg-white py-2 pl-9 pr-3 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#5850ec] focus:ring-2 focus:ring-[#5850ec]/20 placeholder:text-[#9ca3af]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151]"
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Difficulty */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">Difficulty</p>
            <div className="flex gap-1.5">
              {difficultyOptions.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                    difficulty === opt.value
                      ? 'border-transparent text-white'
                      : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#d1d5db]'
                  }`}
                  style={difficulty === opt.value ? { background: opt.color } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic / Skill filter */}
          {Object.keys(skillsByStrand).length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                Topic / skill
                {selectedSkillIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSkillIds([])}
                    className="ml-2 normal-case font-normal text-[#5850ec] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </p>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {Object.entries(skillsByStrand).map(([strand, strandSkills]) => (
                  <div key={strand}>
                    <p className="mb-1 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">{strand}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {strandSkills.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                            selectedSkillIds.includes(skill.id)
                              ? 'border-[#5850ec] bg-[#5850ec] text-white'
                              : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#5850ec]/40'
                          }`}
                        >
                          {skill.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {/* Result count / error */}
          <div className="sticky top-0 z-10 border-b border-[#f3f4f6] bg-white px-5 py-2.5">
            {loadError ? (
              <p className="text-xs text-red-600">
                Failed to load: {loadError}
                <button
                  type="button"
                  onClick={() => void loadItems(0)}
                  className="ml-2 font-semibold underline"
                >
                  Retry
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#6b7280]">
                {loading && items.length === 0
                  ? 'Loading…'
                  : `${total.toLocaleString()} question${total !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          {/* R2: answer-match warning — shown when an MCQ's correct answer couldn't be matched */}
          {answerMatchWarning && (
            <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3.5 py-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-[#f59e0b]" aria-hidden>
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="min-w-0 flex-1 text-xs text-[#92400e]">{answerMatchWarning}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setAnswerMatchWarning(null)}
                className="shrink-0 text-[#9ca3af] transition hover:text-[#6b7280]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}

          {/* Item list */}
          <ul className="divide-y divide-[#f3f4f6]">
            {items.map((item) => {
              const meta = getLiveMetadata(item.liveMetadata);
              const band = meta.difficultyBand;
              const isAdding = adding === item.id;

              return (
                <li key={item.id} className="flex items-start gap-3 px-5 py-4 hover:bg-[#f9fafb] transition">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#111827] line-clamp-3 leading-snug">{item.question}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {band && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{ background: difficultyColor(band) }}
                        >
                          {difficultyLabel(band)}
                        </span>
                      )}
                      <span className="rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2 py-0.5 text-[11px] font-medium text-[#6b7280]">
                        {item.type}
                      </span>
                      {item.skills.slice(0, 3).map(({ skill }) => (
                        <span
                          key={skill.id}
                          className="rounded-full border border-[#e5e7eb] bg-[#f5f3ff] px-2 py-0.5 text-[11px] font-medium text-[#5850ec]"
                        >
                          {skill.name}
                        </span>
                      ))}
                      {item.skills.length > 3 && (
                        <span className="text-[11px] text-[#9ca3af]">+{item.skills.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddItem(item)}
                    disabled={isAdding}
                    className="shrink-0 rounded-lg border border-[#5850ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#5850ec] shadow-sm transition hover:bg-[#5850ec] hover:text-white disabled:opacity-50"
                  >
                    {isAdding ? 'Adding…' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Empty state */}
          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3f4f6]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#9ca3af]" aria-hidden>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#374151]">No questions found</p>
              <p className="mt-1 text-xs text-[#6b7280]">Try adjusting your filters or search term</p>
            </div>
          )}

          {/* Load more */}
          {hasMore && !loading && (
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={loadMore}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white py-2 text-xs font-semibold text-[#374151] transition hover:bg-[#f3f4f6]"
              >
                Load more
              </button>
            </div>
          )}

          {loading && items.length > 0 && (
            <div className="px-5 py-4 text-center">
              <p className="text-xs text-[#9ca3af]">Loading…</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
