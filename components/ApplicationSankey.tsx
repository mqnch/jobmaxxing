'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'
import {
  buildSankeyData,
  nodeOrderOf,
  type SankeyApp,
  type SankeyLinkDef,
  type SankeyNodeDef,
} from '@/lib/sankey-data'

type GraphNode = SankeyNodeDef & SankeyNode<SankeyNodeDef, SankeyLinkDef>
type GraphLink = SankeyLink<SankeyNodeDef, SankeyLinkDef> & SankeyLinkDef

const NODE_COLORS: Record<SankeyNodeDef['kind'], string> = {
  applied: '#334155',
  interview: '#2563eb',
  offer: '#0f766e',
  rejected: '#dc2626',
  awaiting: '#94a3b8',
}

function linkColor(kind: SankeyNodeDef['kind']) {
  switch (kind) {
    case 'rejected':
      return 'rgba(220, 38, 38, 0.38)'
    case 'offer':
      return 'rgba(15, 118, 110, 0.42)'
    case 'awaiting':
      return 'rgba(148, 163, 184, 0.5)'
    case 'interview':
      return 'rgba(37, 99, 235, 0.38)'
    default:
      return 'rgba(100, 116, 139, 0.28)'
  }
}

function nodeIdFrom(end: GraphLink['source'] | GraphLink['target'] | string) {
  if (typeof end === 'string') return end
  if (end && typeof end === 'object' && 'id' in end) return (end as GraphNode).id
  return String(end)
}

function linkTargetId(link: { target: GraphLink['target'] | string }) {
  return nodeIdFrom(link.target)
}

function linkSourceId(link: { source: GraphLink['source'] | string }) {
  return nodeIdFrom(link.source)
}

function sortNodeLinks(nodes: GraphNode[]) {
  for (const node of nodes) {
    node.sourceLinks?.sort(
      (a, b) => nodeOrderOf(linkTargetId(a)) - nodeOrderOf(linkTargetId(b))
    )
    node.targetLinks?.sort(
      (a, b) => nodeOrderOf(linkSourceId(a)) - nodeOrderOf(linkSourceId(b))
    )
  }
}

function setNodeY(node: GraphNode, y0: number) {
  const height = (node.y1 ?? 0) - (node.y0 ?? 0)
  node.y0 = y0
  node.y1 = y0 + height
}

function outgoingBandY(node: GraphNode, targetId: string) {
  let y = node.y0 ?? 0
  for (const link of node.sourceLinks ?? []) {
    if (linkTargetId(link) === targetId) return y
    y += link.width ?? 0
  }
  return y
}

function previousStage(node: GraphNode) {
  const sources = (node.targetLinks ?? [])
    .map((link) => link.source as GraphNode)
    .filter((source) => source && (source.kind === 'applied' || source.kind === 'interview'))
    .sort((a, b) => a.order - b.order)
  return sources[0] ?? null
}

function spreadLayout(nodes: GraphNode[], yMin: number, yMax: number, dropPx: number) {
  const columns = new Map<number, GraphNode[]>()
  for (const node of nodes) {
    const key = Math.round(node.x0 ?? 0)
    const col = columns.get(key) ?? []
    col.push(node)
    columns.set(key, col)
  }

  const xs = [...columns.keys()].sort((a, b) => a - b)
  const lastX = xs[xs.length - 1]
  const available = yMax - yMin

  for (const x of xs) {
    const col = (columns.get(x) ?? []).sort((a, b) => a.order - b.order)
    const heights = col.map((n) => (n.y1 ?? 0) - (n.y0 ?? 0))
    const totalH = heights.reduce((sum, h) => sum + h, 0)
    const leftover = Math.max(0, available - totalH)

    if (col.length > 1 || (x === lastX && col[0]?.kind !== 'interview' && col[0]?.kind !== 'applied')) {
      const gap = leftover / (col.length + 1)
      let y = yMin + gap
      for (const node of col) {
        setNodeY(node, y)
        y += (node.y1 ?? 0) - (node.y0 ?? 0) + gap
      }
      continue
    }

    const node = col[0]
    const height = heights[0]
    if (node.kind === 'applied') {
      setNodeY(node, yMin)
      continue
    }

    const prev = previousStage(node)
    if (prev) {
      const aligned = outgoingBandY(prev, node.id)
      const drop = Math.min(dropPx, Math.max(Math.round(dropPx * 0.5), leftover * 0.18))
      const y = Math.min(aligned + drop, yMax - height)
      setNodeY(node, Math.max(y, yMin))
      continue
    }

    setNodeY(node, yMin + leftover / 2)
  }
}

function recomputeLinkBreadths(nodes: GraphNode[]) {
  for (const node of nodes) {
    let outY = node.y0 ?? 0
    for (const link of node.sourceLinks ?? []) {
      link.y0 = outY + (link.width ?? 0) / 2
      outY += link.width ?? 0
    }
    let inY = node.y0 ?? 0
    for (const link of node.targetLinks ?? []) {
      link.y1 = inY + (link.width ?? 0) / 2
      inY += link.width ?? 0
    }
  }
}

