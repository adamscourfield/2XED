import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { LearningPageShell } from '@/components/LearningPageShell';

export default async function CurriculumPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  return (
    <LearningPageShell
      title="Curriculum"
      subtitle="Map your topics, set aims and success measures."
      appChrome="teacher"
    >
      <div className="rounded-xl border border-dashed border-[#e5e7eb] px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f3ff] text-[#5850ec]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-base font-semibold text-[#111827]">Curriculum mapper coming soon</p>
        <p className="mt-2 max-w-sm mx-auto text-sm text-[#6b7280]">
          Map topics over a term or year, set learning aims and success measures, and get AI feedback on your coverage. Build your lessons first and come back here to organise them into a curriculum plan.
        </p>
      </div>
    </LearningPageShell>
  );
}
