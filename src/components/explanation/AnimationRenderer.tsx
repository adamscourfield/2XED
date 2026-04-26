'use client';

import { useState, useCallback, useEffect } from 'react';

interface AnimationStep {
  stepIndex: number;
  id: string;
  visuals: VisualPrimitive[];
  narration: string;
  audioFile: string | null;
}

type VisualPrimitive =
  | { type: 'show_expression'; expression: string; parts: { text: string; id: string; highlight: string | null }[] }
  | { type: 'number_line'; range: [number, number]; highlightStart?: number; arrowFrom?: number; arrowTo?: number }
  | { type: 'step_reveal'; lines: { text: string; highlight: string | null }[] }
  | { type: 'rule_callout'; ruleText: string; subText?: string }
  | { type: 'area_model'; rows: number; cols: number; highlightRows?: number[]; label?: string }
  | { type: 'fraction_bar'; numerator: number; denominator: number; showDecimal?: boolean; showPercent?: boolean }
  | { type: 'result_reveal'; expression: string; label?: string };

interface MisconceptionStrip {
  text: string;
  audioNarration: string;
}

interface AnimationSchema {
  schemaVersion: string;
  skillCode: string;
  skillName: string;
  routeType: string;
  routeLabel: string;
  misconceptionSummary: string;
  generatedAt: string;
  steps: AnimationStep[];
  misconceptionStrip: MisconceptionStrip;
  loopable: boolean;
  pauseAtEndMs: number;
}

interface AnimationRendererProps {
  schema: AnimationSchema;
  /** When provided, the renderer is controlled — internal step state is ignored. */
  currentStep?: number;
  /** Called when the user navigates steps in controlled mode (teacher view). */
  onStepChange?: (step: number) => void;
}

const highlightColors: Record<string, string> = {
  accent: 'text-orange-600 font-bold',
  blue: 'text-blue-600',
  green: 'text-green-600',
  dim: 'text-gray-400',
};

function renderVisual(visual: VisualPrimitive, key: number) {
  switch (visual.type) {
    case 'show_expression':
      return (
        <div key={key} className="flex items-center justify-center gap-1 text-2xl font-mono py-4">
          {visual.parts.map((part) => (
            <span key={part.id} className={part.highlight ? highlightColors[part.highlight] ?? '' : ''}>
              {part.text}
            </span>
          ))}
        </div>
      );

    case 'step_reveal':
      return (
        <div key={key} className="space-y-2 py-4">
          {visual.lines.map((line, i) => (
            <p key={i} className={`text-xl font-mono text-center ${line.highlight ? highlightColors[line.highlight] ?? '' : ''}`}>
              {line.text}
            </p>
          ))}
        </div>
      );

    case 'rule_callout':
      return (
        <div key={key} className="rounded-lg border-2 border-indigo-200 bg-indigo-50 px-6 py-4 text-center my-4">
          <p className="text-lg font-bold text-indigo-900">{visual.ruleText}</p>
          {visual.subText && <p className="text-sm text-indigo-600 mt-1">{visual.subText}</p>}
        </div>
      );

    case 'result_reveal':
      return (
        <div key={key} className="rounded-lg bg-green-50 border border-green-200 px-6 py-4 text-center my-4">
          <p className="text-2xl font-bold font-mono text-green-800">{visual.expression}</p>
          {visual.label && <p className="text-sm text-green-600 mt-1">{visual.label}</p>}
        </div>
      );

    case 'number_line': {
      const [min, max] = visual.range;
      const width = 400;
      const padding = 24;
      const lineY = 35;
      const toX = (v: number) => padding + ((v - min) / (max - min)) * (width - 2 * padding);
      return (
        <svg key={key} width={width} height={70} viewBox={`0 0 ${width} 70`} className="block mx-auto my-4">
          <line x1={padding} y1={lineY} x2={width - padding} y2={lineY} stroke="#1a1814" strokeWidth={2} />
          {visual.highlightStart !== undefined && (
            <circle cx={toX(visual.highlightStart)} cy={lineY} r={5} fill="#1a56d4" />
          )}
          {visual.arrowFrom !== undefined && visual.arrowTo !== undefined && (
            <line x1={toX(visual.arrowFrom)} y1={lineY - 12} x2={toX(visual.arrowTo)} y2={lineY - 12} stroke="#1a9454" strokeWidth={2} />
          )}
        </svg>
      );
    }

    case 'area_model': {
      const cellSize = 28;
      const w = visual.cols * cellSize;
      const h = visual.rows * cellSize;
      return (
        <div key={key} className="flex flex-col items-center my-4">
          <svg width={w + 2} height={h + 2} viewBox={`0 0 ${w + 2} ${h + 2}`}>
            {Array.from({ length: visual.rows }, (_, r) =>
              Array.from({ length: visual.cols }, (_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize + 1}
                  y={r * cellSize + 1}
                  width={cellSize}
                  height={cellSize}
                  fill={visual.highlightRows?.includes(r) ? '#e8f0fd' : 'white'}
                  stroke="#e8e3db"
                  strokeWidth={1}
                />
              ))
            )}
          </svg>
          {visual.label && <p className="text-sm text-gray-600 mt-2">{visual.label}</p>}
        </div>
      );
    }

    case 'fraction_bar': {
      const barWidth = 200;
      const filled = (visual.numerator / visual.denominator) * barWidth;
      return (
        <div key={key} className="flex flex-col items-center my-4">
          <svg width={barWidth + 2} height={32}>
            <rect x={1} y={1} width={barWidth} height={30} fill="white" stroke="#e8e3db" strokeWidth={1} />
            <rect x={1} y={1} width={filled} height={30} fill="#e8f0fd" stroke="#1a56d4" strokeWidth={1} />
          </svg>
          <div className="flex gap-4 mt-2 text-sm text-gray-700">
            <span>{visual.numerator}/{visual.denominator}</span>
            {visual.showDecimal && <span>= {(visual.numerator / visual.denominator).toFixed(2)}</span>}
            {visual.showPercent && <span>= {((visual.numerator / visual.denominator) * 100).toFixed(0)}%</span>}
          </div>
        </div>
      );
    }
  }
}

