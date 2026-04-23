import type { ReactNode } from 'react';

type Props = {
  eyebrow: string;
  title: string;
  lead?: string;
  /** `compact` for secondary screens (e.g. live join); `full` matches dashboard hero weight */
  variant?: 'full' | 'compact';
  className?: string;
  /** Unique id for the title heading (a11y when multiple heroes exist). */
  titleId?: string;
  children?: ReactNode;
};

/**
 * Dashboard-aligned hero strip for flows (student diagnostic, teacher live launcher, etc.).
 */
export function StudentFlowHero({
  eyebrow,
  title,
  lead,
  variant = 'full',
  className = '',
  titleId = 'anx-flow-hero-title',
  children,
}: Props) {
  const innerClass = variant === 'compact' ? 'anx-flow-hero-inner anx-flow-hero-inner--compact' : 'anx-flow-hero-inner';
  return (
    <section className={`anx-flow-hero ${className}`.trim()} aria-labelledby={titleId}>
      <div className={innerClass}>
        <p className="anx-flow-hero-eyebrow">{eyebrow}</p>
        <h1 id={titleId} className="anx-flow-hero-title">
          {title}
        </h1>
        {lead ? <p className="anx-flow-hero-lead">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
