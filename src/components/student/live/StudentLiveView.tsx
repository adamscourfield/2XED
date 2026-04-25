'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import { LiveWhiteboardViewer } from '@/components/student/LiveWhiteboardViewer';
import {
  HelpIcon,
  MessageIcon,
} from '@/components/teacher/workspace/icons';
import type { LiveWhiteboardPayload } from '@/lib/live/whiteboard-strokes';

export type StudentLiveScreen =
  | { kind: 'waiting' }
  | { kind: 'message'; message: string }
  | { kind: 'watch'; whiteboard?: LiveWhiteboardPayload | null }
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

function TopBar({
  lessonTitle,
  classLabel,
  onLeave,
}: {
  lessonTitle: string;
  classLabel?: string;
  onLeave?: () => void;
}) {
  return (
    <header
      className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6"
      style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)' }}
    >
      <Image src="/Ember_logo_icon.png" alt="Ember" width={512} height={512} className="h-7 w-7" priority />
      <span className="anx-live-pill">
        <span className="anx-live-pill-dot" />
        Live
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-none" style={{ color: 'var(--anx-text)' }}>
          {lessonTitle}
        </p>
        {classLabel && (
          <p className="mt-1 text-xs leading-none" style={{ color: 'var(--anx-text-muted)' }}>
            {classLabel}
          </p>
        )}
      </div>
      <div className="ml-auto">
        {onLeave && (
          <button type="button" onClick={onLeave} className="anx-btn-secondary px-3 py-1.5 text-xs">
            Leave
          </button>
        )}
      </div>
    </header>
  );
}

function SidePanel({
  title,
  body,
  onNeedHelp,
  onMessageTeacher,
  children,
}: {
  title: string;
  body: string;
  onNeedHelp?: () => void;
  onMessageTeacher?: (message: string) => void;
  children?: React.ReactNode;
}) {
  const [messageOpen, setMessageOpen] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <aside className="flex flex-col gap-4">
      <div className="anx-card p-5">
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

      {children}

      <div className="anx-card flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={onNeedHelp}
          className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--anx-primary-soft)]"
          style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-primary)' }}
        >
          <HelpIcon size={16} />
          I’m not sure / I need help
        </button>
        <button
          type="button"
          onClick={() => setMessageOpen((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-[var(--anx-surface-hover)]"
          style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
        >
          <MessageIcon size={16} />
          Message teacher
        </button>
        {messageOpen && (
          <div className="flex items-center gap-2">
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
                  setMessageOpen(false);
                }
              }}
              className="anx-btn-primary px-3 py-2 text-xs"
              disabled={!draft.trim()}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function CanvasFrame({ whiteboard }: { whiteboard?: LiveWhiteboardPayload | null }) {
  return (
    <div className="anx-card flex min-h-[320px] flex-1 flex-col overflow-hidden p-3 sm:p-4">
      {whiteboard ? (
        <LiveWhiteboardViewer
          logicalWidth={whiteboard.width}
          logicalHeight={whiteboard.height}
          strokes={whiteboard.strokes}
          className="rounded-2xl"
        />
      ) : (
        <div
          className="flex flex-1 items-center justify-center rounded-2xl text-sm"
          style={{ background: 'var(--anx-surface-container-low)', color: 'var(--anx-text-muted)' }}
        >
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

  return (
    <form onSubmit={handleSubmit} className="anx-card flex flex-col gap-4 p-5">
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
          autoFocus
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
          disabled={busy || !answer.trim()}
          className="anx-btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
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
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)]">
      <TopBar lessonTitle={lessonTitle} classLabel={classLabel} onLeave={onLeave} />

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr),320px]">
        {screen.kind === 'waiting' && (
          <>
            <div className="anx-card flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
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
                <p className="mt-2 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                  Sit tight — the next activity will appear here.
                </p>
              </div>
            </div>
            <SidePanel
              title="Get ready"
              body="Your teacher will start any moment. Keep this tab open."
              onNeedHelp={onNeedHelp}
              onMessageTeacher={onMessageTeacher}
            />
          </>
        )}

        {screen.kind === 'message' && (
          <>
            <div className="anx-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="text-4xl" aria-hidden>💬</div>
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                Message
              </p>
              <p className="text-base" style={{ color: 'var(--anx-text)' }}>{screen.message}</p>
            </div>
            <SidePanel
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
              title="Watch the board"
              body="Follow what your teacher is showing. You don’t need to do anything yet — they’ll let you know when it’s your turn."
              onNeedHelp={onNeedHelp}
              onMessageTeacher={onMessageTeacher}
            />
          </>
        )}

        {screen.kind === 'check' && (
          <>
            <div className="flex min-h-0 flex-col gap-4">
              <CanvasFrame whiteboard={screen.whiteboard} />
            </div>
            <SidePanel
              title="Quick check"
              body="Answer the question your teacher just asked. There’s no rush."
              onNeedHelp={onNeedHelp}
              onMessageTeacher={onMessageTeacher}
            >
              <CheckAnswerCard
                questionStem={screen.questionStem}
                options={screen.options}
                busy={screen.busy}
                error={screen.error}
                onSubmit={screen.onSubmit}
                onNeedHelp={onNeedHelp}
              />
            </SidePanel>
          </>
        )}
      </main>
    </div>
  );
}
