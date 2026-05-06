import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { loadTeacherResourcesData } from '@/data/teacherResourcesCatalog';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const subjectId = req.nextUrl.searchParams.get('subjectId');
  const payload = await loadTeacherResourcesData({
    teacherUserId: user.id,
    subjectId: subjectId && subjectId.length > 0 ? subjectId : null,
  });

  return NextResponse.json(payload);
}
