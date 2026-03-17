'use client';

import React, { useEffect, useState } from 'react';

interface Policy {
  policyVersion: 'v1' | 'v2';
  checkpointAccuracyTrigger: number;
  wrongFirstDifferenceTrigger: number;
  interactionPassTrigger: number;
  dleTrendTrigger: number;
  gateConsecutiveIndependentCorrect: number;
  gateIndependentRateWindow: number;
  gateIndependentRateMin: number;
  gateEscalateAfterFailedLoops: number;
}

const numericFields: Array<{ key: keyof Policy; label: string; step?: string }> = [
  { key: 'checkpointAccuracyTrigger', label: 'Checkpoint accuracy trigger', step: '0.01' },
  { key: 'wrongFirstDifferenceTrigger', label: 'Wrong first-difference trigger', step: '0.01' },
  { key: 'interactionPassTrigger', label: 'Interaction pass trigger', step: '0.01' },
  { key: 'dleTrendTrigger', label: 'DLE trend trigger', step: '0.01' },
  { key: 'gateConsecutiveIndependentCorrect', label: 'Gate consecutive independent correct', step: '1' },
  { key: 'gateIndependentRateWindow', label: 'Gate independent rate window', step: '1' },
  { key: 'gateIndependentRateMin', label: 'Gate independent rate min', step: '0.01' },
  { key: 'gateEscalateAfterFailedLoops', label: 'Escalate after failed loops', step: '1' },
];

export function AdminReteachPolicyPanel() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/reteach-policy')
      .then((r) => r.json())
      .then((data) => setPolicy(data.policy as Policy))
      .catch(() => setMessage('Could not load reteach policy.'));
  }, []);

  if (!policy) {
    return <div className="anx-card p-4 text-sm" style={{ color: 'var(--anx-text-muted)' }}>Loading Phase 9 thresholds…</div>;
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/reteach-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      if (!res.ok) throw new Error('save failed');
      setMessage('Saved. New policy is now live for routing and gate decisions.');
    } catch {
      setMessage('Could not save policy.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="anx-card p-4">
      <h2 className="text-sm font-semibold text-[color:var(--anx-text)]">Phase 9 Threshold Controls</h2>
      <p className="mt-1 text-xs text-[color:var(--anx-text-secondary)]">Tune reteach triggers and gate thresholds without redeploying.</p>
      <div className="mt-3">
        <label className="text-xs text-[color:var(--anx-text-secondary)]">
          <div className="mb-1">Policy version</div>
          <select
            className="anx-input max-w-xs"
            value={policy.policyVersion}
            onChange={(e) =>
              setPolicy((prev) =>
                prev ? { ...prev, policyVersion: e.target.value === 'v2' ? 'v2' : 'v1' } : prev,
              )
            }
          >
            <option value="v1">v1 (legacy)</option>
            <option value="v2">v2</option>
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {numericFields.map((field) => (
          <label key={String(field.key)} className="text-xs text-[color:var(--anx-text-secondary)]">
            <div className="mb-1">{field.label}</div>
            <input
              className="anx-input"
              type="number"
              step={field.step ?? '0.01'}
              value={policy[field.key] as number}
              onChange={(e) =>
                setPolicy((prev) => (prev ? { ...prev, [field.key]: Number(e.target.value) } : prev))
              }
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="anx-btn-primary text-xs"
        >
          {saving ? 'Saving…' : 'Save thresholds'}
        </button>
        {message && <p className="text-xs text-[color:var(--anx-text-secondary)]">{message}</p>}
      </div>
    </div>
  );
}
