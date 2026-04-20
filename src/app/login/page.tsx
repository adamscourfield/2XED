'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
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
    <main className="anx-scene flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Image
            src="/anaxi-logo.png"
            alt="Anaxi Logo"
            width={48}
            height={48}
            className="mb-0"
          />
        </div>

        <div className="anx-panel p-8 sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--anx-text-muted)' }}>
              2XED
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-[1.65rem]" style={{ color: 'var(--anx-text)' }}>
              Sign in to continue learning
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
              Enter your credentials to access 2XED.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="student@example.com"
                className="anx-input"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="anx-input"
                required
              />
            </div>

            <div className="flex justify-end">
              <a className="anx-btn-ghost text-xs" href="#">
                Forgot password?
              </a>
            </div>

            {error ? (
              <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--anx-danger)', background: 'var(--anx-danger-soft)', color: '#dc2626' }}>
                {error}
              </div>
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

        <p className="text-center text-xs text-white/70">
          &copy; 2026 Anaxi. All rights reserved.
        </p>
      </div>
    </main>
  );
}
