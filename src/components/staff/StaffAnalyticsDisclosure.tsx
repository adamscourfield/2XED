'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';

type Props = {
  /** Persist open/closed in localStorage so returning staff keep their preference */
  storageKey?: string;
  defaultOpen?: boolean;
  /**
   * When the URL hash matches `#${expandHashId}` (e.g. deep link to `class-analytics-<classroomId>`),
   * the panel opens on load and when the hash changes.
   */
  expandHashId?: string;
  labelShowDetails?: string;
  labelHideDetails?: string;
  summary?: ReactNode;
  children: ReactNode;
};

function hashMatches(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const want = id.startsWith('#') ? id.slice(1) : id;
  const got = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return got === want;
}

export function StaffAnalyticsDisclosure({
  storageKey,
  defaultOpen = false,
  expandHashId,
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
    if (!storageKey && !expandHashId) return;
    try {
      if (expandHashId && hashMatches(expandHashId)) {
        setOpen(true);
        return;
      }
      if (!storageKey) return;
      const v = localStorage.getItem(`staff-dash-disclosure:${storageKey}`);
      if (v === '1') setOpen(true);
      else if (v === '0') setOpen(false);
    } catch {
      /* ignore */
    }
  }, [storageKey, expandHashId]);

  useEffect(() => {
    if (!expandHashId) return;
    const id = expandHashId;
    function syncFromHash() {
      if (hashMatches(id)) setOpen(true);
    }
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [expandHashId]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(`staff-dash-disclosure:${storageKey}`, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [storageKey, open]);

  useEffect(() => {
    if (!open || !expandHashId) return;
    if (typeof window === 'undefined') return;
    if (!hashMatches(expandHashId)) return;
    const el = document.getElementById(expandHashId.startsWith('#') ? expandHashId.slice(1) : expandHashId);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [open, expandHashId]);

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
