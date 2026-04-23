import Link from 'next/link';
import { QuestionQaWorkbench } from '@/components/admin/QuestionQaWorkbench';
import { AdminPageFrame } from '@/components/admin/AdminPageFrame';
import type { QaItem } from '@/components/admin/QuestionQaWorkbench';

type Props = {
  subjectTitle: string;
  subjectSlug: string;
  qaItems: QaItem[];
  /** Optional intro line under the page title */
  introNote?: string;
};

function StatTile({
  label,
  value,
  valueColor = 'var(--anx-text)',
  hint,
}: {
  label: string;
  value: number | string;
  valueColor?: string;
  hint?: string;
}) {
  return (
    <div className="anx-card rounded-xl p-4">
      <p className="anx-section-label m-0 text-[10px]" style={{ color: 'var(--anx-text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight" style={{ color: valueColor }}>
        {typeof value === 'number' ? value.toLocaleString('en-GB') : value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--anx-text-muted)' }}>{hint}</p> : null}
    </div>
  );
}

export function AdminContentQaView({ subjectTitle, subjectSlug, qaItems, introNote }: Props) {
  const skillSet = Array.from(new Set(qaItems.flatMap((item) => item.skills))).sort();
  const typeSet = Array.from(new Set(qaItems.map((item) => item.type))).sort();
  const typeCounts = typeSet.map((type) => ({
    type,
    count: qaItems.filter((item) => item.type === type).length,
  }));
  const realQuestionCount = qaItems.filter((item) => !item.isPlaceholder).length;
  const placeholderCount = qaItems.filter((item) => item.isPlaceholder).length;
  const issueCount = qaItems.reduce((sum, item) => sum + item.issues.length, 0);
  const flaggedCount = qaItems.filter((item) => item.issues.length > 0).length;
  const repairOpenCount = qaItems.reduce(
    (sum, item) => sum + (item.reviewNotes?.filter((note) => note.status === 'OPEN').length ?? 0),
    0
  );

  const gridCols = 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7';

  return (
    <AdminPageFrame
      maxWidthClassName="max-w-7xl"
      title={`Question QA Lab — ${subjectTitle}`}
      subtitle="Review answer mode, stored answers, accepted answers, and grading behaviour before students see items."
      backHref={`/admin/insight/${subjectSlug}`}
      backLabel="← Insight dashboard"
      actions={(
        <Link href="/admin/content-ingestion" className="anx-btn-secondary px-4 py-2.5 text-sm no-underline">
          Content ingestion
        </Link>
      )}
    >
      {introNote ? (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
          {introNote}
        </p>
      ) : null}

      <section className={gridCols}>
        <StatTile label="Total rows" value={qaItems.length} />
        <StatTile label="Real questions" value={realQuestionCount} valueColor="var(--anx-success)" />
        <StatTile
          label="Placeholder rows"
          value={placeholderCount}
          valueColor="var(--anx-text-secondary)"
          hint={placeholderCount > 0 ? 'Hidden by default in the list' : undefined}
        />
        <StatTile label="Flagged items" value={flaggedCount} valueColor="var(--anx-danger-text)" />
        <StatTile label="Contract issues" value={issueCount} valueColor="var(--anx-warning-text)" />
        <StatTile label="Skills covered" value={skillSet.length} />
        <StatTile label="Open repair notes" value={repairOpenCount} valueColor="var(--anx-primary)" />
      </section>

      <section className="anx-callout-info text-sm leading-relaxed">
        <p className="m-0 font-semibold text-[color:var(--anx-text)]">How to use this lab</p>
        <p className="mt-1 m-0">
          Filter by answer mode or stored type, preview the student input, and check whether the stored answer can really be selected or typed.
          Future encoding rules should satisfy the same contract checks shown here.
        </p>
      </section>

      <section className="anx-card rounded-xl p-5">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>Stored type coverage</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {typeCounts.map(({ type, count }) => (
            <span
              key={type}
              className="rounded-full px-3 py-1.5 text-sm font-medium"
              style={{
                background: 'var(--anx-surface-container-low)',
                color: 'var(--anx-text-secondary)',
                border: '1px solid var(--anx-border)',
              }}
            >
              {type}: <strong style={{ color: 'var(--anx-text)' }}>{count}</strong>
            </span>
          ))}
        </div>
      </section>

      <QuestionQaWorkbench items={qaItems} availableSkills={skillSet} availableTypes={typeSet} />
    </AdminPageFrame>
  );
}
