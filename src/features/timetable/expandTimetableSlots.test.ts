import { describe, expect, it } from 'vitest';
import { expandTimetableSlots, type TimetableSlotForExpansion } from './expandTimetableSlots';

describe('expandTimetableSlots', () => {
  it('expands a weekly Monday 09:00 slot in Europe/London', () => {
    const slot: TimetableSlotForExpansion = {
      id: 's1',
      classroomId: 'c1',
      classroomName: '7a Maths',
      label: 'Period 1',
      room: 'M12',
      dayOfWeek: 0,
      minuteOfDay: 9 * 60,
      durationMinutes: 60,
      recurrence: 'WEEKLY',
      week0Anchor: null,
      nthWeekOfMonth: null,
      timezone: 'Europe/London',
    };
    const rangeStart = new Date('2026-04-01T00:00:00.000Z');
    const rangeEnd = new Date('2026-04-30T00:00:00.000Z');
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    const mondays = occ.filter((o) => o.title === 'Period 1');
    expect(mondays.length).toBeGreaterThanOrEqual(3);
    expect(mondays[0].meta).toContain('7a Maths');
    expect(mondays[0].meta).toContain('M12');
  });
});
