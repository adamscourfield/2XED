import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api/auth';
import { escalateReteach } from '@/features/reteach/studentReteach';

const suggestionSchema = z.object({
  code: z.enum(['RUN_WORKED_EXAMPLE_1TO1', 'ASSIGN_SHORT_RETRIEVAL_SET', 'CHECK_FOUNDATION_PREREQUISITE', 'REDUCE_SCAFFOLD_GRADUALLY']),
  label: z.string(),
  detail: z.string(),
});

const schema = z.object({
  subjectId: z.string().min(1),
  skillId: z.string().min(1),
  assignedPathId: z.string().min(1),
  reason: z.string().min(1).max(500),
  reasonCode: z.enum([
    'mastery_with_independence',
    'repeated_failed_loops',
    'attempt_budget_exhausted',
    'high_hint_dependence_without_recovery',
    'needs_more_independent_success',
    'recovering_keep_looping',
    'v1_mastery_gate_met',
    'v1_repeated_failed_loops',
    'insufficient_evidence',
  ]).optional(),
  interventionSuggestions: z.array(suggestionSchema).optional(),
  decisionTrace: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  await escalateReteach({ userId: user.id, ...parsed.data });
  return NextResponse.json({ ok: true });
}
