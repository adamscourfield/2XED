import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Role } from '@prisma/client';
import { authOptions } from '@/features/auth/authOptions';

export type ApiSessionUser = {
  id: string;
  role: Role;
  email?: string | null;
  name?: string | null;
};

export async function getApiSessionUser(): Promise<ApiSessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Partial<ApiSessionUser> | undefined;
  if (!user?.id) return null;
  return {
    id: user.id,
    role: user.role ?? 'STUDENT',
    email: user.email,
    name: user.name,
  };
}

export async function requireApiUser(roles?: readonly Role[]) {
  const user = await getApiSessionUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (roles && !roles.includes(user.role)) {
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, response: null };
}

export const STAFF_ROLES = ['TEACHER', 'ADMIN', 'LEADERSHIP'] as const satisfies readonly Role[];
