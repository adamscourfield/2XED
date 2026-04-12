'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_TEXT' | 'SHORT_NUMERIC' | 'ORDER' | 'NUMBER_LINE' | 'MULTI_SELECT';

export interface Skill {
  id: string;
  code: string;
  name: string;
  strand: string;
}

export interface Misconception {
  type: string;
  diagnostic_signal: string;
}

export interface NumberLineConfig {
  min: number;
  max: number;
  step: number;
  task: 'place' | 'read' | 'round';
  markerValue?: number;
  labelledValues?: number[];
  tolerance?: number;
}

export interface QuestionFormData {
  stem: string;
  type: QuestionType;
  answer: string;
  choices: string[];
  acceptedAnswers: string[];
  tolerance?: number;
  numberLine?: NumberLineConfig;
  skillIds: string[];
  misconceptions: Misconception[];
}

interface Props {
  initialData?: Partial<QuestionFormData>;
  itemId?: string;        // present when editing
  allSkills: Skill[];
  mode: 'create' | 'edit';
}

const TYPE_OPTIONS: { value: QuestionType; label: string; description: string }[] = [
  { value: 'MCQ',           label: 'Multiple Choice',   description: 'One correct answer from several options' },
  { value: 'TRUE_FALSE',    label: 'True / False',      description: 'Binary correct/incorrect statement' },
  { value: 'SHORT_TEXT',    label: 'Short Text',        description: 'Free-text answer (exact match)' },
  { value: 'SHORT_NUMERIC', label: 'Numeric',           description: 'Number answer with optional tolerance' },
  { value: 'ORDER',         label: 'Ordering',          description: 'Put items in the correct sequence' },
  { value: 'NUMBER_LINE',   label: 'Number Line',       description: 'Interactive number line (place, read, or round)' },
];

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

