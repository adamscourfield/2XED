import type { ReactNode } from 'react';

export type StaffDashboardStat = {
  label: string;
  value: string;
  hint?: string;
};

type Variant = 'teacher' | 'leadership';

type Props = {
  variant: Variant;
  /** Short line above the title, e.g. "Your classes" */
  eyebrow: string;
  displayName: string;
  title: string;
  lead: string;
  stats: StaffDashboardStat[];
  heroActions?: ReactNode;
  /** Optional note below stats (e.g. methodology) */
  footnote?: ReactNode;
  children: ReactNode;
};

export function StaffDashboardShell({
  variant,
  eyebrow,
  displayName,
  title,
  lead,
  stats,
  heroActions,
  footnote,
  children,
}: Props) {
  const rootClass = variant === 'leadership' ? 'staff-dash staff-dash--leadership' : 'staff-dash staff-dash--teacher';

  return (
    <div className={rootClass}>
      <section className="staff-dash-hero">
        <div className="staff-dash-hero-grid">
          <div className="staff-dash-hero-copy">
            <p className="staff-dash-eyebrow">{eyebrow}</p>
            <h2 className="staff-dash-hero-title">{title}</h2>
            <p className="staff-dash-hero-greeting">Hi, {displayName}</p>
            <p className="staff-dash-hero-lead">{lead}</p>
            {heroActions ? <div className="staff-dash-hero-actions">{heroActions}</div> : null}
            {footnote ? <div className="staff-dash-hero-footnote">{footnote}</div> : null}
          </div>
          <div className="staff-dash-stats-rail" role="list">
            {stats.map((s) => (
              <div key={s.label} className="staff-dash-stat-card" role="listitem">
                <p className="staff-dash-stat-label">{s.label}</p>
                <p className="staff-dash-stat-value">{s.value}</p>
                {s.hint ? <p className="staff-dash-stat-hint">{s.hint}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}
