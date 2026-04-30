'use client';

import { FormEvent, useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const ink = '#2D236E';
const iconWell = '#EDE9FE';
const borderField = '#D8DCE6';

/** Gradient flame (purple → orange → pink) when brand PNG is unavailable. */
function EmberFlameMark({ className }: { className?: string }) {
  const gid = useId();
  const gradId = `login-flame-${gid.replace(/:/g, '')}`;
  return (
    <svg
      className={className}
      viewBox="0 0 48 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="24" y1="4" x2="24" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2D236E" />
          <stop offset="40%" stopColor="#5B4DB8" />
          <stop offset="72%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M24 6C12 18 10 34 24 56 38 34 36 18 24 6z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16v10H4V7zm0 0 8 5 8-5"
        stroke={ink}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={ink} strokeWidth="1.65" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={ink} strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        stroke={ink}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke={ink} strokeWidth="1.65" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a18.45 18.45 0 0 1-2.16 3.19m-3.72 1.27a12 12 0 0 1-4.24 1.55M6.34 6.34A12 12 0 0 0 2 12s4 7 10 7a9.74 9.74 0 0 0 5.39-1.55M2 2l20 20"
        stroke={ink}
        strokeWidth="1.65"
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
  const [logoOk, setLogoOk] = useState(true);

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

  const fieldRow =
    'flex min-h-[3.5rem] items-center gap-3 rounded-2xl border bg-white px-3 py-2 transition-shadow focus-within:border-[#B8B9E5] focus-within:shadow-[0_0_0_3px_rgba(62,41,211,0.15)]';

  return (
    <main
      className="relative isolate flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden px-5 py-10 sm:px-6"
      style={{ color: ink }}
    >
      <div className="relative z-[1] w-full max-w-[420px]">
        <header className="flex flex-col items-center text-center">
          <div className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center sm:h-[4.75rem] sm:w-[4.75rem]">
            {logoOk ? (
              <Image
                src="/Ember_logo_icon.png"
                alt=""
                width={256}
                height={256}
                className="h-full w-full object-contain drop-shadow-[0_8px_20px_rgba(62,41,211,0.2)]"
                priority
                onError={() => setLogoOk(false)}
              />
            ) : (
              <EmberFlameMark className="h-full w-full drop-shadow-[0_8px_20px_rgba(62,41,211,0.22)]" />
            )}
          </div>
          <p
            className="mt-1 font-display text-[1.65rem] font-bold tracking-[-0.02em] sm:text-[1.75rem]"
            style={{ color: ink }}
          >
            ember
          </p>
          <h1 className="mt-5 text-[1.85rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.125rem]">
            Sign in
          </h1>
          <div
            className="mt-3 h-[3px] w-16 rounded-full sm:w-[4.25rem]"
            style={{
              background: 'linear-gradient(90deg, #2D236E 0%, #2D236E 28%, #FF8A4C 55%, #F472B6 100%)',
            }}
          />
        </header>

        <div
          className="mt-9 rounded-[24px] bg-white px-7 py-9 shadow-[0_20px_50px_rgba(45,35,110,0.08),0_8px_20px_rgba(45,35,110,0.05)] sm:px-9 sm:py-10"
          style={{ border: `1px solid ${borderField}` }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-[0.8125rem] font-semibold tracking-wide">
                Email
              </label>
              <div className={fieldRow} style={{ borderColor: borderField }}>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: iconWell }}
                >
                  <MailIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="student@example.com"
                  className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[0.9375rem] outline-none ring-0 placeholder:font-normal placeholder:text-[#8B919C]"
                  style={{ color: ink, caretColor: ink }}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[0.8125rem] font-semibold tracking-wide">
                Password
              </label>
              <div className={fieldRow} style={{ borderColor: borderField }}>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: iconWell }}
                >
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[0.9375rem] outline-none ring-0 placeholder:text-[#8B919C]"
                  style={{ color: ink, caretColor: ink }}
                  required
                />
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#2D236E] transition-colors hover:bg-[#F4F2FB]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error ? (
              <div
                className="rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2.5 text-sm text-red-900"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl text-[0.9375rem] font-semibold text-white shadow-[0_10px_28px_rgba(62,41,211,0.35)] transition-[filter,transform,opacity] hover:brightness-[1.04] active:translate-y-px active:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
              style={{
                background: 'linear-gradient(90deg, #3E29D3 0%, #6D69F6 100%)',
              }}
            >
              {loading ? (
                'Signing in…'
              ) : (
                <>
                  Sign in
                  <span aria-hidden className="text-[1.125rem] font-normal leading-none">
                    →
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center">
          <Link
            href="/"
            className="text-[0.9375rem] font-semibold no-underline transition-opacity hover:opacity-75"
            style={{ color: ink }}
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