export function QuestionFormClient({ initialData, itemId, allSkills, mode }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [stem, setStem] = useState(initialData?.stem ?? '');
  const [type, setType] = useState<QuestionType>(initialData?.type ?? 'MCQ');
  const [answer, setAnswer] = useState(initialData?.answer ?? '');
  const [choices, setChoices] = useState<string[]>(initialData?.choices?.length ? initialData.choices : ['', '', '', '']);
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(initialData?.acceptedAnswers ?? []);
  const [tolerance, setTolerance] = useState<string>(initialData?.tolerance?.toString() ?? '');
  const [numberLine, setNumberLine] = useState<NumberLineConfig>(initialData?.numberLine ?? {
    min: 0, max: 100, step: 10, task: 'place', tolerance: 5,
  });
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(initialData?.skillIds ?? []);
  const [skillSearch, setSkillSearch] = useState('');
  const [misconceptions, setMisconceptions] = useState<Misconception[]>(initialData?.misconceptions ?? []);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // ── Skill picker helpers ──────────────────────────────────────────────────

  const filteredSkills = allSkills.filter((s) =>
    !selectedSkillIds.includes(s.id) &&
    (skillSearch === '' ||
      s.code.toLowerCase().includes(skillSearch.toLowerCase()) ||
      s.name.toLowerCase().includes(skillSearch.toLowerCase()))
  );

  function toggleSkill(id: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ── Choices helpers ───────────────────────────────────────────────────────

  function setChoice(i: number, val: string) {
    setChoices((prev) => prev.map((c, idx) => (idx === i ? val : c)));
  }

  function addChoice() {
    setChoices((prev) => [...prev, '']);
  }

  function removeChoice(i: number) {
    setChoices((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Accepted answers helpers ──────────────────────────────────────────────

  function addAccepted(val: string) {
    if (val.trim()) setAcceptedAnswers((prev) => uniq([...prev, val.trim()]));
  }

  function removeAccepted(i: number) {
    setAcceptedAnswers((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Misconceptions helpers ────────────────────────────────────────────────

  function addMisconception() {
    setMisconceptions((prev) => [...prev, { type: '', diagnostic_signal: '' }]);
  }

  function setMisconception(i: number, field: keyof Misconception, val: string) {
    setMisconceptions((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
  }

  function removeMisconception(i: number) {
    setMisconceptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Build payload ─────────────────────────────────────────────────────────

  function buildPayload() {
    const cleanChoices = choices.map((c) => c.trim()).filter(Boolean);
    let finalAccepted = uniq(acceptedAnswers);
    if (finalAccepted.length === 0 && answer.trim()) finalAccepted = [answer.trim()];

    return {
      stem: stem.trim(),
      type,
      answer: answer.trim(),
      choices: type === 'TRUE_FALSE' ? ['True', 'False'] : cleanChoices,
      acceptedAnswers: type === 'TRUE_FALSE' ? [answer.trim()] : finalAccepted,
      ...(tolerance ? { tolerance: parseFloat(tolerance) } : {}),
      ...(type === 'NUMBER_LINE' ? { numberLine } : {}),
      skillIds: selectedSkillIds,
      misconceptions: misconceptions.filter((m) => m.type.trim()),
    };
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = buildPayload();
    if (!payload.stem) return setError('Question stem is required.');
    if (!payload.answer) return setError('Answer is required.');
    if (payload.acceptedAnswers.length === 0) return setError('At least one accepted answer is required.');

    startTransition(async () => {
      const url = mode === 'create' ? '/api/admin/questions' : `/api/admin/questions/${itemId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      const data = await res.json();
      router.push(mode === 'create' ? `/admin/questions/${data.id}` : '/admin/questions');
      router.refresh();
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!itemId) return;
    startTransition(async () => {
      await fetch(`/api/admin/questions/${itemId}`, { method: 'DELETE' });
      router.push('/admin/questions');
      router.refresh();
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Type selector */}
      <section className="space-y-3">
        <p className="anx-section-label">Question type</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setType(opt.value); setAnswer(''); }}
              className="text-left rounded-xl p-3 transition-colors"
              style={{
                background: type === opt.value ? 'var(--anx-primary-container)' : 'var(--anx-surface-container-low)',
                border: `1px solid ${type === opt.value ? 'var(--anx-primary)' : 'var(--anx-border)'}`,
                color: type === opt.value ? '#fff' : 'var(--anx-text)',
              }}
            >
              <p className="font-semibold text-sm">{opt.label}</p>
              <p className="text-xs mt-0.5 opacity-70">{opt.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Stem */}
      <section className="space-y-2">
        <label className="anx-section-label" htmlFor="stem">Question stem</label>
        <textarea
          id="stem"
          value={stem}
          onChange={(e) => setStem(e.target.value)}
          rows={3}
          className="anx-input w-full resize-y"
          placeholder="Type the question here…"
          required
        />
      </section>

      {/* MCQ choices */}
      {type === 'MCQ' && (
        <section className="space-y-3">
          <p className="anx-section-label">Answer choices</p>
          {choices.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={c}
                onChange={(e) => setChoice(i, e.target.value)}
                className="anx-input flex-1"
                placeholder={`Choice ${i + 1}`}
              />
              {choices.length > 2 && (
                <button type="button" onClick={() => removeChoice(i)} className="anx-btn-ghost text-sm px-2" style={{ color: 'var(--anx-danger-text)' }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addChoice} className="anx-btn-ghost text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            + Add choice
          </button>
          <div className="space-y-2">
            <label className="anx-section-label" htmlFor="mcq-answer">Correct answer</label>
            <select
              id="mcq-answer"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setAcceptedAnswers([e.target.value]);
              }}
              className="anx-input w-full"
              style={{ background: 'var(--anx-surface-container-highest)' }}
            >
              <option value="">Select the correct choice…</option>
              {choices.filter(Boolean).map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
        </section>
      )}

      {/* True/False */}
      {type === 'TRUE_FALSE' && (
        <section className="space-y-3">
          <p className="anx-section-label">Correct answer</p>
          <div className="flex gap-3">
            {['True', 'False'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { setAnswer(v); setAcceptedAnswers([v]); }}
                className="flex-1 rounded-xl py-3 font-semibold text-sm transition-colors"
                style={{
                  background: answer === v ? (v === 'True' ? '#134e2a' : '#4a1212') : 'var(--anx-surface-container-low)',
                  border: `1px solid ${answer === v ? (v === 'True' ? 'var(--anx-success)' : 'var(--anx-danger)') : 'var(--anx-border)'}`,
                  color: answer === v ? '#fff' : 'var(--anx-text)',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Short text / numeric */}
      {(type === 'SHORT_TEXT' || type === 'SHORT_NUMERIC') && (
        <section className="space-y-3">
          <label className="anx-section-label" htmlFor="short-answer">
            {type === 'SHORT_NUMERIC' ? 'Correct answer (number)' : 'Correct answer'}
          </label>
          <input
            id="short-answer"
            type={type === 'SHORT_NUMERIC' ? 'text' : 'text'}
            inputMode={type === 'SHORT_NUMERIC' ? 'decimal' : 'text'}
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setAcceptedAnswers(uniq([e.target.value, ...acceptedAnswers.slice(1)])); }}
            className="anx-input w-full"
            placeholder={type === 'SHORT_NUMERIC' ? 'e.g. 3.14' : 'e.g. Paris'}
          />
          {type === 'SHORT_NUMERIC' && (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="anx-section-label" htmlFor="tolerance">Tolerance (±)</label>
                <input
                  id="tolerance"
                  type="text"
                  inputMode="decimal"
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value)}
                  className="anx-input w-full mt-1"
                  placeholder="0 = exact match"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="anx-section-label">Additional accepted answers</p>
            <div className="flex flex-wrap gap-2">
              {acceptedAnswers.slice(1).map((a, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm"
                  style={{ background: 'var(--anx-surface-container-highest)', color: 'var(--anx-text)' }}
                >
                  {a}
                  <button type="button" onClick={() => removeAccepted(i + 1)} style={{ color: 'var(--anx-text-muted)' }}>✕</button>
                </span>
              ))}
            </div>
            <AddAcceptedInput onAdd={(v) => addAccepted(v)} />
          </div>
        </section>
      )}

      {/* Ordering */}
      {type === 'ORDER' && (
        <section className="space-y-3">
          <p className="anx-section-label">Items to order (one per line — top = first in correct order)</p>
          <textarea
            value={choices.join('\n')}
            onChange={(e) => {
              const vals = e.target.value.split('\n');
              setChoices(vals);
              const ans = vals.filter(Boolean).join('|');
              setAnswer(ans);
              setAcceptedAnswers([ans]);
            }}
            className="anx-input w-full font-mono text-sm"
            rows={5}
            placeholder={"First item\nSecond item\nThird item"}
          />
          {answer && (
            <p className="text-xs font-mono" style={{ color: 'var(--anx-text-muted)' }}>
              Stored answer: <span style={{ color: 'var(--anx-text)' }}>{answer}</span>
            </p>
          )}
        </section>
      )}

      {/* Number line */}
      {type === 'NUMBER_LINE' && (
        <section className="space-y-4">
          <p className="anx-section-label">Number line configuration</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([['min','Min'],['max','Max'],['step','Step']] as const).map(([field, label]) => (
              <div key={field}>
                <label className="anx-section-label">{label}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={String(numberLine[field] ?? '')}
                  onChange={(e) => setNumberLine((n) => ({ ...n, [field]: parseFloat(e.target.value) || 0 }))}
                  className="anx-input w-full mt-1"
                />
              </div>
            ))}
            <div>
              <label className="anx-section-label">Tolerance (±)</label>
              <input
                type="text"
                inputMode="decimal"
                value={String(numberLine.tolerance ?? '')}
                onChange={(e) => setNumberLine((n) => ({ ...n, tolerance: parseFloat(e.target.value) || 0 }))}
                className="anx-input w-full mt-1"
                placeholder="5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="anx-section-label">Task type</label>
              <select
                value={numberLine.task}
                onChange={(e) => setNumberLine((n) => ({ ...n, task: e.target.value as 'place' | 'read' | 'round' }))}
                className="anx-input w-full mt-1"
                style={{ background: 'var(--anx-surface-container-highest)' }}
              >
                <option value="place">Place — student taps to place a marker</option>
                <option value="read">Read — student reads where arrow points</option>
                <option value="round">Round — student picks which boundary to round to</option>
              </select>
            </div>
            {(numberLine.task === 'read' || numberLine.task === 'round') && (
              <div>
                <label className="anx-section-label">Marker value</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={String(numberLine.markerValue ?? '')}
                  onChange={(e) => setNumberLine((n) => ({ ...n, markerValue: parseFloat(e.target.value) || 0 }))}
                  className="anx-input w-full mt-1"
                  placeholder="e.g. 35"
                />
              </div>
            )}
          </div>
          <div>
            <label className="anx-section-label">Labelled values (comma-separated, optional)</label>
            <input
              type="text"
              value={(numberLine.labelledValues ?? []).join(', ')}
              onChange={(e) => {
                const vals = e.target.value.split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
                setNumberLine((n) => ({ ...n, labelledValues: vals }));
              }}
              className="anx-input w-full mt-1"
              placeholder="e.g. 0, 25, 50, 75, 100"
            />
          </div>
          <div>
            <label className="anx-section-label">
              {numberLine.task === 'place' ? 'Expected answer (numeric)' : 'Correct answer'}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setAcceptedAnswers([e.target.value]); }}
              className="anx-input w-full mt-1"
              placeholder="Numeric value"
            />
          </div>
        </section>
      )}

      {/* Skills */}
      <section className="space-y-3">
        <p className="anx-section-label">Skills</p>
        {selectedSkillIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSkillIds.map((id) => {
              const s = allSkills.find((x) => x.id === id);
              return s ? (
                <span
                  key={id}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium"
                  style={{ background: 'var(--anx-primary-container)', color: '#93c5fd' }}
                >
                  <span className="font-mono">{s.code}</span>
                  <span className="opacity-70 text-xs">{s.name.slice(0, 30)}</span>
                  <button type="button" onClick={() => toggleSkill(id)} className="opacity-60 hover:opacity-100">✕</button>
                </span>
              ) : null;
            })}
          </div>
        )}
        <input
          type="search"
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          className="anx-input w-full"
          placeholder="Search skills by code or name…"
        />
        {skillSearch && (
          <div
            className="rounded-xl overflow-hidden max-h-48 overflow-y-auto"
            style={{ border: '1px solid var(--anx-border)' }}
          >
            {filteredSkills.slice(0, 20).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { toggleSkill(s.id); setSkillSearch(''); }}
                className="w-full text-left px-3 py-2 text-sm transition-colors hover:brightness-110"
                style={{ background: 'var(--anx-surface-container-low)', borderBottom: '1px solid var(--anx-border)' }}
              >
                <span className="font-mono font-semibold" style={{ color: 'var(--anx-text)' }}>{s.code}</span>
                <span className="ml-2" style={{ color: 'var(--anx-text-secondary)' }}>{s.name.slice(0, 60)}</span>
              </button>
            ))}
            {filteredSkills.length === 0 && (
              <p className="p-3 text-sm" style={{ color: 'var(--anx-text-muted)' }}>No matching skills.</p>
            )}
          </div>
        )}
      </section>

      {/* Misconceptions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="anx-section-label">Misconceptions (optional)</p>
          <button type="button" onClick={addMisconception} className="anx-btn-ghost text-xs" style={{ color: 'var(--anx-text-muted)' }}>
            + Add
          </button>
        </div>
        {misconceptions.map((m, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <input
              value={m.type}
              onChange={(e) => setMisconception(i, 'type', e.target.value)}
              className="anx-input"
              placeholder="Type e.g. WRONG_DIRECTION_ROUND"
            />
            <div className="flex gap-2">
              <input
                value={m.diagnostic_signal}
                onChange={(e) => setMisconception(i, 'diagnostic_signal', e.target.value)}
                className="anx-input flex-1"
                placeholder="Diagnostic signal (optional)"
              />
              <button type="button" onClick={() => removeMisconception(i)} className="anx-btn-ghost px-2" style={{ color: 'var(--anx-danger-text)' }}>✕</button>
            </div>
          </div>
        ))}
      </section>

      {/* Error */}
      {error && (
        <div className="anx-callout-warning">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="anx-btn-primary px-6 py-2.5"
        >
          {isPending ? 'Saving…' : mode === 'create' ? 'Create question' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/questions')}
          className="anx-btn-secondary px-4 py-2.5"
        >
          Cancel
        </button>
        {mode === 'edit' && itemId && (
          <div className="ml-auto">
            {deleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--anx-danger-text)' }}>Archive this question?</span>
                <button type="button" onClick={handleDelete} disabled={isPending} className="anx-btn-ghost text-sm font-semibold" style={{ color: 'var(--anx-danger-text)' }}>
                  Yes, archive
                </button>
                <button type="button" onClick={() => setDeleteConfirm(false)} className="anx-btn-ghost text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="anx-btn-ghost text-sm"
                style={{ color: 'var(--anx-text-muted)' }}
              >
                Archive
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

// ── Small helper: add an accepted answer via input ────────────────────────────
function AddAcceptedInput({ onAdd }: { onAdd: (v: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(val); setVal(''); } }}
        className="anx-input flex-1"
        placeholder="Add another accepted answer and press Enter"
      />
      <button
        type="button"
        onClick={() => { onAdd(val); setVal(''); }}
        className="anx-btn-secondary px-3 text-sm"
      >
        Add
      </button>
    </div>
  );
}
