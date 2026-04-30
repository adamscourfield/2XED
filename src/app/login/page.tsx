'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const ink = '#2D236E';
const iconBox = '#EDE9FE';

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6zm0 0 8 6 8-6"
        stroke={ink}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={ink} strokeWidth="1.75" />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke={ink}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        stroke={ink}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke={ink} strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a18.45 18.45 0 0 1-2.16 3.19m-3.72 1.27a12 12 0 0 1-4.24 1.55M6.34 6.34A12 12 0 0 0 2 12s4 7 10 7a9.74 9.74 0 0 0 5.39-1.55M2 2l20 20"
        stroke={ink}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const fieldShell =
    'flex min-h-[3.25rem] items-stretch overflow-hidden rounded-2xl border border-[#D4D7E0] bg-white transition-shadow focus-within:border-[#2D236E]/30 focus-within:shadow-[0_0_0_3px_rgba(45,35,110,0.12)]';

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{ backgroundColor: '#F8F9FD', color: ink }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-[18%] top-[12%] h-[min(520px,95vw)] w-[min(520px,95vw)] rounded-full blur-3xl"
          style={{ background: 'rgba(232, 228, 245, 0.75)' }}
        />
        <div
          className="absolute -right-[12%] bottom-[-8%] h-[min(480px,90vw)] w-[min(480px,90vw)] rounded-full blur-3xl"
          style={{ background: 'rgba(221, 214, 254, 0.55)' }}
        />
        <div
          className="absolute left-[35%] top-[-20%] h-[min(380px,70vw)] w-[min(380px,70vw)] rounded-full blur-3xl"
          style={{ background: 'rgba(237, 233, 254, 0.5)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        <header className="flex flex-col items-center text-center">
          <Image
            src="/Ember_logo_icon.png"
            alt=""
            width={1024}
            height={1024}
            className="h-14 w-14 sm:h-16 sm:w-16"
            aria-hidden
            priority
          />
          <p className="mt-3 text-2xl font-bold tracking-tight sm:text-[1.65rem]" style={{ color: ink }}>
            ember
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-[2rem]">Sign in</h1>
          <div
            className="mt-3 h-1 w-14 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #2D236E 0%, #2D236E 35%, #FF7A45 100%)',
            }}
          />
        </header>

        <div className="rounded-3xl border border-white/80 bg-white p-8 shadow-[0_24px_64px_rgba(45,35,110,0.1),0_8px_24px_rgba(45,35,110,0.06)] sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold" style={{ color: ink }}>
                Email
              </label>
              <div className={fieldShell}>
                <span
                  className="flex w-12 shrink-0 items-center justify-center border-r border-[#E8EAF0]"
                  style={{ backgroundColor: iconBox }}
                >
                  <MailIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="student@example.com"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-base outline-none ring-0 placeholder:text-[#8B90A0]"
                  style={{ color: ink }}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold" style={{ color: ink }}>
                Password
              </label>
              <div className={fieldShell}>
                <span
                  className="flex w-12 shrink-0 items-center justify-center border-r border-[#E8EAF0]"
                  style={{ backgroundColor: iconBox }}
                >
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 pr-2 text-base outline-none ring-0 placeholder:text-[#8B90A0]"
                  style={{ color: ink }}
                  required
                />
                <button
                  type="button"
                  className="flex shrink-0 items-center justify-center px-3 text-[#2D236E] transition-opacity hover:opacity-70"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error ? (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_rgba(62,41,211,0.38)] transition-[filter,opacity] hover:brightness-[1.03] active:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: 'linear-gradient(90deg, #3E29D3 0%, #6D69F6 100%)',
              }}
            >
              {loading ? (
                'Signing in…'
              ) : (
                <>
                  Sign in
                  <span aria-hidden className="text-lg leading-none">
                    →
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center">
          <Link
            href="/"
            className="text-sm font-semibold no-underline transition-opacity hover:opacity-80"
            style={{ color: ink }}
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
