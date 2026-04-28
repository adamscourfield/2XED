'use client';

import type { CSSProperties } from 'react';

/**
 * Lightweight confetti burst for correct feedback. Hidden when prefers-reduced-motion.
 */
export function StudentFeedbackConfetti({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="student-feedback-confetti pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="student-feedback-confetti-piece" style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  );
}
