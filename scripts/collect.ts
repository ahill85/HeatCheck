/**
 * Free data collector for HeatCheck.
 * HN + Reddit + curated RSS + GDELT + Google Trends / Bluesky / Mastodon /
 * Wikipedia / Lobsters / Lemmy (all free, no API keys).
 *
 * Usage: npm run collect
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Parser from 'rss-parser'
import { classifyText } from '../src/lib/classify'
import { buildHighlights } from '../src/lib/highlights'
import {
  diversifyTrends,
  historyFromItems,
  scoreSignals,
  type HistoryMap,
} from '../src/lib/scoring'
import type { RawSignal, SnapshotPayload } from '../src/lib/types'
import { collectExtraSources } from './extraSources'
import { REDDIT_BUNDLES, RSS_FEEDS, type FeedDef } from './feeds'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dataDir = path.join(root, 'public', 'data')
const latestPath = path.join(dataDir, 'latest.json')
const historyPath = path.join(dataDir, 'history.json')
const highlightsPath = path.join(dataDir, 'highlights.json')

const UA = 'HeatCheck/1.0 (astarmedia.net/heatcheck; research; contact@astarmedia.net)'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json() as Promise<T>
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

async function collectHackerNews(): Promise<RawSignal[]> {
  const [ids, topIds] = await Promise.all([
    fetchJson<number[]>('https://hacker-news.firebaseio.com/v0/newstories.json'),
    fetchJson<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json'),
  ])
  // Cap HN so it doesn't drown news/sports coverage
  const unique = [...new Set([...ids.slice(0, 28), ...topIds.slice(0, 28)])]

  const items = await mapPool(unique, 10, async (id) => {
    try {
      const item = await fetchJson<{
        id: number
        title?: string
        url?: string
        score?: number
        descendants?: number
        time?: number
        type?: string
        text?: string
      }>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      if (!item?.title || item.type === 'job') return null
      const title = item.title
      return {
        id: `hn-${item.id}`,
        title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        source: 'Hacker News',
        kind: 'hackernews' as const,
        category: classifyText(title, 'tech'),
        score: item.score ?? 0,
        comments: item.descendants ?? 0,
        createdAt: (item.time ?? Math.floor(Date.now() / 1000)) * 1000,
        summary: item.text
          ? item.text.replace(/<[^>]+>/g, ' ').slice(0, 160)
          : undefined,
      } satisfies RawSignal
    } catch {
      return null
    }
  })

  return items.filter((x): x is RawSignal => Boolean(x))
}

async function collectReddit(): Promise<RawSignal[]> {
  const parser = new Parser({
    headers: {
      'User-Agent': UA,
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    timeout: 18000,
  })
  const out: RawSignal[] = []

  // Bundled multi-sub feeds: ~6 requests instead of 25+ (Reddit 429s hard)
  for (const { path, label, fallback } of REDDIT_BUNDLES) {
    let ok = false
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 4000))
        const parsed = await parser.parseURL(
          `https://www.reddit.com/r/${path}/.rss?limit=40`,
        )
        for (const item of (parsed.items ?? []).slice(0, 28)) {
          if (!item.title || !item.link) continue
          const createdAt = item.isoDate
            ? Date.parse(item.isoDate)
            : item.pubDate
              ? Date.parse(item.pubDate)
              : Date.now()
          const snippet = (item.contentSnippet || item.summary || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160)
          const subFromLink =
            item.link.match(/reddit\.com\/r\/([^/]+)/i)?.[1] ?? label

          out.push({
            id: `reddit-${subFromLink}-${item.id || item.link}`,
            title: item.title,
            url: item.link,
            source: `r/${subFromLink}`,
            kind: 'reddit',
            category: classifyText(`${item.title} ${subFromLink}`, fallback),
            score: Math.max(
              8,
              (fallback === 'news' ? 48 : 36) -
                Math.floor((Date.now() - createdAt) / 3_600_000) * 3,
            ),
            comments: 0,
            createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
            summary: snippet || undefined,
          })
        }
        ok = true
        await new Promise((r) => setTimeout(r, 2500))
      } catch (err) {
        console.warn(
          `Reddit r/${path} RSS failed (try ${attempt + 1}):`,
          (err as Error).message,
        )
        await new Promise((r) => setTimeout(r, 3500))
      }
    }
  }

  return out
}

function cleanTitle(title: string): string {
  // Google News often appends " - Outlet"
  return title.replace(/\s+-\s+[^-]+$/, '').trim()
}

async function collectOneFeed(
  parser: Parser,
  feed: FeedDef,
): Promise<RawSignal[]> {
  const parsed = await parser.parseURL(feed.url)
  const take = feed.take ?? 12
  const weight = feed.weight ?? 28
  const out: RawSignal[] = []

  for (const item of (parsed.items ?? []).slice(0, take)) {
    if (!item.title || !item.link) continue
    const createdAt = item.isoDate
      ? Date.parse(item.isoDate)
      : item.pubDate
        ? Date.parse(item.pubDate)
        : Date.now()
    const ageH = Math.max(0.2, (Date.now() - createdAt) / 3_600_000)
    const snippet = (item.contentSnippet || item.summary || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160)
    const title = cleanTitle(item.title)

    out.push({
      id: `rss-${feed.source}-${item.link}`,
      title,
      url: item.link,
      source: feed.source,
      kind: 'rss',
      category: classifyText(title, feed.fallback),
      score: Math.max(10, Math.round(weight * (ageH < 6 ? 1.25 : ageH < 24 ? 1 : 0.65))),
      comments: 0,
      createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
      summary: snippet || undefined,
    })
  }
  return out
}

async function collectRss(): Promise<RawSignal[]> {
  const parser = new Parser({
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    timeout: 18000,
  })

  const batches = await mapPool(RSS_FEEDS, 8, async (feed) => {
    try {
      return await collectOneFeed(parser, feed)
    } catch (err) {
      console.warn(`RSS ${feed.source} failed:`, (err as Error).message)
      return [] as RawSignal[]
    }
  })

  return batches.flat()
}

/** GDELT DOC 2.0 — free, no key; often rate-limits, so best-effort. */
async function collectGdelt(): Promise<RawSignal[]> {
  const queries = [
    { q: 'sourcelang:english', fallback: 'news' as const },
    { q: '(NBA OR NFL OR AFL OR soccer OR MLB) sourcelang:english', fallback: 'sports' as const },
    { q: '(election OR congress OR war OR climate) sourcelang:english', fallback: 'news' as const },
  ]
  const out: RawSignal[] = []

  for (const { q, fallback } of queries) {
    try {
      await new Promise((r) => setTimeout(r, 1500))
      const url =
        `https://api.gdeltproject.org/api/v2/doc/doc?` +
        new URLSearchParams({
          query: q,
          mode: 'ArtList',
          maxrecords: '40',
          format: 'json',
          timespan: '6h',
          sort: 'datedesc',
        })
      const data = await fetchJson<{
        articles?: Array<{
          url?: string
          title?: string
          seendate?: string
          domain?: string
          language?: string
        }>
      }>(url)

      for (const art of data.articles ?? []) {
        if (!art.title || !art.url) continue
        // seendate like 20260718T191500Z
        let createdAt = Date.now()
        if (art.seendate) {
          const m = art.seendate.match(
            /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
          )
          if (m) {
            createdAt = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
          }
        }
        out.push({
          id: `gdelt-${art.url}`,
          title: art.title,
          url: art.url,
          source: art.domain ? `GDELT · ${art.domain}` : 'GDELT',
          kind: 'gdelt',
          category: classifyText(art.title, fallback),
          score: 34,
          comments: 0,
          createdAt,
          summary: undefined,
        })
      }
    } catch (err) {
      console.warn('GDELT query failed:', (err as Error).message)
    }
  }

  return out
}

