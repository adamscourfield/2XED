import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { escalateReteach } from '@/features/reteach/studentReteach';

const suggestionSchema = z.object({
  code: z.enum([
    'RUN_WORKED_EXAMPLE_1TO1',
    'ASSIGN_SHORT_RETRIEVAL_SET',
    'CHECK_FOUNDATION_PREREQUISITE',
    'REDUCE_SCAFFOLD_GRADUALLY',
  ]),
  label: z.string().min(1),
  detail: z.string().min(1),
});

const schema = z.object({
  subjectId: z.string().min(1),
  skillId: z.string().min(1),
  assignedPathId: z.string().min(1),
  reason: z.string().min(3),
  reasonCode: z
    .enum([
      'mastery_with_independence',
      'repeated_failed_loops',
      'attempt_budget_exhausted',
      'high_hint_dependence_without_recovery',
      'needs_more_independent_success',
      'recovering_keep_looping',
      'v1_mastery_gate_met',
      'v1_repeated_failed_loops',
      'insufficient_evidence',
    ])
    .optional(),
  interventionSuggestions: z.array(suggestionSchema).max(5).optional(),
  decisionTrace: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  await escalateReteach({ userId, ...parsed.data });

  return NextResponse.json({ ok: true });
}
