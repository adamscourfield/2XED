'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import type {
  ExplanationBlock,
  ExplanationBlockType,
  AnnotationData,
  EnglishAnimationSchema,
  EnglishVisual,
} from '@/features/content/types';

// ── English visual renderers ───────────────────────────────────────────────────

const highlightStyles: Record<string, string> = {
  bold: 'font-bold',
  underline: 'underline',
  italic: 'italic',
  accent: 'text-orange-600 font-semibold',
  evidence: 'bg-amber-100 text-amber-900 rounded px-0.5',
};

function renderEnglishVisual(visual: EnglishVisual, key: number): ReactNode {
  switch (visual.type) {
    case 'text_block':
      return (
        <p key={key} className="text-base leading-relaxed" style={{ color: 'var(--anx-text)' }}>
          {visual.highlightSpans
            ? visual.content
                .split(new RegExp(`(${visual.highlightSpans.map((s) => escapeRe(s.text)).join('|')})`))
                .map((part, i) => {
                  const span = visual.highlightSpans?.find((s) => s.text === part);
                  return span ? (
                    <span key={i} className={highlightStyles[span.style] ?? ''}>
                      {part}
                    </span>
                  ) : (
                    part
                  );
                })
            : visual.content}
        </p>
      );

    case 'inference_chain':
      return (
        <div key={key} className="flex flex-col items-start gap-1 py-2">
          {visual.nodes.map((node, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                  visual.highlightNode === i
                    ? 'bg-primary text-on-primary'
                    : 'border border-primary/15 bg-accentSurface text-primary'
                }`}
              >
                {node.label}
              </span>
              <span
                className={`text-sm ${node.highlight ? 'font-medium' : ''}`}
                style={{ color: 'var(--anx-text)' }}
              >
                {node.text}
              </span>
              {i < visual.nodes.length - 1 && (
                <span className="self-stretch ml-4 text-on-surface-variant text-xs">↓</span>
              )}
            </div>
          ))}
        </div>
      );

    case 'sentence_parse':
      return (
        <div key={key} className="py-3">
          <div className="relative text-base font-mono leading-loose" style={{ color: 'var(--anx-text)' }}>
            {visual.sentence}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {visual.annotations.map((ann, i) => (
              <span
                key={i}
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: ann.color + '22', color: ann.color, border: `1px solid ${ann.color}44` }}
              >
                {ann.text} — {ann.label}
              </span>
            ))}
          </div>
        </div>
      );

    case 'peel_reveal': {
      const peelColors: Record<string, string> = {
        P: 'border-l-4 border-primary bg-accentSurface text-on-surface',
        E: 'bg-amber-50 border-amber-300 text-amber-900 border-l-4 border-amber-400',
        E2: 'bg-orange-50 border-orange-300 text-orange-900 border-l-4 border-orange-400',
        L: 'bg-green-50 border-green-300 text-green-900 border-l-4 border-green-400',
      };
      const peelLabels: Record<string, string> = {
        P: 'Point',
        E: 'Evidence',
        E2: 'Explain',
        L: 'Link',
      };
      return (
        <div key={key} className="space-y-2 py-2">
          {visual.elements.map((el, i) => (
            <div key={i} className={`rounded-lg px-4 py-3 text-sm ${peelColors[el.role] ?? ''}`}>
              <span className="mr-2 text-xs font-bold uppercase tracking-wider opacity-70">
                {peelLabels[el.role] ?? el.role}
              </span>
              {el.text}
            </div>
          ))}
        </div>
      );
    }

    case 'persuasive_highlight':
      return (
        <div key={key} className="rounded-lg border border-primary/20 bg-accentSurface px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-primary">{visual.device}</p>
          <p className="text-sm italic text-on-surface">&ldquo;{visual.text}&rdquo;</p>
          <p className="text-sm text-on-surface-variant">{visual.explanation}</p>
        </div>
      );

    case 'vocab_breakdown':
      return (
        <div key={key} className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold" style={{ color: 'var(--anx-text)' }}>{visual.word}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {visual.prefix && (
              <span className="rounded bg-warning-soft text-warning px-2 py-0.5 font-mono">
                prefix: {visual.prefix}
              </span>
            )}
            <span className="rounded bg-accentSurface px-2 py-0.5 font-mono text-primary">
              root: {visual.root}
            </span>
            {visual.suffix && (
              <span
                className="rounded bg-secondary-container px-2 py-0.5 font-mono"
                style={{ color: 'var(--anx-on-secondary-container)' }}
              >
                suffix: {visual.suffix}
              </span>
            )}
          </div>
          {visual.family.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              Word family: {visual.family.join(', ')}
            </p>
          )}
        </div>
      );

    case 'quotation_annotate':
      return (
        <div key={key} className="py-2 space-y-1">
          {visual.annotationSide === 'above' && (
            <p className="text-xs italic text-primary">{visual.annotation}</p>
          )}
          <blockquote className="border-l-4 border-primary pl-4 text-base italic" style={{ color: 'var(--anx-text)' }}>
            &ldquo;{visual.quote}&rdquo;
          </blockquote>
          {visual.annotationSide === 'below' && (
            <p className="text-xs italic text-primary">{visual.annotation}</p>
          )}
        </div>
      );

    case 'step_reveal': {
      const lineHighlight: Record<string, string> = {
        accent: 'text-orange-600 font-semibold',
        evidence: 'bg-amber-100 text-amber-900 rounded px-1',
        green: 'text-green-700 font-medium',
      };
      return (
        <div key={key} className="space-y-2 py-2">
          {visual.lines.map((line, i) => (
            <p key={i} className={`text-sm ${line.highlight ? lineHighlight[line.highlight] ?? '' : ''}`} style={{ color: line.highlight ? undefined : 'var(--anx-text)' }}>
              {line.text}
            </p>
          ))}
        </div>
      );
    }

    case 'rule_callout':
      return (
        <div key={key} className="rounded-lg border-2 border-primary bg-accentSurface px-5 py-4 text-center my-2 shadow-md">
          <p className="text-base font-bold text-primary">{visual.ruleText}</p>
          {visual.subText && <p className="text-sm text-on-surface-variant mt-1">{visual.subText}</p>}
        </div>
      );

    case 'result_reveal':
      return (
        <div key={key} className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 text-center my-2">
          <p className="text-xl font-bold text-green-800">{visual.expression}</p>
          {visual.label && <p className="text-sm text-green-600 mt-1">{visual.label}</p>}
        </div>
      );
  }
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── English Animation Player ───────────────────────────────────────────────────

function EnglishAnimationPlayer({ schema }: { schema: EnglishAnimationSchema }) {
  const [step, setStep] = useState(0);
  const current = schema.steps[step];
  const isLast = step === schema.steps.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setStep((s) => (isLast && schema.loopable ? 0 : Math.min(s + 1, schema.steps.length - 1)));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStep((s) => Math.max(s - 1, 0));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLast, schema.loopable, schema.steps.length]);

  if (!current) return null;

  return (
    <div className="anx-card rounded-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-2 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
        <span>{schema.skillName}</span>
        <span>
          {step + 1} / {schema.steps.length}
        </span>
      </div>

      <div className="min-h-[180px] flex flex-col justify-center gap-3 px-6 py-6">
        {current.visuals.map((v, i) => renderEnglishVisual(v, i))}
      </div>

      <div className="border-t border-outline-variant bg-surface-container-low px-5 py-3">
        <p className="text-sm italic" style={{ color: 'var(--anx-text-muted)' }}>{current.narration}</p>
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3">
        <button
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="rounded px-3 py-1.5 text-sm font-medium hover:bg-surface-container-high disabled:opacity-30"
          style={{ color: 'var(--anx-text)' }}
        >
          ← Prev
        </button>
        <div className="flex gap-1">
          {schema.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 w-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-surface-container-high'}`}
            />
          ))}
        </div>
        <button
          onClick={() =>
            setStep((s) =>
              isLast && schema.loopable ? 0 : Math.min(s + 1, schema.steps.length - 1)
            )
          }
          disabled={isLast && !schema.loopable}
          className="rounded px-3 py-1.5 text-sm font-medium hover:bg-surface-container-high disabled:opacity-30"
          style={{ color: 'var(--anx-text)' }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Annotation playback canvas ─────────────────────────────────────────────────

function AnnotationPlayer({ data }: { data: AnnotationData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  const draw = useCallback(
    (upToIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const seq = data.playbackSequence.slice(0, upToIndex + 1);
      for (const item of seq) {
        if (item.kind === 'stroke') {
          const stroke = data.strokes[item.index];
          if (!stroke || stroke.points.length < 2) continue;
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const [first, ...rest] = stroke.points;
          ctx.moveTo(first.x, first.y);
          for (const pt of rest) ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        } else {
          const label = data.labels[item.index];
          if (!label) continue;
          ctx.fillStyle = label.color;
          ctx.font = `${label.fontSize}px sans-serif`;
          ctx.fillText(label.text, label.x, label.y);
        }
      }
    },
    [data]
  );

  const play = useCallback(() => {
    if (playing) return;
    setPlaying(true);
    let i = 0;
    const total = data.playbackSequence.length;

    function step() {
      if (i >= total) {
        setPlaying(false);
        return;
      }
      draw(i);
      setProgress(i);
      i++;
      frameRef.current = window.setTimeout(step, 300);
    }

    step();
  }, [playing, data.playbackSequence.length, draw]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) clearTimeout(frameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!playing) draw(progress);
  }, [playing, progress, draw]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        className="w-full rounded-lg border border-outline-variant"
      />
      <button
        type="button"
        onClick={play}
        disabled={playing}
        className="anx-btn-secondary text-xs disabled:opacity-50"
      >
        {playing ? 'Playing…' : 'Play annotation'}
      </button>
    </div>
  );
}

// ── Block renderers ────────────────────────────────────────────────────────────

function renderBlock(block: ExplanationBlock): ReactNode {
  switch (block.type as ExplanationBlockType) {
    case 'TEXT':
      return (
        <div
          className="prose prose-sm max-w-none leading-relaxed"
          style={{ color: 'var(--anx-text)' }}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case 'IMAGE': {
      let caption: string | undefined;
      let src = block.content;
      try {
        const parsed = JSON.parse(block.content) as { src?: string; caption?: string };
        src = parsed.src ?? block.content;
        caption = parsed.caption;
      } catch {
        // content is a plain URL
      }
      return (
        <figure className="my-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption ?? ''} className="rounded-lg max-w-full border border-outline-variant" />
          {caption && (
            <figcaption className="mt-1 text-center text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'CALLOUT': {
      let title: string | undefined;
      let body = block.content;
      try {
        const parsed = JSON.parse(block.content) as { title?: string; body?: string };
        title = parsed.title;
        body = parsed.body ?? block.content;
      } catch {
        // plain text
      }
      return (
        <div className="rounded-lg border border-primary/25 bg-accentSurface px-4 py-3 space-y-0.5 shadow-md">
          {title && <p className="text-xs font-bold uppercase tracking-wide text-primary">{title}</p>}
          <p className="text-sm text-on-surface">{body}</p>
        </div>
      );
    }

    case 'QUOTATION': {
      let quote = block.content;
      let source: string | undefined;
      try {
        const parsed = JSON.parse(block.content) as { quote?: string; source?: string };
        quote = parsed.quote ?? block.content;
        source = parsed.source;
      } catch {
        // plain text
      }
      return (
        <blockquote className="border-l-4 border-outline pl-4 py-1 italic text-base" style={{ color: 'var(--anx-text)' }}>
          <p>&ldquo;{quote}&rdquo;</p>
          {source && (
            <footer className="mt-1 text-xs not-italic" style={{ color: 'var(--anx-text-muted)' }}>
              — {source}
            </footer>
          )}
        </blockquote>
      );
    }

    case 'MODEL': {
      let modelContent = block.content;
      let label = 'Model answer';
      try {
        const parsed = JSON.parse(block.content) as { text?: string; label?: string };
        modelContent = parsed.text ?? block.content;
        label = parsed.label ?? label;
      } catch {
        // plain text
      }
      return (
        <div className="rounded-lg border border-green-200 bg-green-50 space-y-3 overflow-hidden">
          <div className="border-b border-green-200 bg-green-100 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-800">{label}</p>
          </div>
          <div className="px-4 pb-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--anx-text)' }}>
              {modelContent}
            </p>
            {block.annotationData && block.annotationData.playbackSequence.length > 0 && (
              <div className="mt-4">
                <AnnotationPlayer data={block.annotationData} />
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'SCAFFOLD': {
      let frames: string[] = [];
      try {
        const parsed = JSON.parse(block.content) as { frames?: string[] } | string[];
        frames = Array.isArray(parsed) ? parsed : (parsed.frames ?? [block.content]);
      } catch {
        frames = [block.content];
      }
      return (
        <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Writing frame</p>
          {frames.map((frame, i) => (
            <p key={i} className="text-sm text-amber-900">
              {frame}
            </p>
          ))}
        </div>
      );
    }

    case 'ANIMATION': {
      let schema: EnglishAnimationSchema | null = null;
      try {
        schema = JSON.parse(block.content) as EnglishAnimationSchema;
      } catch {
        return (
          <p className="text-sm text-red-600">Animation schema could not be parsed.</p>
        );
      }
      return <EnglishAnimationPlayer schema={schema} />;
    }

    case 'CHECKPOINT':
      // Checkpoint blocks are rendered by the parent via QuestionBlock — skip here.
      return null;

    default:
      return null;
  }
}

// ── ExplanationBlockRenderer ───────────────────────────────────────────────────

export interface ExplanationBlockRendererProps {
  blocks: ExplanationBlock[];
  /** If true, pause-for-interaction blocks show a "Continue" button */
  interactive?: boolean;
}

export function ExplanationBlockRenderer({
  blocks,
  interactive = true,
}: ExplanationBlockRendererProps) {
  const [unlockedUpTo, setUnlockedUpTo] = useState(0);

  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-5">
      {sorted.map((block, i) => {
        const isPaused = interactive && block.pauseForInteraction && i === unlockedUpTo && i < sorted.length - 1;
        const isLocked = interactive && block.pauseForInteraction && i > unlockedUpTo;

        return (
          <div key={block.id} className={isLocked ? 'opacity-40 pointer-events-none select-none' : ''}>
            {renderBlock(block)}

            {isPaused && (
              <button
                type="button"
                onClick={() => setUnlockedUpTo(i + 1)}
                className="anx-btn-primary mt-3"
              >
                Continue →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
