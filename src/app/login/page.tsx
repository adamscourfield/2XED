'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="anx-scene flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Image src="/2xed-logo.png" alt="2XED" width={48} height={48} className="mx-auto" />
          <p className="anx-section-label mt-4">Welcome back</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[1.65rem]" style={{ color: 'var(--anx-text)' }}>
            Sign in to 2XED
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
            Use the email and password from your school. You will land on your dashboard after signing in.
          </p>
        </div>

        <div className="anx-panel p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="student@example.com"
                className="anx-input w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="anx-input w-full"
                required
              />
            </div>

            <div className="flex justify-end">
              <span className="text-xs font-medium" style={{ color: 'var(--anx-text-muted)' }}>
                Forgot password? Contact your school.
              </span>
            </div>

            {error ? (
              <div className="anx-callout-danger text-sm">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="anx-btn-primary w-full py-3.5 text-base"
            >
              {loading ? 'Signing in\u2026' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--anx-text-muted)' }}>
          <Link href="/" className="font-medium no-underline hover:underline" style={{ color: 'var(--anx-primary)' }}>
            ← Back to home
          </Link>
          <span className="mx-2 text-[var(--anx-text-faint)]">·</span>
          &copy; 2026 2XED
        </p>
      </div>
    </main>
  );
}
