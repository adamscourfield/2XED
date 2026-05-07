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
          <stop stopColor="#E8E2FF" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#DDD6FE" stopOpacity="0.55" />
          <stop offset="1" stopColor="#D4C9FD" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="landingWaveB" x1="0" y1="200" x2="1440" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EDE9FF" stopOpacity="1" />
          <stop offset="0.5" stopColor="#DDD6FE" stopOpacity="0.45" />
          <stop offset="1" stopColor="#C4B5FD" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id="landingWaveC" x1="1440" y1="120" x2="0" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#F0ECFF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#E4DCFF" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <path
        d="M-160 260 C 120 170 380 290 720 215 C 1060 140 1320 200 1600 275 L 1600 520 L -160 520 Z"
        fill="url(#landingWaveA)"
      />
      <path
        d="M-200 320 C 100 240 360 360 720 285 C 1080 210 1280 240 1680 335 L 1680 520 L -200 520 Z"
        fill="url(#landingWaveB)"
        opacity="0.82"
      />
      <path
        d="M-120 290 C 200 210 440 340 780 265 C 1020 205 1240 230 1580 305 L 1580 520 L -120 520 Z"
        fill="url(#landingWaveC)"
        opacity="0.62"
      />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M5 20V10h4v10H5zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z" fill="currentColor" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FF] text-[#2D205F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5v14l11-7L8 5z" />
      </svg>
    </span>
  );
}

const nav = [
  { label: 'Features', href: '#landing-features' },
  { label: 'Benefits', href: '#landing-benefits' },
  { label: 'Testimonials', href: '#landing-testimonials' },
  { label: 'Pricing', href: '#landing-pricing' },
] as const;

export default function HomePage() {
  return (
    <div className="anx-landing-page font-display text-[#2D205F] antialiased">
      <div className="anx-landing-wave" aria-hidden>
        <LandingWaveArt />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-screen max-w-[1200px] flex-col px-6 pb-20 pt-8 sm:px-10 sm:pb-24 sm:pt-10 lg:px-12 lg:pb-28 lg:pt-12">
        <header className="anx-landing-header">
          <Link href="/" className="anx-landing-header__brand flex shrink-0 items-center gap-3 no-underline">
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

          <nav
            className="anx-landing-header__nav flex flex-wrap items-center justify-center gap-x-9 gap-y-2 text-[0.9375rem] font-medium tracking-tight text-[#2D205F]/68"
            aria-label="Marketing"
          >
            {nav.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="transition-colors duration-200 hover:text-[#2D205F]"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="anx-landing-header__cta flex shrink-0 justify-end">
            <Link href="/login" className="anx-landing-signin-outline">
              Sign in
            </Link>
          </div>
        </header>

        <main className="mt-14 grid flex-1 grid-cols-1 items-center gap-14 lg:mt-[4.25rem] lg:grid-cols-[minmax(0,1fr)_408px] lg:gap-x-[4.5rem] xl:grid-cols-[minmax(0,1fr)_432px] xl:gap-x-24">
          <section className="flex min-w-0 flex-col">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-[#6345ED] sm:text-xs">
              Teach the room.
            </p>

            <h1 className="mt-5 max-w-[22ch] text-[2.375rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[2.75rem] lg:mt-6 lg:text-[3.125rem] xl:text-[3.5rem]">
              <span className="text-[#2D205F]">Not the </span>
              <span className="anx-landing-gradient-text">average.</span>
            </h1>

            <p
              id="landing-benefits"
              className="scroll-mt-28 mt-6 max-w-lg text-[1.0625rem] font-medium leading-[1.65] text-[#2D205F]/72 sm:text-[1.125rem]"
            >
              Ember helps educators spark real engagement, moments that stick, and learning that lasts.
            </p>

            <div
              id="landing-pricing"
              className="scroll-mt-28 mt-9 flex flex-col gap-5 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-4"
            >
              <Link href="/login" className="anx-landing-cta anx-landing-cta--hero">
                <span>Get started free</span>
                <span aria-hidden className="anx-landing-cta-arrow">
                  →
                </span>
              </Link>
              <a
                href="#landing-features"
                className="inline-flex items-center gap-3 text-[0.9375rem] font-semibold text-[#2D205F] no-underline transition-opacity hover:opacity-75"
              >
                <PlayGlyph />
                Watch how it works
              </a>
            </div>

            <ul id="landing-features" className="scroll-mt-28 mt-14 space-y-7 sm:mt-16 lg:mt-[4.25rem]">
              <li className="flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FF] text-[#5B42F3] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <IconUsers className="h-7 w-7" />
                </div>
                <div className="min-w-0 pt-1">
                  <p className="text-[1.0625rem] font-bold leading-snug text-[#2D205F]">Engage every student</p>
                  <p className="mt-1 text-[0.9375rem] font-normal leading-relaxed text-[#2D205F]/68">
                    Interactive tools that bring every voice in.
                  </p>
                </div>
              </li>
              <li id="landing-testimonials" className="flex scroll-mt-28 gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FF] text-[#5B42F3] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <IconChart className="h-7 w-7" />
                </div>
                <div className="min-w-0 pt-1">
                  <p className="text-[1.0625rem] font-bold leading-snug text-[#2D205F]">See real progress</p>
                  <p className="mt-1 text-[0.9375rem] font-normal leading-relaxed text-[#2D205F]/68">
                    Live insights that help you adapt and improve.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FF] text-[#5B42F3] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <IconStar className="h-7 w-7" />
                </div>
                <div className="min-w-0 pt-1">
                  <p className="text-[1.0625rem] font-bold leading-snug text-[#2D205F]">Save hours weekly</p>
                  <p className="mt-1 text-[0.9375rem] font-normal leading-relaxed text-[#2D205F]/68">
                    Automate the busywork and focus on teaching.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <aside className="flex justify-center lg:justify-end">
            <div className="anx-landing-signin-card flex w-full max-w-[400px] flex-col items-center justify-center px-10 py-14 sm:px-11 sm:py-16 lg:min-h-[30rem] xl:min-h-[31.5rem]">
              <div className="flex flex-col items-center gap-4">
                <Image
                  src="/Ember_logo_icon.png"
                  alt=""
                  width={256}
                  height={256}
                  className="h-[5.25rem] w-[5.25rem]"
                  sizes="84px"
                  aria-hidden
                />
                <Image
                  src="/Ember_logo_text.png"
                  alt=""
                  width={512}
                  height={128}
                  className="anx-landing-wordmark h-9 w-auto opacity-95"
                  sizes="176px"
                  aria-hidden
                />
              </div>

              <div className="mt-8 space-y-1.5 text-center text-[0.96875rem] font-semibold leading-snug tracking-tight">
                <p className="text-[#2D205F]">Teach the room.</p>
                <p className="anx-landing-gradient-text anx-landing-gradient-text--center text-[1rem]">
                  Not the average.
                </p>
              </div>

              <div className="mt-10 w-full">
                <Link href="/login" className="anx-landing-cta anx-landing-cta--card">
                  <span>Sign in</span>
                  <span aria-hidden className="anx-landing-cta-arrow">
                    →
                  </span>
                </Link>
              </div>

              <p className="mt-8 text-center text-[0.9375rem] font-normal leading-snug text-[#2D205F]/58">
                New here?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-[#6345ED] no-underline transition-opacity hover:opacity-80"
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
