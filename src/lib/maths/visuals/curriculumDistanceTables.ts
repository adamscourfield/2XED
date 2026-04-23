/** Symmetric distance charts (km) referenced by N2.14 Unit 1 question bank stems. */

export const MILTON_FIVE_TOWN_LABELS = ['Milton', 'Toddsville', 'Oldtown', 'Southville', 'Northbrook'] as const;

/** Lower-triangular row values: row i has distances to columns 0..i-1 (symmetric matrix filled from these). */
const MILTON_FIVE_TOWN_LOWER: number[][] = [
  [], // Milton
  [35], // Toddsville — Milton
  [41, 27], // Oldtown
  [28, 33, 20], // Southville
  [62, 72, 51, 39], // Northbrook
];

function symmetricFromLower(lower: number[][], n: number): number[][] {
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      const v = lower[i][j];
      m[i][j] = v;
      m[j][i] = v;
    }
  }
  return m;
}

export const MILTON_FIVE_TOWN_MATRIX_KM = symmetricFromLower(MILTON_FIVE_TOWN_LOWER, 5);

/**
 * Slide 169 (core answers): (a) B–J 25 km, (b) RI–Greenwood 62 km, (c) Grasswich–Bakerstown 46 km;
 * (e) RI–Grasswich 39 km; furthest Greenwood–Grasswich; closest Bakerstown–Red Island.
 */
const BAKERSTOWN_LOWER: number[][] = [
  [],
  [25],
  [15, 33], // Bakerstown — Red Island, Jaxonville — Red Island
  [46, 44, 39], // Grasswich row to B, J, RI
  [55, 50, 62, 82], // Greenwood row
];

export const BAKERSTOWN_FIVE_TOWN_LABELS = ['Bakerstown', 'Jaxonville', 'Red Island', 'Grasswich', 'Greenwood'] as const;

export const BAKERSTOWN_FIVE_TOWN_MATRIX_KM = symmetricFromLower(BAKERSTOWN_LOWER, 5);

export function matrixToDataTable(
  labels: readonly string[],
  km: number[][],
  title: string
): { columnHeaders: string[]; rows: { cells: string[] }[] } {
  const columnHeaders = ['', ...labels];
  const rows = labels.map((rowLabel, i) => ({
    cells: [
      rowLabel,
      ...labels.map((_, j) => {
        if (i === j) return '—';
        return String(km[i][j]);
      }),
    ],
  }));
  return { columnHeaders, rows: rows as { cells: string[] }[] };
}