async function loadHistory(): Promise<HistoryMap> {
  try {
    const raw = await readFile(historyPath, 'utf8')
    return JSON.parse(raw) as HistoryMap
  } catch {
    return {}
  }
}

function countByCategory(items: { category: string }[]) {
  const map: Record<string, number> = {}
  for (const i of items) map[i.category] = (map[i.category] ?? 0) + 1
  return map
}

async function main() {
  console.log(
    `Collecting from ${RSS_FEEDS.length} RSS feeds + HN + Reddit + GDELT + social/trends…`,
  )
  const [hn, rss, gdelt, extra] = await Promise.all([
    collectHackerNews(),
    collectRss(),
    collectGdelt(),
    collectExtraSources(),
  ])
  const reddit = await collectReddit()

  const {
    googletrends,
    bluesky,
    mastodon,
    wikipedia,
    lobsters,
    lemmy,
  } = extra

  const signals = [
    ...hn,
    ...reddit,
    ...rss,
    ...gdelt,
    ...googletrends,
    ...bluesky,
    ...mastodon,
    ...wikipedia,
    ...lobsters,
    ...lemmy,
  ]
  console.log(
    `Signals: HN ${hn.length}, Reddit ${reddit.length}, RSS ${rss.length}, GDELT ${gdelt.length}, ` +
      `GTrends ${googletrends.length}, Bluesky ${bluesky.length}, Mastodon ${mastodon.length}, ` +
      `Wiki ${wikipedia.length}, Lobsters ${lobsters.length}, Lemmy ${lemmy.length} ` +
      `(total ${signals.length})`,
  )
  console.log('Raw categories:', countByCategory(signals))

  const history = await loadHistory()
  const ranked = scoreSignals(signals, history)
  const items = diversifyTrends(ranked, 140)
  const nextHistory = { ...history, ...historyFromItems(items) }

  console.log('Board categories:', countByCategory(items))

  const payload: SnapshotPayload = {
    generatedAt: new Date().toISOString(),
    windowHint: '24h',
    items,
    meta: {
      sourceCounts: {
        hackernews: hn.length,
        reddit: reddit.length,
        rss: rss.length,
        gdelt: gdelt.length,
        googletrends: googletrends.length,
        bluesky: bluesky.length,
        mastodon: mastodon.length,
        wikipedia: wikipedia.length,
        lobsters: lobsters.length,
        lemmy: lemmy.length,
      },
      note: 'Ranked by acceleration across free news/RSS, HN, Reddit, Google Trends, Bluesky, Mastodon, Wikipedia, Lobsters, Lemmy, and GDELT.',
    },
  }

  const highlights = buildHighlights(items)

  await mkdir(dataDir, { recursive: true })
  await writeFile(latestPath, JSON.stringify(payload, null, 2))
  await writeFile(historyPath, JSON.stringify(nextHistory, null, 2))
  await writeFile(highlightsPath, JSON.stringify(highlights, null, 2))
  console.log(`Wrote ${items.length} trends → ${latestPath}`)
  console.log(
    `Might-pop picks: ${highlights.picks.map((p) => `"${p.topic.slice(0, 36)}"`).join(' · ') || '—'}`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
