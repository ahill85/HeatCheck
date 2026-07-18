import type { TrendItem } from './types'

export type CheckVerdict = 'cold' | 'quiet' | 'stirring' | 'rising' | 'hot'

export interface TrendCheckResult {
  query: string
  score: number
  verdict: CheckVerdict
  label: string
  blurb: string
}

interface AlgoliaHit {
  points?: number
  num_comments?: number
  created_at_i?: number
}

interface AlgoliaResponse {
  hits?: AlgoliaHit[]
  nbHits?: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function dayStamp(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function verdictFromScore(score: number): Pick<TrendCheckResult, 'verdict' | 'label' | 'blurb'> {
  if (score >= 80)
    return {
      verdict: 'hot',
      label: 'Hot',
      blurb: 'Worth talking about — conversation is already loud.',
    }
  if (score >= 60)
    return {
      verdict: 'rising',
      label: 'Rising',
      blurb: 'Worth talking about — attention is climbing right now.',
    }
  if (score >= 40)
    return {
      verdict: 'stirring',
      label: 'Stirring',
      blurb: 'Not exploding yet, but it is starting to move.',
    }
  if (score >= 20)
    return {
      verdict: 'quiet',
      label: 'Quiet',
      blurb: 'Some chatter, not a spike. Probably skip unless you care.',
    }
  return {
    verdict: 'cold',
    label: 'Cold',
    blurb: 'Barely on the radar. Not trending right now.',
  }
}

function boardScore(query: string, items: TrendItem[]): number {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const tokens = q.split(/\s+/).filter((t) => t.length > 2)
  const hits = items.filter((item) => {
    const hay = `${item.topic} ${item.summary}`.toLowerCase()
    if (hay.includes(q)) return true
    return tokens.length > 0 && tokens.every((t) => hay.includes(t))
  })
  if (!hits.length) return 0
  const best = Math.max(...hits.map((h) => h.momentum))
  const phaseBoost = hits.some((h) => h.phase === 'rising')
    ? 14
    : hits.some((h) => h.phase === 'peaking')
      ? 9
      : 0
  return clamp(30 + Math.log10(best + 10) * 24 + hits.length * 7 + phaseBoost, 0, 78)
}

async function hnScore(query: string): Promise<number> {
  const url =
    `https://hn.algolia.com/api/v1/search_by_date?` +
    new URLSearchParams({
      query,
      tags: 'story',
      hitsPerPage: '25',
    })

  const res = await fetch(url)
  if (!res.ok) return 0
  const data = (await res.json()) as AlgoliaResponse
  const now = Date.now() / 1000
  const hits = data.hits ?? []

  let recent = 0
  let engagement = 0
  for (const hit of hits) {
    const ageH = (now - (hit.created_at_i ?? now)) / 3600
    if (ageH > 168) continue // 7 days
    const weight = ageH < 6 ? 1.5 : ageH < 24 ? 1.1 : ageH < 72 ? 0.7 : 0.35
    recent += weight
    engagement += ((hit.points ?? 0) + (hit.num_comments ?? 0) * 2) * weight
  }

  if (recent === 0) return 0
  return clamp(8 + recent * 7 + Math.log10(engagement + 10) * 16, 0, 82)
}

async function wikiScore(query: string): Promise<number> {
  const searchUrl =
    `https://en.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: 'opensearch',
      search: query,
      limit: '1',
      namespace: '0',
      format: 'json',
      origin: '*',
    })

  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) return 0
  const searchJson = (await searchRes.json()) as [string, string[], string[], string[]]
  const title = searchJson[1]?.[0]
  if (!title) return 0

  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 1) // yesterday usually complete
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 13)

  const article = encodeURIComponent(title.replace(/ /g, '_'))
  const viewsUrl =
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/` +
    `en.wikipedia/all-access/all-agents/${article}/daily/${dayStamp(start)}/${dayStamp(end)}`

  const viewsRes = await fetch(viewsUrl, {
    headers: { 'Api-User-Agent': 'HeatCheck/1.0 (astarmedia.net/heatcheck)' },
  })
  if (!viewsRes.ok) return 0
  const viewsJson = (await viewsRes.json()) as { items?: Array<{ views: number }> }
  const series = (viewsJson.items ?? []).map((i) => i.views)
  if (series.length < 6) return 0

  const recent = series.slice(-3)
  const prior = series.slice(-6, -3)
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length || 1
  const growth = recentAvg / priorAvg
  const volume = Math.log10(recentAvg + 10) // famous topics baseline

  // Growth drives “rising”; volume alone caps as quiet/stirring
  const growthPoints = growth >= 1.8 ? 55 : growth >= 1.35 ? 40 : growth >= 1.12 ? 24 : growth >= 0.95 ? 10 : 4
  const volumePoints = clamp(volume * 8, 0, 28)

  return clamp(growthPoints + volumePoints, 0, 88)
}

/** Free “worth talking about?” score — board + HN + Wikipedia views. No graphs. */
export async function checkTrend(
  rawQuery: string,
  boardItems: TrendItem[],
): Promise<TrendCheckResult> {
  const query = rawQuery.trim().replace(/\s+/g, ' ')
  if (!query) {
    return {
      query: '',
      score: 0,
      verdict: 'cold',
      label: 'Cold',
      blurb: 'Paste a person, topic, or headline.',
    }
  }

  const [fromBoard, fromHn, fromWiki] = await Promise.all([
    Promise.resolve(boardScore(query, boardItems)),
    hnScore(query).catch(() => 0),
    wikiScore(query).catch(() => 0),
  ])

  const parts = [fromBoard, fromHn, fromWiki].filter((n) => n > 0)
  const peak = parts.length ? Math.max(...parts) : 0
  const blend = parts.length
    ? parts.reduce((a, b) => a + b, 0) / parts.length
    : 0

  // Peak signal matters most; blend keeps multi-source topics honest
  const score = Math.round(clamp(peak * 0.72 + blend * 0.38, 0, 100))
  const meta = verdictFromScore(score)

  return { query, score, ...meta }
}
