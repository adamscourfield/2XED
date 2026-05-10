'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

type Subject = { id: string; title: string; slug: string };
type Skill = { id: string; name: string; strand: string };

type Props = { subjects: Subject[] };

const YEAR_GROUPS = ['7', '8', '9', '10', '11', '12', '13'];

export function NewLessonForm({ subjects }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [yearGroup, setYearGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skill search state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  // Fetch skills whenever subject changes
  useEffect(() => {
    if (!subjectId) return;
    setSkillsLoading(true);
    setSkills([]);
    setSkillSearch('');
    fetch(`/api/subjects/${subjectId}/skills`)
      .then((r) => r.ok ? r.json() : { skills: [] })
      .then((data: { skills?: Skill[] }) => setSkills(data.skills ?? []))
      .catch(() => setSkills([]))
      .finally(() => setSkillsLoading(false));
  }, [subjectId]);

  const filteredSkills = skillSearch.trim()
    ? skills.filter((s) =>
        s.name.toLowerCase().includes(skillSearch.trim().toLowerCase()) ||
        s.strand.toLowerCase().includes(skillSearch.trim().toLowerCase())
      )
    : skills;

  function handleSkillSelect(skill: Skill) {
    setTopic(skill.name);
    setSkillSearch(skill.name);
    setSkillDropdownOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !topic.trim() || !subjectId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), topic: topic.trim(), subjectId, yearGroup: yearGroup || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const lesson = await res.json() as { id: string };
      router.push(`/teacher/lessons/${lesson.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#5850ec] focus:ring-2 focus:ring-[#5850ec]/20 placeholder:text-[#9ca3af]';
  const labelCls = 'mb-1.5 block text-sm font-semibold text-[#374151]';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="lesson-title" className={labelCls}>
          Lesson title <span className="text-red-500">*</span>
        </label>
        <input
          id="lesson-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Introduction to Fractions"
          className={inputCls}
          required
          maxLength={200}
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="lesson-subject" className={labelCls}>
          Subject <span className="text-red-500">*</span>
        </label>
        {subjects.length === 0 ? (
          <p className="text-sm text-red-600">No subjects found. Check your database setup.</p>
        ) : (
          <select
            id="lesson-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className={inputCls}
            required
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Skill search — optional, populates topic when selected */}
      {subjectId && (
        <div className="relative">
          <label htmlFor="skill-search" className={labelCls}>
            Search for a skill or sub-topic{' '}
            <span className="text-[#9ca3af] font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              id="skill-search"
              ref={skillInputRef}
              type="text"
              value={skillSearch}
              onChange={(e) => {
                setSkillSearch(e.target.value);
                setSkillDropdownOpen(true);
                // Keep topic in sync with free-form typing if user clears the pick
                if (!e.target.value) setTopic('');
              }}
              onFocus={() => setSkillDropdownOpen(true)}
              onBlur={() => setTimeout(() => setSkillDropdownOpen(false), 150)}
              placeholder={skillsLoading ? 'Loading skills…' : 'e.g. Equivalent fractions'}
              className={inputCls}
              disabled={skillsLoading}
              autoComplete="off"
            />
            {skillsLoading && (
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 text-[#9ca3af]"
                viewBox="0 0 24 24" fill="none" aria-hidden
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
          </div>
          {skillDropdownOpen && filteredSkills.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#e5e7eb] bg-white shadow-lg">
              {filteredSkills.slice(0, 40).map((skill) => (
                <li key={skill.id}>
                  <button
                    type="button"
                    onMouseDown={() => handleSkillSelect(skill)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f5f3ff] flex flex-col"
                  >
                    <span className="font-medium text-[#111827]">{skill.name}</span>
                    {skill.strand && (
                      <span className="text-xs text-[#9ca3af]">{skill.strand}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-xs text-[#6b7280]">
            Select a skill to auto-fill the topic below, or type your own.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="lesson-topic" className={labelCls}>
          Topic / learning objective <span className="text-red-500">*</span>
        </label>
        <input
          id="lesson-topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Students can add fractions with unlike denominators"
          className={inputCls}
          required
          maxLength={200}
        />
        <p className="mt-1.5 text-xs text-[#6b7280]">
          Describe what students will be able to do by the end of this lesson.
        </p>
      </div>

      <div>
        <label htmlFor="lesson-year" className={labelCls}>
          Year group <span className="text-[#9ca3af] font-normal">(optional)</span>
        </label>
        <select
          id="lesson-year"
          value={yearGroup}
          onChange={(e) => setYearGroup(e.target.value)}
          className={inputCls}
        >
          <option value="">Select year group…</option>
          {YEAR_GROUPS.map((y) => (
            <option key={y} value={y}>Year {y}</option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-[#6b7280]">
          Helps the AI target difficulty and question level appropriately.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !title.trim() || !topic.trim() || !subjectId}
          className="inline-flex items-center gap-2 rounded-lg bg-[#5850ec] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Creating…
            </>
          ) : (
            <>
              Create lesson
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
        <Link href="/teacher/lessons" className="text-sm text-[#6b7280] hover:text-[#374151]">
          Cancel
        </Link>
      </div>
    </form>
  );
}
