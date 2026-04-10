'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function JoinSessionInput() {
  const [code, setCode] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) return;
    router.push(`/student/live?code=${trimmed}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        maxLength={6}
        placeholder="ABC123"
        aria-label="Session code"
        className="anx-input w-28 text-center font-mono text-base tracking-widest uppercase"
        spellCheck={false}
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={code.length !== 6}
        className="anx-btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-40"
      >
        Join →
      </button>
    </form>
  );
}
