import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const flagId = formData.get('flagId') as string;
  if (!flagId) return NextResponse.json({ error: 'Missing flagId' }, { status: 400 });

  await prisma.interventionFlag.update({
    where: { id: flagId },
    data: { isResolved: true, resolvedAt: new Date() },
  });

  // Redirect back to interventions page
  return NextResponse.redirect(new URL('/admin/interventions', req.url));
}
