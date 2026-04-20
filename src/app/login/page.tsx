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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f7] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Image
              src="/2xed-logo.png"
              alt="2XED"
              width={200}
              height={50}
              className="h-10 w-auto sm:h-12"
              priority
            />
          </div>
          <p className="text-sm text-[#6b7280]">Sign in to continue learning</p>
        </div>

        <div
          className="rounded-[1.5rem] bg-white p-8 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08)]"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#374151]">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="student@example.com"
                className="w-full rounded-full border-0 bg-[#f0f1f4] px-5 py-3.5 text-sm text-[#111827] placeholder:text-[#9ca3af] outline-none ring-0 transition focus:bg-[#e8eaef] focus:ring-2 focus:ring-[#6366f1]/30"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#374151]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-full border-0 bg-[#f0f1f4] px-5 py-3.5 text-sm text-[#111827] placeholder:text-[#9ca3af] outline-none ring-0 transition focus:bg-[#e8eaef] focus:ring-2 focus:ring-[#6366f1]/30"
                required
              />
            </div>

            <div className="flex justify-end">
              <a className="text-xs font-medium text-[#6b7280] transition hover:text-[#374151]" href="#">
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
              className="w-full rounded-full bg-gradient-to-r from-[#4f46e5] via-[#6366f1] to-[#a5b4fc] py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Signing in\u2026' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#9ca3af]">
          &copy; 2026 Anaxi. All rights reserved.
        </p>
        <p className="text-center text-sm font-medium text-[#6b7280]">
          &rarr; Switch to Teacher view
        </p>
      </div>
    </main>
  );
}
