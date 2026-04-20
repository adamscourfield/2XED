'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="anx-btn-ghost px-3 py-2 text-xs sm:text-sm"
    >
      Sign out
    </button>
  );
}
