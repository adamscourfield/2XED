import { ReactNode } from 'react';
import { AppChrome, type AppChromeVariant } from '@/components/AppChrome';

interface LearningPageShellProps {
  title: string;
  subtitle?: ReactNode;
  /** Optional full-width strip above the page header (e.g. dashboard-style hero). */
  hero?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
  /** When set, wraps the page in the app layout with left navigation. */
  appChrome?: AppChromeVariant;
  /** Adds Leadership to the teacher nav (e.g. leadership role pages). */
  appChromeShowLeadershipNav?: boolean;
}

export function LearningPageShell({
  title,
  subtitle,
  hero,
  meta,
  actions,
  children,
  maxWidthClassName = 'max-w-5xl',
  appChrome,
  appChromeShowLeadershipNav = false,
}: LearningPageShellProps) {
  const main = (
    <main className="anx-shell flex-1">
      <div className={`mx-auto w-full ${maxWidthClassName} px-4 sm:px-6`}>
        {hero ? <div className="mb-8">{hero}</div> : null}
        <header className="mb-8 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--anx-text)' }}>{title}</h1>
              {subtitle && <p className="text-sm sm:text-base" style={{ color: 'var(--anx-text-muted)' }}>{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {meta && (
            <div className="anx-card p-4 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>
              {meta}
            </div>
          )}
        </header>

        <div className="space-y-6">{children}</div>
      </div>
    </main>
  );

  if (appChrome) {
    return (
      <AppChrome variant={appChrome} showLeadershipNav={appChromeShowLeadershipNav}>
        {main}
      </AppChrome>
    );
  }

  return main;
}
