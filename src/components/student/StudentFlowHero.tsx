import type { ReactNode } from 'react';

type Props = {
  eyebrow: string;
  title: string;
  lead?: string;
  /** `compact` for secondary screens (e.g. live join); `full` matches dashboard hero weight */
  variant?: 'full' | 'compact';
  className?: string;
  children?: ReactNode;
};

/**
 * Dashboard-aligned hero strip for student flows (diagnostic intro, completion, etc.).
 */
export function StudentFlowHero({
  eyebrow,
  title,
  lead,
  variant = 'full',
  className = '',
  children,
}: Props) {
  const innerClass = variant === 'compact' ? 'student-flow-hero-inner student-flow-hero-inner--compact' : 'student-flow-hero-inner';
  return (
    <section className={`student-flow-hero ${className}`.trim()} aria-labelledby="student-flow-hero-title">
      <div className={innerClass}>
        <p className="student-flow-hero-eyebrow">{eyebrow}</p>
        <h1 id="student-flow-hero-title" className="student-flow-hero-title">
          {title}
        </h1>
        {lead ? <p className="student-flow-hero-lead">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
