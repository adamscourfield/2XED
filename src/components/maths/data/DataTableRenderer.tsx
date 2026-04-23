import type { DataTableVisual } from '@/lib/maths/visuals/types';

export function DataTableRenderer({ visual }: { visual: DataTableVisual }) {
  const title =
    visual.title && visual.unit ? `${visual.title} (${visual.unit})` : visual.title ?? (visual.unit ? `(${visual.unit})` : null);
  return (
    <div className="w-full max-w-2xl overflow-x-auto rounded-lg border border-slate-200 bg-white">
      {title && <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">{title}</div>}
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-slate-100">
            {visual.columnHeaders.map((h, i) => (
              <th key={i} className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-800">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visual.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {row.cells.map((cell, ci) => (
                <td key={ci} className="border border-slate-200 px-2 py-1.5 font-mono text-slate-900">
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
