import type { ReactNode } from 'react';
import type { FrequencyTreeNode, FrequencyTreeVisual } from '@/lib/maths/visuals/types';

function formatVal(v: number | null): string {
  if (v === null) return '—';
  return String(v);
}

function NodeBox({
  node,
  x,
  y,
  w,
  h,
}: {
  node: FrequencyTreeNode;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#f8fafc" stroke="#64748b" strokeWidth={2} />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" fill="#0f172a" style={{ fontSize: 12, fontWeight: 600 }}>
        {node.label}
      </text>
      <text x={x + w / 2} y={y + 44} textAnchor="middle" fill="#334155" style={{ fontSize: 15, fontWeight: 600 }}>
        {formatVal(node.value)}
      </text>
    </g>
  );
}

function layoutDepth(node: FrequencyTreeNode): number {
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(layoutDepth));
}

function layoutWidth(node: FrequencyTreeNode): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + layoutWidth(c), 0);
}

function renderSubtree(
  node: FrequencyTreeNode,
  x: number,
  y: number,
  availW: number,
  rowGap: number,
  nodeH: number
): ReactNode {
  const w = availW;
  if (!node.children?.length) {
    return <NodeBox node={node} x={x} y={y} w={w} h={nodeH} />;
  }

  const childWidths = node.children.map((c) => layoutWidth(c));
  const total = childWidths.reduce((a, b) => a + b, 0) || 1;
  const childY = y + nodeH + rowGap;

  let cx = x;
  const lines: ReactNode[] = [];
  const children: ReactNode[] = [];

  node.children.forEach((child, i) => {
    const cw = (childWidths[i] / total) * w;
    const mid = cx + cw / 2;
    lines.push(
      <line
        key={`ln-${i}`}
        x1={x + w / 2}
        y1={y + nodeH}
        x2={mid}
        y2={childY}
        stroke="#94a3b8"
        strokeWidth={2}
      />
    );
    children.push(<g key={`sub-${i}`}>{renderSubtree(child, cx, childY, cw, rowGap, nodeH)}</g>);
    cx += cw;
  });

  return (
    <g>
      <NodeBox node={node} x={x} y={y} w={w} h={nodeH} />
      {lines}
      {children}
    </g>
  );
}

export function FrequencyTreeRenderer({ visual }: { visual: FrequencyTreeVisual }) {
  const maxDepth = layoutDepth(visual.root);
  const width = Math.min(720, 80 + layoutWidth(visual.root) * 110);
  const nodeH = 52;
  const rowGap = 28;
  const height = 40 + maxDepth * (nodeH + rowGap);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-3xl">
      <g transform="translate(10, 16)">{renderSubtree(visual.root, 0, 0, width - 20, rowGap, nodeH)}</g>
    </svg>
  );
}
