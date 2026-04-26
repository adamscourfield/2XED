import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="anx-landing-scene flex min-h-screen flex-col items-center justify-between px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="anx-landing-card w-full max-w-[22.5rem] px-10 pb-14 pt-12 text-center sm:max-w-[26rem] sm:px-12 sm:pb-16 sm:pt-14">
          <div className="flex flex-col items-center">
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
            <div
              className="mx-auto mt-9 h-[2px] w-11 rounded-full bg-gradient-to-r from-[#4a40e0] via-[#9795ff] to-[#f74b6d] sm:mt-10 sm:w-12"
              aria-hidden
            />
            <p
              className="mt-8 max-w-[18rem] text-[0.9375rem] font-medium leading-snug tracking-tight sm:mt-9 sm:max-w-none sm:text-base"
              style={{ color: 'var(--anx-text-muted)' }}
            >
              Teach the room. Not the average.
            </p>
            <Link
              href="/login"
              className="anx-btn-primary mt-9 px-11 py-3.5 text-[0.9375rem] font-semibold no-underline sm:mt-10 sm:px-12 sm:text-base"
            >
              Sign in
              <span aria-hidden className="text-[1.125rem] font-normal leading-none sm:text-xl">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
      <p
        className="mt-6 pb-1 text-center text-[0.6875rem] tracking-wide sm:mt-8 sm:text-xs"
        style={{ color: 'var(--anx-text-faint)' }}
      >
        By Anaxi · Built for teachers
      </p>
    </main>
  );
}
