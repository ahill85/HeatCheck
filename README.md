# HeatCheck

Worth talking about — or not.  
Live at `https://astarmedia.net/heatcheck/`

## How trends are found

Every collect run pulls free sources (no paid APIs):

| Source | What we take |
| --- | --- |
| Google News + major RSS | Headlines from news, sports, tech, business, games, entertainment (CNN, Axios, BBC, NYT, ESPN, IGN, Deadline, etc.) |
| Google Trends RSS | Daily rising searches (US / UK / AU) |
| Hacker News API | New + top stories (points + comments) |
| Bluesky | Public trending topics (AT Protocol, no auth) |
| Mastodon | Trending shared links (`mastodon.social`) |
| Wikipedia | Most-viewed English articles (pageviews API) |
| Lobste.rs | Hottest tech community stories |
| Lemmy | Hot posts from `lemmy.world` (Reddit-like, federated) |
| Reddit RSS | Bundled multi-sub feeds (rate-limits often; best-effort) |
| GDELT | Global news articles when the free API isn’t rate-limiting |

**Not available free:** Facebook, Instagram, Threads, X/Twitter, TikTok, YouTube Trending — those APIs are paid, locked, or scrape-only.

Stories about the same topic get **deduped** into one spike (shared keywords in the headline).

## How the score works

Raw “engagement” per story ≈ points/comments (HN) or a recency-weighted score (RSS).

Then for each clustered topic:

```text
momentum ≈
  (engagement ÷ age in hours)   ← velocity
  × growth vs last snapshot     ← acceleration
  × boost if multiple sources
```

That momentum drives the fun heat scale (Ice cold → Nuclear).  
Search (“Is this trending?”) blends board matches + HN Algolia + Wikipedia pageviews into a **0–100** heat reading.

## How often it updates

| Layer | Frequency |
| --- | --- |
| **GitHub Action collect** | Every **15 minutes** (plus manual “Run workflow”) |
| **On each page visit** | Live Hacker News merge (browser, free, no key) |
| **Heat history** | Each collect compares to the previous run so growth gets sharper over time |

GitHub’s cron can drift a bit (sometimes closer to hourly under load) — still free and hands-off.

## Self-running setup (recommended)

So you upload the site **once**, and data keeps refreshing:

1. Push this repo to GitHub (private is fine).
2. **Settings → Actions → General** → allow workflows; allow Actions to create PRs/commits if prompted (read/write for `GITHUB_TOKEN`).
3. Confirm `.github/workflows/collect.yml` runs (Actions tab → “Collect HeatCheck data” → Run workflow once).
4. Create `.env` (or set at build time):

```bash
# replace with your GitHub user/repo
VITE_DATA_URL=https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/public/data
```

5. Build and upload:

```bash
npm install
npm run collect   # optional first snapshot
npm run build
```

Upload **everything inside `dist/`** into your host folder:

`astarmedia.net/heatcheck/`  
(so the site is at `https://astarmedia.net/heatcheck/`)

After that, Actions rewrites `public/data/*.json` on GitHub every ~15 minutes; the live site reads those files via `VITE_DATA_URL`. You only re-upload `dist/` when you change the UI.

### Without remote data URL

If you skip `VITE_DATA_URL`, the site uses the JSON baked into `dist/data/`. Then you must **re-collect + rebuild + re-upload** whenever you want fresher boards (or only get live HN on each visit).

## Local dev

```bash
npm install
npm run collect
npm run dev
# → http://127.0.0.1:5173/heatcheck/
```

## AdSense

Same bottom unit as Hoops Redraft (`ca-pub-9167552007992876` / slot `2160710155`). Works on the live astarmedia.net domain; often empty on localhost.

## SEO

The build ships:

- Meta description, canonical, Open Graph, Twitter cards
- JSON-LD (`WebSite` + `WebApplication`)
- `/heatcheck/robots.txt` and `/heatcheck/sitemap.xml`
- Share image at `/heatcheck/og-image.jpg`

After deploy, submit `https://astarmedia.net/heatcheck/sitemap.xml` in [Google Search Console](https://search.google.com/search-console). Crawlers only read `robots.txt` at the **domain root**, so if the host still 404s `https://astarmedia.net/robots.txt`, add one there that allows `/heatcheck/` and points at the sitemap above.
