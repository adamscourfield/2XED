import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="anx-landing-scene flex min-h-[100dvh] flex-col">
      <div className="anx-landing-scene__aurora" aria-hidden />
      <div className="anx-landing-scene__sparkles" aria-hidden />

      <div className="relative z-[1] flex flex-1 flex-col items-center px-5 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-14">
        <div className="flex w-full max-w-[22.5rem] flex-1 flex-col items-center text-center sm:max-w-[26rem]">
          <div className="flex flex-col items-center gap-2.5">
            <Image
              src="/Ember_logo_icon.png"
              alt=""
              width={1024}
              height={1024}
              className="h-[5.25rem] w-[5.25rem] sm:h-[6rem] sm:w-[6rem]"
              sizes="(max-width: 640px) 84px, 96px"
              aria-hidden
              priority
            />
            <Image
              src="/Ember_logo_text.png"
              alt="Ember"
              width={1024}
              height={1024}
              className="anx-landing-wordmark"
              sizes="(max-width: 640px) 248px, 280px"
              priority
            />
          </div>

          <div className="font-display mt-10 space-y-0.5 text-base font-semibold leading-snug tracking-tight sm:mt-11 sm:text-[1.0625rem]">
            <p style={{ color: 'var(--anx-landing-ink)' }}>Teach the room.</p>
            <p style={{ color: 'var(--anx-landing-tagline-2)' }}>Not the average.</p>
          </div>

          <div className="mt-auto w-full pt-14 sm:pt-16">
            <Link href="/login" className="anx-landing-cta mx-auto">
              Sign in
              <span aria-hidden className="text-[1.125rem] font-normal leading-none">
                →
              </span>
            </Link>

            <p className="mt-6 text-[0.9375rem] leading-relaxed" style={{ color: 'var(--anx-landing-ink)', opacity: 0.72 }}>
              New here?{' '}
              <Link
                href="/login"
                className="font-semibold no-underline transition-opacity hover:opacity-[0.85]"
                style={{ color: 'var(--anx-landing-link)' }}
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
