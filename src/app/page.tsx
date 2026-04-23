import Image from 'next/image';
import Link from 'next/link';
import { StudentFlowHero } from '@/components/student/StudentFlowHero';

export default function HomePage() {
  return (
    <main className="anx-scene flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-xl space-y-6 sm:max-w-2xl">
          <StudentFlowHero
            titleId="marketing-home-title"
            eyebrow="2XED"
            title="Adaptive learning that keeps pace with every learner"
            lead="Mastery paths, diagnostics, and live lessons — with progress your students can actually read."
            variant="compact"
          >
            <div className="mt-6 flex justify-center">
              <div className="rounded-2xl bg-white/12 p-3 shadow-lg backdrop-blur-sm ring-1 ring-white/25">
                <Image src="/2xed-logo.png" alt="2XED" width={44} height={44} />
              </div>
            </div>
          </StudentFlowHero>

          <section className="anx-panel px-7 py-8 text-center sm:px-10 sm:py-9">
            <p className="mx-auto max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--anx-text-secondary)' }}>
              Built for schools that want calm, focused practice — not noisy dashboards. Sign in to open your space.
            </p>
            <div className="mx-auto mt-6 max-w-xs">
              <div className="anx-divider" />
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link href="/login" className="anx-btn-primary px-10 py-3.5 text-base">
                Sign in
              </Link>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                Teachers and students use school credentials.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
