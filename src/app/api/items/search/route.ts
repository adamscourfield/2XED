import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser, STAFF_ROLES } from '@/lib/api/auth';
import type { Prisma } from '@prisma/client';

const TAKE_MAX = 50;
const TAKE_DEFAULT = 24;

export async function GET(req: NextRequest) {
  const { user, response } = await requireApiUser(STAFF_ROLES);
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  if (!subjectId) return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });

  const skillIdsParam = searchParams.get('skillIds');
  const difficulty = searchParams.get('difficulty'); // EASIER | CORE | CHALLENGE
  const search = searchParams.get('search')?.trim() ?? '';
  const take = Math.min(parseInt(searchParams.get('take') ?? String(TAKE_DEFAULT), 10), TAKE_MAX);
  const skip = Math.min(Math.max(parseInt(searchParams.get('skip') ?? '0', 10), 0), 5_000);

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
