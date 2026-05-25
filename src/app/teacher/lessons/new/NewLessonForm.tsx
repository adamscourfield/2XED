'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type Subject = { id: string; title: string; slug: string };
type Skill = { id: string; name: string; strand: string };
type BlockType = 'DO_NOW' | 'EXPLAIN' | 'MODEL' | 'CHECK' | 'PRACTICE';

type Props = { subjects: Subject[] };

type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  blocks: BlockType[];
};

const YEAR_GROUPS = ['7', '8', '9', '10', '11', '12', '13'];
const YEAR_GROUP_STORAGE_KEY = 'ember:last-lesson-year-group';

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'guided-core',
    name: 'Guided Core',
    description: 'Warm-up, explanation, worked example, check for understanding, then practice.',
    blocks: ['DO_NOW', 'EXPLAIN', 'MODEL', 'CHECK', 'PRACTICE'],
  },
  {
    id: 'fast-launch',
    name: 'Fast Launch',
    description: 'A lean structure for short lessons or quick intervention sessions.',
    blocks: ['DO_NOW', 'EXPLAIN', 'CHECK', 'PRACTICE'],
  },
  {
    id: 'practice-heavy',
    name: 'Practice Heavy',
    description: 'Move quickly from modelling into extended student practice.',
    blocks: ['DO_NOW', 'MODEL', 'PRACTICE', 'PRACTICE'],
  },
];

