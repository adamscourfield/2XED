import { describe, it, expect } from 'vitest';
import { expandTimetableSlots, type TimetableSlotForExpansion } from '@/features/timetable/expandTimetableSlots';

function baseSlot(overrides: Partial<TimetableSlotForExpansion> = {}): TimetableSlotForExpansion {
  return {
    id: 's1',
    classroomId: 'c1',
    classroomName: '7a Maths',
    label: 'Period 1',
    room: 'M12',
    dayOfWeek: 0, // Monday (product convention: 0 = Monday)
    minuteOfDay: 9 * 60,
    durationMinutes: 60,
    recurrence: 'WEEKLY',
    week0Anchor: null,
    nthWeekOfMonth: null,
    timezone: 'UTC',
    ...overrides,
  };
}

describe('expandTimetableSlots — BIWEEKLY', () => {
  // Mondays in [2026-01-05 .. 2026-02-02): Jan 5, Jan 12, Jan 19, Jan 26
  // Anchor = Jan 5 (week 0). Weeks 0,2 (even from anchor) → Jan 5, Jan 19
  const rangeStart = new Date('2026-01-05T00:00:00.000Z');
  const rangeEnd = new Date('2026-02-02T00:00:00.000Z');

  it('includes only even-offset weeks from anchor', () => {
    const slot = baseSlot({
      recurrence: 'BIWEEKLY',
      week0Anchor: new Date('2026-01-05T00:00:00.000Z'), // Monday week 0
    });
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ).toHaveLength(2);
    // Should be Jan 5 and Jan 19
    const days = occ.map((o) => o.startsAtUtc.toISOString().slice(0, 10));
    expect(days).toContain('2026-01-05');
    expect(days).toContain('2026-01-19');
    expect(days).not.toContain('2026-01-12');
    expect(days).not.toContain('2026-01-26');
  });

  it('skips the slot entirely when week0Anchor is null', () => {
    const slot = baseSlot({ recurrence: 'BIWEEKLY', week0Anchor: null });
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ).toHaveLength(0);
  });

  it('includes only odd-offset weeks when anchor is in an odd week relative to range', () => {
    // Anchor = Jan 12 (week 1 from Jan 5). Range starts Jan 5.
    // Jan 5 = week -1 from anchor → (-1)%2 in JS = -1 (not 0), skip
    // Jan 12 = week 0 from anchor → 0%2=0, include
    // Jan 19 = week 1 → 1%2=1, skip
    // Jan 26 = week 2 → 2%2=0, include
    const slot = baseSlot({
      recurrence: 'BIWEEKLY',
      week0Anchor: new Date('2026-01-12T00:00:00.000Z'),
    });
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    const days = occ.map((o) => o.startsAtUtc.toISOString().slice(0, 10));
    expect(days).toContain('2026-01-12');
    expect(days).toContain('2026-01-26');
    expect(days).not.toContain('2026-01-05');
    expect(days).not.toContain('2026-01-19');
  });
});

describe('expandTimetableSlots — MONTHLY_NTH', () => {
  // April 2026 Mondays: Apr 6, Apr 13, Apr 20, Apr 27
  const rangeStart = new Date('2026-04-01T00:00:00.000Z');
  const rangeEnd = new Date('2026-05-01T00:00:00.000Z');

  it('includes only the 1st Monday of the month with nthWeekOfMonth=1', () => {
    const slot = baseSlot({ recurrence: 'MONTHLY_NTH', nthWeekOfMonth: 1 });
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtUtc.toISOString().slice(0, 10)).toBe('2026-04-06');
  });

  it('includes only the 2nd Monday of the month with nthWeekOfMonth=2', () => {
    const slot = baseSlot({ recurrence: 'MONTHLY_NTH', nthWeekOfMonth: 2 });
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtUtc.toISOString().slice(0, 10)).toBe('2026-04-13');
  });

  it('uses last occurrence when nthWeekOfMonth=5 and 5th does not exist', () => {
    // April 2026 has 4 Mondays; nth=5 → last = Apr 27
    const slot = baseSlot({ recurrence: 'MONTHLY_NTH', nthWeekOfMonth: 5 });
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtUtc.toISOString().slice(0, 10)).toBe('2026-04-27');
  });

  it('uses nthWeekOfMonth=1 as default when nthWeekOfMonth is null', () => {
    const slot = baseSlot({ recurrence: 'MONTHLY_NTH', nthWeekOfMonth: null });
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    // null defaults to 1 via `?? 1`
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtUtc.toISOString().slice(0, 10)).toBe('2026-04-06');
  });
});

describe('expandTimetableSlots — edge cases', () => {
  it('caps at MAX_OCCURRENCES_PER_SLOT (120) for a long WEEKLY range', () => {
    const slot = baseSlot({ recurrence: 'WEEKLY' });
    // 3 years ≈ 156 Mondays — should cap at 120
    const rangeStart = new Date('2024-01-01T00:00:00.000Z');
    const rangeEnd = new Date('2027-01-01T00:00:00.000Z');
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ.length).toBe(120);
  });

  it('uses "Timetabled lesson" as title when label is null', () => {
    const slot = baseSlot({ label: null });
    const rangeStart = new Date('2026-01-05T00:00:00.000Z');
    const rangeEnd = new Date('2026-01-12T00:00:00.000Z');
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ[0].title).toBe('Timetabled lesson');
  });

  it('meta contains only classroom name when room is null', () => {
    const slot = baseSlot({ room: null });
    const rangeStart = new Date('2026-01-05T00:00:00.000Z');
    const rangeEnd = new Date('2026-01-12T00:00:00.000Z');
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ[0].meta).toBe('7a Maths');
    expect(occ[0].meta).not.toContain(' · ');
  });

  it('meta includes room with separator when room is set', () => {
    const slot = baseSlot({ room: 'M12' });
    const rangeStart = new Date('2026-01-05T00:00:00.000Z');
    const rangeEnd = new Date('2026-01-12T00:00:00.000Z');
    const occ = expandTimetableSlots([slot], rangeStart, rangeEnd);
    expect(occ[0].meta).toBe('7a Maths · M12');
  });

  it('returns empty array when range is empty', () => {
    const slot = baseSlot({ recurrence: 'WEEKLY' });
    const d = new Date('2026-01-05T00:00:00.000Z');
    const occ = expandTimetableSlots([slot], d, d);
    expect(occ).toHaveLength(0);
  });
});
