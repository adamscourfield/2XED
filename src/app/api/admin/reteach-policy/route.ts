import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { getEffectiveReteachConfig } from '@/features/reteach/reteachPolicy';
import { reteachPolicyWriteSchema } from '@/features/reteach/reteachPolicyContract';

export async function GET() {
  const { response } = await requireApiUser(['ADMIN', 'LEADERSHIP']);
  if (response) return response;

  const policy = await getEffectiveReteachConfig();
  return NextResponse.json({ policy });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['ADMIN', 'LEADERSHIP']);
  if (response) return response;

  const parsed = reteachPolicyWriteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid policy' }, { status: 400 });
  }

  const policy = {
    ...parsed.data,
    policyVersion: parsed.data.policyVersion ?? 'v1',
  };

  await prisma.event.create({
    data: {
      name: 'reteach_policy_updated',
      actorUserId: user.id,
      payload: policy as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ policy });
}

export const PATCH = POST;
