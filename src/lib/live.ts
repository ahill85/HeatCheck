import { classifyText } from './classify'
import { fetchDataJson } from './dataUrl'
import { scoreSignals } from './scoring'
import type { RawSignal, SnapshotPayload, TrendItem } from './types'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HN ${res.status}`)
  return res.json() as Promise<T>
}

/** Browser-safe live enrichment from Hacker News (CORS-open, no key). */
export async function fetchLiveHackerNews(): Promise<TrendItem[]> {
  const [newIds, topIds] = await Promise.all([
    fetchJson<number[]>('https://hacker-news.firebaseio.com/v0/newstories.json'),
    fetchJson<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json'),
  ])
  const ids = [...new Set([...newIds.slice(0, 25), ...topIds.slice(0, 25)])]

  const settled = await Promise.all(
    ids.map(async (id): Promise<RawSignal | null> => {
      try {
        const item = await fetchJson<{
          id: number
          title?: string
          url?: string
          score?: number
          descendants?: number
          time?: number
          type?: string
        }>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        if (!item?.title || item.type === 'job') return null
        const signal: RawSignal = {
          id: `hn-${item.id}`,
          title: item.title,
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          source: 'Hacker News',
          kind: 'hackernews',
          category: classifyText(item.title, 'tech'),
          score: item.score ?? 0,
          comments: item.descendants ?? 0,
          createdAt: (item.time ?? Math.floor(Date.now() / 1000)) * 1000,
        }
        return signal
      } catch {
        return null
      }
    }),
  )

  return scoreSignals(settled.filter((x): x is RawSignal => x !== null))
}

export async function loadSnapshot(): Promise<SnapshotPayload | null> {
  return fetchDataJson<SnapshotPayload>('latest.json')
}

export function mergeTrends(primary: TrendItem[], live: TrendItem[]): TrendItem[] {
  const map = new Map<string, TrendItem>()
  for (const item of [...primary, ...live]) {
    const existing = map.get(item.id)
    if (!existing || item.momentum > existing.momentum) {
      map.set(item.id, item)
    }
  }
  return [...map.values()].sort((a, b) => b.momentum - a.momentum)
}
