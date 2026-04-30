'use client';

/**
 * AiLessonBuilder
 *
 * Two-tab component that lets a teacher build a lesson plan with Claude's help:
 *
 *   Tab 1 — Describe lesson  : teacher answers 3 guided prompts, Claude generates
 *   Tab 2 — Upload resource  : teacher uploads PDF/PPTX/DOCX, Claude parses it
 *
 * Uses the SSE stream from /api/teacher/ai/lesson-plan to show live progress.
 * Once done, shows a plan preview. The teacher can accept (calls onPlanGenerated)
 * or try again.
 */

import { useRef, useState } from 'react';
import type { AiLessonPlanResponse, SseEvent } from '@/app/api/teacher/ai/lesson-plan/route';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  subjectId: string;
  subjectTitle?: string;
  onPlanGenerated: (plan: AiLessonPlanResponse) => void;
  onClose: () => void;
}

// ── Pipeline stage config ─────────────────────────────────────────────────────

type StageKey = 'parsing' | 'extracting' | 'ai_thinking' | 'matching' | 'persisting';

const STAGE_LABELS: Record<StageKey, string> = {
  parsing:     'Loading curriculum…',
  extracting:  'Extracting text from file…',
  ai_thinking: 'Claude is building your lesson…',
  matching:    'Matching skills to your curriculum…',
  persisting:  'Saving questions to Ember…',
};

// Ordered list used to drive the progress timeline.
const ALL_STAGES: StageKey[] = ['parsing', 'extracting', 'ai_thinking', 'matching', 'persisting'];
const GENERATE_STAGES: StageKey[] = ['parsing', 'ai_thinking', 'matching', 'persisting'];
const IMPORT_STAGES: StageKey[] = ALL_STAGES;

// ── Progress timeline UI ──────────────────────────────────────────────────────

type StageStatus = 'pending' | 'active' | 'done';

function StageRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: StageStatus;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Icon */}
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {status === 'done' ? (
          <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8l2.2 2.2L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : status === 'active' ? (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--anx-primary)] border-t-transparent" />
        ) : (
          <div className="h-3 w-3 rounded-full border-2" style={{ borderColor: 'var(--anx-outline-variant)' }} />
        )}
      </div>
      {/* Label */}
      <div className="min-w-0">
        <p
          className={`text-sm leading-snug transition-colors ${
            status === 'active'
              ? 'font-semibold'
              : status === 'done'
                ? 'line-through opacity-50'
                : 'opacity-40'
          }`}
          style={{ color: status === 'active' ? 'var(--anx-primary)' : 'var(--anx-text)' }}
        >
          {label}
        </p>
        {status === 'active' && detail && (
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--anx-text-muted)' }}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

function PipelineProgress({
  mode,
  activeStage,
  completedStages,
  activeDetail,
}: {
  mode: 'generate' | 'import';
  activeStage: StageKey | null;
  completedStages: StageKey[];
  activeDetail?: string;
}) {
  const stages = mode === 'import' ? IMPORT_STAGES : GENERATE_STAGES;

  return (
    <div className="space-y-3 py-2">
      {stages.map((key) => {
        const status: StageStatus = completedStages.includes(key)
          ? 'done'
          : activeStage === key
            ? 'active'
            : 'pending';
        return (
          <StageRow
            key={key}
            label={STAGE_LABELS[key]}
            status={status}
            detail={status === 'active' ? activeDetail : undefined}
          />
        );
      })}
    </div>
  );
}

// ── Plan preview ──────────────────────────────────────────────────────────────

function PlanPreview({
  plan,
  onAccept,
  onReject,
  accepting,
}: {
  plan: AiLessonPlanResponse;
  onAccept: () => void;
  onReject: () => void;
  accepting: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--anx-text-muted)' }}
        >
          Ember generated
        </p>
        <h3 className="mt-1 text-base font-bold" style={{ color: 'var(--anx-text)' }}>
          {plan.title}
        </h3>
        {plan.topicSummary && (
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
            {plan.topicSummary}
          </p>
        )}
      </div>

      {plan.matchedSkills.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
            Lesson plan — {plan.matchedSkills.length} skill
            {plan.matchedSkills.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {plan.matchedSkills.map((s) => (
              <div
                key={s.skillId}
                className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: 'var(--anx-outline-variant)',
                  background: 'var(--anx-surface-container-low)',
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="shrink-0 font-mono text-xs font-bold"
                      style={{ color: 'var(--anx-text-muted)' }}
                    >
                      {s.skillCode}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
                      {s.skillName}
                    </span>
                  </div>
                  {s.rationale && (
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--anx-text-muted)' }}>
                      {s.rationale}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {s.hasExplanation && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      I Do
                    </span>
                  )}
                  {s.hasCheck && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                      We Do
                    </span>
                  )}
                  {s.hasPractice && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      You Do
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="anx-callout-warning text-sm">
          <p className="m-0 font-semibold">No curriculum skills matched</p>
          <p className="m-0 mt-1">
            The AI suggested skill codes not in this subject. Accept and select skills manually in step 1.
          </p>
        </div>
      )}

      {plan.doNowItems.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
            Do Now — {plan.doNowItems.length} question
            {plan.doNowItems.length !== 1 ? 's' : ''} queued
          </p>
          <ol className="m-0 list-decimal space-y-1 pl-5">
            {plan.doNowItems.map((item) => (
              <li
                key={item.itemId}
                className="text-sm leading-snug"
                style={{ color: 'var(--anx-text-secondary)' }}
              >
                {item.stemPreview}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReject}
          disabled={accepting}
          className="anx-btn-secondary flex-1 py-2.5 text-sm"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={accepting}
          className="anx-btn-primary flex-1 py-2.5 text-sm disabled:opacity-40"
        >
          {accepting ? 'Applying…' : 'Apply to lesson →'}
        </button>
      </div>
    </div>
  );
}

// ── Describe-mode form steps ──────────────────────────────────────────────────

interface DescribeForm {
  topic: string;
  yearGroup: string;
  priorKnowledge: string;
  goal: string;
}

const DESCRIBE_STEPS: Array<{
  field: keyof DescribeForm;
  label: string;
  placeholder: string;
  hint: string;
  required: boolean;
}> = [
  {
    field: 'topic',
    label: 'What is the topic?',
    placeholder: 'e.g. Adding fractions with unlike denominators',
    hint: 'Be as specific as you like — a curriculum code like "N3.4" works too.',
    required: true,
  },
  {
    field: 'priorKnowledge',
    label: 'What do students already know?',
    placeholder: 'e.g. They can add fractions with the same denominator and know about LCM',
    hint: 'This helps Ember target the Do Now at the right entry point.',
    required: false,
  },
  {
    field: 'goal',
    label: "What's the learning goal for this lesson?",
    placeholder: 'e.g. Students can find equivalent fractions and add unlike fractions confidently',
    hint: 'One sentence is enough.',
    required: false,
  },
];

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'describe' | 'upload';

export function AiLessonBuilder({ subjectId, subjectTitle, onPlanGenerated, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('describe');

  // Describe-mode state
  const [describeStep, setDescribeStep] = useState(0);
  const [describeForm, setDescribeForm] = useState<DescribeForm>({
    topic: '',
    yearGroup: '',
    priorKnowledge: '',
    goal: '',
  });

  // Upload-mode state
  const [topicHint, setTopicHint] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Streaming / progress state
  const [streaming, setStreaming]           = useState(false);
  const [activeStage, setActiveStage]       = useState<StageKey | null>(null);
  const [activeDetail, setActiveDetail]     = useState<string | undefined>(undefined);
  const [completedStages, setCompletedStages] = useState<StageKey[]>([]);
  const [streamMode, setStreamMode]         = useState<'generate' | 'import'>('generate');

  // Result / error state
  const [error,     setError]     = useState<string | null>(null);
  const [plan,      setPlan]      = useState<AiLessonPlanResponse | null>(null);
  const [accepting, setAccepting] = useState(false);

  // ── SSE stream reader ─────────────────────────────────────────────────────

  async function readStream(res: Response) {
    if (!res.body) throw new Error('No response body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? ''; // Last element may be incomplete

      for (const raw of events) {
        const line = raw.trim();
        if (!line.startsWith('data: ')) continue;
        let event: SseEvent;
        try {
          event = JSON.parse(line.slice(6)) as SseEvent;
        } catch {
          continue;
        }

        if (event.stage === 'error') {
          setError(event.message);
          setStreaming(false);
          setActiveStage(null);
          return;
        }

        if (event.stage === 'done') {
          setCompletedStages((prev) => {
            if (activeStage && !prev.includes(activeStage)) return [...prev, activeStage];
            return prev;
          });
          setActiveStage(null);
          setStreaming(false);
          setPlan(event.plan);
          return;
        }

        // Progress event — advance the stage
        const key = event.stage as StageKey;
        setCompletedStages((prev) => {
          if (activeStage && !prev.includes(activeStage) && activeStage !== key) {
            return [...prev, activeStage];
          }
          return prev;
        });
        setActiveStage(key);
        setActiveDetail('message' in event ? event.message : undefined);
      }
    }
  }

  function resetState() {
    setPlan(null);
    setError(null);
    setStreaming(false);
    setActiveStage(null);
    setActiveDetail(undefined);
    setCompletedStages([]);
    setDescribeStep(0);
    setDescribeForm({ topic: '', yearGroup: '', priorKnowledge: '', goal: '' });
    setFile(null);
    setTopicHint('');
  }

  // ── Submit: generate mode ─────────────────────────────────────────────────

  async function submitGenerate() {
    if (!describeForm.topic.trim()) return;
    setStreaming(true);
    setStreamMode('generate');
    setError(null);
    setActiveStage(null);
    setCompletedStages([]);
    try {
      const res = await fetch('/api/teacher/ai/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          subjectId,
          topic: describeForm.topic,
          yearGroup: describeForm.yearGroup || undefined,
          priorKnowledge: describeForm.priorKnowledge || undefined,
          goal: describeForm.goal || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Request failed.');
        setStreaming(false);
        return;
      }
      await readStream(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setStreaming(false);
    }
  }

  // ── Submit: import mode ───────────────────────────────────────────────────

  async function submitImport() {
    if (!file) return;
    setStreaming(true);
    setStreamMode('import');
    setError(null);
    setActiveStage(null);
    setCompletedStages([]);
    try {
      const form = new FormData();
      form.set('mode', 'import');
      form.set('subjectId', subjectId);
      form.set('file', file);
      if (topicHint.trim()) form.set('topicHint', topicHint.trim());

      const res = await fetch('/api/teacher/ai/lesson-plan', { method: 'POST', body: form });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Request failed.');
        setStreaming(false);
        return;
      }
      await readStream(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setStreaming(false);
    }
  }

  function handleAccept() {
    if (!plan) return;
    setAccepting(true);
    onPlanGenerated(plan);
  }

  // ── Describe step navigation ──────────────────────────────────────────────

  const currentStep = DESCRIBE_STEPS[describeStep];
  const isLastStep = describeStep === DESCRIBE_STEPS.length - 1;

  function handleDescribeNext() {
    if (describeStep === 0 && !describeForm.topic.trim()) return;
    if (isLastStep) {
      void submitGenerate();
    } else {
      setDescribeStep((s) => s + 1);
    }
  }

  function handleDescribeKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDescribeNext();
    }
  }

  // ── Render: plan preview ──────────────────────────────────────────────────

  if (plan) {
    return (
      <PlanPreview
        plan={plan}
        onAccept={handleAccept}
        onReject={resetState}
        accepting={accepting}
      />
    );
  }

  // ── Render: streaming progress ────────────────────────────────────────────

  if (streaming) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white"
            style={{ background: 'var(--anx-primary)' }}
          >
            AI
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
            Building your lesson…
          </span>
        </div>
        <PipelineProgress
          mode={streamMode}
          activeStage={activeStage}
          completedStages={completedStages}
          activeDetail={activeDetail}
        />
        <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
          This usually takes 10–20 seconds.
        </p>
      </div>
    );
  }

  // ── Render: builder UI ────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white"
              style={{ background: 'var(--anx-primary)' }}
            >
              AI
            </span>
            <h3 className="text-base font-bold" style={{ color: 'var(--anx-text)' }}>
              Build lesson with Ember
            </h3>
          </div>
          {subjectTitle && (
            <p className="mt-0.5 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              {subjectTitle} · Claude will suggest skills, phases, and Do Now questions.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-sm hover:bg-[var(--anx-surface-container-high)]"
          style={{ color: 'var(--anx-text-muted)' }}
          aria-label="Close AI builder"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-lg p-0.5"
        style={{ background: 'var(--anx-surface-container-high)' }}
      >
        {(
          [
            { key: 'describe' as const, label: 'Describe lesson' },
            { key: 'upload' as const, label: 'Upload resource' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setActiveTab(t.key);
              setError(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === t.key
                ? 'bg-white shadow-sm'
                : 'text-[var(--anx-text-muted)] hover:text-[var(--anx-text-secondary)]'
            }`}
            style={activeTab === t.key ? { color: 'var(--anx-text)' } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="anx-callout-danger text-sm">{error}</div>}

      {/* ── Tab: Describe lesson ─────────────────────────────────────────── */}
      {activeTab === 'describe' && (
        <div className="space-y-4">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {DESCRIBE_STEPS.map((s, i) => (
              <div
                key={s.field}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < describeStep
                    ? 'bg-[var(--anx-primary)]'
                    : i === describeStep
                      ? 'bg-[var(--anx-primary)]/50'
                      : 'bg-[var(--anx-surface-container-high)]'
                }`}
              />
            ))}
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`describe-${currentStep.field}`}
              className="block text-sm font-semibold"
              style={{ color: 'var(--anx-text)' }}
            >
              {currentStep.label}
              {!currentStep.required && (
                <span
                  className="ml-1.5 text-xs font-normal"
                  style={{ color: 'var(--anx-text-muted)' }}
                >
                  (optional)
                </span>
              )}
            </label>
            <textarea
              id={`describe-${currentStep.field}`}
              rows={3}
              value={describeForm[currentStep.field]}
              onChange={(e) =>
                setDescribeForm((prev) => ({ ...prev, [currentStep.field]: e.target.value }))
              }
              onKeyDown={handleDescribeKeyDown}
              placeholder={currentStep.placeholder}
              className="anx-input w-full resize-none text-sm"
              autoFocus
            />
            <p className="text-[11px]" style={{ color: 'var(--anx-text-muted)' }}>
              {currentStep.hint}
            </p>
          </div>

          <div className="flex gap-2">
            {describeStep > 0 && (
              <button
                type="button"
                onClick={() => setDescribeStep((s) => s - 1)}
                className="anx-btn-secondary px-4 py-2.5 text-sm"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={handleDescribeNext}
              disabled={describeStep === 0 && !describeForm.topic.trim()}
              className="anx-btn-primary flex-1 py-2.5 text-sm disabled:opacity-40"
            >
              {isLastStep ? 'Build lesson →' : 'Next →'}
            </button>
          </div>

          {!isLastStep && describeForm.topic.trim() && (
            <button
              type="button"
              onClick={() => void submitGenerate()}
              className="w-full text-center text-xs underline-offset-2 hover:underline"
              style={{ color: 'var(--anx-text-muted)' }}
            >
              Skip remaining questions and generate now
            </button>
          )}
        </div>
      )}

      {/* ── Tab: Upload resource ──────────────────────────────────────────── */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-sm font-semibold"
              style={{ color: 'var(--anx-text)' }}
            >
              Teaching resource
            </label>
            <div
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all ${
                file
                  ? 'border-[var(--anx-primary)]/50 bg-[var(--anx-primary-soft)]'
                  : 'border-[var(--anx-outline-variant)] hover:border-[var(--anx-primary)]/40'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload file"
            >
              {file ? (
                <>
                  <span className="text-2xl">📄</span>
                  <p
                    className="mt-1.5 text-sm font-semibold"
                    style={{ color: 'var(--anx-primary)' }}
                  >
                    {file.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    {(file.size / 1024).toFixed(0)} KB · click to change
                  </p>
                </>
              ) : (
                <>
                  <span className="text-2xl opacity-40">📎</span>
                  <p
                    className="mt-1.5 text-sm font-medium"
                    style={{ color: 'var(--anx-text-secondary)' }}
                  >
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                    PDF, PowerPoint (.pptx) or Word (.docx)
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.docx,.ppt,.doc"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </div>

          <div>
            <label
              htmlFor="topic-hint"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--anx-text-secondary)' }}
            >
              What is this resource about?{' '}
              <span className="text-xs font-normal" style={{ color: 'var(--anx-text-muted)' }}>
                (optional)
              </span>
            </label>
            <input
              id="topic-hint"
              type="text"
              value={topicHint}
              onChange={(e) => setTopicHint(e.target.value)}
              placeholder="e.g. Adding fractions"
              className="anx-input w-full text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => void submitImport()}
            disabled={!file}
            className="anx-btn-primary w-full py-3 text-sm disabled:opacity-40"
          >
            Analyse and build lesson →
          </button>
        </div>
      )}
    </div>
  );
}
