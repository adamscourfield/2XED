import { differenceInCalendarDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export type TimetableRecurrence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY_NTH';

export type TimetableSlotForExpansion = {
  id: string;
  classroomId: string;
  classroomName: string;
  label: string | null;
  room: string | null;
  dayOfWeek: number;
  minuteOfDay: number;
  durationMinutes: number;
  recurrence: TimetableRecurrence;
  week0Anchor: Date | null;
  nthWeekOfMonth: number | null;
  timezone: string;
};

export type ExpandedTimetableOccurrence = {
  slotId: string;
  classroomId: string;
  startsAtUtc: Date;
  title: string;
  meta: string;
};

/** Monday = 0 … Sunday = 6 (product convention). */
function toJsWeekday(slotDayOfWeek: number): number {
  return (slotDayOfWeek + 1) % 7;
}

function mondayOfWeekContaining(y: number, m: number, d: number, timeZone: string): Date {
  const noon = fromZonedTime(new Date(y, m, d, 12, 0, 0), timeZone);
  const z = toZonedTime(noon, timeZone);
  const dow = z.getDay();
  const offsetFromMonday = (dow + 6) % 7;
  const mondayCal = new Date(z.getFullYear(), z.getMonth(), z.getDate() - offsetFromMonday, 12, 0, 0);
  return fromZonedTime(mondayCal, timeZone);
}

/** Calendar days (y,m,d) in `timeZone` from first day overlapping `rangeStart` through last day before `rangeEnd`. */
function calendarDaysInRange(timeZone: string, rangeStart: Date, rangeEnd: Date): Array<{ y: number; m: number; d: number }> {
  const zStart = toZonedTime(rangeStart, timeZone);
  let y = zStart.getFullYear();
  let m = zStart.getMonth();
  let d = zStart.getDate();
  const zEnd = toZonedTime(new Date(rangeEnd.getTime() - 1), timeZone);
  const endY = zEnd.getFullYear();
  const endM = zEnd.getMonth();
  const endD = zEnd.getDate();
  const out: Array<{ y: number; m: number; d: number }> = [];
  const beforeEnd = (cy: number, cm: number, cd: number) =>
    cy < endY || (cy === endY && (cm < endM || (cm === endM && cd <= endD)));
  while (beforeEnd(y, m, d)) {
    out.push({ y, m, d });
    const next = new Date(y, m, d + 1);
    y = next.getFullYear();
    m = next.getMonth();
    d = next.getDate();
  }
  return out;
}

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  nth: number,
  slotDayOfWeek: number,
  timeZone: string
): Date | null {
  const jsDow = toJsWeekday(slotDayOfWeek);
  const matches: Date[] = [];
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const localNoon = fromZonedTime(new Date(year, monthIndex, d, 12, 0, 0), timeZone);
    const z = toZonedTime(localNoon, timeZone);
    if (z.getDay() === jsDow) {
      matches.push(localNoon);
    }
  }
  if (matches.length === 0) return null;
  if (nth >= 1 && nth <= 4) return matches[nth - 1] ?? null;
  if (nth === 5) return matches[matches.length - 1] ?? null;
  return null;
}

const MAX_OCCURRENCES_PER_SLOT = 120;

/**
 * Expands recurring timetable rules into concrete UTC instants within [rangeStart, rangeEnd).
 */
export function expandTimetableSlots(
  slots: TimetableSlotForExpansion[],
  rangeStart: Date,
  rangeEnd: Date
): ExpandedTimetableOccurrence[] {
  const out: ExpandedTimetableOccurrence[] = [];

  for (const slot of slots) {
    const tz = slot.timezone || 'UTC';
    const hour = Math.floor(slot.minuteOfDay / 60);
    const minute = slot.minuteOfDay % 60;
    const jsDow = toJsWeekday(slot.dayOfWeek);

    const days = calendarDaysInRange(tz, rangeStart, rangeEnd);
    let count = 0;

    for (const { y, m, d } of days) {
      if (count >= MAX_OCCURRENCES_PER_SLOT) break;

      const localNoon = fromZonedTime(new Date(y, m, d, 12, 0, 0), tz);
      const zNoon = toZonedTime(localNoon, tz);
      if (zNoon.getDay() !== jsDow) continue;

      let include = false;
      if (slot.recurrence === 'WEEKLY') {
        include = true;
      } else if (slot.recurrence === 'BIWEEKLY') {
        if (!slot.week0Anchor) continue;
        const anchorZ = toZonedTime(slot.week0Anchor, tz);
        const anchorMonday = mondayOfWeekContaining(anchorZ.getFullYear(), anchorZ.getMonth(), anchorZ.getDate(), tz);
        const thisMonday = mondayOfWeekContaining(y, m, d, tz);
        const weeks = Math.round(differenceInCalendarDays(thisMonday, anchorMonday) / 7);
        if (weeks % 2 === 0) include = true;
      } else if (slot.recurrence === 'MONTHLY_NTH') {
        const nth = slot.nthWeekOfMonth ?? 1;
        const nthDate = nthWeekdayOfMonth(zNoon.getFullYear(), zNoon.getMonth(), nth, slot.dayOfWeek, tz);
        if (!nthDate) continue;
        const zNth = toZonedTime(nthDate, tz);
        if (
          zNth.getFullYear() === zNoon.getFullYear() &&
          zNth.getMonth() === zNoon.getMonth() &&
          zNth.getDate() === zNoon.getDate()
        ) {
          include = true;
        }
      }

      if (!include) continue;

      const startsAtUtc = fromZonedTime(new Date(y, m, d, hour, minute, 0, 0), tz);

      if (startsAtUtc < rangeStart || startsAtUtc >= rangeEnd) continue;

      const title = slot.label?.trim() || 'Timetabled lesson';
      const metaParts = [slot.classroomName];
      if (slot.room?.trim()) metaParts.push(slot.room.trim());
      out.push({
        slotId: slot.id,
        classroomId: slot.classroomId,
        startsAtUtc,
        title,
        meta: metaParts.join(' · '),
      });
      count += 1;
    }
  }

  out.sort((a, b) => a.startsAtUtc.getTime() - b.startsAtUtc.getTime());
  return out;
}
