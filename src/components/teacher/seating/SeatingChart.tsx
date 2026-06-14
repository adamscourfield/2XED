'use client';

import { laneDef } from '@/lib/live/lanes';
import type { Seat } from '@/lib/live/seatingPlan';

export interface SeatRenderInfo {
  studentUserId: string;
  name: string;
  /** Lane id when known (live view) — drives the seat colour. Null = neutral. */
  lane: string | null;
  movedRecently?: boolean;
}

interface Props {
  rows: number;
  cols: number;
  seats: Seat[];
  /** studentUserId → render info (name, lane). */
  studentInfo: Map<string, SeatRenderInfo>;
  /** Editor mode: clicking a cell calls onCellClick. */
  onCellClick?: (row: number, col: number, occupantId: string | null) => void;
  /** Highlight the cell currently being assigned. */
  selectedCell?: { row: number; col: number } | null;
}

/**
 * Renders the classroom as a grid of seats. In the live view each occupied seat
 * is coloured by the student's current lane, so the teacher can spot individuals
 * and clusters at a glance. Reused by the editor (neutral colours, clickable).
 */
export function SeatingChart({ rows, cols, seats, studentInfo, onCellClick, selectedCell }: Props) {
  const seatAt = new Map<string, Seat>();
  for (const s of seats) seatAt.set(`${s.row}:${s.col}`, s);

  return (
    // role="group" (not "grid") — a true ARIA grid needs row containers, which
    // the flat CSS-grid layout doesn't have; group + strong per-seat labels is
    // the honest, correct semantic. Each seat is a <button> so it's reachable by
    // Tab and operable with Enter/Space.
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      role="group"
      aria-label={`Seating plan, ${rows} rows by ${cols} columns`}
    >
      {Array.from({ length: rows }).flatMap((_, row) =>
        Array.from({ length: cols }).map((__, col) => {
          const seat = seatAt.get(`${row}:${col}`);
          const info = seat ? studentInfo.get(seat.studentUserId) : null;
          const lane = info?.lane ?? null;
          const def = lane ? laneDef(lane) : null;
          const isSelected = selectedCell?.row === row && selectedCell?.col === col;
          const clickable = Boolean(onCellClick);

          const positionLabel = `row ${row + 1}, column ${col + 1}`;
          const ariaLabel = info
            ? `${info.name}${def ? `, ${def.teacherLabel}` : ''}, ${positionLabel}`
            : `Empty seat, ${positionLabel}`;

          return (
            <button
              key={`${row}:${col}`}
              type="button"
              disabled={!clickable}
              onClick={() => onCellClick?.(row, col, seat?.studentUserId ?? null)}
              aria-label={ariaLabel}
              aria-pressed={clickable ? isSelected : undefined}
              className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border p-1 text-center text-xs transition ${
                clickable ? 'cursor-pointer hover:border-[var(--anx-primary)]' : ''
              } ${info?.movedRecently ? 'anx-lane-chip-moved' : ''}`}
              style={{
                borderColor: isSelected ? 'var(--anx-primary)' : def ? def.colorVar : 'var(--anx-outline-variant)',
                background: def ? def.softVar : seat ? 'var(--anx-surface-container-low)' : 'var(--anx-surface-container-lowest)',
                color: def ? def.colorVar : 'var(--anx-text-secondary)',
              }}
              title={info ? `${info.name}${def ? ` · ${def.teacherLabel}` : ''}` : 'Empty seat'}
            >
              {info ? (
                <span className="line-clamp-2 break-words font-medium leading-tight">{info.name}</span>
              ) : (
                <span aria-hidden style={{ color: 'var(--anx-text-muted)', opacity: 0.5 }}>·</span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
