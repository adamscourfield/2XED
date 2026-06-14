interface Props {
  value: string | number;
  label: string;
  /** Colour for the value (e.g. success green for "correct"). Defaults to body text. */
  valueColor?: string;
}

/**
 * A number-over-label stat cell. Replaces the repeated
 * "rounded tile with a big tabular number and a small caption" markup in the
 * student review, dashboards, and summaries.
 */
export function StatTile({ value, label, valueColor = 'var(--anx-text)' }: Props) {
  return (
    <div className="rounded-xl bg-[var(--anx-surface-container-low)] px-3 py-4 text-center">
      <p className="m-0 text-2xl font-bold tabular-nums" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="m-0 mt-1 text-xs font-medium" style={{ color: 'var(--anx-text-muted)' }}>
        {label}
      </p>
    </div>
  );
}
