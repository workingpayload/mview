import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import { Loader2 } from 'lucide-react'
import { MovieNode } from '@/graph/MovieNode'
import { useGraph } from '@/state/graphStore'
import { genreColor } from '@/lib/genres'
import { EmptyStateSuggestions } from '@/components/EmptyStateSuggestions'
import { EdgeLegend } from '@/components/EdgeLegend'

const nodeTypes = { movie: MovieNode }

function GraphInner() {
  const { visibleNodes, visibleEdges, expandFromNode, loading, error, centerId, setNodes, setEdges } = useGraph()
  const rf = useReactFlow()
  const lastCenterRef = useRef(null)

  useEffect(() => {
    if (!centerId || centerId === lastCenterRef.current) return
    lastCenterRef.current = centerId
    const node = visibleNodes.find((n) => n.id === centerId)
    if (!node) return
    const t = setTimeout(() => {
      rf.fitView({ padding: 0.25, duration: 600, nodes: visibleNodes })
    }, 60)
    return () => clearTimeout(t)
  }, [centerId, visibleNodes, rf])

  const onNodeClick = useCallback(
    (_, node) => {
      if (node.id === centerId) return
      expandFromNode(node.id)
    },
    [centerId, expandFromNode],
  )

  const onNodesChange = useCallback(
    (changes) => setNodes((nodes) => applyNodeChanges(changes, nodes)),
    [setNodes],
  )
  const onEdgesChange = useCallback(
    (changes) => setEdges((edges) => applyEdgeChanges(changes, edges)),
    [setEdges],
  )

  const minimapNodeColor = useCallback(
    (node) => genreColor(node.data?.genreId, 55, 70, 1),
    [],
  )

  const emptyState = useMemo(() => visibleNodes.length === 0, [visibleNodes])

  return (
    <div className="relative h-full w-full canvas-grid">
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="#1f1f24" />
        <Controls className="!shadow-lg" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.65)"
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={2}
          className="!hidden sm:!block"
        />
      </ReactFlow>
      {emptyState && <EmptyStateSuggestions />}
      {!emptyState && <EdgeLegend />}
      {loading && (
        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-md border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Fetching recommendations…
        </div>
      )}
      {error && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  )
}
