export type SankeyApp = {
  status: string
  interview_rounds?: number | null
}

export type SankeyNodeDef = {
  id: string
  label: string
  kind: 'applied' | 'interview' | 'offer' | 'rejected' | 'awaiting'
  order: number
}

export type SankeyLinkDef = {
  source: string
  target: string
  value: number
}

const INTERVIEW_IDS = ['interview_1', 'interview_2', 'interview_3', 'interview_4'] as const
const INTERVIEW_LABELS = ['Interview 1', 'Interview 2', 'Interview 3', 'Interview 4+']

export const NODE_ORDER: Record<string, number> = {
  awaiting: 0,
  rejected: 1,
  offer: 2,
  applied: 3,
  interview_1: 4,
  interview_2: 5,
  interview_3: 6,
  interview_4: 7,
}

function interviewId(round: number) {
  return INTERVIEW_IDS[Math.min(4, Math.max(1, round)) - 1]
}

export function buildSankeyData(apps: SankeyApp[]) {
  const included = apps.filter((app) => app.status && app.status !== 'not_applied')

  const nodeCounts: Record<string, number> = {
    applied: 0,
    interview_1: 0,
    interview_2: 0,
    interview_3: 0,
    interview_4: 0,
    offer: 0,
    rejected: 0,
    awaiting: 0,
  }
  const linkCounts = new Map<string, number>()

  function addLink(source: string, target: string) {
    const key = `${source}|${target}`
    linkCounts.set(key, (linkCounts.get(key) || 0) + 1)
  }

  for (const app of included) {
    const rounds = Math.min(4, Math.max(0, Math.round(app.interview_rounds ?? 0)))
    nodeCounts.applied += 1

    const path = ['applied']
    for (let r = 1; r <= rounds; r++) {
      path.push(interviewId(r))
      nodeCounts[interviewId(r)] += 1
    }

    if (app.status === 'offer') {
      path.push('offer')
      nodeCounts.offer += 1
    } else if (app.status === 'rejected') {
      path.push('rejected')
      nodeCounts.rejected += 1
    } else {
      path.push('awaiting')
      nodeCounts.awaiting += 1
    }

    for (let i = 0; i < path.length - 1; i++) {
      addLink(path[i], path[i + 1])
    }
  }

  const nodeMeta: Record<string, { label: string; kind: SankeyNodeDef['kind'] }> = {
    applied: { label: 'Applied', kind: 'applied' },
    interview_1: { label: INTERVIEW_LABELS[0], kind: 'interview' },
    interview_2: { label: INTERVIEW_LABELS[1], kind: 'interview' },
    interview_3: { label: INTERVIEW_LABELS[2], kind: 'interview' },
    interview_4: { label: INTERVIEW_LABELS[3], kind: 'interview' },
    offer: { label: 'Offer', kind: 'offer' },
    rejected: { label: 'Rejected', kind: 'rejected' },
    awaiting: { label: 'Awaiting', kind: 'awaiting' },
  }

  const nodes: SankeyNodeDef[] = Object.entries(nodeCounts)
    .filter(([, count]) => count > 0)
    .map(([id]) => ({
      id,
      label: nodeMeta[id].label,
      kind: nodeMeta[id].kind,
      order: NODE_ORDER[id] ?? 99,
    }))

  const nodeIds = new Set(nodes.map((n) => n.id))
  const links: SankeyLinkDef[] = []
  for (const [key, value] of linkCounts) {
    const [source, target] = key.split('|')
    if (value > 0 && nodeIds.has(source) && nodeIds.has(target)) {
      links.push({ source, target, value })
    }
  }

  return { nodes, links, total: included.length }
}

export function nodeOrderOf(id: string) {
  return NODE_ORDER[id] ?? 99
}
