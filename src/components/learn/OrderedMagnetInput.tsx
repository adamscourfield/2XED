'use client';

import React from 'react';

interface Props {
  choices: string[];
  value: string;
  onChange: (value: string) => void;
  emptyPrompt?: string;
  helperText?: string;
}

export function OrderedMagnetInput({ choices, value, onChange, emptyPrompt, helperText }: Props) {
  const current = value
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean);

  function toggleChoice(choice: string) {
    if (current.includes(choice)) {
      onChange(current.filter((entry) => entry !== choice).join('|'));
      return;
    }
    onChange([...current, choice].join('|'));
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-soft)] p-3 text-sm text-[var(--anx-text-muted)]">
        {current.length > 0 ? current.join(' -> ') : emptyPrompt ?? 'Choose items in order.'}
      </div>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const active = current.includes(choice);
          return (
            <button
              key={choice}
              type="button"
              onClick={() => toggleChoice(choice)}
              className={`rounded-full border px-3 py-2 text-sm ${
                active
                  ? 'border-[var(--anx-primary)] bg-[var(--anx-primary-soft)] text-[var(--anx-primary)]'
                  : 'border-[var(--anx-border)] bg-white text-[var(--anx-text)]'
              }`}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {helperText ? <p className="text-xs text-[var(--anx-text-muted)]">{helperText}</p> : null}
    </div>
  );
}
