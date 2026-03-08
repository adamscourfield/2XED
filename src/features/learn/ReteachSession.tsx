'use client';

import { useState } from 'react';
import type { ReteachPlan, RouteType } from './reteachContent';

interface Props {
  routeType: RouteType;
  plan: ReteachPlan;
  onComplete: () => void;
}

export function ReteachSession({ routeType, plan, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [guided, setGuided] = useState('');

  const step = plan.steps[stepIndex];

  function checkStep() {
    if (!selected) return;
    const correct = selected === step.checkpointAnswer;
    setFeedback(correct ? 'correct' : 'incorrect');
    if (correct) {
      setTimeout(() => {
        setFeedback(null);
        setSelected('');
        if (stepIndex < plan.steps.length - 1) {
          setStepIndex((i) => i + 1);
        }
      }, 300);
    }
  }

  const doneSteps = stepIndex >= plan.steps.length - 1 && feedback === 'correct';
  const guidedOk = guided.trim() === plan.guidedAnswer;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Misconception detected</p>
        <p className="mt-1">{plan.misconceptionSummary}</p>
      </div>

      <div className={`rounded-xl border border-slate-200 bg-white p-4 ${feedback === 'correct' ? 'anx-pulse-correct' : ''} ${feedback === 'incorrect' ? 'anx-shake-incorrect' : ''}`}>
        <p className="text-xs uppercase tracking-wide text-slate-500">{step.title}</p>
        <p className="mt-2 text-sm text-slate-700">{step.explanation}</p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-800">Checkpoint: {step.checkpointQuestion}</p>
          <div className="mt-3 space-y-2">
            {step.checkpointOptions.map((option) => (
              <button key={option} onClick={() => setSelected(option)} className={`anx-option ${selected === option ? 'anx-option-selected' : ''}`}>
                {option}
              </button>
            ))}
          </div>
          <button onClick={checkStep} className="anx-btn-primary mt-3 w-full" disabled={!selected}>
            Check step
          </button>
          {feedback === 'incorrect' && <p className="mt-2 text-xs text-rose-600">Not quite — reread the step and try again.</p>}
          {feedback === 'correct' && <p className="mt-2 text-xs text-emerald-600">Good. You understood this step.</p>}
        </div>
      </div>

      {stepIndex === plan.steps.length - 1 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Worked example</p>
          <p className="mt-1">{plan.workedExample}</p>
        </div>
      )}

      {doneSteps && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Guided model</p>
          <p className="mt-1 text-sm text-slate-700">{plan.guidedPrompt}</p>
          <input
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={guided}
            onChange={(e) => setGuided(e.target.value)}
            placeholder="Type your answer"
          />
          {!guidedOk && guided.length > 0 && (
            <p className="mt-2 text-xs text-rose-600">Try again — think about the place value column.</p>
          )}
          <button className="anx-btn-primary mt-3 w-full" onClick={onComplete} disabled={!guidedOk}>
            Continue to key questions
          </button>
        </div>
      )}
    </div>
  );
}
