'use client';

import type { SampleSpaceGridVisual } from '@/lib/maths/visuals/types';

interface Props {
  visual: SampleSpaceGridVisual;
  maxWidth?: number;
}

export function SampleSpaceGridRenderer({ visual, maxWidth = 520 }: Props) {
  const { rowLabels, columnLabels, cells } = visual;
  const base = Math.min(maxWidth, 520);
  const labelColW = Math.max(36, Math.min(72, base * 0.14));
  const cellMin = colCount > 6 ? 44 : 52;

  return (
    <div className="overflow-x-auto" style={{ maxWidth: base }}>
      <table className="w-full border-collapse text-center text-sm">
        <thead>
          <tr>
            <th
              className="border border-slate-300 bg-slate-100 p-1 font-medium text-slate-600"
              style={{ width: labelColW }}
              scope="col"
            />
            {columnLabels.map((label, j) => (
              <th
                key={j}
                className="border border-slate-300 bg-slate-100 px-1 py-2 font-semibold text-slate-800"
                style={{ minWidth: cellMin }}
                scope="col"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((rowLabel, i) => (
            <tr key={i}>
              <th
                className="border border-slate-300 bg-slate-100 px-1 py-2 font-semibold text-slate-800"
                scope="row"
              >
                {rowLabel}
              </th>
              {(cells[i] ?? []).map((cell, j) => (
                <td
                  key={j}
                  className="border border-slate-200 bg-white px-1 py-2 font-medium text-slate-900"
                  style={{ minWidth: cellMin }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
