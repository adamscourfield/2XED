import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';

export default async function DashboardRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as { role?: string }).role;

  if (role === 'ADMIN') {
    redirect('/admin');
  }

  if (role === 'TEACHER' || role === 'LEADERSHIP') {
    redirect('/teacher/dashboard');
  }

  redirect('/student/live');
}
