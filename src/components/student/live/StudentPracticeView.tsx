'use client';

import { useState, type FormEvent } from 'react';
import { CanvasInput, type CanvasInputData } from '@/components/question/CanvasInput';
import { StudentLiveSessionChrome } from '@/components/student/live/StudentLiveSessionChrome';
import { StudentLivePhaseStrip } from '@/components/student/live/StudentLivePhaseStrip';
import {
  HelpIcon,
  MessageIcon,
  SmileyHappyIcon,
  SmileyOkIcon,
  SmileySadIcon,
  TipIcon,
} from '@/components/teacher/workspace/icons';

export interface PracticeQuestion {
  id: string;
  stem: React.ReactNode;
  type?: string;
  helperText?: string;
  answerPrefix?: React.ReactNode;
  placeholder?: string;
  tip?: string;
  options?: string[];
}

export type Confidence = 'low' | 'mid' | 'high';

interface Props {
  className?: string;
  lessonTitle: string;
  classLabel?: string;
  question: PracticeQuestion;
  questionNumber: number;
  totalQuestions: number;
  initialAnswer?: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (answer: string, confidence: Confidence | null, canvasData?: CanvasInputData | null) => void;
  onLeave?: () => void;
  onNeedHelp?: () => void;
  onMessageTeacher?: (message: string) => void;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  const items: React.ReactNode[] = [];
  for (let i = 1; i <= total; i++) {
    const state = i < current ? 'done' : i === current ? 'current' : 'todo';
    items.push(
      <span key={`dot-${i}`} className="anx-progress-dot" data-state={state}>
        {state === 'done' ? '✓' : i}
      </span>,
    );
    if (i < total) {
      items.push(
        <span
          key={`rail-${i}`}
          className="anx-progress-rail"
          data-state={i < current ? 'done' : 'todo'}
          aria-hidden
        />,
      );
    }
  }
  return (
    <div className="anx-progress-dots" aria-label={`Question ${current} of ${total}`}>
      {items}
    </div>
  );
}

