import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Max width of main content below header */
  maxWidthClassName?: string;
  backHref?: string;
  backLabel?: string;
  /** Right side of header row (e.g. primary CTA) */
  actions?: ReactNode;
};

/**
 * Shared chrome for admin tool pages: matches Platform Overview header treatment
 * (tonal bar + back link) without duplicating markup on every route.
 */
export function AdminPageFrame({
  title,
  subtitle,
  children,
  maxWidthClassName = 'max-w-6xl',
  backHref = '/admin',
  backLabel = '← Admin',
  actions,
}: Props) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--anx-surface-bright)' }}>
      <header
        className="border-b px-4 py-4 sm:px-8 sm:py-5"
        style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}
      >
        <div className={`mx-auto flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${maxWidthClassName}`}>
          <div className="min-w-0 flex-1">
            <Link href={backHref} className="anx-section-label text-[11px] no-underline hover:opacity-80" style={{ color: 'var(--anx-text-muted)' }}>
              {backLabel}
            </Link>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--anx-text)' }}>
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--anx-text-secondary)' }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </header>

      <main className={`mx-auto w-full space-y-8 px-4 py-8 sm:px-8 ${maxWidthClassName}`}>{children}</main>
    </div>
  );
}
