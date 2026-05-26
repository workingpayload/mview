import { EDGE_KIND_COLORS } from '@/graph/connectionReason'

export function buildEdge({ source, target, reason }) {
  const color = EDGE_KIND_COLORS[reason.kind] ?? EDGE_KIND_COLORS.recommended
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: 'smoothstep',
    animated: true,
    className: 'edge-animated',
    label: reason.label,
    labelStyle: { fill: 'hsl(var(--foreground))', fontWeight: 500 },
    labelBgPadding: [5, 3],
    labelBgBorderRadius: 6,
    labelBgStyle: { fill: 'hsl(var(--card))', stroke: 'hsl(var(--border))' },
    style: { stroke: color, strokeWidth: 1.4, strokeOpacity: 0.75 },
    data: { reason },
  }
}
