'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'student-dashboard-subject-slug';

export type StudentTopBarSubjectOption = {
  id: string;
  title: string;
  slug: string;
  href: string;
};

type Props = {
  subjects: StudentTopBarSubjectOption[];
};

export function StudentTopBarSubjectSelector({ subjects }: Props) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (subjects.length === 0) {
      setSlug(null);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && subjects.some((s) => s.slug === raw)) {
        setSlug(raw);
        return;
      }
    } catch {
      /* ignore */
    }
    setSlug(subjects[0].slug);
  }, [subjects]);

  const selected = subjects.find((s) => s.slug === slug) ?? subjects[0];
  const label = selected?.title ?? 'Subjects';

  function pick(nextSlug: string) {
    setSlug(nextSlug);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, nextSlug);
    } catch {
      /* ignore */
    }
  }

  if (subjects.length === 0) {
    return (
      <div className="stu-top-subject stu-top-subject--static" title="No subjects yet">
        <span className="truncate">{label}</span>
      </div>
    );
  }

  return (
    <div className="stu-top-subject-wrap">
      <button
        type="button"
        className="stu-top-subject"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{label}</span>
        <span className="stu-top-subject-chev" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <>
          <button type="button" className="stu-top-subject-backdrop" aria-label="Close" onClick={() => setOpen(false)} />
          <ul className="stu-top-subject-menu" role="listbox">
            {subjects.map((s) => (
              <li key={s.id} role="option" aria-selected={s.slug === selected?.slug}>
                <Link href={s.href} className="stu-top-subject-option" onClick={() => pick(s.slug)}>
                  <span className="font-semibold text-[color:var(--anx-text)]">{s.title}</span>
                  <span className="text-xs text-[color:var(--anx-text-muted)]">Open subject</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
