import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import Link from 'next/link';
import { listStagedBatches, readStagedBatch } from '@/features/content-ingestion/staging';
import { ContentIngestionReviewClient } from '@/components/admin/ContentIngestionReviewClient';
import { AdminPageFrame } from '@/components/admin/AdminPageFrame';

export default async function AdminContentIngestionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') redirect('/dashboard');

  const batches = listStagedBatches();
  const entriesByBatch = Object.fromEntries(batches.map((batch) => [batch.id, readStagedBatch(batch.fileName)]));

  return (
    <AdminPageFrame
      maxWidthClassName="max-w-7xl"
      title="Content ingestion review"
      subtitle="Review staged imported items, inspect mapping issues, and publish the valid subset safely."
      backHref="/admin"
      backLabel="← Admin"
      actions={(
        <Link href="/admin/content/ks3-maths" className="anx-btn-secondary px-4 py-2.5 text-sm no-underline">
          Question QA lab
        </Link>
      )}
    >
      <ContentIngestionReviewClient batches={batches} entriesByBatch={entriesByBatch} />
    </AdminPageFrame>
  );
}