export function StudentPracticeView({
  className,
  lessonTitle,
  classLabel,
  question,
  questionNumber,
  totalQuestions,
  initialAnswer = '',
  busy,
  error,
  onSubmit,
  onLeave,
  onNeedHelp,
  onMessageTeacher,
}: Props) {
  const [answer, setAnswer] = useState(initialAnswer);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sentFlash, setSentFlash] = useState(false);
  const [canvasData, setCanvasData] = useState<CanvasInputData | null>(null);

  const isCanvasInput = question.type === 'CANVAS_INPUT';
  const isExtendedWriting = question.type === 'EXTENDED_WRITING';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const hasTextAnswer = !!answer.trim();
    const hasCanvasAnswer = !!canvasData;
    if ((!hasTextAnswer && !hasCanvasAnswer) || busy) return;
    onSubmit(answer, confidence, canvasData);
  }

  const hasTextAnswer = Boolean(answer.trim());
  const hasCanvasAnswer = Boolean(canvasData);
  const canSubmitForm = !busy && (hasTextAnswer || hasCanvasAnswer);

  return (
    <div className={`flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)] ${className ?? ''}`}>
      <StudentLiveSessionChrome
        lessonTitle={lessonTitle}
        classLabel={classLabel}
        onLeave={onLeave}
        mode="practice"
        phaseHint="Practice · Your turn"
      >
        <StudentLivePhaseStrip active="Practice" />
      </StudentLiveSessionChrome>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <section className="relative anx-card flex flex-col gap-5 p-6 sm:p-8">
          {busy ? <div className="student-live-busy-overlay" aria-hidden /> : null}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'var(--anx-primary-soft)', color: 'var(--anx-primary)' }}
            >
              <span aria-hidden>🎯</span> Your turn
            </span>
          </div>

          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--anx-text)' }}>
              Your question
            </p>
            <div className="mt-3 text-2xl font-semibold leading-snug" style={{ color: 'var(--anx-text)' }}>
              {question.stem}
            </div>
            {question.helperText && (
              <p className="mt-3 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                {question.helperText}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className={`relative flex flex-col gap-4 ${busy ? 'opacity-90' : ''}`}>
            {error && <div className="anx-callout-danger text-sm">{error}</div>}
            {question.options && question.options.length > 0 ? (
              <div className="flex flex-col gap-2">
                {question.options.map((opt) => (
                  <label
                    key={opt}
                    className={`anx-option flex cursor-pointer items-center gap-3 py-3 ${answer === opt ? 'anx-option-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`practice-answer-${question.id}`}
                      value={opt}
                      checked={answer === opt}
                      onChange={() => setAnswer(opt)}
                      className="accent-[var(--anx-primary)]"
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>{opt}</span>
                  </label>
                ))}
              </div>
            ) : isCanvasInput ? (
              <CanvasInput
                questionId={question.id}
                mode="draw+type"
                onChange={setCanvasData}
                disabled={busy}
              />
            ) : isExtendedWriting ? (
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={question.placeholder ?? 'Write your response here…'}
                className="min-h-48 w-full rounded-2xl border px-4 py-3.5 text-base outline-none transition focus:border-[var(--anx-primary)] focus:shadow-[0_0_0_3px_var(--anx-primary-glow)] resize-y"
                style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)', color: 'var(--anx-text)' }}
                autoFocus
              />
            ) : (
              <label
                className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition focus-within:border-[var(--anx-primary)] focus-within:shadow-[0_0_0_3px_var(--anx-primary-glow)]"
                style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)' }}
              >
                {question.answerPrefix && (
                  <span className="shrink-0 text-xl font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
                    {question.answerPrefix}
                  </span>
                )}
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={question.placeholder ?? 'Type your answer…'}
                  className="w-full bg-transparent text-lg outline-none"
                  style={{ color: 'var(--anx-text)' }}
                  autoFocus
                />
              </label>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onNeedHelp}
                className="inline-flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-80"
                style={{ color: 'var(--anx-primary)' }}
              >
                <HelpIcon size={16} />
                I need help
              </button>
              <button
                type="submit"
                disabled={!canSubmitForm}
                className={`anx-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm transition ${canSubmitForm ? 'student-live-submit-ready' : 'opacity-50'}`}
              >
                {busy ? 'Submitting…' : 'Submit answer'}
              </button>
            </div>
            {!question.options?.length && !isCanvasInput && (
              <p className="text-right text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                Press{' '}
                <kbd
                  className="rounded-md border px-1.5 py-0.5 font-mono text-[10px]"
                  style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-low)' }}
                >
                  Enter ↵
                </kbd>{' '}
                to submit
              </p>
            )}
          </form>
        </section>

        {/* ── Right side panel ─────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <div className="anx-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
              Your progress
            </p>
            <div className="mt-3">
              <ProgressDots current={questionNumber} total={totalQuestions} />
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>
              Question <strong style={{ color: 'var(--anx-primary)' }}>{questionNumber}</strong> of {totalQuestions}
            </p>
          </div>

          <div className="anx-card p-5">
            <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
              How confident do you feel?
            </p>
            <div className="anx-confidence-row mt-3">
              {(
                [
                  { key: 'low' as const, label: 'Not confident', Icon: SmileySadIcon, tone: 'low' as const },
                  { key: 'mid' as const, label: 'Okay', Icon: SmileyOkIcon, tone: 'mid' as const },
                  { key: 'high' as const, label: 'Confident', Icon: SmileyHappyIcon, tone: 'high' as const },
                ]
              ).map(({ key, label, Icon, tone }) => (
                <button
                  key={key}
                  type="button"
                  className="anx-confidence-btn"
                  aria-pressed={confidence === key}
                  onClick={() => setConfidence((c) => (c === key ? null : key))}
                >
                  <span className="anx-confidence-btn-icon" data-tone={tone}>
                    <Icon size={18} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {question.tip && (
            <div className="anx-card p-5">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'var(--anx-primary-soft)', color: 'var(--anx-primary)' }}
                  aria-hidden
                >
                  <TipIcon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>Tip</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                    {question.tip}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* ── Footer / send message ───────────────────────────────────────── */}
      <footer
        className="border-t px-4 py-3 sm:px-6"
        style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)' }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center">
          <button
            type="button"
            onClick={() => setMessageOpen((v) => !v)}
            aria-expanded={messageOpen}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-[var(--anx-surface-hover)] active:scale-[0.98]"
            style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
          >
            <MessageIcon size={16} />
            Send message to teacher
          </button>
        </div>
        <div className={`student-live-msg-composer mx-auto grid max-w-2xl overflow-hidden transition-[grid-template-rows] duration-200 ease-out ${messageOpen ? 'student-live-msg-composer--open' : ''}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 pt-3">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Quick message to your teacher…"
                className="anx-input flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (draft.trim() && onMessageTeacher) {
                    onMessageTeacher(draft.trim());
                    setDraft('');
                    setSentFlash(true);
                    window.setTimeout(() => setSentFlash(false), 1800);
                  }
                }}
                className="anx-btn-primary shrink-0 px-4 py-2 text-sm transition-transform active:scale-[0.97]"
                disabled={!draft.trim()}
              >
                Send
              </button>
            </div>
            {sentFlash ? (
              <p className="mt-2 text-center text-xs font-medium" style={{ color: 'var(--anx-success)' }}>
                Sent — your teacher can see this.
              </p>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
