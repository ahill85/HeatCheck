/**
 * Extra free trend channels (no API keys):
 * Google Trends, Bluesky, Mastodon, Wikipedia pageviews, Lobsters, Lemmy.
 * Facebook / Instagram / Threads / X have no usable free APIs — skipped.
 */
import { classifyText } from '../src/lib/classify'
import type { RawSignal } from '../src/lib/types'

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

function parseTraffic(raw?: string): number {
  if (!raw) return 40
  const n = Number(String(raw).replace(/[^\d]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return 40
  // 50_000+ searches → meaningful but not HN-drowning score
  return Math.min(220, Math.round(28 + Math.log10(n) * 36))
}

function wikiTitle(article: string): string {
  return decodeURIComponent(article.replace(/_/g, ' '))
}

function isWikiNoise(article: string): boolean {
  return /^(Main_Page|Special:|Wikipedia:|Portal:|File:|Template:|Help:|Category:|Draft:|Talk:|User:|Module:)/i.test(
    article,
  )
}

function utcYmd(daysAgo: number): { y: string; m: string; d: string; path: string } {
  const dt = new Date(Date.now() - daysAgo * 86_400_000)
  const y = String(dt.getUTCFullYear())
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return { y, m, d, path: `${y}/${m}/${d}` }
}

/** Google Trends daily RSS — search interest by country. */
export async function collectGoogleTrends(): Promise<RawSignal[]> {
  const geos = [
    { geo: 'US', label: 'Google Trends US' },
    { geo: 'GB', label: 'Google Trends UK' },
    { geo: 'AU', label: 'Google Trends AU' },
  ] as const

  const out: RawSignal[] = []

  for (const { geo, label } of geos) {
    try {
      const res = await fetch(
        `https://trends.google.com/trending/rss?geo=${geo}`,
        { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml' } },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const xml = await res.text()
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
      for (const block of items.slice(0, 12)) {
        const title = block.match(/<title>([^<]*)<\/title>/)?.[1]?.trim()
        if (!title) continue
        const traffic = parseTraffic(
          block.match(/<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>/)?.[1],
        )
        const newsUrl = block
          .match(/<ht:news_item_url>([^<]+)<\/ht:news_item_url>/)?.[1]
          ?.trim()
        const pub = block.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1]
        const createdAt = pub ? Date.parse(pub) : Date.now()
        out.push({
          id: `gtrends-${geo}-${title}`,
          title,
          url:
            newsUrl ||
            `https://trends.google.com/trends/explore?geo=${geo}&q=${encodeURIComponent(title)}`,
          source: label,
          kind: 'googletrends',
          category: classifyText(title, 'news'),
          score: traffic,
          comments: 0,
          createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
          summary: `Trending search interest (${geo}).`,
        })
      }
    } catch (err) {
      console.warn(`Google Trends ${geo} failed:`, (err as Error).message)
    }
  }

  return out
}

/** Bluesky public trending topics (AT Protocol, no auth). */
export async function collectBluesky(): Promise<RawSignal[]> {
  try {
    const data = await fetchJson<{
      trends?: Array<{
        topic?: string
        displayName?: string
        startedAt?: string
        postCount?: number
        status?: string
        category?: string
      }>
    }>('https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrends')

    const out: RawSignal[] = []
    for (const t of (data.trends ?? []).slice(0, 24)) {
      const title = (t.displayName || t.topic || '').trim()
      if (!title) continue
      const posts = t.postCount ?? 0
      const createdAt = t.startedAt ? Date.parse(t.startedAt) : Date.now()
      const hotBoost = t.status === 'hot' ? 24 : t.status === 'rising' ? 12 : 0
      out.push({
        id: `bsky-${t.topic || title}`,
        title,
        url: `https://bsky.app/search?q=${encodeURIComponent(title)}`,
        source: 'Bluesky',
        kind: 'bluesky',
        category: classifyText(
          `${title} ${t.category ?? ''}`,
          t.category === 'sports' ? 'sports' : 'entertainment',
        ),
        score: Math.min(180, 30 + Math.round(Math.log10(posts + 10) * 40) + hotBoost),
        comments: Math.min(400, Math.round(posts / 8)),
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        summary: `${posts.toLocaleString()} posts on Bluesky${t.status ? ` · ${t.status}` : ''}.`,
      })
    }
    return out
  } catch (err) {
    console.warn('Bluesky trends failed:', (err as Error).message)
    return []
  }
}

/** Mastodon trending links (shared URLs with real titles). */
export async function collectMastodon(): Promise<RawSignal[]> {
  try {
    const links = await fetchJson<
      Array<{
        url?: string
        title?: string
        description?: string
        provider_name?: string
        published_at?: string
        history?: Array<{ accounts?: string; uses?: string }>
      }>
    >('https://mastodon.social/api/v1/trends/links')

    const out: RawSignal[] = []
    for (const link of (links ?? []).slice(0, 20)) {
      if (!link.title || !link.url) continue
      const uses = (link.history ?? []).reduce(
        (sum, h) => sum + (Number(h.uses) || 0),
        0,
      )
      const accounts = (link.history ?? []).reduce(
        (sum, h) => sum + (Number(h.accounts) || 0),
        0,
      )
      const createdAt = link.published_at
        ? Date.parse(link.published_at)
        : Date.now()
      out.push({
        id: `masto-${link.url}`,
        title: link.title,
        url: link.url,
        source: link.provider_name
          ? `Mastodon · ${link.provider_name}`
          : 'Mastodon',
        kind: 'mastodon',
        category: classifyText(link.title, 'news'),
        score: Math.min(160, 28 + Math.round(Math.log10(uses + 10) * 36)),
        comments: Math.min(200, accounts),
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        summary: (link.description || '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
          undefined,
      })
    }
    return out
  } catch (err) {
    console.warn('Mastodon trends failed:', (err as Error).message)
    return []
  }
}

/** Wikipedia most-viewed articles (yesterday UTC) — what people are looking up. */
export async function collectWikipedia(): Promise<RawSignal[]> {
  for (const daysAgo of [1, 2]) {
    const { path } = utcYmd(daysAgo)
    try {
      const data = await fetchJson<{
        items?: Array<{
          articles?: Array<{ article?: string; views?: number; rank?: number }>
        }>
      }>(
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${path}`,
      )
      const articles = data.items?.[0]?.articles ?? []
      const out: RawSignal[] = []
      const dayStart = Date.parse(`${path.replace(/\//g, '-')}T12:00:00Z`)

      for (const art of articles) {
        if (!art.article || isWikiNoise(art.article)) continue
        const title = wikiTitle(art.article)
        const views = art.views ?? 0
        if (views < 40_000) continue
        out.push({
          id: `wiki-${art.article}`,
          title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(art.article)}`,
          source: 'Wikipedia',
          kind: 'wikipedia',
          category: classifyText(title, 'news'),
          score: Math.min(200, 24 + Math.round(Math.log10(views) * 28)),
          comments: 0,
          createdAt: Number.isFinite(dayStart) ? dayStart : Date.now() - 86_400_000,
          summary: `${views.toLocaleString()} Wikipedia views (rank #${art.rank ?? '?'}).`,
        })
        if (out.length >= 30) break
      }
      if (out.length) return out
    } catch (err) {
      console.warn(`Wikipedia top (${path}) failed:`, (err as Error).message)
    }
  }
  return []
}

/** Lobste.rs hottest — curated tech community signal. */
export async function collectLobsters(): Promise<RawSignal[]> {
  try {
    const items = await fetchJson<
      Array<{
        title?: string
        url?: string
        score?: number
        comment_count?: number
        created_at?: string
        short_id_url?: string
        tags?: string[]
      }>
    >('https://lobste.rs/hottest.json')

    return (items ?? []).slice(0, 30).flatMap((item) => {
      if (!item.title) return []
      const createdAt = item.created_at ? Date.parse(item.created_at) : Date.now()
      const tags = (item.tags ?? []).join(' ')
      return [
        {
          id: `lob-${item.short_id_url || item.url || item.title}`,
          title: item.title,
          url: item.url || item.short_id_url || 'https://lobste.rs/',
          source: 'Lobsters',
          kind: 'lobsters' as const,
          category: classifyText(`${item.title} ${tags}`, 'tech'),
          score: Math.max(8, (item.score ?? 0) * 4),
          comments: item.comment_count ?? 0,
          createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        } satisfies RawSignal,
      ]
    })
  } catch (err) {
    console.warn('Lobsters failed:', (err as Error).message)
    return []
  }
}

/** Lemmy.world hot posts — federated Reddit-like signal. */
export async function collectLemmy(): Promise<RawSignal[]> {
  try {
    const data = await fetchJson<{
      posts?: Array<{
        post?: {
          id?: number
          name?: string
          url?: string
          body?: string
          ap_id?: string
          published?: string
        }
        counts?: { score?: number; comments?: number }
        community?: { name?: string }
      }>
    }>(
      'https://lemmy.world/api/v3/post/list?sort=Hot&limit=40&type_=All',
    )

    const out: RawSignal[] = []
    for (const row of data.posts ?? []) {
      const post = row.post
      if (!post?.name) continue
      const url = post.url || post.ap_id
      if (!url) continue
      // Skip pure image meme dumps without an external article URL host diversity
      const score = row.counts?.score ?? 0
      if (score < 25) continue
      const createdAt = post.published ? Date.parse(post.published) : Date.now()
      const community = row.community?.name ?? 'lemmy'
      out.push({
        id: `lemmy-${post.id ?? url}`,
        title: post.name,
        url,
        source: `Lemmy · ${community}`,
        kind: 'lemmy',
        category: classifyText(`${post.name} ${community}`, 'news'),
        score: Math.min(150, 16 + Math.round(score / 3)),
        comments: row.counts?.comments ?? 0,
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        summary: (post.body || '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
          undefined,
      })
      if (out.length >= 28) break
    }
    return out
  } catch (err) {
    console.warn('Lemmy failed:', (err as Error).message)
    return []
  }
}

export async function collectExtraSources(): Promise<{
  googletrends: RawSignal[]
  bluesky: RawSignal[]
  mastodon: RawSignal[]
  wikipedia: RawSignal[]
  lobsters: RawSignal[]
  lemmy: RawSignal[]
}> {
  const [googletrends, bluesky, mastodon, wikipedia, lobsters, lemmy] =
    await Promise.all([
      collectGoogleTrends(),
      collectBluesky(),
      collectMastodon(),
      collectWikipedia(),
      collectLobsters(),
      collectLemmy(),
    ])
  return { googletrends, bluesky, mastodon, wikipedia, lobsters, lemmy }
}
