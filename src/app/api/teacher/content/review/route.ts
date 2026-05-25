import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser, STAFF_ROLES } from '@/lib/api/auth';

const createSchema = z.object({
  skillId: z.string().min(1),
  blockType: z.string().min(1).max(40),
  sortOrder: z.number().int().min(0),
  content: z.string().min(1),
  sourceRef: z.string().min(1).max(200),
});

const deleteSchema = z.object({
  blockId: z.string().min(1),
});

const blockTypes = ['TEXT', 'IMAGE', 'ANIMATION', 'CALLOUT', 'QUOTATION', 'MODEL', 'SCAFFOLD', 'CHECKPOINT'] as const;

const checkpointContentSchema = z.object({
  id: z.string().optional(),
  skillCode: z.string().optional(),
  questions: z.array(z.object({
    index: z.number().int().min(0),
    stem: z.string().min(1),
    inputType: z.enum(['MCQ', 'SHORT_TEXT', 'NUMERIC', 'CANVAS', 'MIXED']),
    options: z.array(z.string()).optional(),
    rubric: z.unknown().optional(),
    acceptedAnswers: z.array(z.string()).optional(),
    points: z.number().positive(),
  })).min(1),
  presentationHint: z.enum(['sequential', 'all_visible', 'accordion']),
  submitRule: z.enum(['per_question', 'all_together']),
  instructionText: z.string().optional(),
});

function validateContent(blockType: string, content: string): { ok: true; content: string } | { ok: false; error: string } {
  if (!blockTypes.includes(blockType as (typeof blockTypes)[number])) {
    return { ok: false, error: 'Unsupported block type' };
  }

  if (blockType !== 'CHECKPOINT') return { ok: true, content };

  try {
    const raw = JSON.parse(content) as unknown;
    const parsed = checkpointContentSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: 'CHECKPOINT content must be valid question JSON' };
    return { ok: true, content: JSON.stringify(parsed.data) };
  } catch {
    return { ok: false, error: 'CHECKPOINT content must be JSON' };
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireApiUser(STAFF_ROLES);
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const content = validateContent(parsed.data.blockType, parsed.data.content);
  if (!content.ok) return NextResponse.json({ error: content.error }, { status: 400 });

  const skill = await prisma.skill.findUnique({ where: { id: parsed.data.skillId }, select: { id: true } });
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });

  const block = await prisma.englishContentBlock.create({
    data: {
      skillId: parsed.data.skillId,
      blockType: parsed.data.blockType,
      sortOrder: parsed.data.sortOrder,
      content: content.content,
      sourceRef: parsed.data.sourceRef,
      isPublished: true,
    },
    select: { id: true },
  });

  return NextResponse.json(block);
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireApiUser(STAFF_ROLES);
  if (response) return response;

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  await prisma.englishContentBlock.delete({ where: { id: parsed.data.blockId } });
  return NextResponse.json({ ok: true });
}
