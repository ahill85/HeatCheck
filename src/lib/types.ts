export type Category =
  | 'everything'
  | 'games'
  | 'sports'
  | 'news'
  | 'tech'
  | 'entertainment'
  | 'business'

export type TimeWindow = '1h' | '4h' | '24h' | '7d' | '30d'

export type TrendPhase = 'rising' | 'peaking' | 'fading'

export type SourceKind = 'hackernews' | 'reddit' | 'rss' | 'gdelt'

export interface TrendLink {
  title: string
  url: string
  source: string
  kind: SourceKind
  score?: number
  comments?: number
}

export interface TrendItem {
  id: string
  topic: string
  summary: string
  category: Exclude<Category, 'everything'>
  momentum: number
  phase: TrendPhase
  firstSeen: string
  sourceCount: number
  engagement: number
  ageHours: number
  links: TrendLink[]
}

export interface SnapshotPayload {
  generatedAt: string
  windowHint: TimeWindow
  items: TrendItem[]
  meta: {
    sourceCounts: Record<SourceKind, number>
    note: string
  }
}

export interface RawSignal {
  id: string
  title: string
  url: string
  source: string
  kind: SourceKind
  category: Exclude<Category, 'everything'>
  score: number
  comments: number
  createdAt: number
  summary?: string
}
