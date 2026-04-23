'use client';

import React, { type ReactNode } from 'react';

export type StudentQuestionCardProps = {
  /** Stable id for the current step (e.g. item id); drives the continuity animation when it changes */
  questionKey: string;
  className?: string;
  /** Top row (title, counts, etc.) */
  header?: ReactNode;
  progress?: ReactNode;
  /** Optional banner or context above the question */
  preface?: ReactNode;
  /** Diagrams / ItemVisualPanel */
  visual?: ReactNode;
  /** Small label above the question stem */
  questionLabel?: string;
  question: ReactNode;
  /** Short hint under the stem (answer format) */
  instruction?: ReactNode;
  answerArea: ReactNode;
  actions?: ReactNode;
};

/**
 * Shared layout for one-question-at-a-time flows: baseline, diagnostic, solo practice, live recheck.
 * Keeps panel footprint steady, separates stem from answers, and animates step changes.
 */
export function StudentQuestionCard({
  questionKey,
  className = '',
  header,
  progress,
  preface,
  visual,
  questionLabel,
  question,
  instruction,
  answerArea,
  actions,
}: StudentQuestionCardProps) {
  return (
    <div className={`anx-panel anx-question-card-panel w-full max-w-3xl ${className}`.trim()}>
      <div className="anx-question-card-viewport">
        <div key={questionKey} className="anx-question-card-sweep-in flex min-h-0 flex-col">
          {header ? <div className="anx-question-card-header">{header}</div> : null}
          {progress ? <div className="anx-question-card-progress">{progress}</div> : null}
          {preface ? <div className="anx-question-card-preface">{preface}</div> : null}
          {visual ? <div className="anx-question-card-visual">{visual}</div> : null}

          <div className="anx-question-card-prompt">
            {questionLabel ? (
              <p className="anx-question-card-eyebrow">{questionLabel}</p>
            ) : null}
            <div className="anx-question-card-stem">{question}</div>
          </div>

          <div className="anx-question-card-divider" aria-hidden />

          <div className="anx-question-card-response">
            {instruction ? <div className="anx-question-card-instruction">{instruction}</div> : null}
            <div className="anx-question-card-answers">{answerArea}</div>
          </div>

          {actions ? <div className="anx-question-card-actions">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
