'use client';

import { useState, useCallback } from 'react';

interface StagedBlock {
  id: string;
  pageIndex: number;
  blockType: string;
  text: string;
  confidence?: number;
}

interface SkillOption {
  id: string;
  code: string;
  name: string;
}

interface AcceptedRef {
  sourceRef: string;
  blockId: string;
}

interface BookletReviewClientProps {
  blocks: StagedBlock[];
  skills: SkillOption[];
  alreadyAccepted: AcceptedRef[];
}

type BlockStatus = 'pending' | 'accepted' | 'rejected';

interface BlockState {
  status: BlockStatus;
  dbId?: string;
  editedType?: string;
  editedText?: string;
}

interface AcceptFormState {
  skillId: string;
  sortOrder: number;
}

const ALL_TYPES = 'ALL';

export function BookletReviewClient({ blocks, skills, alreadyAccepted }: BookletReviewClientProps) {
  const initialStates = useCallback((): Record<string, BlockState> => {
    const map: Record<string, BlockState> = {};
    for (const block of blocks) {
      const match = alreadyAccepted.find((a) => a.sourceRef === block.id);
      if (match) {
        map[block.id] = { status: 'accepted', dbId: match.blockId };
      } else {
        map[block.id] = { status: 'pending' };
      }
    }
    return map;
  }, [blocks, alreadyAccepted]);

  const [blockStates, setBlockStates] = useState<Record<string, BlockState>>(initialStates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptForms, setAcceptForms] = useState<Record<string, AcceptFormState>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);

  const uniqueTypes = Array.from(new Set(blocks.map((b) => b.blockType)));

  const filteredBlocks = typeFilter === ALL_TYPES
    ? blocks
    : blocks.filter((b) => b.blockType === typeFilter);

  const counts = {
    pending: Object.values(blockStates).filter((s) => s.status === 'pending').length,
    accepted: Object.values(blockStates).filter((s) => s.status === 'accepted').length,
    rejected: Object.values(blockStates).filter((s) => s.status === 'rejected').length,
  };

  const allResolved = counts.pending === 0;

  function getBlockText(block: StagedBlock): string {
    return blockStates[block.id]?.editedText ?? block.text;
  }

  function getBlockType(block: StagedBlock): string {
    return blockStates[block.id]?.editedType ?? block.blockType;
  }

  function handleReject(blockId: string) {
    setBlockStates((prev) => ({ ...prev, [blockId]: { ...prev[blockId], status: 'rejected' } }));
    if (editingId === blockId) setEditingId(null);
    if (acceptingId === blockId) setAcceptingId(null);
  }

  function handleEditToggle(blockId: string, block: StagedBlock) {
    if (editingId === blockId) {
      setEditingId(null);
    } else {
      setEditingId(blockId);
      setAcceptingId(null);
      setBlockStates((prev) => ({
        ...prev,
        [blockId]: {
          ...prev[blockId],
          editedType: prev[blockId]?.editedType ?? block.blockType,
          editedText: prev[blockId]?.editedText ?? block.text,
        },
      }));
    }
  }

  function handleEditChange(blockId: string, field: 'editedType' | 'editedText', value: string) {
    setBlockStates((prev) => ({ ...prev, [blockId]: { ...prev[blockId], [field]: value } }));
  }

  function handleAcceptOpen(blockId: string, sortOrder: number) {
    setAcceptingId(blockId);
    setEditingId(null);
    setAcceptForms((prev) => ({
      ...prev,
      [blockId]: prev[blockId] ?? { skillId: skills[0]?.id ?? '', sortOrder },
    }));
  }

  function handleAcceptFormChange(blockId: string, field: keyof AcceptFormState, value: string | number) {
    setAcceptForms((prev) => ({
      ...prev,
      [blockId]: { ...prev[blockId], [field]: value },
    }));
  }

  async function handleAcceptSubmit(block: StagedBlock) {
    const form = acceptForms[block.id];
    if (!form?.skillId) return;

    setSubmitting(block.id);
    setErrors((prev) => ({ ...prev, [block.id]: '' }));

    try {
      const res = await fetch('/api/teacher/content/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: form.skillId,
          blockType: getBlockType(block),
          sortOrder: form.sortOrder,
          content: getBlockText(block),
          sourceRef: block.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const { id } = await res.json();
      setBlockStates((prev) => ({
        ...prev,
        [block.id]: { ...prev[block.id], status: 'accepted', dbId: id },
      }));
      setAcceptingId(null);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [block.id]: err instanceof Error ? err.message : 'Unknown error',
      }));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleUndo(block: StagedBlock) {
    const state = blockStates[block.id];
    if (!state?.dbId) return;

    setSubmitting(block.id);
    setErrors((prev) => ({ ...prev, [block.id]: '' }));

    try {
      const res = await fetch('/api/teacher/content/review', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId: state.dbId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setBlockStates((prev) => ({
        ...prev,
        [block.id]: { status: 'pending' },
      }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [block.id]: err instanceof Error ? err.message : 'Unknown error',
      }));
    } finally {
      setSubmitting(null);
    }
  }

  function typeBadgeColor(type: string): string {
    const map: Record<string, string> = {
      TEXT: '#6366f1',
      MODEL: '#0891b2',
      QUESTION: '#d97706',
      CALLOUT: '#7c3aed',
      ANIMATION: '#059669',
      SCAFFOLD: '#db2777',
      CHECKPOINT: '#dc2626',
      IMAGE: '#64748b',
    };
    return map[type] ?? '#6b7280';
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="anx-card flex flex-wrap gap-6 p-4">
        <div className="anx-stat">
          <span className="anx-stat-value">{counts.pending}</span>
          <span className="anx-stat-label">Pending</span>
        </div>
        <div className="anx-stat">
          <span className="anx-stat-value" style={{ color: '#16a34a' }}>{counts.accepted}</span>
          <span className="anx-stat-label">Accepted</span>
        </div>
        <div className="anx-stat">
          <span className="anx-stat-value" style={{ color: '#dc2626' }}>{counts.rejected}</span>
          <span className="anx-stat-label">Rejected</span>
        </div>
        <div className="anx-stat">
          <span className="anx-stat-value">{blocks.length}</span>
          <span className="anx-stat-label">Total blocks</span>
        </div>
      </div>

      {/* All-resolved banner */}
      {allResolved && (
        <div className="anx-callout-info p-4">
          <p className="font-semibold">All blocks resolved — review complete.</p>
        </div>
      )}

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {[ALL_TYPES, ...uniqueTypes].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={typeFilter === type ? 'anx-option anx-option-selected' : 'anx-option'}
          >
            {type === ALL_TYPES ? 'All' : type}
          </button>
        ))}
      </div>

      {/* Block list */}
      <div className="space-y-4">
        {filteredBlocks.map((block, idx) => {
          const state = blockStates[block.id] ?? { status: 'pending' };
          const isEditing = editingId === block.id;
          const isAccepting = acceptingId === block.id;
          const isSubmitting = submitting === block.id;
          const form = acceptForms[block.id];
          const error = errors[block.id];

          return (
            <div
              key={block.id}
              className="anx-card space-y-3"
              style={{
                borderLeft: state.status === 'accepted'
                  ? '4px solid #16a34a'
                  : state.status === 'rejected'
                  ? '4px solid #dc2626'
                  : '4px solid var(--anx-border)',
              }}
            >
              {/* Block header */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-mono" style={{ color: 'var(--anx-text-muted)' }}>
                  p.{block.pageIndex + 1} · #{idx + 1}
                </span>
                <span
                  className="rounded px-2 py-0.5 text-xs font-bold text-white"
                  style={{ background: typeBadgeColor(getBlockType(block)) }}
                >
                  {getBlockType(block)}
                </span>
                {block.confidence !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      Confidence
                    </span>
                    <div className="anx-progress-track" style={{ width: 80 }}>
                      <div
                        className="anx-progress-bar"
                        style={{ width: `${Math.round(block.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      {Math.round(block.confidence * 100)}%
                    </span>
                  </div>
                )}
                <span className="text-xs font-mono ml-auto" style={{ color: 'var(--anx-text-muted)' }}>
                  {block.id}
                </span>
              </div>

              {/* Block text / inline editor */}
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--anx-text-muted)' }}>
                      Block type
                    </label>
                    <select
                      className="anx-input text-sm"
                      value={getBlockType(block)}
                      onChange={(e) => handleEditChange(block.id, 'editedType', e.target.value)}
                    >
                      {['TEXT', 'MODEL', 'QUESTION', 'CALLOUT', 'ANIMATION', 'SCAFFOLD', 'CHECKPOINT', 'IMAGE'].map(
                        (t) => (
                          <option key={t} value={t}>{t}</option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--anx-text-muted)' }}>
                      Content
                    </label>
                    <textarea
                      className="anx-input text-sm w-full"
                      rows={6}
                      value={getBlockText(block)}
                      onChange={(e) => handleEditChange(block.id, 'editedText', e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--anx-text)' }}>
                  {getBlockText(block)}
                </p>
              )}

              {/* Accept inline form */}
              {isAccepting && state.status !== 'accepted' && (
                <div className="anx-card space-y-3 p-3">
                  <p className="text-xs font-semibold" style={{ color: 'var(--anx-text-muted)' }}>
                    Select skill &amp; sort order
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-xs mb-1" style={{ color: 'var(--anx-text-muted)' }}>Skill</label>
                      <select
                        className="anx-input text-sm w-full"
                        value={form?.skillId ?? ''}
                        onChange={(e) => handleAcceptFormChange(block.id, 'skillId', e.target.value)}
                      >
                        {skills.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} — {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 120 }}>
                      <label className="block text-xs mb-1" style={{ color: 'var(--anx-text-muted)' }}>Sort order</label>
                      <input
                        type="number"
                        className="anx-input text-sm w-full"
                        value={form?.sortOrder ?? block.pageIndex * 100 + idx}
                        onChange={(e) => handleAcceptFormChange(block.id, 'sortOrder', parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="anx-btn-primary text-sm"
                      onClick={() => handleAcceptSubmit(block)}
                      disabled={isSubmitting || !form?.skillId}
                    >
                      {isSubmitting ? 'Saving…' : 'Confirm accept'}
                    </button>
                    <button
                      className="anx-btn-secondary text-sm"
                      onClick={() => setAcceptingId(null)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {state.status === 'accepted' ? (
                  <>
                    <span className="text-xs font-semibold px-3 py-1 rounded" style={{ background: '#dcfce7', color: '#15803d' }}>
                      Accepted
                    </span>
                    <button
                      className="anx-btn-secondary text-sm"
                      onClick={() => handleUndo(block)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Undoing…' : 'Undo'}
                    </button>
                  </>
                ) : state.status === 'rejected' ? (
                  <>
                    <span className="text-xs font-semibold px-3 py-1 rounded" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                      Rejected
                    </span>
                    <button
                      className="anx-btn-secondary text-sm"
                      onClick={() =>
                        setBlockStates((prev) => ({ ...prev, [block.id]: { ...prev[block.id], status: 'pending' } }))
                      }
                    >
                      Restore
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="anx-btn-primary text-sm"
                      onClick={() => handleAcceptOpen(block.id, block.pageIndex * 100 + idx)}
                    >
                      Accept
                    </button>
                    <button
                      className="anx-btn-secondary text-sm"
                      onClick={() => handleEditToggle(block.id, block)}
                    >
                      {isEditing ? 'Done editing' : 'Edit'}
                    </button>
                    <button
                      className="text-sm px-3 py-1 rounded"
                      style={{ background: '#fee2e2', color: '#b91c1c' }}
                      onClick={() => handleReject(block.id)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
