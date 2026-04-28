'use client';

import { useState, type FormEvent } from 'react';
import { LiveWhiteboardViewer } from '@/components/student/LiveWhiteboardViewer';
import { AnimationRenderer } from '@/components/explanation/AnimationRenderer';
import { sanitizeStudentCopy } from '@/features/learn/studentCopy';
import {
  HelpIcon,
  MessageIcon,
} from '@/components/teacher/workspace/icons';
import type { LiveWhiteboardPayload } from '@/lib/live/whiteboard-strokes';
import { StudentLiveSessionChrome } from '@/components/student/live/StudentLiveSessionChrome';
import { LivePhaseTransition } from '@/components/student/live/LivePhaseTransition';
import { StudentLivePhaseStrip, livePhaseToStripStep } from '@/components/student/live/StudentLivePhaseStrip';
import { useLivePhasePrimaryFocus } from '@/components/student/live/useLivePhasePrimaryFocus';

export type LiveExplanationPayload = {
  id: string;
  skillId: string;
  routeType: string;
  misconceptionSummary: string;
  workedExample: string;
  animationSchema: unknown | null;
};

export type StudentLiveScreen =
  | { kind: 'waiting' }
  | { kind: 'message'; message: string }
  | { kind: 'watch'; whiteboard?: LiveWhiteboardPayload | null }
  | {
      kind: 'explanation';
      explanation: LiveExplanationPayload;
      whiteboard?: LiveWhiteboardPayload | null;
      onDismiss: () => void;
    }
  | {
      kind: 'check';
      whiteboard?: LiveWhiteboardPayload | null;
      questionStem: string;
      options?: string[];
      busy?: boolean;
      error?: string | null;
      onSubmit: (answer: string) => void;
    };

interface Props {
  lessonTitle: string;
  classLabel?: string;
  screen: StudentLiveScreen;
  onLeave?: () => void;
  onNeedHelp?: () => void;
  onMessageTeacher?: (message: string) => void;
}

function phaseHintFor(screen: StudentLiveScreen): string {
  switch (screen.kind) {
    case 'waiting':
      return 'Waiting · Teacher preparing';
    case 'message':
      return 'Message · Read';
    case 'watch':
      return 'Watching · Follow the board';
    case 'explanation':
      return 'Model · Follow along';
    case 'check':
      return 'Quick check · Your answer';
    default:
      return '';
  }
}

function GuidanceCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="student-live-guidance-enter anx-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
        What to do
      </p>
      <h2 className="mt-2 text-base font-bold" style={{ color: 'var(--anx-text)' }}>
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
        {body}
      </p>
    </div>
  );
}

