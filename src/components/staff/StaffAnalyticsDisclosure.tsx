'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';

type Props = {
  /** Persist open/closed in localStorage so returning teachers keep their preference */
  storageKey?: string;
  defaultOpen?: boolean;
  labelShowDetails?: string;
  labelHideDetails?: string;
  summary?: ReactNode;
  children: ReactNode;
};

export function StaffAnalyticsDisclosure({
  storageKey,
  defaultOpen = false,
  labelShowDetails = 'Show detailed analytics',
  labelHideDetails = 'Hide detailed analytics',
  summary,
  children,
}: Props) {
  const reactId = useId().replaceAll(':', '');
  const panelId = `staff-dash-panel-${reactId}`;
  const btnId = `staff-dash-btn-${reactId}`;

  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const v = localStorage.getItem(`staff-dash-disclosure:${storageKey}`);
      if (v === '1') setOpen(true);
      else if (v === '0') setOpen(false);
      // undefined v: keep defaultOpen from props
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(`staff-dash-disclosure:${storageKey}`, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [storageKey, open]);

  return (
    <>
      <div className="staff-dash-disclosure-bar">
        <button
          type="button"
          id={btnId}
          className="staff-dash-disclosure-btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={`staff-dash-disclosure-chevron${open ? ' staff-dash-disclosure-chevron--open' : ''}`} aria-hidden />
          <span>{open ? labelHideDetails : labelShowDetails}</span>
        </button>
        {summary ? <div className="staff-dash-disclosure-summary">{summary}</div> : null}
      </div>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={btnId} className="staff-dash-disclosure-panel">
          {children}
        </div>
      ) : null}
    </>
  );
}
