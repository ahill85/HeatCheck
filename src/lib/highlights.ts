import { fetchDataJson } from './dataUrl'
import { heatFromMomentum } from './heatScale'
import type { TrendItem } from './types'

export type HighlightCard = {
  topic: string
  momentum: number
  firstSeen: string
  url?: string
  category?: string
  /** Short reason we think it could pop */
  reason?: string
  popScore?: number
}

export type HighlightsPayload = {
  updatedAt: string
  /** Up to 3 “might pop soon” picks */
  picks: HighlightCard[]
}

export type BannerSlot = {
  key: string
  eyebrow: string
  card: HighlightCard
}

function toCard(item: TrendItem, reason: string, popScore: number): HighlightCard {
  return {
    topic: item.topic,
    momentum: item.momentum,
    firstSeen: item.firstSeen,
    url: item.links[0]?.url,
    category: item.category,
    reason,
    popScore,
  }
}

function reasonFor(item: TrendItem): string {
  if (item.sourceCount >= 3 && item.phase === 'rising') return 'Sources stacking'
  if (item.phase === 'rising') return 'Quietly rising'
  if (item.sourceCount >= 3) return 'Spreading fast'
  if (item.ageHours < 4) return 'Just lit'
  return 'Could pop'
}

/**
 * Score how likely something is to blow up soon — not how loud it already is.
 * Skips board toppers (already in “Spiking now”) and fading peaks.
 */
function popScore(item: TrendItem, boardRank: number): number {
  if (boardRank < 5) return -1 // already front-page hot
  if (item.phase === 'fading' && item.ageHours > 18) return -1
  if (item.ageHours > 48) return -1
  if (item.momentum < 25) return -1

  const phaseBoost =
    item.phase === 'rising' ? 1.55 : item.phase === 'peaking' ? 0.85 : 0.45
  // Sweet spot: fresh enough to still climb, old enough to not be noise
  const ageSweet =
    item.ageHours < 1
      ? 0.7
      : item.ageHours < 8
        ? 1.35
        : item.ageHours < 24
          ? 1.1
          : 0.55
  const sourceBoost = 1 + Math.min(item.sourceCount, 5) * 0.22
  // Mid momentum beats already-nuclear
  const heatCurve = item.momentum / (80 + item.momentum * 0.35)

  return heatCurve * phaseBoost * ageSweet * sourceBoost * 100
}

/**
 * Hour-bucket shuffle so picks rotate a bit between collects without pure chaos.
 */
function rotateSeed(now: Date): number {
  return Math.floor(now.getTime() / (45 * 60_000))
}

function seededJitter(id: string, seed: number): number {
  let h = seed
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 1000) / 1000 // 0..1
}

/**
 * Pick up to 3 topics that look primed to pop — diversified by category.
 */
export function buildHighlights(
  items: TrendItem[],
  _ignored?: unknown,
  now = new Date(),
): HighlightsPayload {
  const ranked = [...items].sort((a, b) => b.momentum - a.momentum)
  const seed = rotateSeed(now)

  const scored = ranked
    .map((item, rank) => {
      const base = popScore(item, rank)
      if (base < 0) return null
      const jitter = 1 + seededJitter(item.id, seed) * 0.18
      const score = base * jitter
      return { item, score, reason: reasonFor(item) }
    })
    .filter((x): x is { item: TrendItem; score: number; reason: string } =>
      Boolean(x),
    )
    .sort((a, b) => b.score - a.score)

  const picks: HighlightCard[] = []
  const usedCats = new Set<string>()
  const usedIds = new Set<string>()

  // Prefer category diversity first pass
  for (const row of scored) {
    if (picks.length >= 3) break
    if (usedIds.has(row.item.id)) continue
    if (usedCats.has(row.item.category) && usedCats.size < 3) continue
    picks.push(toCard(row.item, row.reason, Math.round(row.score)))
    usedCats.add(row.item.category)
    usedIds.add(row.item.id)
  }

  // Fill remaining if we couldn't diversify
  for (const row of scored) {
    if (picks.length >= 3) break
    if (usedIds.has(row.item.id)) continue
    picks.push(toCard(row.item, row.reason, Math.round(row.score)))
    usedIds.add(row.item.id)
  }

  return {
    updatedAt: now.toISOString(),
    picks,
  }
}

export function bannerSlots(h: HighlightsPayload): BannerSlot[] {
  // New shape
  if (Array.isArray(h.picks) && h.picks.length) {
    return h.picks.map((card, i) => ({
      key: `pick-${i}`,
      eyebrow: card.reason || 'Might pop',
      card,
    }))
  }

  // Legacy today/month/year payload (until next collect)
  const legacy = h as HighlightsPayload & {
    today?: HighlightCard | null
    month?: HighlightCard | null
    year?: HighlightCard | null
  }
  const fallback = [legacy.today, legacy.month, legacy.year].filter(
    (c): c is HighlightCard => Boolean(c),
  )
  const unique: HighlightCard[] = []
  for (const c of fallback) {
    if (unique.some((u) => u.topic === c.topic)) continue
    unique.push(c)
  }
  return unique.slice(0, 3).map((card, i) => ({
    key: `legacy-${i}`,
    eyebrow: card.reason || 'Might pop',
    card,
  }))
}

export function highlightHeat(card: HighlightCard) {
  return heatFromMomentum(card.momentum, Math.max(card.momentum, 400))
}

export async function loadHighlights(): Promise<HighlightsPayload | null> {
  return fetchDataJson<HighlightsPayload>('highlights.json')
}
