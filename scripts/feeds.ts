import type { RawSignal } from '../src/lib/types'

export type FeedDef = {
  url: string
  source: string
  fallback: RawSignal['category']
  /** How many items to keep from this feed */
  take?: number
  /** Base engagement score (RSS has no real scores) */
  weight?: number
}

/** Curated free RSS / Atom feeds — no API keys. */
export const RSS_FEEDS: FeedDef[] = [
  // —— General / world news ——
  { url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', source: 'Google News', fallback: 'news', take: 25, weight: 48 },
  {
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News World',
    fallback: 'news',
    take: 20,
    weight: 46,
  },
  {
    url: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News US',
    fallback: 'news',
    take: 18,
    weight: 46,
  },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'NYTimes', fallback: 'news', take: 18, weight: 42 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT World', fallback: 'news', take: 14, weight: 40 },
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News', fallback: 'news', take: 18, weight: 42 },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World', fallback: 'news', take: 16, weight: 40 },
  { url: 'https://feeds.npr.org/1001/rss.xml', source: 'NPR', fallback: 'news', take: 16, weight: 38 },
  { url: 'https://www.theguardian.com/world/rss', source: 'Guardian World', fallback: 'news', take: 16, weight: 40 },
  { url: 'https://www.theguardian.com/us-news/rss', source: 'Guardian US', fallback: 'news', take: 12, weight: 38 },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera', fallback: 'news', take: 14, weight: 38 },
  { url: 'https://www.dw.com/en/top-stories/s-9097?maca=en-rss-en-all-1573-rdf', source: 'DW', fallback: 'news', take: 12, weight: 36 },
  { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', source: 'ABC News AU', fallback: 'news', take: 14, weight: 36 },
  { url: 'https://www.smh.com.au/rss/feed.xml', source: 'SMH', fallback: 'news', take: 12, weight: 34 },
  { url: 'https://rss.politico.com/politics-news.xml', source: 'Politico', fallback: 'news', take: 14, weight: 38 },
  { url: 'https://feeds.washingtonpost.com/rss/world', source: 'Washington Post', fallback: 'news', take: 12, weight: 38 },
  { url: 'https://www.independent.co.uk/news/world/rss', source: 'Independent', fallback: 'news', take: 12, weight: 34 },
  { url: 'https://www.cbsnews.com/latest/rss/main', source: 'CBS News', fallback: 'news', take: 14, weight: 36 },
  { url: 'https://moxie.foxnews.com/google-publisher/latest.xml', source: 'Fox News', fallback: 'news', take: 12, weight: 34 },
  { url: 'https://www.vox.com/rss/index.xml', source: 'Vox', fallback: 'news', take: 12, weight: 34 },
  { url: 'https://www.theatlantic.com/feed/all/', source: 'The Atlantic', fallback: 'news', take: 10, weight: 34 },
  {
    url: 'https://en.wikipedia.org/w/api.php?action=featuredfeed&feed=currentevents&feedformat=atom',
    source: 'Wikipedia Current Events',
    fallback: 'news',
    take: 8,
    weight: 30,
  },

  // —— Business ——
  {
    url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News Business',
    fallback: 'business',
    take: 16,
    weight: 44,
  },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business', fallback: 'business', take: 12, weight: 36 },
  {
    url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    source: 'CNBC',
    fallback: 'business',
    take: 14,
    weight: 38,
  },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', source: 'MarketWatch', fallback: 'business', take: 12, weight: 36 },

  // —— Tech ——
  {
    url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News Tech',
    fallback: 'tech',
    take: 16,
    weight: 44,
  },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC Tech', fallback: 'tech', take: 10, weight: 34 },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge', fallback: 'tech', take: 14, weight: 36 },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', fallback: 'tech', take: 14, weight: 36 },
  { url: 'https://www.wired.com/feed/rss', source: 'Wired', fallback: 'tech', take: 12, weight: 34 },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'Ars Technica', fallback: 'tech', take: 12, weight: 34 },
  { url: 'https://www.engadget.com/rss.xml', source: 'Engadget', fallback: 'tech', take: 10, weight: 32 },

  // —— Sports ——
  {
    url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News Sports',
    fallback: 'sports',
    take: 18,
    weight: 44,
  },
  { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN', fallback: 'sports', take: 14, weight: 38 },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', source: 'BBC Sport', fallback: 'sports', take: 14, weight: 36 },
  { url: 'https://www.espn.com/espn/rss/nba/news', source: 'ESPN NBA', fallback: 'sports', take: 12, weight: 40 },
  { url: 'https://www.espn.com/espn/rss/nfl/news', source: 'ESPN NFL', fallback: 'sports', take: 12, weight: 40 },
  { url: 'https://www.espn.com/espn/rss/mlb/news', source: 'ESPN MLB', fallback: 'sports', take: 10, weight: 38 },
  { url: 'https://www.espn.com/espn/rss/nhl/news', source: 'ESPN NHL', fallback: 'sports', take: 10, weight: 38 },
  { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN Soccer', fallback: 'sports', take: 12, weight: 38 },
  { url: 'https://www.espn.com.au/espn/rss/afl/news', source: 'ESPN AFL', fallback: 'sports', take: 12, weight: 40 },
  { url: 'https://www.afl.com.au/rss/news.xml', source: 'AFL', fallback: 'sports', take: 12, weight: 40 },

  // —— Entertainment ——
  {
    url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News Entertainment',
    fallback: 'entertainment',
    take: 16,
    weight: 42,
  },
  {
    url: 'https://www.hollywoodreporter.com/feed/',
    source: 'Hollywood Reporter',
    fallback: 'entertainment',
    take: 12,
    weight: 34,
  },
  { url: 'https://www.billboard.com/feed/', source: 'Billboard', fallback: 'entertainment', take: 10, weight: 32 },
  { url: 'https://variety.com/feed/', source: 'Variety', fallback: 'entertainment', take: 12, weight: 34 },

  // —— Games ——
  { url: 'https://www.polygon.com/rss/index.xml', source: 'Polygon', fallback: 'games', take: 12, weight: 36 },
  {
    url: 'https://www.rockpapershotgun.com/feed',
    source: 'Rock Paper Shotgun',
    fallback: 'games',
    take: 10,
    weight: 34,
  },
  { url: 'https://www.gamespot.com/feeds/news/', source: 'GameSpot', fallback: 'games', take: 12, weight: 34 },
  { url: 'https://kotaku.com/rss', source: 'Kotaku', fallback: 'games', take: 10, weight: 32 },
  {
    url: 'https://news.google.com/rss/search?q=video+games+OR+gaming+when:1d&hl=en-US&gl=US&ceid=US:en',
    source: 'Google News Games',
    fallback: 'games',
    take: 12,
    weight: 40,
  },
]