function SidePanel({
  guidanceSlotKey,
  title,
  body,
  onNeedHelp,
  onMessageTeacher,
  primaryFocusHelp,
  children,
}: {
  guidanceSlotKey: string;
  title: string;
  body: string;
  onNeedHelp?: () => void;
  onMessageTeacher?: (message: string) => void;
  /** Move keyboard focus here after a phase change (one per screen). */
  primaryFocusHelp?: boolean;
  children?: React.ReactNode;
}) {
  const [messageOpen, setMessageOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sentFlash, setSentFlash] = useState(false);

  return (
    <aside className="flex flex-col gap-4">
      <GuidanceCard key={guidanceSlotKey} title={title} body={body} />

      {children}

      <div className="anx-card flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={onNeedHelp}
          data-live-primary-focus={primaryFocusHelp ? '' : undefined}
          className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--anx-primary-soft)] active:scale-[0.98]"
          style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-primary)' }}
        >
          <HelpIcon size={16} />
          I’m not sure / I need help
        </button>
        <button
          type="button"
          onClick={() => setMessageOpen((v) => !v)}
          aria-expanded={messageOpen}
          className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-[var(--anx-surface-hover)] active:scale-[0.98]"
          style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
        >
          <MessageIcon size={16} />
          Message teacher
        </button>
        <div
          className={`student-live-msg-composer grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out ${messageOpen ? 'student-live-msg-composer--open' : ''}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Quick message…"
                className="anx-input flex-1 text-sm"
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
                className="anx-btn-primary shrink-0 px-3 py-2 text-xs transition-transform active:scale-[0.97]"
                disabled={!draft.trim()}
              >
                Send
              </button>
            </div>
            {sentFlash ? (
              <p className="mt-2 text-xs font-medium" style={{ color: 'var(--anx-success)' }}>
                Sent — your teacher can see this.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function CanvasFrame({ whiteboard }: { whiteboard?: LiveWhiteboardPayload | null }) {
  return (
    <div className="anx-card student-live-waiting-card flex min-h-[320px] flex-1 flex-col overflow-hidden p-3 sm:p-4">
      {whiteboard ? (
        <LiveWhiteboardViewer
          logicalWidth={whiteboard.width}
          logicalHeight={whiteboard.height}
          strokes={whiteboard.strokes}
          className="rounded-2xl"
        />
      ) : (
        <div
          className="student-live-waiting-placeholder flex flex-1 flex-col items-center justify-center rounded-2xl px-4 py-10 text-center text-sm"
          style={{ color: 'var(--anx-text-muted)' }}
        >
          <span className="student-live-waiting-ring mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full" aria-hidden>
            <span className="student-live-waiting-dot h-2 w-2 rounded-full bg-[var(--anx-primary)]" />
          </span>
          Waiting for your teacher to start…
        </div>
      )}
    </div>
  );
}

function CheckAnswerCard({
  questionStem,
  options,
  busy,
  error,
  onSubmit,
  onNeedHelp,
}: {
  questionStem: string;
  options?: string[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (answer: string) => void;
  onNeedHelp?: () => void;
}) {
  const [answer, setAnswer] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!answer.trim() || busy) return;
    onSubmit(answer);
  }

  const canSubmit = Boolean(answer.trim()) && !busy;

  return (
    <div className="relative">
      {busy ? <div className="student-live-busy-overlay" aria-hidden /> : null}
      <form onSubmit={handleSubmit} className={`anx-card flex flex-col gap-4 p-5 ${busy ? 'opacity-90' : ''}`}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-primary)' }}>
          Quick check
        </p>
        <p className="text-base font-semibold" style={{ color: 'var(--anx-text)' }}>
          {questionStem}
        </p>
        {error && <div className="anx-callout-danger text-sm">{error}</div>}
        {options && options.length > 0 ? (
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <label
                key={opt}
                className={`anx-option flex cursor-pointer items-center gap-3 py-3 ${answer === opt ? 'anx-option-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={opt}
                  checked={answer === opt}
                  onChange={() => setAnswer(opt)}
                  className="accent-[var(--anx-primary)]"
                  data-live-primary-focus={options[0] === opt ? '' : undefined}
                />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer…"
            className="anx-input"
            data-live-primary-focus=""
          />
        )}
        <div className="flex items-center justify-between gap-3">
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
            disabled={!canSubmit}
            className={`anx-btn-primary px-5 py-2.5 text-sm transition ${canSubmit ? 'student-live-submit-ready' : 'opacity-50'}`}
          >
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function StudentLiveView({
  lessonTitle,
  classLabel,
  screen,
  onLeave,
  onNeedHelp,
  onMessageTeacher,
}: Props) {
  const stripActive = livePhaseToStripStep(screen.kind);
  const phaseHint = phaseHintFor(screen);
  const transitionKey = `${screen.kind}-${screen.kind === 'message' ? screen.message : ''}`;
  useLivePhasePrimaryFocus(transitionKey);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)]">
      <StudentLiveSessionChrome
        lessonTitle={lessonTitle}
        classLabel={classLabel}
        onLeave={onLeave}
        mode="live"
        phaseHint={phaseHint}
      >
        <StudentLivePhaseStrip active={stripActive} />
      </StudentLiveSessionChrome>

      <LivePhaseTransition key={transitionKey}>
        <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr),320px]">
          {screen.kind === 'waiting' && (
            <>
              <div className="anx-card student-live-waiting-card flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
                <div
                  className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--anx-surface-container-high)] border-t-[var(--anx-primary)]"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                    Live lesson
                  </p>
                  <h2 className="mt-2 text-xl font-bold" style={{ color: 'var(--anx-text)' }}>
                    Waiting for your teacher
                  </h2>
                  <WaitingTip />
                </div>
              </div>
              <SidePanel
                guidanceSlotKey="waiting"
                title="Get ready"
                body="Your teacher will start any moment. Keep this tab open."
                onNeedHelp={onNeedHelp}
                onMessageTeacher={onMessageTeacher}
                primaryFocusHelp
              />
            </>
          )}

          {screen.kind === 'message' && (
            <>
              <div
                className="anx-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--anx-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--anx-surface-bright)] rounded-2xl"
                tabIndex={-1}
                data-live-primary-focus=""
              >
                <div className="text-4xl" aria-hidden>
                  💬
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                  Message
                </p>
                <p className="text-base" style={{ color: 'var(--anx-text)' }}>
                  {screen.message}
                </p>
              </div>
              <SidePanel
                guidanceSlotKey={`msg-${screen.message.slice(0, 24)}`}
                title="Read this"
                body="Your teacher sent a quick message. The next activity will appear shortly."
                onNeedHelp={onNeedHelp}
                onMessageTeacher={onMessageTeacher}
              />
            </>
          )}

          {screen.kind === 'watch' && (
            <>
              <CanvasFrame whiteboard={screen.whiteboard} />
              <SidePanel
                guidanceSlotKey="watch"
                title="Watch the board"
                body="Follow what your teacher is showing. You don’t need to do anything yet — they’ll let you know when it’s your turn."
                onNeedHelp={onNeedHelp}
                onMessageTeacher={onMessageTeacher}
                primaryFocusHelp
              />
            </>
          )}

          {screen.kind === 'explanation' && (
            <>
              <div className="flex min-h-0 flex-col gap-4">
                <CanvasFrame whiteboard={screen.whiteboard} />
                <div className="anx-card flex flex-col gap-4 p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-primary)' }}>
                    Model explanation
                  </p>
                  {screen.explanation.animationSchema ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <AnimationRenderer schema={screen.explanation.animationSchema as any} />
                  ) : (
                    <div className="space-y-4">
                      {sanitizeStudentCopy(screen.explanation.misconceptionSummary) && (
                        <div className="anx-callout-warning rounded-xl px-4 py-3 text-sm">
                          <p className="font-semibold" style={{ color: 'var(--anx-text)' }}>
                            Watch out for this
                          </p>
                          <p className="mt-1 leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
                            {sanitizeStudentCopy(screen.explanation.misconceptionSummary)}
                          </p>
                        </div>
                      )}
                      {sanitizeStudentCopy(screen.explanation.workedExample) && (
                        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--anx-outline-variant)' }}>
                          <p className="font-semibold" style={{ color: 'var(--anx-text)' }}>
                            Worked example
                          </p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
                            {sanitizeStudentCopy(screen.explanation.workedExample)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={screen.onDismiss}
                    data-live-primary-focus=""
                    className="anx-btn-primary w-full py-3 text-sm transition-transform active:scale-[0.99]"
                  >
                    I’ve watched this — continue
                  </button>
                </div>
              </div>
              <SidePanel
                guidanceSlotKey="explanation"
                title="Follow along"
                body="Your teacher shared a model from the lesson bank. Read or play the steps, then tap continue when you’re ready."
                onNeedHelp={onNeedHelp}
                onMessageTeacher={onMessageTeacher}
              />
            </>
          )}

          {screen.kind === 'check' && (
            <>
              <div className="flex min-h-0 flex-col gap-4">
                <CheckAnswerCard
                  questionStem={screen.questionStem}
                  options={screen.options}
                  busy={screen.busy}
                  error={screen.error}
                  onSubmit={screen.onSubmit}
                  onNeedHelp={onNeedHelp}
                />
                {screen.whiteboard && <CanvasFrame whiteboard={screen.whiteboard} />}
              </div>
              <SidePanel
                guidanceSlotKey="check"
                title="Quick check"
                body="Answer the question first. Use the board only if your teacher is pointing something out there."
                onNeedHelp={onNeedHelp}
                onMessageTeacher={onMessageTeacher}
              />
            </>
          )}
        </main>
      </LivePhaseTransition>
    </div>
  );
}

const WAITING_TIPS = [
  'Sit tight — the next activity will appear here.',
  'Your teacher may be explaining to the whole class first.',
  'Keep this tab open so you do not miss the next step.',
] as const;

function WaitingTip() {
  const [i, setI] = useState(0);
  return (
    <p className="student-live-waiting-tip mt-2 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
      {WAITING_TIPS[i % WAITING_TIPS.length]}
      <button
        type="button"
        className="ml-2 text-xs font-semibold underline decoration-dotted underline-offset-2"
        style={{ color: 'var(--anx-primary)' }}
        onClick={() => setI((x) => x + 1)}
      >
        Another tip
      </button>
    </p>
  );
}
