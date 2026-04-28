'use client';

import { useRouter } from 'next/navigation';

type Props = {
  message: string;
};

/** Soft-error banner with retry (same navigation target as user-initiated refresh). */
export function StaffAnalyticsRetryBanner({ message }: Props) {
  const router = useRouter();
  return (
    <div
      className="mb-6 rounded-xl border px-4 py-3 text-sm"
      style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-warning-soft)', color: 'var(--anx-text)' }}
      role="alert"
    >
      <p className="m-0 font-medium">{message}</p>
      <button
        type="button"
        className="mt-2 text-sm font-semibold underline decoration-dotted underline-offset-2"
        style={{ color: 'var(--anx-primary)' }}
        onClick={() => router.refresh()}
      >
        Try again
      </button>
    </div>
  );
}
