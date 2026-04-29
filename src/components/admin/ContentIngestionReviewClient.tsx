'use client';

import { useMemo, useState } from 'react';
import type { StagedBatchEntry, StagedBatchSummary } from '@/features/content-ingestion/staging';

interface Props {
  batches: StagedBatchSummary[];
  entriesByBatch: Record<string, StagedBatchEntry[]>;
}

export function ContentIngestionReviewClient({ batches, entriesByBatch }: Props) {
  const [selectedBatch, setSelectedBatch] = useState(batches[0]?.id ?? '');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'ERROR' | 'WARNING'>('ALL');
  const [publishState, setPublishState] = useState<'idle' | 'saving' | 'done' | 'failed'>('idle');

  const currentEntries = useMemo(() => entriesByBatch[selectedBatch] ?? [], [entriesByBatch, selectedBatch]);
  const filteredEntries = useMemo(() => {
    return currentEntries.filter((entry) => {
      if (severityFilter === 'ERROR') return entry.issues.some((issue) => issue.severity === 'error');
      if (severityFilter === 'WARNING') return entry.issues.some((issue) => issue.severity === 'warning');
      return true;
    });
  }, [currentEntries, severityFilter]);

  async function publishValidItems() {
    setPublishState('saving');
    const response = await fetch('/api/admin/content-ingestion/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchFile: selectedBatch }),
    });

    setPublishState(response.ok ? 'done' : 'failed');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      <aside className="space-y-4">
        <div className="anx-card rounded-xl p-4">
          <h2 className="text-sm font-semibold text-on-surface">Staged batches</h2>
          <div className="mt-4 space-y-2">
            {batches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => setSelectedBatch(batch.id)}
                className={`block w-full rounded-lg border px-3 py-3 text-left transition-colors duration-200 ${
                  batch.id === selectedBatch ? 'border-primary bg-accentSurface' : 'border-outline-variant bg-surface-container-lowest'
                }`}
              >
                <div className="text-sm font-medium text-on-surface">{batch.batchLabel}</div>
                <div className="mt-1 text-xs text-muted">{batch.itemCount} staged items</div>
              </button>
            ))}
          </div>
        </div>

        <div className="anx-card rounded-xl p-4">
          <label className="block text-sm">
            <span className="mb-1 block text-on-surface-variant">Issue severity</span>
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as 'ALL' | 'ERROR' | 'WARNING')}
              className="w-full rounded-lg border border-outline px-3 py-2"
            >
              <option value="ALL">All</option>
              <option value="ERROR">Errors only</option>
              <option value="WARNING">Warnings only</option>
            </select>
          </label>
          <button
            onClick={() => void publishValidItems()}
            className="anx-btn-primary mt-4 w-full py-2.5 text-sm disabled:opacity-60"
            disabled={!selectedBatch || publishState === 'saving'}
          >
            {publishState === 'saving' ? 'Publishing…' : 'Publish valid items from batch'}
          </button>
          {publishState === 'done' && <p className="mt-2 text-xs text-emerald-700">Publish pass completed.</p>}
          {publishState === 'failed' && <p className="mt-2 text-xs text-red-700">Publish pass failed.</p>}
        </div>
      </aside>

      <section className="space-y-4">
        <div className="anx-card rounded-xl p-4 text-sm text-on-surface-variant">
          Showing {filteredEntries.length} of {currentEntries.length} staged items.
        </div>
        {filteredEntries.map((entry, index) => (
          <article key={`${selectedBatch}-${index}`} className="anx-card rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-container-high px-2 py-1 text-xs font-medium text-on-surface-variant">
                {entry.question.provenance.slideOrPageRef}
              </span>
              <span className="rounded-full bg-accentSurface px-2 py-1 text-xs font-medium text-primary">
                {entry.question.curriculum.objectiveId ?? 'Unmapped objective'}
              </span>
              {entry.question.adaptive.answerModeAllowed.map((mode) => (
                <span key={mode} className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  {mode}
                </span>
              ))}
            </div>
            <h3 className="text-lg font-semibold text-on-surface">{entry.question.stem}</h3>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <div className="font-medium text-on-surface-variant">Curriculum</div>
                <div className="mt-1 text-on-surface-variant">{entry.question.curriculum.subtopic}</div>
                <div className="text-muted">{entry.question.curriculum.yearBand} · {entry.question.curriculum.strand}</div>
              </div>
              <div>
                <div className="font-medium text-on-surface-variant">Marking</div>
                <div className="mt-1 text-on-surface-variant">{entry.question.marking.markingMethod}</div>
                <div className="text-muted">Answer: {entry.question.marking.correctAnswer || 'Unclear'}</div>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs font-semibold text-amber-800">Review issues</div>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {entry.issues.map((issue) => (
                  <li key={`${issue.code}-${issue.message}`}>{issue.code}: {issue.message}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
