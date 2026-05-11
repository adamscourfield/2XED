'use client';

import type { ProtractorConfig } from '@/features/learn/itemContent';

interface Props {
  config: ProtractorConfig;
  value: string;
  onChange: (value: string) => void;
  demo?: boolean;
  onInteract?: () => void;
}

export function ProtractorInput({ config, value, onChange, demo = false, onInteract }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-soft)] p-3 text-sm text-[var(--anx-text-muted)]">
        {config.angleImage ? 'Use the displayed angle as your reference.' : 'Measure the angle and enter your answer.'}
        {demo ? ' Demo mode is on.' : ''}
      </div>
      <input
        type="number"
        value={value}
        onChange={(event) => {
          onInteract?.();
          onChange(event.target.value);
        }}
        className="anx-input"
        placeholder={`Target around ${config.targetAngle}°`}
      />
    </div>
  );
}
