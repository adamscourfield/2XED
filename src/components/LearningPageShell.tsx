import { ReactNode } from 'react';
import { AppChrome, type AppChromeVariant } from '@/components/AppChrome';
import type { StudentTopBarSubjectOption } from '@/components/student/StudentTopBarSubjectSelector';

interface LearningPageShellProps {
  title: string;
  subtitle?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  /** Optional full-width strip above the page header (e.g. dashboard-style hero). */
  hero?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
  /** Extra classes on the inner width-constrained wrapper (e.g. horizontal padding). */
  innerClassName?: string;
  /** Extra classes on the block that wraps {children} (e.g. full-bleed background). */
  childrenClassName?: string;
  /** Classes on a wrapper around the header and main content (e.g. page-scoped CSS variables). */
  contentWrapperClassName?: string;
  /** When set, wraps the page in the app layout with left navigation. */
  appChrome?: AppChromeVariant;
  /** Adds Leadership to the teacher nav (e.g. leadership role pages). */
  appChromeShowLeadershipNav?: boolean;
  /** Omit the default title block (for custom in-page headers). */
  hideHeader?: boolean;
  /** Student chrome: `topbar` removes the side menu (dashboard-style). */
  appChromeStudentLayout?: 'sidebar' | 'topbar';
  /** Options for the student top-bar subject switcher. */
  appChromeStudentSubjects?: StudentTopBarSubjectOption[];
}

export function LearningPageShell({
  title,
  subtitle,
  titleClassName,
  subtitleClassName,
  hero,
  meta,
  actions,
  children,
  maxWidthClassName = 'max-w-5xl',
  innerClassName,
  childrenClassName,
  contentWrapperClassName,
  appChrome,
  appChromeShowLeadershipNav = false,
  hideHeader = false,
  appChromeStudentLayout = 'sidebar',
  appChromeStudentSubjects,
}: LearningPageShellProps) {
  const main = (
    <main className="anx-shell flex-1">
      <div className={`mx-auto w-full ${maxWidthClassName} px-4 sm:px-6${innerClassName ? ` ${innerClassName}` : ''}`}>
        <div className={contentWrapperClassName ?? ''}>
          {hero ? <div className="mb-8">{hero}</div> : null}
          {hideHeader ? null : (
            <header className="mb-8 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                <h1
                  className={titleClassName ?? 'text-2xl font-bold tracking-tight sm:text-3xl'}
                  style={titleClassName ? undefined : { color: 'var(--anx-text)' }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p
                    className={subtitleClassName ?? 'text-sm sm:text-base'}
                    style={subtitleClassName ? undefined : { color: 'var(--anx-text-muted)' }}
                  >
                    {subtitle}
                  </p>
                )}
                </div>
                {actions && <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">{actions}</div>}
              </div>
              {meta && (
                <div className="anx-card p-4 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>
                  {meta}
                </div>
              )}
            </header>
          )}

          <div className={[hideHeader ? '' : 'space-y-6', childrenClassName].filter(Boolean).join(' ')}>{children}</div>
        </div>
      </div>
    </main>
  );

  if (appChrome) {
    return (
      <AppChrome
        variant={appChrome}
        showLeadershipNav={appChromeShowLeadershipNav}
        studentLayout={appChrome === 'student' ? appChromeStudentLayout : 'sidebar'}
        studentTopBarSubjects={appChrome === 'student' ? appChromeStudentSubjects : undefined}
      >
        {main}
      </AppChrome>
    );
  }

  return main;
}
