'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import type { CurriculumPlanDetail, CurriculumUnitDetail } from '@/app/api/curriculum-plans/[planId]/route';
import type { UnitAiSuggestion } from '@/app/api/curriculum-plans/[planId]/units/ai-suggest/route';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Skill {
  id: string;
  code: string;
  name: string;
}

interface Props {
  plan: CurriculumPlanDetail;
  availableSkills: Skill[];
  subjectId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toIsoDate(val: string): string | undefined {
  if (!val) return undefined;
  return new Date(val).toISOString();
}

const UNIT_COLOURS = [
  'bg-[#eef2ff] text-[#5850ec]',
  'bg-[#f0fdf4] text-[#059669]',
  'bg-[#fff7ed] text-[#d97706]',
  'bg-[#fdf4ff] text-[#9333ea]',
  'bg-[#fef2f2] text-[#dc2626]',
  'bg-[#f0f9ff] text-[#0284c7]',
];

// ── New Lesson Modal ──────────────────────────────────────────────────────────

function NewLessonModal({
  unit,
  subjectId,
  onClose,
}: {
  unit: CurriculumUnitDetail;
  subjectId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !topic.trim()) return;
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
          curriculumUnitId: unit.id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const lesson = await res.json() as { id: string };
      router.push(`/teacher/lessons/${lesson.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create lesson');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
      role="dialog"
      aria-modal
      aria-labelledby="new-lesson-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-4 bg-[#10b981] px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6M12 18v-6M9 15h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="new-lesson-title" className="font-bold text-white">New lesson</h2>
            <p className="mt-0.5 truncate text-sm text-white/80">Unit: {unit.title}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-white/70 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Lesson title</label>
            <input
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
              placeholder="e.g. Introduction to Algebra"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Topic</label>
            <input
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
              placeholder="e.g. Forming and solving linear equations"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !topic.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#10b981] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#059669] disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create & open lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AI Assist Panel ───────────────────────────────────────────────────────────

function AiAssistPanel({
  planId,
  unitTitle,
  availableSkills,
  onApply,
}: {
  planId: string;
  unitTitle: string;
  availableSkills: Skill[];
  onApply: (suggestion: UnitAiSuggestion) => void;
}) {
  type AiMode = 'describe' | 'import';
  const [mode, setMode] = useState<AiMode>('describe');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<UnitAiSuggestion | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const skillCodeMap = new Map(availableSkills.map((s) => [s.code.toUpperCase(), s.id]));

  const handleGenerate = async () => {
    if (!unitTitle.trim()) {
      setError('Add a unit title first so AI has context.');
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      let res: Response;
      if (mode === 'import' && file) {
        const form = new FormData();
        form.append('mode', 'import');
        form.append('unitTitle', unitTitle);
        form.append('file', file);
        res = await fetch(`/api/curriculum-plans/${planId}/units/ai-suggest`, { method: 'POST', body: form });
      } else {
        res = await fetch(`/api/curriculum-plans/${planId}/units/ai-suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'describe', unitTitle, description }),
        });
      }
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `HTTP ${res.status}`);
      }
      const suggestion = await res.json() as UnitAiSuggestion;
      setPreview(suggestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    // Resolve skill codes → IDs
    const resolvedIds = (preview.suggestedSkillCodes ?? [])
      .map((code) => skillCodeMap.get(code.toUpperCase()))
      .filter((id): id is string => !!id);
    onApply({ ...preview, suggestedSkillCodes: resolvedIds });
    setPreview(null);
  };

  return (
    <div className="rounded-xl border border-[#5850ec]/20 bg-[#eef2ff] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#5850ec]" aria-hidden>
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-semibold text-[#4338ca]">AI assist</span>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-[#c7d2fe] bg-white overflow-hidden text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode('describe')}
          className={`flex-1 py-2 transition ${mode === 'describe' ? 'bg-[#5850ec] text-white' : 'text-[#6b7280] hover:bg-[#f9fafb]'}`}
        >
          Describe topic
        </button>
        <button
          type="button"
          onClick={() => setMode('import')}
          className={`flex-1 py-2 transition ${mode === 'import' ? 'bg-[#5850ec] text-white' : 'text-[#6b7280] hover:bg-[#f9fafb]'}`}
        >
          Import file
        </button>
      </div>

      {/* Input */}
      {mode === 'describe' ? (
        <textarea
          rows={3}
          className="w-full resize-none rounded-xl border border-[#c7d2fe] bg-white px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#5850ec] focus:outline-none focus:ring-2 focus:ring-[#5850ec]/20"
          placeholder="Describe what this unit covers, any key topics, or paste a scheme of work excerpt…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.csv,.docx,.pptx,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#c7d2fe] bg-white py-3 text-sm text-[#6b7280] transition hover:border-[#5850ec]/60 hover:text-[#5850ec]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {file ? file.name : 'Choose PDF, CSV, DOCX, or PPTX'}
          </button>
          <p className="mt-1.5 text-center text-xs text-[#6b7280]">AI will extract unit structure from the file</p>
        </div>
      )}

      {/* Preview of AI suggestion */}
      {preview && (
        <div className="rounded-xl border border-[#c7d2fe] bg-white p-3 space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">AI suggestion — review before applying</p>
          {preview.aims && (
            <div>
              <p className="text-xs font-semibold text-[#374151]">Aims</p>
              <p className="mt-0.5 whitespace-pre-line text-[#374151]">{preview.aims}</p>
            </div>
          )}
          {preview.successMeasures && (
            <div>
              <p className="text-xs font-semibold text-[#374151]">Success measures</p>
              <p className="mt-0.5 whitespace-pre-line text-[#374151]">{preview.successMeasures}</p>
            </div>
          )}
          {preview.suggestedSkillCodes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#374151]">Skills</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {preview.suggestedSkillCodes.map((code) => {
                  const skill = availableSkills.find((s) => s.code.toUpperCase() === code.toUpperCase());
                  return skill ? (
                    <span key={code} className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-xs text-[#5850ec]">
                      {skill.code} — {skill.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-[#5850ec] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4338ca] transition"
            >
              Apply to form
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#6b7280] hover:bg-[#f3f4f6] transition"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {/* Generate button */}
      {!preview && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || (mode === 'import' && !file)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5850ec] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4338ca] disabled:opacity-50 transition"
        >
          {loading ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" stroke="white" strokeWidth="1.75" strokeLinejoin="round" />
              </svg>
              Generate with AI
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── Unit Editor Panel ─────────────────────────────────────────────────────────

function UnitEditorPanel({
  unit,
  planId,
  availableSkills,
  onSaved,
  onDeleted,
  onClose,
}: {
  unit: CurriculumUnitDetail | null; // null = new unit
  planId: string;
  availableSkills: Skill[];
  onSaved: (unit: CurriculumUnitDetail) => void;
  onDeleted?: (unitId: string) => void;
  onClose: () => void;
}) {
  const isNew = unit === null;
  const [title, setTitle] = useState(unit?.title ?? '');
  const [aims, setAims] = useState(unit?.aims ?? '');
  const [successMeasures, setSuccessMeasures] = useState(unit?.successMeasures ?? '');
  const [dateStart, setDateStart] = useState(unit?.dateStart ? unit.dateStart.slice(0, 10) : '');
  const [dateEnd, setDateEnd] = useState(unit?.dateEnd ? unit.dateEnd.slice(0, 10) : '');
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
    unit?.skills.map((s) => s.skillId) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(isNew); // open by default for new units

  const handleAiApply = (suggestion: UnitAiSuggestion) => {
    if (suggestion.aims) setAims(suggestion.aims);
    if (suggestion.successMeasures) setSuccessMeasures(suggestion.successMeasures);
    // suggestedSkillCodes here are already resolved to IDs by AiAssistPanel
    if (suggestion.suggestedSkillCodes?.length > 0) {
      setSelectedSkillIds((prev) => {
        const merged = new Set([...prev, ...suggestion.suggestedSkillCodes]);
        return Array.from(merged);
      });
    }
    setShowAi(false);
  };

  const filteredSkills = availableSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(skillSearch.toLowerCase()),
  );

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        aims: aims.trim() || null,
        successMeasures: successMeasures.trim() || null,
        dateStart: dateStart ? toIsoDate(dateStart) : null,
        dateEnd: dateEnd ? toIsoDate(dateEnd) : null,
        skillIds: selectedSkillIds,
      };

      const url = isNew
        ? `/api/curriculum-plans/${planId}/units`
        : `/api/curriculum-plans/${planId}/units/${unit!.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `HTTP ${res.status}`);
      }

      const saved = await res.json() as {
        id: string;
        title: string;
        aims: string | null;
        successMeasures: string | null;
        dateStart: string | null;
        dateEnd: string | null;
        sortOrder: number;
        skills: Array<{ skillId: string; skill: { code: string; name: string } }>;
        lessons: Array<{ id: string; title: string; topic: string; isPublished: boolean }>;
      };

      onSaved({
        id: saved.id,
        title: saved.title,
        aims: saved.aims,
        successMeasures: saved.successMeasures,
        dateStart: saved.dateStart,
        dateEnd: saved.dateEnd,
        sortOrder: saved.sortOrder,
        skills: saved.skills.map((s) => ({ skillId: s.skillId, skillCode: s.skill.code, skillName: s.skill.name })),
        lessons: saved.lessons,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!unit || !onDeleted) return;
    if (!confirm(`Delete "${unit.title}"? This will not delete its lessons, but they will be unlinked from this unit.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/curriculum-plans/${planId}/units/${unit.id}`, { method: 'DELETE' });
      onDeleted(unit.id);
    } catch {
      setError('Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-[#e5e7eb] bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#111827]">{isNew ? 'New unit' : 'Edit unit'}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAi((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              showAi
                ? 'bg-[#5850ec] text-white'
                : 'text-[#5850ec] hover:bg-[#eef2ff]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            </svg>
            AI assist
          </button>
          <button type="button" onClick={onClose} className="text-[#9ca3af] hover:text-[#374151]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* AI assist panel */}
      {showAi && (
        <AiAssistPanel
          planId={planId}
          unitTitle={title}
          availableSkills={availableSkills}
          onApply={handleAiApply}
        />
      )}

      {/* Title */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Unit title</label>
        <input
          className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#5850ec] focus:outline-none focus:ring-2 focus:ring-[#5850ec]/20"
          placeholder="e.g. Algebra — Linear Equations"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Start date</label>
          <input
            type="date"
            className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] focus:border-[#5850ec] focus:outline-none focus:ring-2 focus:ring-[#5850ec]/20"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">End date</label>
          <input
            type="date"
            className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] focus:border-[#5850ec] focus:outline-none focus:ring-2 focus:ring-[#5850ec]/20"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>
      </div>

      {/* Aims */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Learning aims</label>
        <textarea
          rows={3}
          className="w-full resize-none rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#5850ec] focus:outline-none focus:ring-2 focus:ring-[#5850ec]/20"
          placeholder="What will students be able to do by the end of this unit?"
          value={aims}
          onChange={(e) => setAims(e.target.value)}
        />
      </div>

      {/* Success measures */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Success measures</label>
        <textarea
          rows={3}
          className="w-full resize-none rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#5850ec] focus:outline-none focus:ring-2 focus:ring-[#5850ec]/20"
          placeholder="How will you know students have met the aims?"
          value={successMeasures}
          onChange={(e) => setSuccessMeasures(e.target.value)}
        />
      </div>

      {/* Skills */}
      {availableSkills.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Skills covered ({selectedSkillIds.length} selected)
          </label>
          <input
            className="mb-2 w-full rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#5850ec] focus:outline-none focus:ring-2 focus:ring-[#5850ec]/20"
            placeholder="Search skills…"
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
          />
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-[#e5e7eb] p-2">
            {filteredSkills.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-[#9ca3af]">No skills match.</p>
            )}
            {filteredSkills.map((skill) => {
              const selected = selectedSkillIds.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                    selected
                      ? 'bg-[#eef2ff] text-[#5850ec]'
                      : 'text-[#374151] hover:bg-[#f9fafb]'
                  }`}
                >
                  <span className={`h-3.5 w-3.5 shrink-0 rounded border transition ${selected ? 'border-[#5850ec] bg-[#5850ec]' : 'border-[#d1d5db]'}`}>
                    {selected && (
                      <svg viewBox="0 0 12 12" fill="none" className="text-white">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-[#6b7280]">{skill.code}</span>
                  <span className="truncate">{skill.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 border-t border-[#f3f4f6] pt-4">
        {!isNew && onDeleted ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete unit'}
          </button>
        ) : <span />}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#5850ec] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#4338ca] disabled:opacity-50"
          >
            {saving ? 'Saving…' : isNew ? 'Add unit' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Unit Card ─────────────────────────────────────────────────────────────────

function UnitCard({
  unit,
  index,
  planId,
  availableSkills,
  subjectId,
  onUpdated,
  onDeleted,
}: {
  unit: CurriculumUnitDetail;
  index: number;
  planId: string;
  availableSkills: Skill[];
  subjectId: string;
  onUpdated: (unit: CurriculumUnitDetail) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [newLesson, setNewLesson] = useState(false);
  const colour = UNIT_COLOURS[index % UNIT_COLOURS.length];

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white overflow-hidden">
      {/* Header bar */}
      <div className="flex items-start gap-3 px-5 py-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${colour}`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#111827]">{unit.title}</p>
          {(unit.dateStart || unit.dateEnd) && (
            <p className="mt-0.5 text-xs text-[#6b7280]">
              {fmtDate(unit.dateStart)}{unit.dateStart && unit.dateEnd ? ' – ' : ''}{fmtDate(unit.dateEnd)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#6b7280] hover:bg-[#f3f4f6] transition"
        >
          Edit
        </button>
      </div>

      {/* Aims / success measures */}
      {(unit.aims || unit.successMeasures) && (
        <div className="border-t border-[#f3f4f6] px-5 py-3 space-y-2">
          {unit.aims && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">Learning aims</p>
              <p className="mt-0.5 text-sm text-[#374151] whitespace-pre-line">{unit.aims}</p>
            </div>
          )}
          {unit.successMeasures && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">Success measures</p>
              <p className="mt-0.5 text-sm text-[#374151] whitespace-pre-line">{unit.successMeasures}</p>
            </div>
          )}
        </div>
      )}

      {/* Skills chips */}
      {unit.skills.length > 0 && (
        <div className="border-t border-[#f3f4f6] px-5 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {unit.skills.map((s) => (
              <span key={s.skillId} className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs text-[#374151]">
                <span className="font-mono text-[#9ca3af]">{s.skillCode}</span> {s.skillName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lessons list */}
      <div className="border-t border-[#f3f4f6] px-5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">
            Lessons ({unit.lessons.length})
          </p>
          <button
            type="button"
            onClick={() => setNewLesson(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#5850ec] hover:text-[#4338ca] transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            New lesson
          </button>
        </div>
        {unit.lessons.length === 0 ? (
          <p className="text-xs text-[#9ca3af]">No lessons yet. Create the first one above.</p>
        ) : (
          <div className="space-y-1">
            {unit.lessons.map((lesson) => (
              <a
                key={lesson.id}
                href={`/teacher/lessons/${lesson.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f9fafb] transition group"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${lesson.isPublished ? 'bg-[#10b981]' : 'bg-[#d1d5db]'}`} />
                <span className="truncate text-sm text-[#374151] group-hover:text-[#111827]">{lesson.title}</span>
                <span className="ml-auto shrink-0 text-xs text-[#9ca3af] group-hover:text-[#5850ec]">Open →</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Edit panel (inline below card) */}
      {editing && (
        <div className="border-t border-[#e5e7eb] p-5">
          <UnitEditorPanel
            unit={unit}
            planId={planId}
            availableSkills={availableSkills}
            onSaved={(updated) => { onUpdated(updated); setEditing(false); }}
            onDeleted={(id) => { onDeleted(id); setEditing(false); }}
            onClose={() => setEditing(false)}
          />
        </div>
      )}

      {/* New lesson modal */}
      {newLesson && (
        <NewLessonModal
          unit={unit}
          subjectId={subjectId}
          onClose={() => setNewLesson(false)}
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PlanDetail({ plan: initialPlan, availableSkills, subjectId }: Props) {
  const [plan, setPlan] = useState(initialPlan);
  const [addingUnit, setAddingUnit] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(plan.title);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft.trim() === plan.title) {
      setEditingTitle(false);
      setTitleDraft(plan.title);
      return;
    }
    await fetch(`/api/curriculum-plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleDraft.trim() }),
    });
    setPlan((p) => ({ ...p, title: titleDraft.trim() }));
    setEditingTitle(false);
  };

  const handleUnitSaved = (unit: CurriculumUnitDetail) => {
    setPlan((p) => {
      const idx = p.units.findIndex((u) => u.id === unit.id);
      if (idx === -1) return { ...p, units: [...p.units, unit] };
      const units = [...p.units];
      units[idx] = unit;
      return { ...p, units };
    });
    setAddingUnit(false);
  };

  const handleUnitDeleted = (unitId: string) => {
    setPlan((p) => ({ ...p, units: p.units.filter((u) => u.id !== unitId) }));
  };

  const totalLessons = plan.units.reduce((sum, u) => sum + u.lessons.length, 0);

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-white px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#5850ec]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleRef}
                className="w-full rounded-lg border border-[#5850ec] px-3 py-1.5 text-lg font-bold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#5850ec]/20"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(plan.title); } }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="group flex items-center gap-2 text-left"
              >
                <h1 className="text-lg font-bold text-[#111827] group-hover:text-[#5850ec] transition-colors">{plan.title}</h1>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#9ca3af] opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <p className="mt-0.5 text-sm text-[#6b7280]">
              {plan.subjectTitle}
              {plan.academicYear && ` · ${plan.academicYear}`}
              {plan.termLabel && ` · ${plan.termLabel}`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-[#f3f4f6] pt-4 text-sm text-[#6b7280]">
          <span><span className="font-semibold text-[#374151]">{plan.units.length}</span> {plan.units.length === 1 ? 'unit' : 'units'}</span>
          <span><span className="font-semibold text-[#374151]">{totalLessons}</span> {totalLessons === 1 ? 'lesson' : 'lessons'}</span>
          <a href="/teacher/curriculum" className="ml-auto text-xs text-[#9ca3af] hover:text-[#6b7280] transition">← All plans</a>
        </div>
      </div>

      {/* Units */}
      <div className="space-y-4">
        {plan.units.map((unit, i) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            index={i}
            planId={plan.id}
            availableSkills={availableSkills}
            subjectId={subjectId}
            onUpdated={handleUnitSaved}
            onDeleted={handleUnitDeleted}
          />
        ))}
      </div>

      {/* Add unit */}
      {addingUnit ? (
        <UnitEditorPanel
          unit={null}
          planId={plan.id}
          availableSkills={availableSkills}
          onSaved={handleUnitSaved}
          onClose={() => setAddingUnit(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingUnit(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e5e7eb] py-5 text-sm font-semibold text-[#9ca3af] transition hover:border-[#5850ec]/50 hover:text-[#5850ec]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Add unit
        </button>
      )}
    </div>
  );
}
