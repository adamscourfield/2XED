import { describe, it, expect } from 'vitest';
import { LANES, LANE_IDS, laneDef, teacherLaneLabel, studentLaneLabel, laneReasonText } from '@/lib/live/lanes';

describe('canonical lanes', () => {
  it('defines exactly the three lanes in order', () => {
    expect(LANE_IDS).toEqual(['LANE_1', 'LANE_2', 'LANE_3']);
    for (const id of LANE_IDS) {
      expect(LANES[id].id).toBe(id);
      expect(LANES[id].teacherLabel.length).toBeGreaterThan(0);
      expect(LANES[id].studentLabel.length).toBeGreaterThan(0);
    }
  });

  it('maps tones to the expected lanes', () => {
    expect(LANES.LANE_1.tone).toBe('success');
    expect(LANES.LANE_2.tone).toBe('warning');
    expect(LANES.LANE_3.tone).toBe('danger');
  });

  it('resolves labels by lane id', () => {
    expect(teacherLaneLabel('LANE_1')).toBe('Got it');
    expect(teacherLaneLabel('LANE_3')).toBe('Needs teacher');
    expect(studentLaneLabel('LANE_1')).toBe('Ready for independent practice');
  });

  it('falls back to amber for unknown / null lanes rather than throwing', () => {
    expect(laneDef('WHAT').id).toBe('LANE_2');
    expect(laneDef(null).id).toBe('LANE_2');
    expect(laneDef(undefined).id).toBe('LANE_2');
  });

  it('maps escalation reasons to friendly text, null for none/unknown', () => {
    expect(laneReasonText('PRACTICE_REGRESSION')).toBe('Slipped during practice');
    expect(laneReasonText('MISCONCEPTION_FAILED')).toBe('Hit a known misconception');
    expect(laneReasonText('MANUAL_TEACHER')).toBe('Moved by you');
    expect(laneReasonText(null)).toBeNull();
    expect(laneReasonText('SOMETHING_ELSE')).toBeNull();
  });
});
