import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import type { Prisma } from '@prisma/client';

const TAKE_MAX = 50;
const TAKE_DEFAULT = 24;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  if (!subjectId) return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });

  const skillIdsParam = searchParams.get('skillIds');
  const difficulty = searchParams.get('difficulty'); // EASIER | CORE | CHALLENGE
  const search = searchParams.get('search')?.trim() ?? '';
  const take = Math.min(parseInt(searchParams.get('take') ?? String(TAKE_DEFAULT), 10), TAKE_MAX);
  const skip = Math.max(parseInt(searchParams.get('skip') ?? '0', 10), 0);

  const skillIds = skillIdsParam ? skillIdsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const where: Prisma.ItemWhereInput = {
    OR: [{ subjectId }, { subjectId: null }],
  };

  if (skillIds.length > 0) {
    where.skills = { some: { skillId: { in: skillIds } } };
  }

  if (difficulty === 'EASIER' || difficulty === 'CORE' || difficulty === 'CHALLENGE') {
    where.liveMetadata = {
      path: ['difficultyBand'],
      equals: difficulty,
    };
  }

  if (search.length > 0) {
    where.question = { contains: search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        question: true,
        type: true,
        options: true,
        answer: true,
        liveMetadata: true,
        skills: {
          select: {
            skill: {
              select: { id: true, code: true, name: true, strand: true },
            },
          },
        },
      },
    }),
    prisma.item.count({ where }),
  ]);

  return NextResponse.json({ items, total, hasMore: skip + take < total });
}
