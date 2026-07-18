import { startTransition, useEffect, useMemo, useState } from 'react'
import { BottomAd } from './components/BottomAd'
import { HeatBadge } from './components/HeatBadge'
import { HighlightBanners } from './components/HighlightBanners'
import { checkTrend, type TrendCheckResult } from './lib/checkTrend'
import { heatFromMomentum, heatFromScore } from './lib/heatScale'
import {
  buildHighlights,
  loadHighlights,
  type HighlightsPayload,
} from './lib/highlights'
import { filterByQuery, filterByWindow } from './lib/scoring'
import { fetchLiveHackerNews, loadSnapshot, mergeTrends } from './lib/live'
import type { TimeWindow, TrendItem } from './lib/types'
import './index.css'

const WINDOWS: { id: TimeWindow; label: string }[] = [
  { id: '1h', label: '1h' },
  { id: '4h', label: '4h' },
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
]

function formatWhen(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.round(ms / 60_000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function maxMomentum(items: TrendItem[]) {
  return Math.max(1, ...items.map((i) => i.momentum))
}

export default function App() {
  const [query, setQuery] = useState('')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h')
  const [items, setItems] = useState<TrendItem[]>([])
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [liveNote, setLiveNote] = useState('Loading…')
  const [verdict, setVerdict] = useState<TrendCheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [storedHighlights, setStoredHighlights] =
    useState<HighlightsPayload | null>(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      setStatus('loading')
      const [snapshot, priorHighlights] = await Promise.all([
        loadSnapshot(),
        loadHighlights(),
      ])
      let base = snapshot?.items ?? []

      if (!cancelled) {
        if (priorHighlights) setStoredHighlights(priorHighlights)
        if (snapshot) {
          setGeneratedAt(snapshot.generatedAt)
          setItems(base)
          setStatus('ready')
          setLiveNote('Updating…')
        }
      }

      try {
        const live = await fetchLiveHackerNews()
        if (cancelled) return
        startTransition(() => {
          setItems(mergeTrends(base, live))
          setStatus('ready')
          setLiveNote(snapshot ? 'Live' : 'Live HN only')
          if (!snapshot) setGeneratedAt(new Date().toISOString())
        })
      } catch {
        if (cancelled) return
        if (base.length) {
          setStatus('ready')
          setLiveNote('Cached')
        } else {
          setStatus('error')
          setLiveNote('Could not load. Run collect, then refresh.')
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setVerdict(null)
      setChecking(false)
      return
    }
    setChecking(true)
    const handle = window.setTimeout(() => {
      void checkTrend(q, items)
        .then(setVerdict)
        .finally(() => setChecking(false))
    }, 280)
    return () => window.clearTimeout(handle)
  }, [query, items])

  const visible = useMemo(() => {
    const byTime = filterByWindow(items, timeWindow)
    const byQuery = filterByQuery(byTime, query)
    return byQuery.slice(0, 50)
  }, [items, timeWindow, query])

  const peak = maxMomentum(visible)
  const searching = query.trim().length >= 2
  const searchHeat = verdict ? heatFromScore(verdict.score) : null

  const highlights = useMemo(() => {
    if (!items.length && !storedHighlights) return null
    if (!items.length) return storedHighlights
    return buildHighlights(items, storedHighlights?.byYear ?? {})
  }, [items, storedHighlights])

  return (
    <div className="app">
      <header className="top">
        <p className="brand">
          Heat<span>Check</span>
        </p>
        <p className="tagline">Worth talking about — or not.</p>
      </header>

      <section className="search-block" aria-label="Search">
        <label className="checker-field">
          <span className="sr-only">Search a topic</span>
          <input
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Type anything — a headline, a game, a name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="control-scroll times" role="tablist" aria-label="Time window">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              className="chip time"
              aria-pressed={timeWindow === w.id}
              onClick={() => setTimeWindow(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="meta-line">
          <span className="live-dot" aria-hidden="true" />
          <span>{liveNote}</span>
          {generatedAt && <span>{formatWhen(generatedAt)}</span>}
          <span>
            <strong>{visible.length}</strong>
            {searching ? ' matches' : ' spikes'}
          </span>
        </div>

        <div className="checker-result" aria-live="polite">
          {searching && checking && !searchHeat && (
            <p className="checker-idle">Checking the heat…</p>
          )}
          {searching && verdict && searchHeat && (
            <div className={`verdict heat-verdict heat-${searchHeat.id}`}>
              <div className="verdict-hero">
                <span className="verdict-face" aria-hidden="true">
                  {searchHeat.emoji}
                  {(searchHeat.id === 'redhot' || searchHeat.id === 'nuclear') && (
                    <span className="heat-steam" />
                  )}
                </span>
                <div className="verdict-text">
                  <span className="verdict-label">{searchHeat.label}</span>
                  <span className="verdict-score">
                    <strong>{verdict.score}</strong>/100
                  </span>
                </div>
              </div>
              <div className="verdict-meter" aria-hidden="true">
                <span style={{ width: `${Math.max(4, verdict.score)}%` }} />
              </div>
              <p className="verdict-blurb">{searchHeat.vibe}</p>
            </div>
          )}
        </div>
      </section>

      {!searching && (
        <HighlightBanners highlights={highlights} items={items} />
      )}

      <section className="board" id="board">
        <h2 className="board-title">
          {searching ? `Results for “${query.trim()}”` : 'Spiking now'}
        </h2>

        {status === 'loading' && <p className="status">Scanning…</p>}
        {status === 'error' && <p className="status">{liveNote}</p>}
        {status === 'ready' && visible.length === 0 && (
          <p className="empty">
            {searching
              ? 'Nothing matching in this window. Try another term or wider time.'
              : 'Nothing accelerating here. Try a wider time window.'}
          </p>
        )}

        {status === 'ready' && visible.length > 0 && (
          <ol className="rank-list">
            {visible.map((item, index) => {
              const heat = heatFromMomentum(item.momentum, peak)
              return (
                <li
                  key={item.id}
                  className={`rank-item heat-row-${heat.id}`}
                  style={{ animationDelay: `${Math.min(index, 10) * 0.03}s` }}
                >
                  <div className="rank-num">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="rank-body">
                    <div className="rank-top">
                      <h3 className="topic">{item.topic}</h3>
                      <HeatBadge heat={heat} size="sm" />
                    </div>
                    <p className="summary">{item.summary}</p>
                    <div
                      className={`meter meter-${heat.id}`}
                      aria-hidden="true"
                    >
                      <span
                        style={{
                          width: `${Math.max(8, (item.momentum / peak) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="tags">
                      <span className="tag">{item.category}</span>
                      <span className="heat-vibe">{heat.vibe}</span>
                      <span>{formatWhen(item.firstSeen)}</span>
                    </div>
                    <div className="links">
                      {item.links.slice(0, 3).map((link) => (
                        <a
                          key={link.url}
                          className="link-chip"
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>{link.source}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <footer className="footer">
        <p>
          Free acceleration radar ·{' '}
          <a href="https://astarmedia.net/heatcheck/">astarmedia.net/heatcheck/</a>
        </p>
      </footer>

      <BottomAd />
    </div>
  )
}
