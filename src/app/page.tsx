import Image from 'next/image';
import Link from 'next/link';

function LandingWaveArt() {
  return (
    <svg
      className="anx-landing-wave__svg"
      viewBox="0 0 1440 480"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="landingWaveA" x1="720" y1="80" x2="720" y2="480" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EBE8FF" stopOpacity="0.92" />
          <stop offset="0.45" stopColor="#E0DAFF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#D4CCFD" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="landingWaveB" x1="0" y1="200" x2="1440" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EEF0FF" stopOpacity="0.98" />
          <stop offset="0.5" stopColor="#DDD8FF" stopOpacity="0.42" />
          <stop offset="1" stopColor="#CDC4FC" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id="landingWaveC" x1="1440" y1="120" x2="0" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.88" />
          <stop offset="0.5" stopColor="#F4F3FF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#E8E4FF" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path
        d="M-160 260 C 120 170 380 290 720 215 C 1060 140 1320 200 1600 275 L 1600 520 L -160 520 Z"
        fill="url(#landingWaveA)"
      />
      <path
        d="M-200 320 C 100 240 360 360 720 285 C 1080 210 1280 240 1680 335 L 1680 520 L -200 520 Z"
        fill="url(#landingWaveB)"
        opacity="0.8"
      />
      <path
        d="M-120 290 C 200 210 440 340 780 265 C 1020 205 1240 230 1580 305 L 1580 520 L -120 520 Z"
        fill="url(#landingWaveC)"
        opacity="0.58"
      />
    </svg>
  );
}

/** Thin purple ring + filled triangle (mockup secondary CTA). */
function PlayGlyph() {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="17.25" stroke="#6345FF" strokeWidth="1.35" />
        <path d="M17 13.5 L27.5 20 L17 26.5 V13.5 Z" fill="#6345FF" />
      </svg>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="anx-landing-page font-landing antialiased">
      <div className="anx-landing-wave" aria-hidden>
        <LandingWaveArt />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-screen max-w-[1180px] flex-col px-6 pb-20 pt-8 sm:px-10 sm:pb-24 sm:pt-10 lg:px-14 lg:pb-28 lg:pt-11">
        <header className="flex flex-row items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-3 no-underline">
            <Image
              src="/Ember_logo_icon.png"
              alt=""
              width={256}
              height={256}
              className="h-11 w-11 sm:h-12 sm:w-12"
              sizes="48px"
              aria-hidden
              priority
            />
            <Image
              src="/Ember_logo_text.png"
              alt="Ember"
              width={512}
              height={128}
              className="anx-landing-wordmark anx-landing-wordmark--header h-[1.65rem] w-auto sm:h-[1.85rem]"
              sizes="140px"
              priority
            />
          </Link>

          <Link
            href="/login"
            className="shrink-0 text-[0.9375rem] font-semibold text-[#2D2D5F] no-underline transition-opacity hover:opacity-70"
          >
            Sign in
          </Link>
        </header>

        <main className="mt-16 grid flex-1 grid-cols-1 items-center gap-14 lg:mt-[4.5rem] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-14 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-x-[4.75rem]">
          <section className="flex min-w-0 flex-col">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-[#6345FF] sm:text-xs">
              Teach the room.
            </p>

            <h1 className="mt-6 max-w-[18ch] text-[2.5rem] font-bold leading-[1.06] tracking-[-0.032em] text-[#2D2D5F] sm:text-[2.875rem] lg:mt-7 lg:text-[3.25rem] xl:text-[3.5rem]">
              <span>Not the </span>
              <span className="anx-landing-gradient-text">average.</span>
            </h1>

            <p className="mt-7 max-w-[36rem] text-[1.0625rem] font-normal leading-[1.75] text-[#5C5C8A] sm:text-[1.125rem]">
              Ember helps educators spark real engagement, moments that stick, and learning that lasts.
            </p>

            <div className="mt-10 flex flex-col gap-6 sm:mt-11 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-10 sm:gap-y-4">
              <Link href="/login" className="anx-landing-cta anx-landing-cta--hero">
                <span>Get started free</span>
                <span aria-hidden className="anx-landing-cta-arrow">
                  →
                </span>
              </Link>
              <a
                href="/login"
                className="inline-flex items-center gap-3 text-[0.9375rem] font-semibold text-[#5B54A8] no-underline transition-opacity hover:opacity-75"
              >
                <PlayGlyph />
                Watch how it works
              </a>
            </div>
          </section>

          <aside className="flex justify-center lg:justify-end">
            <div className="anx-landing-signin-card flex w-full max-w-[400px] flex-col items-center justify-center px-10 py-14 sm:px-11 sm:py-[3.75rem] lg:min-h-[28rem] xl:min-h-[29.5rem]">
              <div className="flex flex-col items-center gap-4">
                <Image
                  src="/Ember_logo_icon.png"
                  alt=""
                  width={256}
                  height={256}
                  className="h-[5rem] w-[5rem]"
                  sizes="80px"
                  aria-hidden
                />
                <Image
                  src="/Ember_logo_text.png"
                  alt=""
                  width={512}
                  height={128}
                  className="anx-landing-wordmark h-[2.125rem] w-auto"
                  sizes="168px"
                  aria-hidden
                />
              </div>

              <div className="mt-9 max-w-[14rem] space-y-1 text-center text-[0.96875rem] font-semibold leading-snug tracking-tight">
                <p className="text-[#2D2D5F]">Teach the room.</p>
                <p className="text-[#8B7FD9]">Not the average.</p>
              </div>

              <div className="mt-11 w-full">
                <Link href="/login" className="anx-landing-cta anx-landing-cta--card">
                  <span>Sign in</span>
                  <span aria-hidden className="anx-landing-cta-arrow">
                    →
                  </span>
                </Link>
              </div>

              <p className="mt-9 text-center text-[0.875rem] font-normal leading-relaxed text-[#6C6C92]">
                New here?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-[#4A69FF] no-underline transition-opacity hover:opacity-80"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
