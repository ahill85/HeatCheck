import { topicKey } from './classify'
import type { RawSignal, TrendItem, TrendPhase, TrendLink } from './types'

export interface HistoryMap {
  [key: string]: { engagement: number; seenAt: string }
}

function phaseFromMomentum(momentum: number, ageHours: number): TrendPhase {
  if (momentum >= 180 && ageHours < 6) return 'rising'
  if (momentum >= 80 && ageHours < 18) return 'peaking'
  return 'fading'
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Acceleration-first score:
 * recent engagement × growth vs prior snapshot × velocity × source diversity
 */
export function scoreSignals(
  signals: RawSignal[],
  history: HistoryMap = {},
  now = Date.now(),
): TrendItem[] {
  const buckets = new Map<string, RawSignal[]>()

  for (const signal of signals) {
    const key = topicKey(signal.title) || signal.id
    const list = buckets.get(key) ?? []
    list.push(signal)
    buckets.set(key, list)
  }

  const items: TrendItem[] = []

  for (const [key, group] of buckets) {
    const best = [...group].sort(
      (a, b) => b.score + b.comments * 2 - (a.score + a.comments * 2),
    )[0]

    const engagement = group.reduce((sum, s) => sum + s.score + s.comments * 3, 0)
    const createdAt = Math.min(...group.map((s) => s.createdAt))
    const ageHours = Math.max(0.25, (now - createdAt) / 3_600_000)
    const velocity = engagement / ageHours

    const prior = history[key]?.engagement ?? 0
    const growth = prior > 0 ? engagement / prior : engagement > 40 ? 2.2 : 1.15
    const sourceKinds = new Set(group.map((s) => s.kind))
    const sourceBoost = 1 + (sourceKinds.size - 1) * 0.35 + Math.min(group.length, 5) * 0.08

    const momentum = Math.round(
      clamp(velocity * 1.1, 0, 5000) * clamp(growth, 0.5, 12) * sourceBoost,
    )

    const links: TrendLink[] = []
    const seenUrls = new Set<string>()
    for (const s of [...group].sort((a, b) => b.score - a.score)) {
      if (seenUrls.has(s.url)) continue
      seenUrls.add(s.url)
      links.push({
        title: s.title,
        url: s.url,
        source: s.source,
        kind: s.kind,
        score: s.score,
        comments: s.comments,
      })
      if (links.length >= 4) break
    }

    const summary =
      best.summary?.trim() ||
      `Surfacing across ${sourceKinds.size} channel${sourceKinds.size === 1 ? '' : 's'} with rising engagement.`

    items.push({
      id: key || best.id,
      topic: best.title.replace(/\s+/g, ' ').trim(),
      summary,
      category: best.category,
      momentum,
      phase: phaseFromMomentum(momentum, ageHours),
      firstSeen: new Date(createdAt).toISOString(),
      sourceCount: links.length,
      engagement,
      ageHours: Math.round(ageHours * 10) / 10,
      links,
    })
  }

  return items.sort((a, b) => b.momentum - a.momentum)
}

export function filterByWindow(items: TrendItem[], window: string): TrendItem[] {
  const maxHours =
    window === '1h'
      ? 1
      : window === '4h'
        ? 4
        : window === '24h'
          ? 24
          : window === '7d'
            ? 24 * 7
            : 24 * 30
  return items.filter((item) => item.ageHours <= maxHours)
}

export function filterByQuery(items: TrendItem[], query: string): TrendItem[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return items
  const tokens = q.split(/\s+/).filter((t) => t.length > 1)
  return items.filter((item) => {
    const hay = `${item.topic} ${item.summary} ${item.category} ${item.links
      .map((l) => `${l.title} ${l.source}`)
      .join(' ')}`.toLowerCase()
    if (hay.includes(q)) return true
    return tokens.length > 0 && tokens.every((t) => hay.includes(t))
  })
}

export function historyFromItems(items: TrendItem[]): HistoryMap {
  const map: HistoryMap = {}
  const seenAt = new Date().toISOString()
  for (const item of items) {
    map[item.id] = { engagement: item.engagement, seenAt }
  }
  return map
}

/**
 * Keep momentum ranking but prevent one category (usually tech/HN) from
 * swallowing the whole board.
 */
export function diversifyTrends(items: TrendItem[], limit = 140): TrendItem[] {
  const order: Array<TrendItem['category']> = [
    'news',
    'sports',
    'tech',
    'business',
    'entertainment',
    'games',
  ]
  const floors: Record<TrendItem['category'], number> = {
    news: 42,
    sports: 20,
    tech: 20,
    business: 12,
    entertainment: 12,
    games: 10,
  }

  const picked: TrendItem[] = []
  const used = new Set<string>()

  for (const cat of order) {
    const floor = floors[cat]
    for (const item of items) {
      if (picked.length >= limit) break
      if (item.category !== cat || used.has(item.id)) continue
      if (picked.filter((p) => p.category === cat).length >= floor) break
      picked.push(item)
      used.add(item.id)
    }
  }

  for (const item of items) {
    if (picked.length >= limit) break
    if (used.has(item.id)) continue
    picked.push(item)
    used.add(item.id)
  }

  return picked.sort((a, b) => b.momentum - a.momentum)
}