function shortLabel(node: GraphNode, compact: boolean) {
  const count = Math.round(node.value ?? 0)
  if (!compact) return `${node.label} (${count})`
  const names: Record<string, string> = {
    applied: 'Applied',
    interview_1: 'I1',
    interview_2: 'I2',
    interview_3: 'I3',
    interview_4: 'I4+',
    awaiting: 'Wait',
    rejected: 'Rej',
    offer: 'Offer',
  }
  return `${names[node.id] ?? node.label} (${count})`
}

export default function ApplicationSankey({ apps }: { apps: SankeyApp[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width
      if (next) setWidth(next)
    })
    observer.observe(el)
    setWidth(el.clientWidth || 800)
    return () => observer.disconnect()
  }, [])

  const { nodes: nodeDefs, links: linkDefs, total } = useMemo(
    () => buildSankeyData(apps),
    [apps]
  )

  const compact = width < 768
  const height = compact ? 280 : 640
  const dropPx = compact ? 18 : 56
  const graph = useMemo(() => {
    if (nodeDefs.length === 0 || linkDefs.length === 0) {
      return null
    }

    const top = compact ? 22 : 44
    const bottom = compact ? 12 : 28
    const left = compact ? 6 : 16
    const right = compact ? 42 : 96

    const layout = sankey<SankeyNodeDef, SankeyLinkDef>()
      .nodeId((d) => d.id)
      .nodeWidth(compact ? 8 : 18)
      .nodePadding(compact ? 24 : 72)
      .iterations(0)
      .nodeSort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .linkSort((a, b) => {
        const byTarget =
          nodeOrderOf(linkTargetId(a as GraphLink)) - nodeOrderOf(linkTargetId(b as GraphLink))
        if (byTarget !== 0) return byTarget
        return nodeOrderOf(linkSourceId(a as GraphLink)) - nodeOrderOf(linkSourceId(b as GraphLink))
      })
      .extent([
        [left, top],
        [Math.max(left + 40, width - right), height - bottom],
      ])

    try {
      const next = layout({
        nodes: nodeDefs.map((n) => ({ ...n })),
        links: linkDefs.map((l) => ({ ...l })),
      })
      const nodes = next.nodes as GraphNode[]
      sortNodeLinks(nodes)
      spreadLayout(nodes, top, height - bottom, dropPx)
      recomputeLinkBreadths(nodes)
      return next
    } catch {
      return null
    }
  }, [nodeDefs, linkDefs, width, height, compact, dropPx])

  if (total === 0) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No applications for this term</h3>
        <p className="text-slate-500 max-w-md font-medium">
          Track a few applications and set interview rounds to see the sankey diagram.
        </p>
      </div>
    )
  }

  if (!graph || graph.links.length === 0) {
    return (
      <div ref={containerRef} className="px-6 py-10">
        <p className="text-sm font-semibold text-slate-700">
          {total} applied — still waiting, so there is nothing to flow yet.
        </p>
      </div>
    )
  }

  const path = sankeyLinkHorizontal()
  const nodes = graph.nodes as GraphNode[]
  const links = [...(graph.links as GraphLink[])].sort((a, b) => {
    const byTarget = nodeOrderOf(linkTargetId(a)) - nodeOrderOf(linkTargetId(b))
    if (byTarget !== 0) return byTarget
    return nodeOrderOf(linkSourceId(a)) - nodeOrderOf(linkSourceId(b))
  })

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${Math.max(width, 1)} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block max-w-full"
      >
        {links.map((link, i) => {
          const source = link.source as GraphNode
          const target = link.target as GraphNode
          return (
            <g key={`${linkSourceId(link)}-${linkTargetId(link)}-${i}`}>
              <title>{`${source.label} → ${target.label}: ${link.value}`}</title>
              <path
                d={path(link) || undefined}
                fill="none"
                stroke={linkColor(target.kind)}
                strokeWidth={Math.max(2, link.width || 0)}
              />
            </g>
          )
        })}
        {nodes.map((node) => {
          const x0 = node.x0 ?? 0
          const x1 = node.x1 ?? 0
          const y0 = node.y0 ?? 0
          const y1 = node.y1 ?? 0
          const nodeWidth = x1 - x0
          const nodeHeight = Math.max(y1 - y0, 4)
          const isOutcome =
            node.kind === 'awaiting' || node.kind === 'rejected' || node.kind === 'offer'
          const isApplied = node.kind === 'applied'
          const labelX = isOutcome || isApplied ? x1 + (compact ? 4 : 10) : (x0 + x1) / 2
          const labelY = isOutcome || isApplied ? (y0 + y1) / 2 : y0 - (compact ? 5 : 10)
          const labelAnchor = isOutcome || isApplied ? 'start' : 'middle'
          return (
            <g key={node.id}>
              <rect
                x={x0}
                y={y0}
                width={nodeWidth}
                height={nodeHeight}
                fill={NODE_COLORS[node.kind]}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor={labelAnchor}
                dominantBaseline={isOutcome || isApplied ? 'middle' : 'auto'}
                className="fill-slate-800"
                style={{ fontSize: compact ? 9 : 13, fontWeight: 700 }}
              >
                {shortLabel(node, compact)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
