import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="anx-shell flex items-center">
      <div className="anx-container">
        <section className="anx-panel mx-auto max-w-3xl p-8 sm:p-12">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600/80">Anaxi Family</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Anaxi Learn</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Adaptive mastery learning with clean pacing, targeted practice, and progress that stays easy to read.
            </p>
          </div>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="anx-btn-primary px-6 py-3 text-base">
              Sign In
            </Link>
            <Link href="/dashboard" className="anx-btn-secondary px-6 py-3 text-base">
              Open Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
