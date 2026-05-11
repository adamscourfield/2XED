'use client';

import type { NumberLineConfig } from '@/features/learn/itemContent';

interface Props {
  config: NumberLineConfig;
  value: string;
  onChange: (value: string) => void;
}

export function NumberLineInput({ config, value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-soft)] p-3 text-sm text-[var(--anx-text-muted)]">
        Range {config.min} to {config.max} in steps of {config.step}.
      </div>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        step={config.step}
        min={config.min}
        max={config.max}
        className="anx-input"
        placeholder={config.task === 'place' ? 'Enter the position' : 'Enter the reading'}
      />
    </div>
  );
}