export function AnimationRenderer({ schema, currentStep: controlledStep, onStepChange }: AnimationRendererProps) {
  const isControlled = controlledStep !== undefined;
  const [internalStep, setInternalStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentStep = isControlled ? controlledStep : internalStep;
  const step = schema.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === schema.steps.length - 1;

  const speakNarration = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const goNext = useCallback(() => {
    if (isControlled) {
      if (!isLast) onStepChange?.(currentStep + 1);
      else if (schema.loopable) onStepChange?.(0);
    } else {
      if (isLast && schema.loopable) setInternalStep(0);
      else if (!isLast) setInternalStep((s) => s + 1);
    }
  }, [isControlled, isLast, schema.loopable, currentStep, onStepChange]);

  const goPrev = useCallback(() => {
    if (isControlled) {
      if (!isFirst) onStepChange?.(currentStep - 1);
    } else {
      if (!isFirst) setInternalStep((s) => s - 1);
    }
  }, [isControlled, isFirst, currentStep, onStepChange]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (step?.narration) {
      speakNarration(step.narration);
    }
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, [currentStep, step?.narration, speakNarration]);

  if (!step) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-sm text-gray-500">
        <span>{schema.skillName} — Route {schema.routeType} ({schema.routeLabel})</span>
        <span>Step {currentStep + 1} / {schema.steps.length}</span>
      </div>

      {/* Visual area */}
      <div className="min-h-[200px] flex flex-col items-center justify-center px-6 py-8">
        {step.visuals.map((v, i) => renderVisual(v, i))}
      </div>

      {/* Narration */}
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
        <div className="flex items-start gap-2">
          {isSpeaking && <span className="text-indigo-500 animate-pulse">🔊</span>}
          <p className="text-sm text-gray-700 italic">{step.narration}</p>
        </div>
      </div>

      {/* Controls — hidden in student-controlled mode (teacher advances steps) */}
      {(!isControlled || onStepChange) && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-30"
          >
            ← Prev
          </button>
          <div className="flex gap-1">
            {schema.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => isControlled ? onStepChange?.(i) : setInternalStep(i)}
                className={`h-2 w-2 rounded-full ${i === currentStep ? 'bg-indigo-500' : 'bg-gray-300'}`}
              />
            ))}
          </div>
          <button
            onClick={goNext}
            disabled={isLast && !schema.loopable}
            className="rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}

      {/* Misconception strip */}
      <div className="border-t border-amber-200 bg-amber-50 px-6 py-3">
        <p className="text-sm font-medium text-amber-800">
          ⚠️ {schema.misconceptionStrip.text}
        </p>
      </div>
    </div>
  );
}
