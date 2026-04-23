import type { TimetableVisual } from './types';

function tt(
  title: string,
  columnHeaders: string[],
  rows: string[][],
  alt: string
): TimetableVisual {
  return {
    type: 'timetable',
    title,
    columnHeaders,
    rows: rows.map((cells) => ({ cells })),
    altText: alt,
    caption: title,
  };
}

/** Antrim–Ballycastle corridor (slides 180–181; TOPUP 21–23). */
export const NI_TRAIN_TIMETABLE = tt(
  'Train times (Northern Ireland example)',
  ['Service', 'Antrim', 'Ballymena', 'Randalstown', 'Ballycastle'],
  [
    ['12:30', '12:30', '12:52', '13:05', '13:35'],
    ['13:15', '13:05', '13:10', '13:15', '14:09'],
    ['14:00', '14:00', '14:18', '14:35', '15:09'],
  ],
  'Train timetable between Antrim, Ballymena, Randalstown and Ballycastle.'
);

/** Leek–Southville–Milton (slides 181–182; TOPUP 24–26). */
export const LEEK_MILTON_TIMETABLE = tt(
  'Train times (Leek–Southville–Milton)',
  ['Service', 'Leek', 'Southville', 'Milton'],
  [
    ['06:30', '—', '06:30', '08:24'],
    ['06:50', '07:15', '06:50', '—'],
    ['07:15', '07:15', '—', '08:35'],
    ['07:20', '—', '07:20', '09:05'],
    ['07:45', '—', '07:45', '09:40'],
  ],
  'Train timetable between Leek, Southville and Milton.'
);

/** London–Paris GMT (slide 182; TOPUP 27–30). */
export const LONDON_PARIS_TIMETABLE = tt(
  'Train times London–Paris (GMT)',
  ['Service', 'London', 'Paris'],
  [
    ['04:21', '04:21', '09:11'],
    ['05:19', '05:19', '08:09'],
    ['14:40', '14:40', '18:55'],
    ['15:28', '15:28', '18:18'],
  ],
  'International train timetable between London and Paris.'
);
