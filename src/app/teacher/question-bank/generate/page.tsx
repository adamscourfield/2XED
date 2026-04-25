import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';
import { QuestionBankGenerateClient } from '@/app/teacher/question-bank/generate/QuestionBankGenerateClient';

export default async function TeacherQuestionBankGeneratePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') redirect('/dashboard');

  return (
    <LearningPageShell
      title="Generate with AI"
      subtitle="Describe what you need and we will draft questions for your class. Saving to the bank will be available once generation is connected."
      appChrome="teacher"
      appChromeShowLeadershipNav={role === 'ADMIN' || role === 'LEADERSHIP'}
      maxWidthClassName="max-w-2xl"
      actions={
        <Link href="/teacher/question-bank" className="anx-btn-secondary text-sm no-underline">
          ← Back to question bank
        </Link>
      }
    >
      <QuestionBankGenerateClient />
    </LearningPageShell>
  );
}
