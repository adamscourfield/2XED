import Image from 'next/image';
import Link from 'next/link';

function LandingBottomArt() {
  return (
    <svg
      className="anx-landing-device__art-svg"
      viewBox="0 0 390 340"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="landingGlassA" x1="195" y1="80" x2="195" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.72" />
          <stop offset="0.45" stopColor="#EDE9FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#E4DCFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="landingGlassB" x1="0" y1="120" x2="390" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8F6FF" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#DDD6FE" stopOpacity="0.22" />
          <stop offset="1" stopColor="#C4B5FD" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="landingGlassC" x1="390" y1="100" x2="0" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#E9E4FF" stopOpacity="0.2" />
          <stop offset="1" stopColor="#DDD6FE" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M-40 180 C 60 120 140 200 195 165 C 260 125 340 95 430 140 L 430 360 L -40 360 Z"
        fill="url(#landingGlassA)"
      />
      <path
        d="M-60 220 C 40 175 120 255 200 210 C 280 165 350 130 450 195 L 450 360 L -60 360 Z"
        fill="url(#landingGlassB)"
        opacity="0.85"
      />
      <path
        d="M-20 200 C 80 155 180 240 270 195 C 330 165 400 140 460 185 L 460 360 L -20 360 Z"
        fill="url(#landingGlassC)"
        opacity="0.65"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="anx-landing-page anx-app-canvas font-landing">
      <main className="anx-landing-device flex min-h-0 flex-col">
        <div className="anx-landing-device__art" aria-hidden>
          <LandingBottomArt />
        </div>
        <div className="anx-landing-device__sun" aria-hidden />
        <div className="anx-landing-device__sun-core" aria-hidden />
        <div className="anx-landing-device__sparkles" aria-hidden />

        <div className="relative z-[2] flex min-h-0 flex-col gap-8 px-7 pb-8 pt-10 sm:gap-9 sm:px-8 sm:pb-9 sm:pt-12">
          <div className="flex flex-col items-center">
            <div className="flex flex-col items-center gap-3">
              <Image
                src="/Ember_logo_icon.png"
                alt=""
                width={1024}
                height={1024}
                className="h-[5.5rem] w-[5.5rem]"
                sizes="88px"
                aria-hidden
                priority
              />
              <Image
                src="/Ember_logo_text.png"
                alt="Ember"
                width={1024}
                height={1024}
                className="anx-landing-wordmark"
                sizes="(max-width: 400px) 236px, 256px"
                priority
              />
            </div>

            <div className="mt-6 space-y-1 text-center text-[0.95rem] font-medium leading-snug tracking-tight sm:mt-7 sm:text-base">
              <p style={{ color: 'var(--anx-landing-ink)' }}>Teach the room.</p>
              <p style={{ color: 'var(--anx-landing-tagline-2)' }}>Not the average.</p>
            </div>
          </div>

          <div className="w-full pb-1">
            <Link href="/login" className="anx-landing-cta">
              <span>Sign in</span>
              <span aria-hidden className="anx-landing-cta-arrow">
                →
              </span>
            </Link>

            <p
              className="mt-5 text-center text-[0.9375rem] font-normal leading-snug"
              style={{ color: 'var(--anx-landing-muted)' }}
            >
              New here?{' '}
              <Link
                href="/login"
                className="font-semibold no-underline transition-opacity hover:opacity-80"
                style={{ color: 'var(--anx-landing-link)' }}
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
