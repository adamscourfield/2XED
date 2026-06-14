import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';

const TONE_STYLES: Record<BadgeTone, { color: string; background: string }> = {
  neutral: { color: 'var(--anx-text-muted)', background: 'var(--anx-surface-container-low)' },
  success: { color: 'var(--anx-success)', background: 'var(--anx-success-soft)' },
  warning: { color: 'var(--anx-warning-text, #b45309)', background: 'var(--anx-warning-soft, #fff8e1)' },
  danger: { color: 'var(--anx-danger-text, #b91c1c)', background: 'var(--anx-danger-soft, #fef2f2)' },
  primary: { color: 'var(--anx-primary)', background: 'var(--anx-primary-soft)' },
};

interface Props {
  children: ReactNode;
  /** Pick a semantic tone, or supply explicit colours (e.g. a lane's tokens). */
  tone?: BadgeTone;
  color?: string;
  background?: string;
  className?: string;
  title?: string;
}

/**
 * A pill label. Replaces the `rounded-full px-2 py-0.5 …` + inline-colour markup
 * repeated across lane badges, counts, and status chips. Pass a `tone` for the
 * common cases, or explicit `color`/`background` (e.g. from a lane definition).
 */
export function Badge({ children, tone = 'neutral', color, background, className = '', title }: Props) {
  const base = TONE_STYLES[tone];
  const style: CSSProperties = {
    color: color ?? base.color,
    background: background ?? base.background,
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`.trim()}
      style={style}
      title={title}
    >
      {children}
    </span>
  );
}
