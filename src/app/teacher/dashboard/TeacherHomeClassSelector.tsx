'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'teacher-dashboard-selected-class';

export type TeacherHomeClassOption = {
  id: string;
  name: string;
  code: string;
  studentCount: number;
  hue: string;
};

type Props = {
  classes: TeacherHomeClassOption[];
};

export function TeacherHomeClassSelector({ classes }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedId(null);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && classes.some((c) => c.id === raw)) {
        setSelectedId(raw);
        return;
      }
    } catch {
      /* ignore */
    }
    setSelectedId(classes[0].id);
  }, [classes]);

  const selected = classes.find((c) => c.id === selectedId) ?? classes[0];
  const label = selected?.name ?? 'All classes';

  function pick(id: string) {
    setSelectedId(id);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  if (classes.length === 0) {
    return (
      <div className="td-class-select td-class-select--static" title="No classes linked">
        <span className="td-class-select-cal" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
        <span className="td-class-select-label">No classes</span>
      </div>
    );
  }

  return (
    <div className="td-class-select-wrap">
      <button
        type="button"
        className="td-class-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="td-class-select-cal" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
        <span className="td-class-select-label">{label}</span>
        <span className="td-class-select-chev" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <>
          <button type="button" className="td-class-select-backdrop" aria-label="Close" onClick={() => setOpen(false)} />
          <ul className="td-class-select-menu" role="listbox">
            {classes.map((c) => (
              <li key={c.id} role="option" aria-selected={c.id === selected?.id}>
                <button type="button" className="td-class-select-option" onClick={() => pick(c.id)}>
                  <span className="td-class-select-orb" style={{ background: c.hue }} aria-hidden>
                    {c.code.slice(0, 3)}
                  </span>
                  <span className="td-class-select-option-text">
                    <span className="td-class-select-option-name">{c.name}</span>
                    <span className="td-class-select-option-sub">
                      {c.studentCount} student{c.studentCount !== 1 ? 's' : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
