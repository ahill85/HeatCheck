import { useEffect, useId, useMemo, useState } from 'react'
import {
  bannerSlots,
  highlightHeat,
  type BannerSlot,
  type HighlightsPayload,
} from '../lib/highlights'
import type { TrendItem, TrendLink } from '../lib/types'
import { HeatBadge } from './HeatBadge'

type Props = {
  highlights: HighlightsPayload | null
  items: TrendItem[]
}

function formatWhen(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.round(ms / 60_000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function findTrend(items: TrendItem[], topic: string, url?: string) {
  if (url) {
    const byUrl = items.find((item) => item.links.some((l) => l.url === url))
    if (byUrl) return byUrl
  }
  return items.find((item) => item.topic === topic) ?? null
}

function linksForSlot(slot: BannerSlot, trend: TrendItem | null): TrendLink[] {
  if (trend?.links.length) return trend.links
  if (slot.card.url) {
    return [
      {
        title: slot.card.topic,
        url: slot.card.url,
        source: 'Read more',
        kind: 'rss',
      },
    ]
  }
  return []
}

export function HighlightBanners({ highlights, items }: Props) {
  const titleId = useId()
  const [openKey, setOpenKey] = useState<BannerSlot['key'] | null>(null)

  const slots = useMemo(
    () => (highlights ? bannerSlots(highlights) : []),
    [highlights],
  )

  const openSlot = openKey
    ? (slots.find((s) => s.key === openKey) ?? null)
    : null

  const openTrend = openSlot
    ? findTrend(items, openSlot.card.topic, openSlot.card.url)
    : null

  useEffect(() => {
    if (!openKey) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenKey(null)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [openKey])

  if (!highlights || slots.length === 0) return null

  const heat = openSlot ? highlightHeat(openSlot.card) : null
  const links = openSlot ? linksForSlot(openSlot, openTrend) : []
  const summary = openTrend?.summary ?? heat?.vibe ?? null
  const category = openTrend?.category ?? openSlot?.card.category

  return (
    <>
      <section className="highlights" aria-label="Biggest explosions">
        <div className="highlights-grid">
          {slots.map((slot) => (
            <button
              key={slot.key}
              type="button"
              className="hi-card"
              aria-haspopup="dialog"
              onClick={() => setOpenKey(slot.key)}
            >
              <p className="hi-eyebrow">{slot.eyebrow}</p>
              <p className="hi-topic">{slot.card.topic}</p>
            </button>
          ))}
        </div>
      </section>

      {openSlot && heat && (
        <div
          className="hi-modal-root"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenKey(null)
          }}
        >
          <div
            className="hi-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="hi-modal-top">
              <p className="hi-modal-eyebrow">{openSlot.eyebrow}</p>
              <button
                type="button"
                className="hi-modal-close"
                aria-label="Close"
                onClick={() => setOpenKey(null)}
              >
                ✕
              </button>
            </div>

            <div className={`hi-modal-body heat-row-${heat.id}`}>
              <div className="rank-top">
                <h3 id={titleId} className="topic">
                  {openSlot.card.topic}
                </h3>
                <HeatBadge heat={heat} size="sm" />
              </div>

              {summary && <p className="summary hi-modal-summary">{summary}</p>}

              <div className={`meter meter-${heat.id}`} aria-hidden="true">
                <span style={{ width: '92%' }} />
              </div>

              <div className="tags">
                {category && <span className="tag">{category}</span>}
                <span className="heat-vibe">{heat.vibe}</span>
                <span>{formatWhen(openSlot.card.firstSeen)}</span>
              </div>

              {links.length > 0 && (
                <div className="links">
                  {links.slice(0, 5).map((link) => (
                    <a
                      key={link.url}
                      className="link-chip"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>{link.source}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
