'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';

type Props = {
  userName: string;
  initial: string;
};

export function StudentTopBarUserMenu({ userName, initial }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="stu-top-user-wrap" ref={ref}>
      <button
        type="button"
        className="stu-top-user-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className="stu-top-user-avatar"
          style={{
            background: 'linear-gradient(145deg, var(--anx-primary) 0%, #6366f1 55%, #8b7bff 100%)',
          }}
          aria-hidden
        >
          {initial}
        </span>
        <span className="stu-top-user-name truncate">{userName}</span>
        <span className="stu-top-user-chev" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="stu-top-user-menu" role="menu">
          <p className="stu-top-user-menu-name truncate px-3 py-2 text-sm font-semibold text-[color:var(--anx-text)]">
            {userName}
          </p>
          <button
            type="button"
            role="menuitem"
            className="stu-top-user-menu-item"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
