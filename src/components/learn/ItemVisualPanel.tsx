'use client';

interface Props {
  item: {
    question?: string;
    options?: unknown;
  };
  primarySkillCode?: string;
}

export function ItemVisualPanel({ item, primarySkillCode }: Props) {
  const media = item.options && typeof item.options === 'object'
    ? (item.options as { media?: unknown }).media
    : null;

  if (typeof media === 'string' && media.trim()) {
    return (
      <div className="rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-soft)] p-3 text-sm text-[var(--anx-text-muted)]">
        Visual asset: {media}
      </div>
    );
  }

  if (!primarySkillCode) return null;

  return (
    <div className="rounded-xl border border-[var(--anx-border)] bg-[var(--anx-surface-soft)] p-3 text-sm text-[var(--anx-text-muted)]">
      Skill focus: {primarySkillCode}
    </div>
  );
}
