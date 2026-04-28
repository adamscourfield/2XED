'use client';

const STEPS = ['Wait', 'Watch', 'Check', 'Practice'] as const;

type StepId = (typeof STEPS)[number];

/** Maps coarse student live phases to the nearest strip step for orientation */
export function livePhaseToStripStep(
  phase:
    | 'waiting'
    | 'message'
    | 'watch'
    | 'check'
    | 'practice'
    | 'explanation'
    | 'feedback'
): StepId {
  switch (phase) {
    case 'watch':
    case 'message':
      return 'Watch';
    case 'check':
    case 'feedback':
      return 'Check';
    case 'practice':
    case 'explanation':
      return 'Practice';
    default:
      return 'Wait';
  }
}

export function StudentLivePhaseStrip({ active }: { active: StepId }) {
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
