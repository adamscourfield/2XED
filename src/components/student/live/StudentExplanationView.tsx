'use client';

import { useLivePhasePrimaryFocus } from '@/components/student/live/useLivePhasePrimaryFocus';
import { AnimationRenderer } from '@/components/explanation/AnimationRenderer';
import { LiveWhiteboardViewer } from '@/components/student/LiveWhiteboardViewer';
import { HelpIcon } from '@/components/teacher/workspace/icons';
import type { LiveWhiteboardPayload } from '@/lib/live/whiteboard-strokes';
import { StudentLiveSessionChrome } from '@/components/student/live/StudentLiveSessionChrome';
import { StudentLivePhaseStrip } from '@/components/student/live/StudentLivePhaseStrip';

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
  totalSteps: number;
  whiteboard: LiveWhiteboardPayload | null;
  onLeave?: () => void;
  onNeedHelp?: () => void;
}

export function StudentExplanationView({
  lessonTitle,
  classLabel,
  explanationRoute,
  stepIndex,
  totalSteps,
  whiteboard,
  onLeave,
  onNeedHelp,
}: Props) {
  const schema = explanationRoute.animationSchema as Parameters<typeof AnimationRenderer>[0]['schema'] | null;
  useLivePhasePrimaryFocus(`${explanationRoute.id}-${stepIndex}`);

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)]">
      <StudentLiveSessionChrome
        lessonTitle={lessonTitle}
        classLabel={classLabel}
        onLeave={onLeave}
        mode="explanation"
        phaseHint={`Model · Step ${Math.min(stepIndex + 1, totalSteps)} of ${Math.max(totalSteps, 1)}`}
      >
        <StudentLivePhaseStrip active="Model" />
      </StudentLiveSessionChrome>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr),320px]">
        {/* Main explanation area with whiteboard overlay */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="anx-card flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                Teacher explanation
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
                Step {Math.min(stepIndex + 1, totalSteps)} of {Math.max(totalSteps, 1)}
              </p>
            </div>
            <div className="flex items-center gap-2" aria-hidden>
              {Array.from({ length: Math.max(totalSteps, 1) }).map((_, idx) => (
                <span
                  key={`step-${idx}`}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background:
                      idx === stepIndex
                        ? 'var(--anx-primary)'
                        : idx < stepIndex
                          ? 'var(--anx-primary-soft)'
                          : 'var(--anx-surface-container-high)',
                  }}
                />
              ))}
            </div>
          </div>

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
                <div className="flex h-full flex-col gap-5 overflow-y-auto p-2 sm:p-4">
                  <section
                    className="rounded-2xl border-l-4 px-5 py-4 sm:px-6"
                    style={{ borderColor: 'var(--anx-warning)', background: 'var(--anx-warning-soft)', color: 'var(--anx-text)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-secondary)' }}>
                      Common mistake
                    </p>
                    <h2 className="mt-2 text-lg font-bold leading-snug" style={{ color: 'var(--anx-text)' }}>
                      Watch out for this
                    </h2>
                    <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--anx-text)' }}>
                      {explanationRoute.misconceptionSummary}
                    </p>
                  </section>
                  <section
                    className="rounded-2xl border px-5 py-5 sm:px-6"
                    style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-lowest)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
                      Worked example
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-base leading-8" style={{ color: 'var(--anx-text)' }}>
                      {explanationRoute.workedExample}
                    </p>
                  </section>
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
              data-live-primary-focus=""
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
