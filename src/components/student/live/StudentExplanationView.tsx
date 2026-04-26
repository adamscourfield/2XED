'use client';

import Image from 'next/image';
import { AnimationRenderer } from '@/components/explanation/AnimationRenderer';
import { LiveWhiteboardViewer } from '@/components/student/LiveWhiteboardViewer';
import { HelpIcon } from '@/components/teacher/workspace/icons';
import type { LiveWhiteboardPayload } from '@/lib/live/whiteboard-strokes';

interface ExplanationRouteData {
  id: string;
  routeType: string;
  misconceptionSummary: string;
  workedExample: string;
  animationSchema: unknown;
}

interface Props {
  lessonTitle: string;
  classLabel?: string;
  explanationRoute: ExplanationRouteData;
  stepIndex: number;
  whiteboard: LiveWhiteboardPayload | null;
  onLeave?: () => void;
  onNeedHelp?: () => void;
}

export function StudentExplanationView({
  lessonTitle,
  classLabel,
  explanationRoute,
  stepIndex,
  whiteboard,
  onLeave,
  onNeedHelp,
}: Props) {
  const schema = explanationRoute.animationSchema as Parameters<typeof AnimationRenderer>[0]['schema'] | null;

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)]">
      {/* Top bar */}
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

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr),320px]">
        {/* Main explanation area with whiteboard overlay */}
        <div className="anx-card flex min-h-[320px] flex-1 flex-col overflow-hidden p-3 sm:p-4">
          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            {/* Explanation content */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              {schema ? (
                <AnimationRenderer
                  schema={schema}
                  currentStep={stepIndex}
                  // No onStepChange — student view is read-only, teacher controls steps
                />
              ) : (
                /* Fallback for routes without animationSchema */
                <div className="flex flex-col gap-4 h-full overflow-y-auto p-2">
                  <div
                    className="rounded-xl border-l-4 p-4 text-sm"
                    style={{ borderColor: 'var(--anx-warning)', background: 'var(--anx-warning-soft)', color: 'var(--anx-text)' }}
                  >
                    <p className="font-semibold">Common mistake to watch out for:</p>
                    <p className="mt-1">{explanationRoute.misconceptionSummary}</p>
                  </div>
                  <div
                    className="rounded-xl border p-4"
                    style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--anx-text-muted)' }}>
                      Worked example
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--anx-text)' }}>
                      {explanationRoute.workedExample}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Teacher annotation overlay — transparent canvas with only strokes */}
            {whiteboard && whiteboard.strokes.length > 0 && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <LiveWhiteboardViewer
                  logicalWidth={whiteboard.width}
                  logicalHeight={whiteboard.height}
                  strokes={whiteboard.strokes}
                  transparent
                  className="rounded-2xl"
                />
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-4">
          <div className="anx-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
              What to do
            </p>
            <h2 className="mt-2 text-base font-bold" style={{ color: 'var(--anx-text)' }}>
              Watch the explanation
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
              Your teacher is stepping through this worked example. Follow along — your teacher will advance each step.
            </p>
          </div>

          <div className="anx-card flex flex-col gap-3 p-4">
            <button
              type="button"
              onClick={onNeedHelp}
              className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--anx-primary-soft)]"
              style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-primary)' }}
            >
              <HelpIcon size={16} />
              I need help with this
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