export const REDDIT_SUBS: Array<{ sub: string; fallback: RawSignal['category'] }> = [
  { sub: 'news', fallback: 'news' },
  { sub: 'worldnews', fallback: 'news' },
  { sub: 'politics', fallback: 'news' },
  { sub: 'inthenews', fallback: 'news' },
  { sub: 'UpliftingNews', fallback: 'news' },
  { sub: 'technology', fallback: 'tech' },
  { sub: 'science', fallback: 'news' },
  { sub: 'sports', fallback: 'sports' },
  { sub: 'nba', fallback: 'sports' },
  { sub: 'nfl', fallback: 'sports' },
  { sub: 'mlb', fallback: 'sports' },
  { sub: 'nhl', fallback: 'sports' },
  { sub: 'soccer', fallback: 'sports' },
  { sub: 'AFL', fallback: 'sports' },
  { sub: 'tennis', fallback: 'sports' },
  { sub: 'formula1', fallback: 'sports' },
  { sub: 'gaming', fallback: 'games' },
  { sub: 'Games', fallback: 'games' },
  { sub: 'movies', fallback: 'entertainment' },
  { sub: 'television', fallback: 'entertainment' },
  { sub: 'entertainment', fallback: 'entertainment' },
  { sub: 'Music', fallback: 'entertainment' },
  { sub: 'business', fallback: 'business' },
  { sub: 'stocks', fallback: 'business' },
  { sub: 'economics', fallback: 'business' },
]
