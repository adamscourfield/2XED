/**
 * Canonical definition of the three live-lesson lanes.
 *
 * One source of truth for what each lane is called and coloured, so the teacher
 * never sees the same lane named differently in two places. Two registers:
 *   - teacherLabel — concise, for boards and triage ("Got it")
 *   - studentLabel — gentle, for the student's own post-lesson review
 *
 * Mirrors the product model: green = ready for independent practice,
 * amber = needs a simpler alternative explanation + check, red = needs the
 * teacher now.
 */

export type LaneId = 'LANE_1' | 'LANE_2' | 'LANE_3';

export interface LaneDef {
  id: LaneId;
  /** Concise teacher-facing label for boards and triage. */
  teacherLabel: string;
  /** Gentle student-facing label for the post-lesson review. */
  studentLabel: string;
  /** One-line meaning, for tooltips and empty states. */
  description: string;
  /** Semantic tone. */
  tone: 'success' | 'warning' | 'danger';
  /** CSS var for the solid accent / text colour. */
  colorVar: string;
  /** CSS var for the soft background fill. */
  softVar: string;
}

export const LANES: Record<LaneId, LaneDef> = {
  LANE_1: {
    id: 'LANE_1',
    teacherLabel: 'Got it',
    studentLabel: 'Ready for independent practice',
    description: 'Ready to move on to independent practice.',
    tone: 'success',
    colorVar: 'var(--anx-success)',
    softVar: 'var(--anx-success-soft)',
  },
  LANE_2: {
    id: 'LANE_2',
    teacherLabel: 'Nearly there',
    studentLabel: 'Nearly there',
    description: 'Needs a simpler alternative explanation, then a quick check.',
    tone: 'warning',
    colorVar: 'var(--anx-warning-text, #b45309)',
    softVar: 'var(--anx-warning-soft, #fff8e1)',
  },
  LANE_3: {
    id: 'LANE_3',
    teacherLabel: 'Needs teacher',
    studentLabel: 'Keep working on this together',
    description: 'Needs immediate teacher support.',
    tone: 'danger',
    colorVar: 'var(--anx-danger-text, #b91c1c)',
    softVar: 'var(--anx-danger-soft, #fef2f2)',
  },
};

/** Lanes in canonical display order (most independent → needs most support). */
export const LANE_IDS: LaneId[] = ['LANE_1', 'LANE_2', 'LANE_3'];

/** Resolve a lane definition, tolerating unknown strings (falls back to amber). */
export function laneDef(lane: string | null | undefined): LaneDef {
  return LANES[lane as LaneId] ?? LANES.LANE_2;
}

export function teacherLaneLabel(lane: string | null | undefined): string {
  return laneDef(lane).teacherLabel;
}

export function studentLaneLabel(lane: string | null | undefined): string {
  return laneDef(lane).studentLabel;
}
