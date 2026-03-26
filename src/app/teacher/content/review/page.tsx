import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { BookletReviewClient } from '@/components/english/BookletReviewClient';
import { readFileSync } from 'fs';
import { join } from 'path';

interface StagedBlock {
  id: string;
  pageIndex: number;
  blockType: string;
  text: string;
  confidence?: number;
}

interface ParsedBooklet {
  sourceFile: string;
  parsedAt: string;
  blocks: StagedBlock[];
}

export default async function BookletReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') redirect('/dashboard');

  // Read staged blocks from tmp file
  let parsedBooklet: ParsedBooklet | null = null;
  try {
    const filePath = join(process.cwd(), 'tmp', 'parsed-booklet.json');
    const raw = readFileSync(filePath, 'utf-8');
    parsedBooklet = JSON.parse(raw) as ParsedBooklet;
  } catch {
    // File not found or invalid — show empty state
    parsedBooklet = null;
  }

  // Fetch already-accepted refs
  const acceptedRefs = await prisma.englishContentBlock.findMany({
    select: { id: true, sourceRef: true },
  });

  const alreadyAccepted = acceptedRefs
    .filter((r) => r.sourceRef !== null)
    .map((r) => ({ sourceRef: r.sourceRef as string, blockId: r.id }));

  // Fetch skills for English subject
  let skills: { id: string; code: string; name: string }[] = [];

  try {
    const englishSubject = await prisma.subject.findUnique({ where: { slug: 'english' } });

    if (englishSubject) {
      skills = await prisma.skill.findMany({
        where: { subjectId: englishSubject.id },
        select: { id: true, code: true, name: true },
        orderBy: { sortOrder: 'asc' },
      });
    }
  } catch {
    // subject query failed — fall through to fallback
  }

  if (skills.length === 0) {
    skills = await prisma.skill.findMany({
      select: { id: true, code: true, name: true },
      take: 50,
    });
  }

  if (!parsedBooklet) {
    return (
      <LearningPageShell
        title="Booklet Review"
        subtitle="Human review gate — accept or reject GPT-4o parsed blocks before publish"
      >
        <div className="anx-callout-info p-6 rounded-lg space-y-2">
          <p className="font-semibold">No staging file found.</p>
          <p style={{ color: 'var(--anx-text-muted)' }}>
            Run <code className="font-mono text-sm bg-black/10 px-1.5 py-0.5 rounded">npx ts-node scripts/parseBooklet.ts</code> to generate the staging file.
          </p>
        </div>
      </LearningPageShell>
    );
  }

  return (
    <LearningPageShell
      title="Booklet Review"
      subtitle="Human review gate — accept or reject GPT-4o parsed blocks before publish"
    >
      <BookletReviewClient
        blocks={parsedBooklet.blocks}
        skills={skills}
        alreadyAccepted={alreadyAccepted}
      />
    </LearningPageShell>
  );
}
