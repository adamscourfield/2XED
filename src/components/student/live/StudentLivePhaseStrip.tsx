'use client';

/** Four beats that match real flows: prep → teacher-led → model → student attempt */
const STEPS = ['Ready', 'Watch', 'Model', 'Try'] as const;

export type LiveStripStepId = (typeof STEPS)[number];

/** Maps coarse student live phases to the strip (explanation = Model, not “Practice”) */
export function livePhaseToStripStep(
  phase:
    | 'waiting'
    | 'message'
    | 'watch'
    | 'check'
    | 'practice'
    | 'explanation'
    | 'feedback',
): LiveStripStepId {
  switch (phase) {
    case 'watch':
    case 'message':
      return 'Watch';
    case 'explanation':
      return 'Model';
    case 'check':
    case 'feedback':
    case 'practice':
      return 'Try';
    default:
      return 'Ready';
  }
}

export function StudentLivePhaseStrip({ active }: { active: LiveStripStepId }) {
  const activeIndex = STEPS.indexOf(active);
  return (
    <div className="student-live-phase-strip" role="navigation" aria-label="Lesson progress">
      {STEPS.map((label, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'todo';
        return (
          <span key={label} className="student-live-phase-strip__item">
            {i > 0 ? (
              <span
                className="student-live-phase-strip__rail"
                aria-hidden
                data-done={i <= activeIndex ? 'true' : 'false'}
              />
            ) : null}
            <span className="student-live-phase-strip__pill" data-state={state}>
              {state === 'done' ? <span aria-hidden>✓</span> : null}
              <span className="student-live-phase-strip__text">{label}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
