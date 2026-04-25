import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="anx-landing-scene flex min-h-screen flex-col items-center justify-between px-4 py-10 sm:py-14">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="anx-landing-card w-full max-w-md px-8 py-12 text-center sm:max-w-lg sm:px-10 sm:py-14">
          <div className="flex flex-col items-center gap-5 sm:gap-6">
            <Image
              src="/Ember_logo_icon.png"
              alt=""
              width={512}
              height={512}
              className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
              aria-hidden
              priority
            />
            <Image
              src="/Ember_logo_text.png"
              alt="Ember"
              width={1024}
              height={256}
              className="h-8 w-auto sm:h-9"
              priority
            />
            <div
              className="mx-auto h-px w-14 rounded-full bg-gradient-to-r from-[#4a40e0] via-[#9795ff] to-[#f74b6d] sm:w-16"
              aria-hidden
            />
            <p
              className="max-w-sm text-base font-medium leading-snug sm:text-lg"
              style={{ color: 'var(--anx-text-muted)' }}
            >
              Teach the room. Not the average.
            </p>
            <Link
              href="/login"
              className="anx-btn-primary mt-1 px-10 py-3.5 text-base no-underline sm:mt-2"
            >
              Sign in
              <span aria-hidden className="text-lg font-light leading-none">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-xs sm:text-sm" style={{ color: 'var(--anx-text-faint)' }}>
        By Anaxi · Built for teachers
      </p>
    </main>
  );
}
