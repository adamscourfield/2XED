'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type TeacherClassesScopeOption = {
  value: string;
  label: string;
};

function ScopeSelectInner({ options }: { options: TeacherClassesScopeOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('scope') ?? 'all';
  const safe = options.some((o) => o.value === current) ? current : 'all';

  return (
    <div className="tc-page-scope">
      <span className="tc-page-scope-icon" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12 1v6M21 16h-6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <label className="sr-only" htmlFor="classes-scope">
        Year and subject
      </label>
      <select
        id="classes-scope"
        className="tc-page-scope-select"
        value={safe}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams.toString());
          const v = e.target.value;
          if (v === 'all') next.delete('scope');
          else next.set('scope', v);
          const q = next.toString();
          router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type Props = {
  scopeOptions: TeacherClassesScopeOption[];
};

export function TeacherClassesPageActions({ scopeOptions }: Props) {
  return (
    <div className="tc-page-actions">
      <Suspense
        fallback={
          <div className="tc-page-scope tc-page-scope--skeleton" aria-hidden>
            <span className="tc-page-scope-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12 1v6M21 16h-6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div className="tc-page-scope-skeleton-bar" />
          </div>
        }
      >
        <ScopeSelectInner options={scopeOptions} />
      </Suspense>
      <span className="td-home-bell shrink-0" title="Notifications" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2V20h16v-2l-2-2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <span className="td-home-bell-dot" />
      </span>
      <button
        type="button"
        className="anx-btn-primary text-sm opacity-60 cursor-not-allowed shrink-0"
        disabled
        title="Contact your school admin to link a new class"
      >
        + Add class
      </button>
    </div>
  );
}