function sentenceCaseSkill(skillName: string): string {
  const trimmed = skillName.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function buildObjectiveSuggestions(skillName: string): string[] {
  const topic = sentenceCaseSkill(skillName);
  if (!topic) return [];

  return [
    `Students can solve problems involving ${topic}.`,
    `Students can explain how to use ${topic} accurately.`,
    `Students can apply ${topic} independently in guided and independent practice.`,
  ];
}

export function NewLessonForm({ subjects }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [yearGroup, setYearGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(STARTER_TEMPLATES[0].id);
  const [selectedSkillName, setSelectedSkillName] = useState('');

  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedYearGroup = window.localStorage.getItem(YEAR_GROUP_STORAGE_KEY);
    if (storedYearGroup && YEAR_GROUPS.includes(storedYearGroup)) {
      setYearGroup(storedYearGroup);
    }
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    setSkillsLoading(true);
    setSkills([]);
    setSkillSearch('');
    setSelectedSkillName('');

    fetch(`/api/subjects/${subjectId}/skills`)
      .then((r) => (r.ok ? r.json() : { skills: [] }))
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

  const objectiveSuggestions = useMemo(
    () => buildObjectiveSuggestions(selectedSkillName || skillSearch),
    [selectedSkillName, skillSearch]
  );

  const selectedTemplate =
    STARTER_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? STARTER_TEMPLATES[0];

  function handleSkillSelect(skill: Skill) {
    setSelectedSkillName(skill.name);
    setTopic(buildObjectiveSuggestions(skill.name)[0] ?? skill.name);
    setSkillSearch(skill.name);
    setSkillDropdownOpen(false);
  }

  async function createStarterBlocks(lessonId: string) {
    for (const type of selectedTemplate.blocks) {
      const blockRes = await fetch(`/api/lessons/${lessonId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!blockRes.ok) {
        throw new Error(`Failed to create ${type} block`);
      }
    }
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
        body: JSON.stringify({
          title: title.trim(),
          topic: topic.trim(),
          subjectId,
          yearGroup: yearGroup || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const lesson = (await res.json()) as { id: string };

      if (typeof window !== 'undefined' && yearGroup) {
        window.localStorage.setItem(YEAR_GROUP_STORAGE_KEY, yearGroup);
      }

      try {
        await createStarterBlocks(lesson.id);
        router.push(`/teacher/lessons/${lesson.id}`);
      } catch {
        router.push(`/teacher/lessons/${lesson.id}?setup=starter-error`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-sm outline-none transition focus:border-[#5850ec] focus:ring-2 focus:ring-[#5850ec]/20 placeholder:text-[#9ca3af]';
  const labelCls = 'mb-1.5 block text-sm font-semibold text-[#374151]';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-5 rounded-[28px] border border-[#e8e7f8] bg-white/90 p-6 shadow-[0_18px_40px_rgba(88,80,236,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c76b8]">
              Lesson Setup
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#1f2440]">Set the teaching goal first</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Pick the class context, then let Ember scaffold a starting structure for you.
            </p>
          </div>
          <div className="hidden rounded-2xl border border-[#ecebff] bg-[#f7f6ff] px-4 py-3 text-xs text-[#5b4db8] sm:block">
            Teachers move faster when the objective and flow are decided together.
          </div>
        </div>

        <div>
          <label htmlFor="lesson-title" className={labelCls}>
            Lesson title <span className="text-red-500">*</span>
          </label>
          <input
            id="lesson-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Equivalent Fractions: Building Fluency"
            className={inputCls}
            required
            maxLength={200}
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
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
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[#6b7280]">
              We&apos;ll remember the last year group you used on this device.
            </p>
          </div>
        </div>
      </section>

      {subjectId && (
        <section className="space-y-5 rounded-[28px] border border-[#e8e7f8] bg-[linear-gradient(180deg,#ffffff_0%,#faf9ff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c76b8]">
              Objective Builder
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#1f2440]">Anchor the lesson to a skill</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Search a curriculum skill, then start from a ready-made objective instead of typing from scratch.
            </p>
          </div>

          <div className="relative">
            <label htmlFor="skill-search" className={labelCls}>
              Search for a skill or sub-topic <span className="text-[#9ca3af] font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                id="skill-search"
                ref={skillInputRef}
                type="text"
                value={skillSearch}
                onChange={(e) => {
                  setSkillSearch(e.target.value);
                  setSelectedSkillName('');
                  setSkillDropdownOpen(true);
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
                  className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#9ca3af]"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
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
                      className="flex w-full flex-col px-4 py-2.5 text-left text-sm hover:bg-[#f5f3ff]"
                    >
                      <span className="font-medium text-[#111827]">{skill.name}</span>
                      {skill.strand && <span className="text-xs text-[#9ca3af]">{skill.strand}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 text-xs text-[#6b7280]">
              Pick a skill to generate objective starters, or type your own lesson focus below.
            </p>
          </div>

          {objectiveSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Suggested learning objectives
              </p>
              <div className="grid gap-2">
                {objectiveSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTopic(suggestion)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      topic === suggestion
                        ? 'border-[#5850ec] bg-[#f5f3ff] text-[#352d84] shadow-sm'
                        : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#c7c4f8] hover:bg-[#faf9ff]'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
              Aim for one sentence that tells the teacher what students should be able to do by the end.
            </p>
          </div>
        </section>
      )}

      <section className="space-y-5 rounded-[28px] border border-[#ece8d8] bg-[linear-gradient(180deg,#fffdf7_0%,#fff9ed_100%)] p-6 shadow-[0_18px_40px_rgba(191,141,42,0.08)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a96b00]">
            Starter Structure
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#33220a]">Open the builder with momentum</h2>
          <p className="mt-1 text-sm text-[#7a5b26]">
            Choose the block sequence Ember should create for this lesson the moment it opens.
          </p>
        </div>

        <div className="grid gap-3">
          {STARTER_TEMPLATES.map((template) => {
            const selected = template.id === selectedTemplateId;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`rounded-3xl border px-4 py-4 text-left transition ${
                  selected
                    ? 'border-[#e6b44f] bg-white shadow-[0_10px_30px_rgba(233,176,52,0.14)]'
                    : 'border-[#f0e3c2] bg-white/80 hover:border-[#e7c883] hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#2c2417]">{template.name}</span>
                      {selected && (
                        <span className="rounded-full bg-[#fff3d6] px-2 py-0.5 text-[11px] font-semibold text-[#9c6700]">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#7a5b26]">{template.description}</p>
                  </div>
                  <span className="rounded-full border border-[#f1deaf] bg-[#fffaf0] px-3 py-1 text-[11px] font-semibold text-[#8c6314]">
                    {template.blocks.length} blocks
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.blocks.map((block, index) => (
                    <span
                      key={`${template.id}-${block}-${index}`}
                      className="rounded-full bg-[#f8edd2] px-2.5 py-1 text-[11px] font-semibold text-[#6e4e19]"
                    >
                      {block.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-dashed border-[#edd8a2] bg-white/70 px-4 py-3 text-sm text-[#7a5b26]">
          Ember will create the lesson first, then add this starter sequence automatically before the builder opens.
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !title.trim() || !topic.trim() || !subjectId}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5850ec] px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Building lesson shell…
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
