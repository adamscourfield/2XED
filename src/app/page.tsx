import Image from 'next/image';
import Link from 'next/link';

function LandingWaveArt() {
  return (
    <svg
      className="anx-landing-wave__svg"
      viewBox="0 0 1440 420"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="landingWaveA" x1="720" y1="120" x2="720" y2="420" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EDE9FF" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#E4DCFF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#DDD6FE" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="landingWaveB" x1="0" y1="180" x2="1440" y2="380" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0ECFF" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#DDD6FE" stopOpacity="0.35" />
          <stop offset="1" stopColor="#C4B5FD" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="landingWaveC" x1="1440" y1="140" x2="0" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="0.55" stopColor="#EDE9FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#DDD6FE" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M-120 220 C 180 140 420 260 720 200 C 1020 140 1260 180 1560 240 L 1560 460 L -120 460 Z"
        fill="url(#landingWaveA)"
      />
      <path
        d="M-160 280 C 140 210 400 320 720 250 C 1040 180 1300 200 1620 290 L 1620 460 L -160 460 Z"
        fill="url(#landingWaveB)"
        opacity="0.78"
      />
      <path
        d="M-80 240 C 220 175 460 290 760 225 C 980 175 1220 195 1540 265 L 1540 460 L -80 460 Z"
        fill="url(#landingWaveC)"
        opacity="0.55"
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

function PlayGlyph({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EDE9FF] text-[#2D205F] ${className ?? ''}`}
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
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
    <div className="anx-landing-page font-landing text-[#2D205F]">
      <div className="anx-landing-wave" aria-hidden>
        <LandingWaveArt />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-screen max-w-6xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-8 lg:px-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <Image
              src="/Ember_logo_icon.png"
              alt=""
              width={256}
              height={256}
              className="h-10 w-10 sm:h-11 sm:w-11"
              sizes="44px"
              aria-hidden
              priority
            />
            <Image
              src="/Ember_logo_text.png"
              alt="Ember"
              width={512}
              height={128}
              className="anx-landing-wordmark anx-landing-wordmark--header h-7 w-auto sm:h-8"
              sizes="128px"
              priority
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.9375rem] font-medium text-[#2D205F]/75 sm:justify-center">
            {nav.map(({ label, href }) => (
              <a key={href} href={href} className="transition-colors hover:text-[#2D205F]">
                {label}
              </a>
            ))}
          </nav>

          <div className="sm:flex sm:justify-end">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border-2 border-[#6345ED] px-5 py-2.5 text-[0.9375rem] font-semibold text-[#6345ED] no-underline transition-colors hover:bg-[#6345ED]/8"
            >
              Sign in
            </Link>
          </div>
        </header>

        <main className="mt-12 grid flex-1 gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-16 xl:gap-20">
          <section className="flex flex-col gap-8 lg:gap-10">
            <div className="space-y-4 lg:space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6345ED] sm:text-[0.8125rem]">
                Teach the room.
              </p>
              <h1 className="text-[2.125rem] font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
                <span className="text-[#2D205F]">Not the </span>
                <span className="bg-gradient-to-r from-[#6345ED] to-[#FF825C] bg-clip-text text-transparent">
                  average.
                </span>
              </h1>
              <p className="max-w-xl text-[1.0625rem] leading-relaxed text-[#2D205F]/78 sm:text-lg">
                Ember helps educators spark real engagement, moments that stick, and learning that lasts.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/login" className="anx-landing-cta anx-landing-cta--inline justify-center sm:w-auto">
                <span>Get started free</span>
                <span aria-hidden className="anx-landing-cta-arrow">
                  →
                </span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-3 rounded-full py-2 text-[0.9375rem] font-semibold text-[#2D205F] no-underline transition-opacity hover:opacity-80 sm:px-2"
              >
                <PlayGlyph />
                Watch how it works
              </a>
            </div>

            <ul id="landing-features" className="scroll-mt-28 space-y-5 pt-2 lg:pt-4">
              <li className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FF] text-[#5B42F3]">
                  <IconUsers className="h-6 w-6" />
                </div>
                <div className="min-w-0 space-y-0.5 pt-0.5">
                  <p className="font-bold text-[#2D205F]">Engage every student</p>
                  <p className="text-[0.9375rem] leading-snug text-[#2D205F]/72">
                    Interactive tools that bring every voice in.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FF] text-[#5B42F3]">
                  <IconChart className="h-6 w-6" />
                </div>
                <div className="min-w-0 space-y-0.5 pt-0.5">
                  <p className="font-bold text-[#2D205F]">See real progress</p>
                  <p className="text-[0.9375rem] leading-snug text-[#2D205F]/72">
                    Live insights that help you adapt and improve.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FF] text-[#5B42F3]">
                  <IconStar className="h-6 w-6" />
                </div>
                <div className="min-w-0 space-y-0.5 pt-0.5">
                  <p className="font-bold text-[#2D205F]">Save hours weekly</p>
                  <p className="text-[0.9375rem] leading-snug text-[#2D205F]/72">
                    Automate the busywork and focus on teaching.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <aside className="relative lg:justify-self-end">
            <div className="anx-landing-signin-card mx-auto flex w-full max-w-md flex-col items-center rounded-[2.5rem] bg-white px-8 py-12 shadow-[0_24px_64px_-12px_rgba(45,32,95,0.12),0_12px_24px_-8px_rgba(45,32,95,0.06)] sm:px-10 sm:py-14">
              <div className="flex flex-col items-center gap-3">
                <Image
                  src="/Ember_logo_icon.png"
                  alt=""
                  width={256}
                  height={256}
                  className="h-[4.5rem] w-[4.5rem]"
                  sizes="72px"
                  aria-hidden
                />
                <Image
                  src="/Ember_logo_text.png"
                  alt=""
                  width={512}
                  height={128}
                  className="anx-landing-wordmark h-8 w-auto opacity-90"
                  sizes="160px"
                  aria-hidden
                />
              </div>

              <div className="mt-7 space-y-1 text-center text-[0.95rem] font-medium leading-snug tracking-tight">
                <p className="text-[#2D205F]">Teach the room.</p>
                <p>
                  <span className="bg-gradient-to-r from-[#6345ED] to-[#FF825C] bg-clip-text text-transparent">
                    Not the average.
                  </span>
                </p>
              </div>

              <div className="mt-9 w-full">
                <Link href="/login" className="anx-landing-cta">
                  <span>Sign in</span>
                  <span aria-hidden className="anx-landing-cta-arrow">
                    →
                  </span>
                </Link>
              </div>

              <p className="mt-7 text-center text-[0.9375rem] font-normal leading-snug text-[#2D205F]/62">
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

        <div className="relative z-[1] mt-16 max-w-3xl space-y-14 text-[#2D205F]/78 lg:mt-20">
          <section id="how-it-works" className="scroll-mt-28">
            <h2 className="text-lg font-bold text-[#2D205F]">How it works</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed sm:text-base">
              Launch a live session, meet students where they are with adaptive checks, and close the loop with clear
              evidence of growth—all in one flow built for real classrooms.
            </p>
          </section>
          <section id="landing-benefits" className="scroll-mt-28">
            <h2 className="text-lg font-bold text-[#2D205F]">Benefits</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed sm:text-base">
              Fewer surprises on test day, more participation during the lesson, and a lighter weekly prep load so you
              can teach—not chase paperwork.
            </p>
          </section>
          <section id="landing-testimonials" className="scroll-mt-28">
            <h2 className="text-lg font-bold text-[#2D205F]">Testimonials</h2>
            <blockquote className="mt-3 rounded-3xl border border-[#EDE9FF] bg-white/60 px-5 py-4 text-[0.9375rem] leading-relaxed backdrop-blur-sm sm:px-6 sm:text-base">
              “Finally a tool that feels built for the room I actually teach in—quick to run, easy to read, and students
              stay with me.”
            </blockquote>
          </section>
          <section id="landing-pricing" className="scroll-mt-28 pb-4">
            <h2 className="text-lg font-bold text-[#2D205F]">Pricing</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed sm:text-base">
              Start free and scale when your team is ready. Talk to us about district-wide rollout when you need SSO,
              advanced reporting, and dedicated support.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
