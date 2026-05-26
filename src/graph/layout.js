// Radial placement helpers for arranging recommendation nodes around a center.
// React Flow uses absolute pixel coordinates; we place around center with jitter
// so even repeated expansions don't pile nodes on top of each other.

const RADIUS_BASE = 460
const RADIUS_STEP = 130

export function radialLayout({ centerX, centerY, count, startIndex = 0, ringSize = 8 }) {
  const points = []
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i
    const ring = Math.floor(idx / ringSize)
    const slot = idx % ringSize
    const slotsInRing = ringSize + ring * 2 // outer rings hold more nodes
    const angle = (slot / slotsInRing) * Math.PI * 2 + ring * 0.21
    const r = RADIUS_BASE + ring * RADIUS_STEP
    const jitterR = (hash(idx) - 0.5) * 50
    const jitterA = (hash(idx * 7) - 0.5) * 0.15
    points.push({
      x: centerX + Math.cos(angle + jitterA) * (r + jitterR),
      y: centerY + Math.sin(angle + jitterA) * (r + jitterR),
    })
  }
  return points
}

// Place new recs around a non-origin center while avoiding existing node positions.
export function placeAroundNode({ existingNodes, centerNode, count }) {
  const occupied = existingNodes.map((n) => ({ x: n.position.x, y: n.position.y }))
  const placed = []
  let attempts = 0
  let ringSize = 8
  while (placed.length < count && attempts < count * 12) {
    const idx = placed.length + attempts
    const ring = Math.floor(idx / ringSize)
    const slot = idx % ringSize
    const slotsInRing = ringSize + ring * 2
    const angle = (slot / slotsInRing) * Math.PI * 2 + ring * 0.21 + hash(attempts * 13) * 0.4
    const r = RADIUS_BASE * 0.7 + ring * RADIUS_STEP
    const x = centerNode.position.x + Math.cos(angle) * r
    const y = centerNode.position.y + Math.sin(angle) * r
    if (!collides(x, y, occupied, 210)) {
      placed.push({ x, y })
      occupied.push({ x, y })
    }
    attempts++
  }
  // pad with radial fallback if avoidance failed
  while (placed.length < count) {
    const fallback = radialLayout({
      centerX: centerNode.position.x,
      centerY: centerNode.position.y,
      count: 1,
      startIndex: placed.length + 30,
    })
    placed.push(fallback[0])
  }
  return placed
}

function collides(x, y, occupied, minDist) {
  for (const p of occupied) {
    const dx = p.x - x
    const dy = p.y - y
    if (dx * dx + dy * dy < minDist * minDist) return true
  }
  return false
}

// deterministic pseudo-random in [0,1)
function hash(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
