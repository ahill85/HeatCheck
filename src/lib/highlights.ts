import { fetchDataJson } from './dataUrl'
import { heatFromMomentum } from './heatScale'
import type { TrendItem } from './types'

export type HighlightCard = {
  topic: string
  momentum: number
  firstSeen: string
  url?: string
  category?: string
}

export type HighlightsPayload = {
  updatedAt: string
  today: HighlightCard | null
  month: HighlightCard | null
  /** Previous calendar year champ when known; else current-year record */
  year: HighlightCard | null
  yearLabel: 'last-year' | 'year-so-far'
  yearName: string
  byYear: Record<string, HighlightCard>
}

export type BannerSlot = {
  key: 'today' | 'month' | 'year'
  eyebrow: string
  card: HighlightCard
}

function toCard(item: TrendItem): HighlightCard {
  return {
    topic: item.topic,
    momentum: item.momentum,
    firstSeen: item.firstSeen,
    url: item.links[0]?.url,
    category: item.category,
  }
}

function bestInWindow(items: TrendItem[], maxHours: number): TrendItem | null {
  let best: TrendItem | null = null
  for (const item of items) {
    if (item.ageHours > maxHours) continue
    if (!best || item.momentum > best.momentum) best = item
  }
  return best
}

export function cardFromItems(items: TrendItem[], maxHours: number): HighlightCard | null {
  const best = bestInWindow(items, maxHours)
  return best ? toCard(best) : null
}

export function mergeYearRecords(
  byYear: Record<string, HighlightCard>,
  challenger: HighlightCard | null,
  now = new Date(),
): Record<string, HighlightCard> {
  if (!challenger) return byYear
  const y = String(now.getUTCFullYear())
  const prev = byYear[y]
  if (!prev || challenger.momentum > prev.momentum) {
    return { ...byYear, [y]: challenger }
  }
  return byYear
}

export function pickYearHighlight(
  byYear: Record<string, HighlightCard>,
  now = new Date(),
): Pick<HighlightsPayload, 'year' | 'yearLabel' | 'yearName'> {
  const thisYear = now.getUTCFullYear()
  const lastYear = String(thisYear - 1)
  const last = byYear[lastYear]
  if (last) {
    return { year: last, yearLabel: 'last-year', yearName: lastYear }
  }
  const current = byYear[String(thisYear)]
  return {
    year: current ?? null,
    yearLabel: 'year-so-far',
    yearName: String(thisYear),
  }
}

export function buildHighlights(
  items: TrendItem[],
  priorByYear: Record<string, HighlightCard> = {},
  now = new Date(),
): HighlightsPayload {
  const today = cardFromItems(items, 24)
  const month = cardFromItems(items, 24 * 30)
  const boardBest = items[0] ? toCard(items[0]) : null
  const challenger =
    [today, month, boardBest]
      .filter((c): c is HighlightCard => Boolean(c))
      .sort((a, b) => b.momentum - a.momentum)[0] ?? null

  const byYear = mergeYearRecords(priorByYear, challenger, now)
  const yearPick = pickYearHighlight(byYear, now)

  return {
    updatedAt: now.toISOString(),
    today,
    month,
    ...yearPick,
    byYear,
  }
}

export function bannerSlots(h: HighlightsPayload): BannerSlot[] {
  const slots: BannerSlot[] = []
  if (h.today) {
    slots.push({ key: 'today', eyebrow: "Today's explosion", card: h.today })
  }
  if (h.month) {
    slots.push({ key: 'month', eyebrow: 'This month', card: h.month })
  }
  if (h.year) {
    slots.push({
      key: 'year',
      eyebrow:
        h.yearLabel === 'last-year' ? `Last year · ${h.yearName}` : 'Year so far',
      card: h.year,
    })
  }
  return slots
}

export function highlightHeat(card: HighlightCard) {
  // Absolute-ish scale so banners feel spicy without needing list peak
  return heatFromMomentum(card.momentum, Math.max(card.momentum, 400))
}

export async function loadHighlights(): Promise<HighlightsPayload | null> {
  return fetchDataJson<HighlightsPayload>('highlights.json')
}
